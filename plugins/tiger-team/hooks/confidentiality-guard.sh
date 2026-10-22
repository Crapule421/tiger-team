#!/usr/bin/env bash
# Tiger Team confidentiality guard.
#
# Runs on PreToolUse (Read, Grep, Glob, Edit, Write, Bash) and UserPromptSubmit.
# Blocks (exit 2, reason on stderr):
#   - access to secret files (.env, private keys, keystores, password vaults...)
#   - reading a file that carries a French classification marking written in
#     upper case, as on marked documents (Secret Défense, Très Secret,
#     Diffusion Restreinte, Spécial France, Confidentiel Défense)
#   - Bash commands that target secret files
#   - prompts that contain such a marking
# Mentions in normal case ("how do I handle Diffusion Restreinte data?") pass.
# Dependencies: bash, grep, sed (Git Bash on Windows, any Linux or macOS). No jq.
#
# This is a safety net against handling mistakes. It does not replace a security
# policy or the homologation of a system: classified information must never be
# processed by a cloud AI service.

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
    .env|.env.*|*.pem|*.key|*.p12|*.pfx|*.jks|*.keystore|*.kdbx) return 0 ;;
    id_rsa*|id_ecdsa*|id_ed25519*|id_dsa*) return 0 ;;
    credentials|credentials.*|.netrc|.pgpass) return 0 ;;
  esac
  return 1
}

event=$(json_field hook_event_name)

# --- Prompt check ------------------------------------------------------------
if [ "$event" = "UserPromptSubmit" ]; then
  if printf '%s' "$input" | grep -qE "$MARKINGS"; then
    block "the prompt contains a classification marking. Classified or Diffusion Restreinte information must never be sent to a cloud AI service. Remove it or use an anonymized, unclassified version." \
          "le prompt contient un marquage de classification. Les informations classifiées ou Diffusion Restreinte ne doivent jamais être envoyées à un service d'IA dans le cloud. Retire-les ou utilise une version anonymisée et non classifiée."
  fi
  exit 0
fi

tool=$(json_field tool_name)

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
