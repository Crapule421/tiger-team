# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-10-23

### Changed
- **Fact-check pass against official documentation.** Every knowledge base was reviewed against vendor and regulator sources (BMC, Broadcom, Absyss, IBM, SAP Help Portal, Oracle, Microsoft Learn, Sage, Axway, HashiCorp, GitLab, GitHub, Red Hat, SUSE, PostgreSQL, MariaDB, EUR-Lex, Légifrance, EBA, ECB, PCI SSC, ANSSI, SGDSN, ANS, CNIL, EDPB, EPC, SWIFT, The Open Group…). About 220 "verify" flags were resolved; around 180 remain where no official source settles the point. Each reference file now ends with a `## Sources` section listing the official pages actually consulted.
- Notable corrections: Control-M Automation API resources are `Resource:Pool` / `Resource:Lock` (Semaphore/Mutex deprecated), `If` object and `Event:Add` / `Event:Delete` actions, `Notify:*` names, event `Date` values; Dollar Universe engine names, `unienv` environment script, `UPT=` uproc types; VTOM command set, date-switch modes and latest-start behaviour; IBM i release lifecycle (7.4 end of standard support 30 Sep 2026), RPG free-form history, `**FREE`, file status codes; HDS référentiel v2.0 (transition completed 16 May 2026); DORA Level 2 acts and incident clocks; PCI DSS v4.0.1 requirement numbers; Instant Payments Regulation dates; SWIFT CBPR+ coexistence end (22 Nov 2025); AI Act dates after Regulation (EU) 2026/1744; EBA/GL/2026/09 third-party risk guidelines; ANSSI/DINUM homologation guide (2025); SecNumCloud 3.2 legal status; CCAG-TIC 2021 VA/VSR articles; TOGAF 10 / ArchiMate 3.2; MADR 4.0; Terraform 1.10 `use_lockfile`; SLE 16 SELinux default; CA/Browser Forum certificate validity schedule; Db2 REORG-pending rules; Oracle `IF [NOT] EXISTS` (23ai); Dynamics 365 integration APIs and limits; Oracle Fusion `ErpIntegrationService` operations; Sage X3 import/export and web services; French e-invoicing calendar (Sep 2026 / Sep 2027).
- `/tiger-team:mission`: new `quick` mode (one expert round, no handoff round, no coherence review), expected-cost notice, briefs written in the user's language with a length cap, default location for written deliverables.
- `project-manager` agent carries the orchestration procedure inline, so `claude --agent tiger-team:project-manager` works without reading the mission skill.
- `enterprise-architect` now preloads the `deliverables` skill.
- Command skills aligned: intake and confidentiality-gate structure shared by all 11 commands, interface IDs `INT-<nnn>`, mapping-table columns matching the interface-contract template, finding-to-risk scale mapping in `sql-release-review`.
- Deliverable templates: consistent IDs (`PRE-`, `GNG-`, `RB-`, `ADR-0001`…), release-sheet checkpoints `GNG-0` to `GNG-4` with an explicit point of no return.
- README redesigned: badges, Mermaid team diagram, modes table, collapsible sections, French section.

### Added
- Confidentiality guard also blocks `*.ppk`, `*.p8` and `.htpasswd`.
- `tests/confidentiality-guard.test.sh` (30 cases) and `tests/lint.sh` (manifests, names, preloaded skills, markings, line limits), run by GitHub Actions (`.github/workflows/ci.yml`).

## [1.0.0] - 2026-10-22

### Added
- Nine senior expert agents: project manager, enterprise architect, DevSecOps, DBA, job scheduling (VTOM, Dollar Universe, Control-M), integration (APIs and data flows), ERP, infrastructure (network, DNS, Linux, Windows), IBM i.
- `/tiger-team:mission` orchestrator: scoping, architecture framing, parallel expert round, handoff routing, coherence review and consolidated deliverable.
- Eleven expert commands: `scoping`, `release-plan`, `adr`, `security-review`, `sql-release-review`, `batch-review`, `scheduler-convert`, `interface-contract`, `erp-interface-review`, `flow-matrix`, `ibmi-review`.
- Knowledge bases for each expert, sector compliance references (banking, healthcare, defense) and deliverable templates (DAT, DEX, release sheet, interface contract, flow matrix, RACI, RAID, UAT sign-off).
- Confidentiality guard hook: blocks secret files, documents carrying French classification markings, and prompts containing such markings.
