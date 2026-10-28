#!/usr/bin/env bash
# Tests for plugins/tiger-team/hooks/confidentiality-guard.sh
# Usage: bash tests/confidentiality-guard.test.sh
# Exit code 0 when every case behaves as expected.
set -u

here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/.." && pwd)
hook="$repo/plugins/tiger-team/hooks/confidentiality-guard.sh"
export CLAUDE_PLUGIN_ROOT="$repo/plugins/tiger-team"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Fixtures. Markings are built from pieces so that this test file itself never contains one.
DR="DIFFUSION RESTRE""INTE"
SD="SECRET D""EFENSE"
printf 'Rapport\n%s\nContenu\n' "$DR" > "$tmp/marked.txt"
printf 'Note sur la Diffusion Restreinte en general\n' > "$tmp/normal-case.txt"
printf 'EN-TETE : SECRET D\xc9FENSE\n' > "$tmp/latin1.txt"          # É in Latin-1
printf 'TR\xc3\x88S SECRET\n' > "$tmp/utf8.txt"                       # È in UTF-8
printf 'API_KEY=placeholder\n' > "$tmp/.env"
printf 'API_KEY=\n' > "$tmp/.env.example"
printf 'hello\n' > "$tmp/notes.md"

pass=0; fail=0

# run <expected rc> <label> <json input>
run() {
  local expected="$1" label="$2" input="$3" rc
  printf '%s' "$input" | bash "$hook" >/dev/null 2>"$tmp/stderr"; rc=$?
  if [ "$rc" = "$expected" ]; then
    pass=$((pass+1)); printf 'ok   %-48s rc=%s\n' "$label" "$rc"
  else
    fail=$((fail+1)); printf 'FAIL %-48s rc=%s expected=%s\n' "$label" "$rc" "$expected"
    sed 's/^/     stderr: /' "$tmp/stderr"
  fi
  if [ "$rc" = 2 ] && ! grep -q 'confidentiality guard' "$tmp/stderr"; then
    fail=$((fail+1)); printf 'FAIL %-48s no explanation on stderr\n' "$label"
  fi
}

# JSON-escape a path (backslashes doubled) so Windows paths survive.
jpath() { printf '%s' "$1" | sed 's/\\/\\\\/g'; }

read_json()   { printf '{"hook_event_name":"PreToolUse","tool_name":"Read","tool_input":{"file_path":"%s"}}' "$(jpath "$1")"; }
write_json()  { printf '{"hook_event_name":"PreToolUse","tool_name":"Write","tool_input":{"file_path":"%s","content":"x"}}' "$(jpath "$1")"; }
grep_json()   { printf '{"hook_event_name":"PreToolUse","tool_name":"Grep","tool_input":{"pattern":"x","path":"%s"}}' "$(jpath "$1")"; }
bash_json()   { printf '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"%s"}}' "$1"; }
prompt_json() { printf '{"hook_event_name":"UserPromptSubmit","prompt":"%s"}' "$1"; }

echo "# Read: classification markings"
run 2 "marked file is blocked"                 "$(read_json "$tmp/marked.txt")"
run 2 "Latin-1 marking is blocked"             "$(read_json "$tmp/latin1.txt")"
run 2 "UTF-8 marking is blocked"               "$(read_json "$tmp/utf8.txt")"
run 0 "normal-case mention passes"             "$(read_json "$tmp/normal-case.txt")"
run 0 "ordinary file passes"                   "$(read_json "$tmp/notes.md")"
run 0 "missing file passes (tool will error)"  "$(read_json "$tmp/does-not-exist.txt")"
run 0 "plugin's own files are never blocked"   "$(read_json "$hook")"

echo "# Read/Write/Grep: secret files"
run 2 ".env is blocked"                        "$(read_json "$tmp/.env")"
run 0 ".env.example passes"                    "$(read_json "$tmp/.env.example")"
run 2 "writing a .key is blocked"              "$(write_json "$tmp/server.key")"
run 2 "writing a .ppk is blocked"              "$(write_json "$tmp/putty.ppk")"
run 2 "grep inside id_rsa is blocked"          "$(grep_json "$tmp/id_rsa")"
run 0 "grep in a directory passes"             "$(grep_json "$tmp")"
run 0 "id_rsa.pub passes"                      "$(read_json "$tmp/id_rsa.pub")"

echo "# Bash: commands that target secret files"
run 2 "cat .env"                               "$(bash_json 'cat .env')"
run 2 "cat ./config/.env.prod | head"          "$(bash_json 'cat ./config/.env.prod | head')"
run 2 "cp .env.example .env"                   "$(bash_json 'cp .env.example .env')"
run 2 "cat ~/.ssh/id_rsa"                      "$(bash_json 'cat ~/.ssh/id_rsa')"
run 2 "openssl on server.pem"                  "$(bash_json 'openssl x509 -in certs/server.pem -noout')"
run 2 "type on a Windows .p12 path"            "$(bash_json 'type C:\\\\app\\\\conf\\\\prod.p12')"
run 0 "cat .env.example"                       "$(bash_json 'cat .env.example')"
run 0 "cat id_rsa.pub"                         "$(bash_json 'cat ~/.ssh/id_rsa.pub')"
run 0 "grep for the word credentials"          "$(bash_json 'grep -rn credentials src/')"
run 0 "git status && ls -la"                   "$(bash_json 'git status \&\& ls -la')"

echo "# Prompts"
run 2 "prompt with a marking"                  "$(prompt_json "voici le doc $DR a analyser")"
run 2 "prompt with JSON-escaped accent"        "$(prompt_json 'CONFIDENTIEL DÉFENSE')"
run 0 "normal-case question passes"            "$(prompt_json 'comment traiter des donnees Diffusion Restreinte ?')"

echo "# Identifiers validated by checksum (IBAN mod 97, card Luhn, NIR key)"
# Values below are built so that the valid ones pass their checksum and the invalid ones fail it.
IBAN_OK="FR76 3000 6000 0112 3456 7890 189"         # the classic documentation IBAN, checksum valid
IBAN_KO="FR76 3000 6000 0112 3456 7890 100"         # same shape, checksum invalid
PAN_OK="4111 1111 1111 1111"                        # Visa test number, Luhn valid
PAN_KO="4111 1111 1111 1112"                        # Luhn invalid
SIRET="73282932000074"                              # 14 digits, Luhn valid: not a card length, must pass
NIR_BODY="1850578006084"
NIR_KEY=$(awk -v b="$NIR_BODY" 'BEGIN{r=0; for(i=1;i<=length(b);i++) r=(r*10+substr(b,i,1))%97; printf "%02d", 97-r}')
NIR_OK="$NIR_BODY$NIR_KEY"
NIR_KO="${NIR_BODY}$(printf '%02d' $(( (10#$NIR_KEY + 1) % 100 )))"
printf 'Customer record: IBAN %s balance 12 450 EUR\n' "$IBAN_OK" > "$tmp/iban-valid.txt"
printf 'Example: IBAN %s (invalid, for tests)\n' "$IBAN_KO" > "$tmp/iban-invalid.txt"
printf 'card %s\n' "$PAN_OK" > "$tmp/pan-valid.txt"
printf 'card %s and SIRET %s\n' "$PAN_KO" "$SIRET" > "$tmp/pan-invalid.txt"
printf 'patient NIR %s\n' "$NIR_OK" > "$tmp/nir-valid.txt"
printf 'patient NIR %s\n' "$NIR_KO" > "$tmp/nir-invalid.txt"
run 2 "Read file with valid IBAN"                "$(read_json "$tmp/iban-valid.txt")"
run 0 "Read file with invalid IBAN"              "$(read_json "$tmp/iban-invalid.txt")"
run 2 "Read file with Luhn-valid Visa number"    "$(read_json "$tmp/pan-valid.txt")"
run 0 "Read file with invalid card and a SIRET"  "$(read_json "$tmp/pan-invalid.txt")"
run 2 "Read file with valid NIR"                 "$(read_json "$tmp/nir-valid.txt")"
run 0 "Read file with invalid NIR"               "$(read_json "$tmp/nir-invalid.txt")"
run 2 "prompt with valid IBAN"                   "$(prompt_json "design the API for IBAN $IBAN_OK please")"
run 0 "prompt with invalid IBAN"                 "$(prompt_json "design the API for IBAN $IBAN_KO please")"
run 2 "prompt with valid NIR"                    "$(prompt_json "patient $NIR_OK admitted")"
post_write_json() { printf '{"hook_event_name":"PostToolUse","tool_name":"Write","tool_input":{"file_path":"%s","content":"%s"},"tool_response":{}}' "$(jpath "$1")" "$2"; }
run 2 "Write content with valid card number"     "$(post_write_json "$tmp/out.md" "Test card: $PAN_OK")"
run 0 "Write content with invalid card number"   "$(post_write_json "$tmp/out.md" "Test card: $PAN_KO")"
run 0 "Write of ordinary content"                "$(post_write_json "$tmp/out.md" "Release sheet v1.0 — 2026-10-28")"

echo "# Final answer (Stop)"
printf '{"type":"user","message":{"role":"user","content":"hello"}}\n{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Account IBAN %s is fine"}]}}\n' "$IBAN_OK" > "$tmp/transcript-leak.jsonl"
printf '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Use an invalid example such as %s"}]}}\n' "$IBAN_KO" > "$tmp/transcript-clean.jsonl"
stop_json() { printf '{"hook_event_name":"Stop","stop_hook_active":%s,"transcript_path":"%s"}' "$2" "$(jpath "$1")"; }
run 2 "final answer repeats a valid IBAN"        "$(stop_json "$tmp/transcript-leak.jsonl" false)"
run 0 "final answer with invalid example"        "$(stop_json "$tmp/transcript-clean.jsonl" false)"
run 0 "no loop when the stop hook already ran"   "$(stop_json "$tmp/transcript-leak.jsonl" true)"
run 0 "missing transcript passes"                "$(stop_json "$tmp/none.jsonl" false)"

echo "# Robustness"
run 0 "garbage input passes"                   'not json'
run 0 "empty input passes"                     ''
run 0 "unknown tool passes"                    '{"hook_event_name":"PreToolUse","tool_name":"WebFetch","tool_input":{"url":"https://example.org"}}'

echo
echo "passed: $pass, failed: $fail"
[ "$fail" = 0 ]
