---
name: deliverables
description: Fill-in templates for integration deliverables (DAT, DEX, release sheet, interface contract, flow matrix, RACI, RAID, UAT sign-off, environment sheet, risk briefing), the writing rules that apply to all of them and a PDF rendering kit.
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
| Record the organization's environment facts once, for every expert to read | `environment-sheet.md` | project-manager (via `/tiger-team:discover`) | all | Start of the engagement, kept current |
| Tell a steering committee what happens if a measure is not taken, and what to decide | `risk-briefing.md` | project-manager | devsecops, enterprise-architect, researcher for the facts | Framing, before the go decision |

## How to instantiate a template

1. Read the template at its full path (index below).
2. Write the instance in the user's project (ask where if no convention exists), e.g. `docs/<deliverable>/<ID>-<short-name>.md`; never modify the template itself.
3. Fill every `<placeholder>`; keep a `TBD (owner, date)` marker for anything unknown rather than inventing it.
4. Delete guidance lines in italics once a section is filled; delete optional sections that do not apply, stating "N/A: <reason>" where an auditor would expect them.
5. Cross-check consistency with related deliverables (same IDs, versions, hostnames, owners).

## Writing rules (all deliverables)

- **Document control first**: identification block, version table (version, date, author, changes), reviewers and approvers with dates. Versions: `0.x` drafts, `1.0` first approved, `1.x` minor updates, `2.0` structural change. Status: Draft / In review / Approved / Obsolete.
- **Audience**: state it at the top (architects, operators, business, auditors, homologation committee) and write for it: operators need commands and thresholds, sponsors need decisions and risks.
- **Traceability**: link each design element, test case and reservation to requirement IDs, ADRs, tickets or RAID items. Use stable IDs across deliverables — items: `REQ-`, `ADR-` (four digits, `ADR-0001`), `INT-` (interfaces), `FLW-` (flows), `JOB-`, `MON-` (monitoring checks), `KE-` (known errors), `RSK-`, `ASM-`, `ISS-`, `DEP-`, `TC-`, `DEF-`, `RES-` (reservations), `PRE-` / `GNG-` / `RB-` (release prerequisites, go/no-go checkpoints, rollback steps); documents: `DAT-`, `DEX-`, `FLM-` (flow matrix), `REL-` (release), `PVR-` (PV de recette), `RACI-`, `RAID-`.
- **No real data**: fictitious hostnames, documentation IP ranges (RFC 5737), placeholders for secrets, synthetic examples, generic role names instead of personal contact details. Apply the confidentiality rules of the `sector-compliance` skill; a deliverable describing a classified or Diffusion Restreinte system is written inside the protected environment, not here.
- **Classification label**: put the organization's document sensitivity label in the header (e.g. Internal, Confidential); deliverables describing production security (flow matrix, DAT security sections) are usually at least Confidential.
- **Precision**: dates in ISO 8601 (`2026-10-22`), times with time zone (`21:30 Europe/Paris`), volumes with units and period (`120 000 msg/day, peak 40 msg/s`), durations explicit (`RTO 4 h`).
- **Single source of truth**: reference other deliverables instead of copying them (the DAT links interface contracts and the flow matrix; the DEX links the DAT).
- **Decisions and evidence**: record who decided what and when; deliverables are audit evidence (DORA, ACPR, PCI DSS, HDS, homologation).
- **Language**: English headings; keep French terms in parentheses when they are the contractual or regulatory name (MEP, PV de recette, réserves).
- Each filled document stays reviewable: tables over prose, one fact per row, no marketing language.

## Writing style (documents sent or printed)

- **Headings name the content** ("Reference costs and sanctions", "Coûts et sanctions de référence"), never a slogan. No label or kicker above a heading; number chapters only when the text refers to them.
- **No stand-alone big numbers**: a figure sits in a table with its unit, year and source.
- **Plain sentences**: one idea per sentence, active voice, each idea said once. No em dashes, no "not X but Y" contrasts, no colon reveals, no rhetorical questions.
- **French deliverables**: French words where they exist (observation, blocage partiel, blocage complet, procédure d'exploitation, actions immédiates, demande entre experts, vérification des faits); keep product, protocol and attribute names as they are.
- **Notation** defined once at the start: [F] sourced fact, [I] inference or design choice, [AV] to verify (in English: [F], [I], [V]).
- **Author and method**: the author is the person the user names. State AI assistance in the method line and that human review is required before external distribution.
- **Organization branding** only on the user's request: colours and fonts from the organization's public charter or the user's instructions, its official logo unchanged (colours and proportions). Use colour for meaning (brand marks, critical status), not decoration.

## Rendering to PDF

For a document sent by mail or printed, write it as HTML with `scripts/print-base.css` (A4, cover, tables, status chips, notes, landscape pages for wide diagrams; brand colours and fonts are CSS variables at its top), then run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/deliverables/scripts/print-pdf.mjs" <document.html> <document.pdf> [--landscape] [--footer "<left text>"]
```

The script needs Node.js 22 or later and a Chromium-based browser (Edge or Chrome; set `BROWSER_PATH` if it is not found). It waits for web fonts, numbers the pages ("page n of N") and embeds fonts and vector graphics. Look at every page once: diagram text of at least 6.5 pt when printed (otherwise put the diagram on a landscape page), no table row alone on a page, no empty page; fix in one batch and render again.

## Template index

- `templates/dat.md` — Technical Architecture Document (Dossier d'Architecture Technique) — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/dat.md`
- `templates/dex.md` — Operations Manual (Dossier d'Exploitation): run book, monitoring, batch, backups, restart, contacts, escalation — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/dex.md`
- `templates/release-sheet.md` — Production release sheet (Fiche de mise en production, fiche MEP): timed run sheet, owners, go/no-go, rollback — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/release-sheet.md`
- `templates/interface-contract.md` — Interface contract (Contrat d'interface): parties, trigger, transport, format, mapping, volumetry, SLAs, errors and replay, security, monitoring, tests — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/interface-contract.md`
- `templates/flow-matrix.md` — Network flow matrix (Matrice des flux) with review checklist — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/flow-matrix.md`
- `templates/raci.md` — RACI matrix (Matrice RACI) — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/raci.md`
- `templates/raid.md` — RAID log (Registre des risques, hypothèses, problèmes et dépendances) — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/raid.md`
- `templates/uat-signoff.md` — UAT sign-off (Procès-verbal de recette): scope, campaign summary, defects, reservations, decision, signatures — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/uat-signoff.md`
- `templates/risk-briefing.md` — Executive risk briefing (Note de risques, support de COPIL): situation, documented cases, requirements, regulatory status, costs and sanctions, scenarios, target, path and effort, decisions, verification annex — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/risk-briefing.md`
- `templates/environment-sheet.md` — Environment sheet (Fiche d'environnement): facts about the organization's environment per domain, with sources and open points; lives in `docs/tiger-team/environment.md` — full path `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/environment-sheet.md`
