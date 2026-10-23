# Examples

Real, unedited outputs of Tiger Team on fictitious cases. Each file starts with the exact command, the experts involved, the plugin version and the measured cost. The prompts were written in French, so the team answered in French: the experts answer in the language you use.

| File | What it shows | Cost |
|---|---|---|
| [mission-release-vtom-to-control-m.md](mission-release-vtom-to-control-m.md) | A full mission in `release` mode: architect framing, five experts in parallel, a handoff round, a coherence review, then a NO-GO verdict with 11 blocking criteria, a 9-decision arbitration log, a merged risk matrix and a timed release sheet with rollback | USD 4.87, 17 min |
| [mission-quick-ibmi-rest-api.md](mission-quick-ibmi-rest-api.md) | A `quick` mission with three experts: exposing IBM i account balances through an internal REST API in a banking context. Shows an arbitration (JDBC vs IWS), a version caution, and open questions that each come with the command to run | USD 3.43 |
| [scheduler-convert-vtom-to-control-m.md](scheduler-convert-vtom-to-control-m.md) | A direct command: VTOM to Control-M conversion with a valid Automation API JSON, the points that do not convert 1:1, and the checks to run for the facts that were not given | USD 1.73, 4 min |

How to read them: the **Risks**, **Handoffs**, **Open questions** and **Assumptions** sections are the team's standard. Handoffs are what the lead routes between experts; open questions are what you would answer to turn assumptions into facts, ideally once, in `docs/tiger-team/environment.md` with `/tiger-team:discover`.

All hosts, systems, dates and figures are fictitious or were given in the prompt. Nothing here comes from a real organization.
