# Contributing to Tiger Team

Thanks for helping make the team sharper. Contributions from practitioners — integrators, DBAs, schedulers, architects, IBM i and ERP specialists — are the most valuable.

## What helps most

- **Corrections of facts**: a wrong command, parameter, transaction code or regulatory reference. Please cite the official documentation or text in the pull request.
- **Field-tested checklists and pitfalls** for the knowledge bases (`plugins/tiger-team/skills/*-reference/`).
- **New deliverable templates** or improvements to existing ones (`plugins/tiger-team/skills/deliverables/templates/`).
- **Scenarios** that show where the team gives a weak answer (open an issue with a fictitious, anonymized example).

## Rules

1. **No confidential content, ever.** No employer conventions, real server or client names, real data, secrets or classified material. Use fictitious names (`APP_COMPTA`, `SRV-BATCH-01`, `example.org`) and documentation IP ranges.
2. **Accuracy over completeness.** If a fact depends on the product version, say so. Never invent options, keywords or codes.
3. **English** for prompts, skills and docs. The agents answer in the user's language.
4. **Keep the format.** Agents answer with Summary, Analysis, Recommendations, Risks, Handoffs, Open questions, Assumptions. Knowledge skills keep `SKILL.md` short and move detail to `references/`.
5. **Keep markings out of the repository.** Do not write French classification markings in upper case in any file: the confidentiality guard would block reading that file.

## Workflow

1. Fork and create a branch.
2. Validate locally: `claude plugin validate .`, then install from your local path (`claude plugin marketplace add ./` and `claude plugin install tiger-team@tiger-team`) and try the commands you changed.
3. Bump the version in `plugins/tiger-team/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`, and add an entry to `CHANGELOG.md`.
4. Open a pull request describing what changed and how you tested it.
