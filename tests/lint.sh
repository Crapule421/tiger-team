#!/usr/bin/env bash
# Structural checks for the Tiger Team repository.
# Usage: bash tests/lint.sh
set -u
repo=$(cd "$(dirname "$0")/.." && pwd)
plugin="$repo/plugins/tiger-team"
fail=0
note() { printf '%s\n' "$*"; }
bad()  { fail=$((fail+1)); printf 'FAIL %s\n' "$*"; }

note "# JSON manifests and hooks"
for f in "$repo/.claude-plugin/marketplace.json" "$plugin/.claude-plugin/plugin.json" "$plugin/hooks/hooks.json"; do
  if python -c "import json,sys; json.load(sys.stdin)" < "$f" 2>/dev/null; then
    note "ok   $(basename "$f")"
  else
    bad "$f is not valid JSON"
  fi
done

note "# Versions match between marketplace and plugin"
v1=$(python -c "import json,sys;print(json.load(sys.stdin)['plugins'][0]['version'])" < "$repo/.claude-plugin/marketplace.json")
v2=$(python -c "import json,sys;print(json.load(sys.stdin)['version'])" < "$plugin/.claude-plugin/plugin.json")
[ "$v1" = "$v2" ] && note "ok   version $v1" || bad "marketplace version $v1 != plugin version $v2"

note "# Skill names match their directories"
for d in "$plugin"/skills/*/; do
  d=${d%/}; name=$(sed -n 's/^name: *//p' "$d/SKILL.md" | head -1)
  [ "$name" = "$(basename "$d")" ] && note "ok   $(basename "$d")" || bad "skill $(basename "$d") has name '$name'"
done

note "# Agent names match their files"
for f in "$plugin"/agents/*.md; do
  name=$(sed -n 's/^name: *//p' "$f" | head -1)
  [ "$name" = "$(basename "$f" .md)" ] && note "ok   $name" || bad "agent $(basename "$f") has name '$name'"
done

note "# Model tiering: experts carry no model field, lead and architect inherit"
for f in "$plugin"/agents/*.md; do
  n=$(basename "$f" .md)
  case "$n" in
    project-manager|enterprise-architect)
      grep -q '^model: inherit$' "$f" && note "ok   $n inherits" || bad "$n must have 'model: inherit'" ;;
    *)
      grep -q '^model:' "$f" && bad "$n must not fix a model (CLAUDE_CODE_SUBAGENT_MODEL tiering)" || note "ok   $n no model" ;;
  esac
done

note "# Agents preload existing skills"
for f in "$plugin"/agents/*.md; do
  awk '/^skills:/{s=1;next} s&&/^  - /{print $2;next} s&&!/^  /{s=0}' "$f" | while read -r s; do
    [ -f "$plugin/skills/$s/SKILL.md" ] || { echo "MISSING $s in $(basename "$f")"; }
  done
done | grep MISSING && fail=$((fail+1))

note "# Command skills target existing agents"
grep -h '^agent: tiger-team:' "$plugin"/skills/*/SKILL.md | sed 's/^agent: tiger-team://' | sort -u | while read -r a; do
  [ -f "$plugin/agents/$a.md" ] && note "ok   $a" || echo "MISSING agent $a"
done | grep MISSING && fail=$((fail+1))

note "# No upper-case classification markings in the repository"
if LC_ALL=C grep -rqE 'SECRET[[:space:]_-]+D(E|É)FENSE|TR(E|È)S[[:space:]_-]+SECRET|DIFFUSION[[:space:]_-]+RESTREINTE|SP(E|É)CIAL[[:space:]_-]+FRANCE|CONFIDENTIEL[[:space:]_-]+D(E|É)FENSE' "$repo" --exclude-dir=.git --exclude-dir=tests; then
  bad "upper-case marking found (the guard would block reading that file)"
else
  note "ok   none"
fi

note "# Line limits (SKILL.md <= 400, references <= 400, templates <= 200)"
while IFS= read -r f; do
  n=$(wc -l < "$f")
  case "$f" in
    */templates/*) limit=200 ;;
    *) limit=400 ;;
  esac
  [ "$n" -le "$limit" ] || bad "$f has $n lines (limit $limit)"
done < <(find "$plugin/skills" -name '*.md')
note "checked"

note "# Line endings"
if grep -rlI $'\r' "$repo" --exclude-dir=.git >/dev/null; then bad "CRLF line endings found"; else note "ok   LF everywhere"; fi

echo
[ "$fail" = 0 ] && echo "lint: all checks passed" || echo "lint: $fail problem(s)"
[ "$fail" = 0 ]
