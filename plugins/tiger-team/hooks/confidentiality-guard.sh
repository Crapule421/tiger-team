#!/usr/bin/env bash
# Tiger Team confidentiality guard.
#
# Runs on:
#   PreToolUse  (Read, Grep, Glob, Edit, Write, Bash)  — inputs the agent is about to read or touch
#   PostToolUse (Write, Edit)                          — content the agent wrote to a file
#   UserPromptSubmit                                   — the user's prompt
#   Stop                                               — the agent's final answer
# Blocks (exit 2, reason on stderr):
#   - access to secret files (.env, private keys, keystores, password vaults...)
#   - a file, prompt, written content or final answer that carries a French
#     classification marking in upper case, as on marked documents (Secret Défense,
#     Très Secret, Diffusion Restreinte, Spécial France, Confidentiel Défense)
#   - a file, prompt, written content or final answer that carries banking or health
#     identifiers that pass their checksum: an IBAN (mod 97), a payment card number
#     (Luhn, card-scheme prefix and length), a French NIR / social security number (key 97)
#   - Bash commands that target secret files
# Mentions in normal case ("how do I handle Diffusion Restreinte data?") pass, and so do
# identifiers that fail their checksum: use invalid ones in examples.
# Dependencies: bash, grep, sed, awk (Git Bash on Windows, any Linux or macOS). No jq.
#
# This is a safety net against handling mistakes. It does not replace a security
# policy or the homologation of a system: classified information and real personal
# data must never be processed by a cloud AI service.

LC_ALL=C
export LC_ALL

input=$(cat)

# --- Markings (upper case, as they appear on marked documents) -------------
# Accented letters are matched in UTF-8, Latin-1/Windows-1252 and JSON \u escapes.
LATIN1_E_ACUTE=$'\xC9'
LATIN1_E_GRAVE=$'\xC8'
E_ACUTE="(E|É|${LATIN1_E_ACUTE}|\\\\u00[cC]9)"
E_GRAVE="(E|È|${LATIN1_E_GRAVE}|\\\\u00[cC]8)"
SEP='[[:space:]_-]+'
MARKINGS="SECRET${SEP}D${E_ACUTE}FENSE|TR${E_GRAVE}S${SEP}SECRET|DIFFUSION${SEP}RESTREINTE|SP${E_ACUTE}CIAL${SEP}FRANCE|CONFIDENTIEL${SEP}D${E_ACUTE}FENSE"

block() {
  {
    echo "Tiger Team confidentiality guard: $1"
    echo "Garde-fou de confidentialité Tiger Team : $2"
  } >&2
  exit 2
}

# Extract the first JSON string value of a key (best effort, no jq).
json_field() {
  printf '%s' "$input" \
    | grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"\\\\]\|\\\\.\)*\"" \
    | head -n 1 \
    | sed -E "s/^\"$1\"[[:space:]]*:[[:space:]]*\"//; s/\"\$//"
}

# JSON-unescape backslashes and use forward slashes: C:\\a\\b -> C:/a/b
to_slashes() {
  local p="$1"
  p="${p//\\\\//}"
  p="${p//\\//}"
  printf '%s' "$p"
}

# Comparable form: forward slashes, /c/... -> c:/..., lower case
canonical() {
  local p
  p=$(to_slashes "$1")
  if [[ "$p" =~ ^/([a-zA-Z])/(.*)$ ]]; then
    p="${BASH_REMATCH[1]}:/${BASH_REMATCH[2]}"
  fi
  printf '%s' "${p,,}"
}

is_secret_name() {
  local name="${1,,}"
  case "$name" in
    .env.example|.env.sample|.env.template|*.pub) return 1 ;;
    .env|.env.*|*.pem|*.key|*.p12|*.pfx|*.jks|*.keystore|*.kdbx|*.ppk|*.p8) return 0 ;;
    id_rsa*|id_ecdsa*|id_ed25519*|id_dsa*) return 0 ;;
    credentials|credentials.*|.netrc|.pgpass|.htpasswd) return 0 ;;
  esac
  return 1
}

# --- Personal and banking identifiers, validated by checksum ----------------
# Each function reads text on stdin and prints the kind of the first valid hit, or nothing.
# Candidates are found with grep, then validated in awk (Luhn, IBAN mod 97, NIR key 97).

find_pii() {
  # Read stdin once: each check below gets the same text.
  local text hit
  text=$(cat)
  # IBAN: two letters, two digits, 11 to 30 alphanumerics, spaces allowed between groups.
  hit=$(printf '%s\n' "$text" | grep -oE '\b[A-Z]{2}[0-9]{2}( ?[A-Z0-9]){11,30}\b' | awk '
    function mod97(s,   i, r, c) { r = 0; for (i = 1; i <= length(s); i++) { c = substr(s, i, 1); r = (r * 10 + c) % 97 } return r }
    {
      s = $0; gsub(/ /, "", s)
      if (length(s) < 15 || length(s) > 34) next
      t = substr(s, 5) substr(s, 1, 4); num = ""
      for (i = 1; i <= length(t); i++) { c = substr(t, i, 1); if (c ~ /[A-Z]/) num = num (index("ABCDEFGHIJKLMNOPQRSTUVWXYZ", c) + 9); else num = num c }
      if (mod97(num) == 1) { print "IBAN"; exit }
    }')
  [ -n "$hit" ] && { echo "$hit"; return; }

  # Payment card: 13 to 19 digits with optional single spaces or dashes, scheme prefix and length, Luhn.
  hit=$(printf '%s\n' "$text" | grep -oE '\b[0-9]([ -]?[0-9]){12,18}\b' | awk '
    function luhn(s,   i, d, sum, alt) { sum = 0; alt = 0; for (i = length(s); i >= 1; i--) { d = substr(s, i, 1) + 0; if (alt) { d *= 2; if (d > 9) d -= 9 } sum += d; alt = !alt } return sum % 10 == 0 }
    {
      s = $0; gsub(/[ -]/, "", s); n = length(s)
      ok = 0
      if (s ~ /^4/ && (n == 13 || n == 16 || n == 19)) ok = 1
      else if ((s ~ /^5[1-5]/ || (substr(s,1,4) >= 2221 && substr(s,1,4) <= 2720)) && n == 16) ok = 1
      else if (s ~ /^3[47]/ && n == 15) ok = 1
      else if ((s ~ /^6011/ || s ~ /^65/ || s ~ /^64[4-9]/) && n == 16) ok = 1
      else if (s ~ /^35/ && n == 16) ok = 1
      if (ok && luhn(s)) { print "payment card number"; exit }
    }')
  [ -n "$hit" ] && { echo "$hit"; return; }

  # French NIR (numéro de sécurité sociale): 13 digits + 2-digit key = 97 - (number mod 97).
  hit=$(printf '%s\n' "$text" | grep -oE '\b[12] ?[0-9]{2} ?[0-9]{2} ?[0-9]{2} ?[0-9]{3} ?[0-9]{3} ?[0-9]{2}\b' | awk '
    function mod97(s,   i, r) { r = 0; for (i = 1; i <= length(s); i++) r = (r * 10 + substr(s, i, 1)) % 97; return r }
    {
      s = $0; gsub(/ /, "", s)
      if (length(s) != 15) next
      body = substr(s, 1, 13); key = substr(s, 14, 2) + 0
      mm = substr(s, 4, 2) + 0
      if (!((mm >= 1 && mm <= 12) || mm == 20 || (mm >= 30 && mm <= 42) || mm >= 50)) next
      if (97 - mod97(body) == key) { print "French NIR"; exit }
    }')
  [ -n "$hit" ] && echo "$hit"
}

block_pii() {
  # $1 = kind, $2 = where (English), $3 = where (French)
  block "$2 contains what looks like a real $1 (checksum valid). Real banking or health identifiers must never be sent to a cloud AI service. Replace it with an invalid or fictitious value." \
        "$3 contient ce qui ressemble à un vrai $1 (somme de contrôle valide). Les identifiants bancaires ou de santé réels ne doivent jamais être envoyés à un service d'IA dans le cloud. Remplace-le par une valeur invalide ou fictive."
}

event=$(json_field hook_event_name)

# --- Prompt check ------------------------------------------------------------
if [ "$event" = "UserPromptSubmit" ]; then
  if printf '%s' "$input" | grep -qE "$MARKINGS"; then
    block "the prompt contains a classification marking. Classified or Diffusion Restreinte information must never be sent to a cloud AI service. Remove it or use an anonymized, unclassified version." \
          "le prompt contient un marquage de classification. Les informations classifiées ou Diffusion Restreinte ne doivent jamais être envoyées à un service d'IA dans le cloud. Retire-les ou utilise une version anonymisée et non classifiée."
  fi
  kind=$(printf '%s' "$input" | find_pii)
  [ -n "$kind" ] && block_pii "$kind" "the prompt" "le prompt"
  exit 0
fi

# --- Final answer check ------------------------------------------------------
if [ "$event" = "Stop" ]; then
  # Do not loop: when this hook already made the agent continue once, let it stop.
  printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0
  transcript=$(to_slashes "$(json_field transcript_path)")
  [ -f "$transcript" ] || exit 0
  last=$(grep '"type":"assistant"' "$transcript" | tail -n 1)
  [ -z "$last" ] && exit 0
  if printf '%s' "$last" | grep -qE "$MARKINGS"; then
    block "your answer contains a classification marking in upper case. Rewrite it without the marking and without the marked content." \
          "ta réponse contient un marquage de classification en majuscules. Réécris-la sans le marquage et sans le contenu marqué."
  fi
  kind=$(printf '%s' "$last" | find_pii)
  [ -n "$kind" ] && block "your answer contains what looks like a real $kind (checksum valid). Rewrite it with the identifier masked or replaced by an invalid example." \
                          "ta réponse contient ce qui ressemble à un vrai $kind (somme de contrôle valide). Réécris-la en masquant l'identifiant ou en le remplaçant par un exemple invalide."
  exit 0
fi

tool=$(json_field tool_name)

# --- Written content check (after Write / Edit) ------------------------------
if [ "$event" = "PostToolUse" ]; then
  case "$tool" in
    Write|Edit)
      content=$(printf '%s' "$input" | grep -o '"\(content\|new_string\)"[[:space:]]*:[[:space:]]*"\([^"\\]\|\\.\)*"' | head -n 1)
      [ -z "$content" ] && exit 0
      if printf '%s' "$content" | grep -qE "$MARKINGS"; then
        block "the content just written to a file carries a classification marking in upper case. Remove it from the file." \
              "le contenu qui vient d'être écrit dans un fichier porte un marquage de classification en majuscules. Retire-le du fichier."
      fi
      kind=$(printf '%s' "$content" | sed 's/\\n/ /g' | find_pii)
      [ -n "$kind" ] && block_pii "$kind" "the content just written to a file" "le contenu qui vient d'être écrit dans un fichier"
      ;;
  esac
  exit 0
fi

# Plugin root, so the plugin's own reference files are never blocked.
root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$root" ]; then
  root=$(to_slashes "$0")
  root="${root%/hooks/*}"
fi
root_c=$(canonical "$root")

case "$tool" in
  Read|Edit|Write|Grep|Glob)
    if [ "$tool" = "Grep" ] || [ "$tool" = "Glob" ]; then
      raw=$(json_field path)
    else
      raw=$(json_field file_path)
    fi
    [ -z "$raw" ] && exit 0
    path=$(to_slashes "$raw")
    name="${path##*/}"

    if is_secret_name "$name"; then
      block "access to '$name' is blocked: it looks like a secret file (credentials, keys, keystore). Do not share secrets with the assistant; use placeholders or a .env.example." \
            "l'accès à '$name' est bloqué : c'est probablement un fichier de secrets (identifiants, clés, keystore). Ne partage pas de secrets avec l'assistant ; utilise des valeurs factices ou un .env.example."
    fi

    if [ "$tool" = "Read" ] && [ -f "$path" ]; then
      path_c=$(canonical "$path")
      if [ -n "$root_c" ] && [[ "$path_c" == "$root_c"/* ]]; then
        exit 0
      fi
      if grep -aqE "$MARKINGS" "$path" 2>/dev/null; then
        block "'$name' carries a classification marking. Classified or Diffusion Restreinte documents must never be processed by a cloud AI service. Provide an anonymized, unclassified version." \
              "'$name' porte un marquage de classification. Les documents classifiés ou Diffusion Restreinte ne doivent jamais être traités par un service d'IA dans le cloud. Fournis une version anonymisée et non classifiée."
      fi
      # Identifier scan on text files up to 5 MB.
      size=$(wc -c < "$path" 2>/dev/null || echo 0)
      if [ "${size:-0}" -le 5242880 ]; then
        kind=$(grep -a '' "$path" 2>/dev/null | find_pii)
        [ -n "$kind" ] && block_pii "$kind" "'$name'" "'$name'"
      fi
    fi
    ;;

  Bash)
    cmd=$(json_field command)
    [ -z "$cmd" ] && exit 0
    # Split the command into words and check each word's file name.
    set -f
    for tok in $(printf '%s' "$cmd" | tr ' \t"'"'"'=<>|;&(),' '\n'); do
      name=$(to_slashes "$tok")
      name="${name##*/}"
      # A bare "credentials" is usually a search term, not a file.
      [ "${name,,}" = "credentials" ] && continue
      if is_secret_name "$name"; then
        block "this command touches a secret file ($tok). Run it yourself outside the assistant if it is really needed." \
              "cette commande touche un fichier de secrets ($tok). Lance-la toi-même hors de l'assistant si elle est vraiment nécessaire."
      fi
    done
    set +f
    ;;
esac

exit 0
