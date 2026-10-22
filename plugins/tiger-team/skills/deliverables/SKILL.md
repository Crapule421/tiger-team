---
name: deliverables
description: Fill-in Markdown templates for integration project deliverables (DAT architecture document, DEX operations manual, production release sheet, interface contract, flow matrix, RACI, RAID log, UAT sign-off) and the writing rules that apply to all of them. Load when an agent must produce, update or review a project deliverable.
user-invocable: false
---

# Project deliverables

Templates follow French integration-project practice (DAT, DEX, fiche MEP, PV de recette) with English headings and the French name in parentheses. They are skeletons: headings, tables and short guidance in italics (`_..._`) to replace or delete.

## When to use which template

| Need | Template | Typical lead agent | Contributors | Phase |
|---|---|---|---|---|
| Describe the target technical solution and justify choices | `dat.md` | enterprise-architect | infra, dba, devsecops, integration, erp, ibmi | Design, updated until go-live |
| Hand over a system to operations | `dex.md` | infra-expert | scheduling, dba, integration, ibmi, erp | Build → before go-live |
| Plan and run a production deployment | `release-sheet.md` | project-manager | all technical agents involved | Each release |
| Specify one interface between two systems | `interface-contract.md` | integration-expert | erp, ibmi, dba, devsecops | Design, versioned per change |
| Request and document network flows | `flow-matrix.md` | infra-expert | devsecops, integration | Design → firewall requests |
| Clarify who does what | `raci.md` | project-manager | all | Framing, reviewed per phase |
| Track risks, assumptions, issues, dependencies | `raid.md` | project-manager | all | Whole project, reviewed weekly |
| Record acceptance of a delivery | `uat-signoff.md` | project-manager | business owner, testers | End of each acceptance campaign |

## How to instantiate a template

1. Read the template at its full path (index below).
2. Write the instance in the user's project (ask where if no convention exists), e.g. `docs/<deliverable>/<ID>-<short-name>.md`; never modify the template itself.
3. Fill every `<placeholder>`; keep a `TBD (owner, date)` marker for anything unknown rather than inventing it.
4. Delete guidance lines in italics once a section is filled; delete optional sections that do not apply, stating "N/A: <reason>" where an auditor would expect them.
5. Cross-check consistency with related deliverables (same IDs, versions, hostnames, owners).

## Writing rules (all deliverables)

- **Document control first**: identification block, version table (version, date, author, changes), reviewers and approvers with dates. Versions: `0.x` drafts, `1.0` first approved, `1.x` minor updates, `2.0` structural change. Status: Draft / In review / Approved / Obsolete.
- **Audience**: state it at the top (architects, operators, business, auditors, homologation committee) and write for it: operators need commands and thresholds, sponsors need decisions and risks.
- **Traceability**: link each design element, test case and reservation to requirement IDs, ADRs, tickets or RAID items. Use stable IDs across deliverables: `REQ-`, `ADR-`, `INT-` (interfaces), `FLW-` (flows), `JOB-`, `RSK-`, `ASM-`, `ISS-`, `DEP-`, `TC-`, `DEF-`, `RES-` (reservations).
- **No real data**: fictitious hostnames, documentation IP ranges (RFC 5737), placeholders for secrets, synthetic examples, generic role names instead of personal contact details. Apply the confidentiality rules of the `sector-compliance` skill; a deliverable describing a classified or Diffusion Restreinte system is written inside the protected environment, not here.
- **Classification label**: put the organization's document sensitivity label in the header (e.g. Internal, Confidential); deliverables describing production security (flow matrix, DAT security sections) are usually at least Confidential.
- **Precision**: dates in ISO 8601 (`2026-10-22`), times with time zone (`21:30 Europe/Paris`), volumes with units and period (`120 000 msg/day, peak 40 msg/s`), durations explicit (`RTO 4 h`).
- **Single source of truth**: reference other deliverables instead of copying them (the DAT links interface contracts and the flow matrix; the DEX links the DAT).
- **Decisions and evidence**: record who decided what and when; deliverables are audit evidence (DORA, ACPR, PCI DSS, HDS, homologation).
- **Language**: English headings; keep French terms in parentheses when they are the contractual or regulatory name (MEP, PV de recette, réserves).
- Each filled document stays reviewable: tables over prose, one fact per row, no marketing language.

## Template index

- `templates/dat.md` — Technical Architecture Document (Dossier d'Architecture Technique) — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/dat.md`
- `templates/dex.md` — Operations Manual (Dossier d'Exploitation): run book, monitoring, batch, backups, restart, contacts, escalation — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/dex.md`
- `templates/release-sheet.md` — Production release sheet (Fiche de mise en production, fiche MEP): timed run sheet, owners, go/no-go, rollback — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/release-sheet.md`
- `templates/interface-contract.md` — Interface contract (Contrat d'interface): parties, trigger, transport, format, mapping, volumetry, SLAs, errors and replay, security, monitoring, tests — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/interface-contract.md`
- `templates/flow-matrix.md` — Network flow matrix (Matrice des flux) with review checklist — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/flow-matrix.md`
- `templates/raci.md` — RACI matrix (Matrice RACI) — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/raci.md`
- `templates/raid.md` — RAID log (Registre des risques, hypothèses, problèmes et dépendances) — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/raid.md`
- `templates/uat-signoff.md` — UAT sign-off (Procès-verbal de recette): scope, campaign summary, defects, reservations, decision, signatures — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/uat-signoff.md`
