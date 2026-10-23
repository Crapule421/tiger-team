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

echo "# Robustness"
run 0 "garbage input passes"                   'not json'
run 0 "empty input passes"                     ''
run 0 "unknown tool passes"                    '{"hook_event_name":"PreToolUse","tool_name":"WebFetch","tool_input":{"url":"https://example.org"}}'

echo
echo "passed: $pass, failed: $fail"
[ "$fail" = 0 ]
