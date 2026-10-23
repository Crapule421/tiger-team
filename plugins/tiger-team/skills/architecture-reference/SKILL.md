---
name: architecture-reference
description: Enterprise architecture knowledge base - design authority role, architecture principles, target vs transition architectures, macro integration patterns, non-functional requirements (availability, RPO/RTO, performance, security, operability, reversibility), cloud strategy and sovereignty (SecNumCloud, reversibility), technical debt, DORA ICT risk from an architecture view, and a cross-expert coherence checklist. Load when designing or reviewing a target architecture, arbitrating structural options, or writing ADRs; references cover TOGAF/ArchiMate, French urbanisation du SI and ADR formats.
user-invocable: false
---

# Architecture Reference (Enterprise Architect / Design Authority)

For regulated EU/French contexts (banking, healthcare, defense). Regulatory details evolve: anything marked "verify" must be checked against the current official text before being used in a deliverable.

## References index
- `references/togaf-archimate.md` — read when structuring an architecture effort (ADM phases, deliverables, governance, compliance reviews) or modelling with ArchiMate (layers, elements, relationships, viewpoints). Full path `${CLAUDE_PLUGIN_ROOT}/skills/architecture-reference/references/togaf-archimate.md`
- `references/urbanisation.md` — read when producing or using French IS maps (zones/quartiers/îlots, cartographies), a schéma directeur, application portfolio assessment (TIME) or a rationalisation/decommissioning plan. Full path `${CLAUDE_PLUGIN_ROOT}/skills/architecture-reference/references/urbanisation.md`
- `references/adr.md` — read when writing or reviewing an Architecture Decision Record or a decision matrix (Nygard, MADR, Y-statements, weighted criteria, fictitious examples). Full path `${CLAUDE_PLUGIN_ROOT}/skills/architecture-reference/references/adr.md`

Related deliverable templates: `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/dat.md`, `interface-contract.md`, `flow-matrix.md`.
Regulatory detail (GDPR, DORA, NIS2, HDS, II 901, IGI 1300…) lives in the `sector-compliance` skill and its sector references (`${CLAUDE_PLUGIN_ROOT}/skills/sector-compliance/references/`); this skill covers the architecture implications only.

## 1. Role: design authority
**Owns**: architecture principles and standards; target architecture and roadmap; structural decisions (ADRs); coherence across domains and experts; dispensations (dérogations) with expiry; architecture compliance reviews; technical debt register at architecture level.
**Does not own**: security risk acceptance (business risk owner / homologation authority, advised by RSSI); personal data decisions (controller, advised by DPO); budget/schedule arbitration (COPIL); production changes (CAB).

**Review gates**
| Gate | When | Checks |
|---|---|---|
| G0 Scoping | Note de cadrage | Fit with target/roadmap, options identified, regulatory perimeter, sovereignty class of data |
| G1 Design | DAT / interface contracts draft | Principles compliance, NFRs quantified, integration pattern, data ownership, security architecture, reversibility |
| G2 Pre-build | Design frozen | ADRs accepted, dispensations signed, flow matrix complete, ops/DR design |
| G3 Pre-go-live | Before go/no-go | As-built vs DAT, debt incurred registered, DR tested, DORA register / dependency map updated |

Outcome of a review: compliant / compliant with reservations (actions + dates) / dispensation (risk owner + expiry) / non-compliant (blocking).

## 2. Architecture principles
Format (TOGAF style): **Name — Statement — Rationale — Implications**. Keep 10-15, each testable in a review. Default set for regulated integration contexts:

| # | Principle | Testable implication |
|---|---|---|
| P1 | Business continuity by design | Every critical function has stated RTO/RPO met by design and tested |
| P2 | Security and privacy by design and by default (GDPR Art. 25) | Data classified (DICT) before design; least privilege; encryption in transit and at rest |
| P3 | Single source of truth per data domain | Each data entity has one master system and a named owner; others hold governed copies |
| P4 | Loose coupling through managed interfaces | No direct access to another application's database; all exchanges via contracted APIs, messages or files |
| P5 | Reuse before buy before build | Existing shared platforms (MFT, API gateway, IAM, scheduling) used unless an ADR says otherwise |
| P6 | Standards and open formats | Open protocols/formats preferred; proprietary only with reversibility plan |
| P7 | Reversibility and exit | Every external service has an exit plan; data exportable in documented formats |
| P8 | Operability is a requirement | Monitoring, logs, scheduling, restart and DEX designed with the solution |
| P9 | Traceability and auditability | End-to-end correlation IDs; audit trails retained per legal requirements |
| P10 | Data residency and sovereignty by classification | Hosting choice derived from data class (see §6) |
| P11 | Simplicity and rationalisation | New component only if no existing one fits; decommissioning planned with every replacement |
| P12 | Automate the delivery chain | Infrastructure and deployments as code, reproducible environments |

## 3. Target vs transition architectures
- **Baseline** (as-is), **Target** (to-be at horizon, typically 3-5 years), **Transition architectures** (plateaus: stable, operable intermediate states delivering value), **Gap analysis** (what is added, removed, changed), **Roadmap** (work packages, dependencies, decommissioning dates).
- Each transition must be operable on its own (supported, monitored, DR-covered, documented) — the project may stop there.
- Coexistence bridges (temporary sync, dual-write avoidance, anti-corruption layers) are first-class components: owner, cost, sunset date, debt entry.
- "Temporary" without a sunset date becomes permanent: refuse it at G1.
- Prefer incremental migration (strangler fig: route functionality progressively to the new system behind a façade) over big-bang replacement when the legacy is large and poorly documented.

## 4. Integration architecture (macro level)
Detailed design belongs to integration-expert; the architect sets the pattern and the rules.

| Pattern | Fits | Avoid when | Watch-outs |
|---|---|---|---|
| Point-to-point | ≤ few stable flows, tactical | Many consumers, frequent change | Spaghetti (n² links), no central monitoring |
| Hub & spoke / EAI / ESB | Many heterogeneous systems, transformations, central governance | Hub becomes bottleneck/monolith of business logic | Keep business logic out of the bus |
| File transfer via MFT | Batch, high volume, partner exchanges, legacy (very common in banking/IBM i) | Real-time needs | Integrity checks, naming, cut-off times, re-send, encryption, non-repudiation |
| API-led (system / process / experience layers) | Reusable services, digital channels, partner APIs | Bulk data movement | API management, versioning, quotas, OAuth2/mTLS |
| Event-driven (pub/sub, event streaming, CDC) | Decoupled reactions, real-time propagation, many consumers | Strong transactional consistency across systems required | Ordering, idempotency, schema evolution, replay, event ownership |
| Data platform (DWH, lake, lakehouse, data mesh) | Analytics, regulatory reporting, ML | Operational transactional integration | Lineage, quality, retention, sensitive data segregation |
| MDM / référentiels | Shared master data (customer, product, organisation, patient identity) | Data with a single natural owner | Governance and stewardship effort is the real cost |

**Rules of thumb**: synchronous calls only when the caller truly needs the answer now; async by default between domains; design every flow for failure (retry with backoff, dead-letter, replay, idempotent consumers); use the outbox pattern rather than dual writes; canonical data models only within a bounded scope (enterprise-wide canonical models rarely survive); version every contract; one correlation ID end-to-end.

## 5. Non-functional requirements
Quantify every NFR; "highly available" is not a requirement.

| Category | Metrics / questions | Pitfalls |
|---|---|---|
| Availability | % over a period, service hours, planned downtime allowed | Ignoring dependency chain; measuring infra not service |
| Continuity | RTO / RPO (DMIA / PDMA) per business function, MTPD | RPO 0 promised with async replication; batch restart ignored |
| Performance | Throughput, p95/p99 latency, batch window, peak factor, growth | Testing average not peak; month-end peaks forgotten |
| Scalability | Volumes at horizon, elasticity | Licence models that scale cost non-linearly |
| Security | DICT rating, IAM, encryption, logging, segregation | Security bolted on after design |
| Operability | Monitoring, alerting, logs, restart, scheduling, automation | DEX written after go-live |
| Observability | Traces, metrics, logs, correlation, business KPIs | No end-to-end view across middleware |
| Reversibility | Exit plan, export formats, time and cost to exit | Only contractual, never tested |
| Interoperability | Standards (e.g., ISO 20022 in payments, HL7 FHIR in health — verify sector mandates) | Local dialects of standards |
| Compliance / residency | Data location, retention, legal holds, audit | Backups and logs stored outside the agreed zone |
| Maintainability | Upgrade cadence, vendor support dates | End of support hitting mid-project |
| Sustainability | Resource efficiency (RGESN eco-design guidelines in France — verify status) | Oversized non-production environments |

**Availability cheat sheet** (per year): 99 % ≈ 3.65 days; 99.5 % ≈ 1.83 days; 99.9 % ≈ 8.76 h; 99.95 % ≈ 4.38 h; 99.99 % ≈ 52.6 min; 99.999 % ≈ 5.3 min. Serial chain: A = A1 × A2 × … ; redundant pair: A = 1 − (1 − A1)(1 − A2) (assumes independent failures — rarely fully true).
**RPO/RTO coherence**: RPO is bounded by replication mode and backup frequency; RTO includes detection, decision, failover, data repair, batch catch-up and partner re-synchronisation — not only technical switch time.

## 6. Cloud strategy & sovereignty
**Classify first, then host**: the data class drives the hosting option.

| Data / system class | Typical hosting options (verify against current rules) |
|---|---|
| Public / internal, non-sensitive | Public cloud acceptable with standard controls |
| Personal data (GDPR) | EU hosting preferred; transfers outside EEA need Chapter V basis and transfer impact assessment |
| Health personal data (France) | HDS-certified hosting provider required (Code de la santé publique, Art. L.1111-8); recent HDS referential adds data-location requirements in the EEA — verify current version and transition dates |
| Data of particular sensitivity (données d'une sensibilité particulière) of State services, State operators and listed GIP | SecNumCloud-qualified offer, or an EU/EEA certification ANSSI recognises as equivalent: SREN law Art. 31 (2024), décret n° 2026-272 (14 April 2026), arrêté of 12 August 2026; the "cloud au centre" doctrine (2021, updated 2023) extends the expectation to other State IS — exemption regime in those texts |
| Diffusion Restreinte (DR) | Systems accredited per II 901; specific hosting constraints — verify |
| Classified (Secret / Très Secret, IGI 1300) | Dedicated accredited infrastructure; public cloud generally excluded |
| Banking critical or important functions | Allowed with DORA third-party requirements, outsourcing rules (EBA guidelines) and supervisor notification where required — verify |

**SecNumCloud**: ANSSI qualification of cloud service providers against the référentiel d'exigences v3.2 (8 March 2022; the version approved by the arrêté of 12 August 2026). Beyond technical security requirements, its §19.6 protects against non-EU extraterritorial law: provider established in the EU, non-EU shareholders capped at 24 % individually and 39 % collectively, data stored and the service administered and supervised from the EU. "Sovereign" marketing labels are not qualification: ask for the qualification certificate and its exact service scope.
**Extraterritorial exposure**: assess non-EU legal access risk (e.g., US CLOUD Act, FISA s.702) against data class; encryption with customer-held keys (HSM/BYOK/HYOK) reduces but does not always remove it.
**Reversibility clauses** (contract + architecture): exit plan and assistance period; data and metadata export in documented open formats at no prohibitive cost; deletion certificate; documentation and configuration export; continuity of service during exit; notice periods; sub-processor list; audit rights. EU Data Act (Regulation (EU) 2023/2854, Chapter VI) applies since 12 September 2025: providers must support switching and may bill only their actual switching/egress costs until 12 January 2027, none after that date.
**Architecture enablers**: portable workloads (containers, IaC), standard databases or documented migration paths, avoid deep coupling to proprietary PaaS for core functions unless an ADR accepts it, periodic exit test (at least export + restore elsewhere).
**Cloud migration options** (6R/7R): retire, retain, rehost, relocate, replatform, refactor, repurchase — decide per application from portfolio assessment (see urbanisation reference).

## 7. Technical debt management
- Types: architecture (wrong pattern, coupling), obsolescence (end-of-support versions), code, data (quality, duplicates), operational (manual steps), documentation, security (deferred fixes).
- Register: item, type, location, cause (deliberate via ADR / accidental), interest (cost or risk per period), principal (cost to fix), owner, deadline, link to ADR/dispensation.
- Obsolescence calendar: vendor end-of-support dates for OS, DB, middleware, runtimes, ERP versions, IBM i releases; flag anything ending within 24 months.
- Funding: reserve explicit capacity (commonly cited 15-20 % of delivery capacity — organisation-specific); debt from a project's dispensation is costed in that project.
- Debt affecting critical functions is an ICT risk: report it in the risk framework, not only in IT backlogs.

## 8. DORA ICT risk from an architecture perspective
Regulation (EU) 2022/2554, applicable since 17 January 2025, completed by RTS/ITS. Article numbers below are indicative: confirm them on EUR-Lex before citing them in a deliverable.

| DORA topic | Architecture contribution |
|---|---|
| ICT risk management framework (Art. 6) | Architecture principles, standards and target architecture as documented controls |
| Identification (Art. 8) | Inventory of ICT assets and information assets; mapping of business functions, especially critical or important functions (CIF), to applications, infrastructure, flows and third parties; dependency maps kept up to date |
| Protection & prevention (Art. 9) | Segmentation, IAM, encryption, change management, secure configuration |
| Detection (Art. 10) | Observability and anomaly detection designed in |
| Response & recovery (Art. 11) | Continuity design per CIF, RTO/RPO, degraded modes |
| Backup, restoration (Art. 12) | Backup segregation, restore tests, secondary processing capability where required |
| Incident classification and reporting (Art. 17-19) | Data needed for classification (clients affected, duration, data loss) must be observable |
| Resilience testing (Art. 24-27) | Testable architecture; TLPT for designated entities (Art. 26) |
| ICT third-party risk (Art. 28-30) | Register of information; concentration risk; exit strategies for services supporting CIF; key contractual provisions |

Rule: any architecture decision touching a CIF must state its DORA impact (dependencies, third party, exit, RTO/RPO) in the ADR. For non-financial essential/important entities, the equivalent driver is NIS2 (Directive (EU) 2022/2555; French transposition status — verify); for vital operators, sector LPM/OIV rules — verify.

## 9. Cross-expert coherence review checklist
Run before G1/G2 and on any consolidated deliverable produced by several experts.
- [ ] Same NFR figures everywhere (DAT, infra sizing, DB replication, scheduling windows, contracts/SLAs).
- [ ] RPO consistent with DB replication mode (dba-expert), backups (infra-expert), and batch restart points (scheduling-expert).
- [ ] RTO includes failover, data repair, batch catch-up, partner resynchronisation.
- [ ] Flow matrix = interface contracts = firewall requests = middleware configuration (integration-expert, infra-expert).
- [ ] Each data entity has one master; ERP vs legacy vs MDM ownership explicit (erp-expert, ibmi-expert).
- [ ] Character sets and formats aligned end-to-end (CCSID/EBCDIC ↔ UTF-8, dates, decimals, time zones).
- [ ] Identity and secrets: service accounts, certificates (expiry owners), vault usage, rotation (devsecops-expert).
- [ ] Batch dependencies cross-system and cut-off times consistent with online availability and partner calendars (scheduling-expert).
- [ ] Capacity: volumes and growth used by infra, DB and middleware sizing are the same numbers.
- [ ] Monitoring: every flow and job has an alert, an owner and a run-book entry (DEX).
- [ ] Environment parity: pre-production gaps listed with residual risk.
- [ ] Data classification and hosting location consistent with §6; non-prod data anonymised.
- [ ] Licences: models compatible with the topology (cores, HA/DR nodes, cloud).
- [ ] Reversibility and exit plan exist for each external service; DORA register impact stated for CIF.
- [ ] Every deviation from principles has an ADR or a signed dispensation with expiry.
- [ ] Decommissioning of replaced components planned (data archive, interfaces, licences).

## 10. Review output format (default)
Findings table: `# | area | finding | severity (Critical/High/Medium/Low) | principle/NFR breached | recommendation | owner`. Then decision: compliant / with reservations / dispensation / non-compliant, followed by the team-standard Risks, Handoffs, Open questions, Assumptions sections.

## Sources
- European Commission, "Data Act explained" (application 12 Sep 2025, switching charges end 12 Jan 2027): https://digital-strategy.ec.europa.eu/en/factpages/data-act-explained
- European Commission, Data Act policy page (entry into force, application): https://digital-strategy.ec.europa.eu/en/policies/data-act
- Arrêté du 12 août 2026 approving SecNumCloud v3.2 (Légifrance): https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054678082
- ANSSI, SecNumCloud référentiel d'exigences v3.2 du 8 mars 2022 (PDF, §19.6): https://cyber.gouv.fr/sites/default/files/document/secnumcloud-referentiel-exigences-v3.2.pdf
- Framework and modelling sources: `references/togaf-archimate.md`; ADR sources: `references/adr.md`.
