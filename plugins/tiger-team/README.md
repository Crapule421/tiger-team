# Tiger Team plugin

Nine senior expert subagents for technical and application integration projects, working as a team inside Claude Code: project manager (the lead), enterprise architect, DevSecOps, DBA, job scheduling (VTOM, Dollar Universe, Control-M), APIs and data flows, ERP (SAP, Oracle, Sage X3, Cegid, Dynamics 365), network and systems (Linux, Windows, DNS, firewalls), IBM i. Built for regulated sectors (banking, healthcare, defense): sector-compliance references checked against official sources, a confidentiality-guard hook, and experts that ask for the facts about your environment instead of guessing them. The agents answer in your language.

Full documentation, example outputs and roadmap: https://github.com/Crapule421/tiger-team

## Example prompts

1. The whole team on a cross-domain topic:
   `/tiger-team:mission Migrate the nightly accounting chain from VTOM to Control-M: IBM i extraction, CFT transfer, SAP IDocs. New firewall flows. Banking context (DORA). release`
2. One expert, one task:
   `/tiger-team:sql-release-review ./release/V42__add_index.sql`
3. Record your environment once, so experts stop asking the same questions:
   `/tiger-team:discover common scheduling dba`
4. A cross-domain question without a deliverable:
   `/tiger-team:mission How should we expose IBM i account balances through an internal REST API, in a banking context? quick`

## What is inside

| Folder | Content |
|---|---|
| `agents/` | the 9 experts (system prompt, tools, preloaded skills) |
| `skills/` | `mission` (orchestrator), `discover` (environment interview), 11 expert commands, 9 knowledge bases with `references/`, `sector-compliance`, `deliverables` templates, `discovery` protocol |
| `hooks/` | `confidentiality-guard.sh`: blocks secret files, documents carrying French classification markings, Bash commands targeting secret files, and prompts containing a marking. Reads only the tool call it checks; stores and sends nothing |

## Data handling

The plugin runs entirely inside Claude Code: no external service, no telemetry, no network call of its own. Agents have no web access (`WebFetch` and `WebSearch` are disallowed); only the DevSecOps, DBA and infra experts have Bash, for local read-only checks. Claude Code itself sends prompts and files read to Anthropic's API: never use the plugin with classified information, real patient or customer data, or live secrets.

## License

MIT. See the repository.
