---
name: pm-playbook
description: Integration project management for French-style IT projects - scoping, RACI, RAID, governance, environments, test strategy (recette, VA/VSR), cut-over and rollback, go/no-go, hypercare, DEX handover, arbitration, estimation.
user-invocable: false
---

# Integration Project Management Playbook

Senior PM reference for technical and application integration projects in regulated French/EU contexts (banking, healthcare, defense). Rules of thumb are starting points: calibrate them with the organisation's own history before committing numbers.

## Templates (reference, do not re-invent)
Fill-in templates live in `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/` (index, ID conventions and writing rules in `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/SKILL.md`): `raci.md`, `raid.md`, `release-sheet.md` (fiche MEP and run sheet), `uat-signoff.md` (PV de recette with réserves), `dat.md`, `dex.md`, `interface-contract.md`, `flow-matrix.md`. Read the one you need; if it is missing, follow the structure given here.

## 1. Vocabulary (FR → EN)
| FR | EN / meaning |
|---|---|
| MOA / MOE / AMOA | Business owner side / delivery side / business-side assistance |
| Note de cadrage | Scoping note (project charter) |
| Expression de besoins / cahier des charges | Requirements statement / specification (often contractual) |
| SFG / SFD | General / detailed functional specifications |
| PAQ / PAS | Quality assurance plan / security assurance plan |
| Recette, PV de recette, réserve | Acceptance testing, acceptance report, reservation (open defect accepted under conditions) |
| VA (VABF) / VSR | Acceptance stages of the public-procurement CCAG-TIC (2021, Art. 32): vérification d'aptitude (usually called VABF) before go-live, then vérification de service régulier in production (30 days by default) |
| MEP / MES | Production deployment / service opening to users |
| Bascule / retour arrière / point de non-retour | Cut-over / rollback / point of no return (PNR) |
| COPIL / COPROJ | Steering committee / project committee |
| Homologation de sécurité | Security accreditation: formal acceptance of residual risk by an authority |
| AIPD | DPIA (GDPR Art. 35) |
| PCA / PRA | Business continuity plan / disaster recovery plan |
| DMIA / PDMA | Max tolerable downtime (≈ RTO) / max tolerable data loss (≈ RPO) |
| Gel des MEP | Change freeze |
| TMA, Build / Run | Outsourced application maintenance, project delivery / operations |
| Ouverture de flux | Firewall / network flow opening request |
| DICT (or DICP) | Availability, Integrity, Confidentiality, Traceability (Proof) security needs rating |

## 2. Scoping (note de cadrage)
**Content checklist**
- Context and triggers (regulation, obsolescence, merger, new product, cost); why now; cost of doing nothing.
- Objectives: measurable (SMART), linked to business KPIs; explicit non-objectives.
- Scope IN / OUT: processes, entities/sites, systems, flows, data domains, environments, countries. List what is explicitly OUT (it prevents half of later disputes).
- Stakeholders and decision rights (see §3); sponsor named.
- Constraints: regulatory (GDPR, DORA, NIS2, HDS, II 901 / IGI 1300, banking secrecy — details in the `sector-compliance` skill), contractual, calendar (freezes, regulatory deadlines), technical (legacy, licences), budget, staffing.
- Integration inventory: systems, flows (count by complexity), protocols, formats/encodings, volumes, frequencies, latency needs, data owners, master data (référentiels).
- High-level plan and milestones (jalons); long-lead items (§5).
- Budget / effort drivers and confidence range; funding (CAPEX/OPEX).
- Governance (§6), deliverables list, acceptance approach, initial RAID.
- Run target: who operates, support levels N1/N2/N3, hours of service, SLAs.

**Scoping exit criteria**: sponsor sign-off; scope IN/OUT agreed; top 10 risks with owners; architecture options identified (not chosen); budget envelope with range; COPIL #1 date set.

**Pitfalls**: scoping written by IT alone; "interfaces TBD"; no data owner named; ignoring ops and security until build; single-point estimate; regulatory deadline not identified as hard constraint.

## 3. Stakeholders & RACI
Typical cast: sponsor; business owner (MOA) and key users; product owner; integrator/MOE; software vendors (éditeurs); design authority (enterprise architect); CISO (RSSI); DPO; risk/compliance (banking: second line, ICT risk function under DORA); operations (exploitation/production), scheduling team (ordonnancement), DBAs, network/security (firewall), service desk N1/N2/N3; external partners (banks, insurers, health authorities, suppliers); purchasing/legal; HR and staff representatives (CSE consultation may be required when work organisation or monitoring changes — verify with HR/legal).

**RACI rules**: exactly one A per activity; at least one R; A and R may be the same person; too many C slows decisions; I is not a substitute for approval. Use `raci.md`.

**Typical RACI points that are usually forgotten**
| Activity | Typical A | Typical R |
|---|---|---|
| Interface contract per flow | Owner of the producing system | Integration lead |
| Flow openings (firewall) | Infra/network manager | Project infra lead |
| Test data anonymisation | Data owner (DPO consulted) | DBA / test lead |
| Security risk acceptance | Business risk owner / homologation authority | RSSI prepares |
| DEX validation | Head of operations | Project + ops |
| Go/no-go decision | Business owner or sponsor | PM prepares |
| Rollback decision during cut-over | Cut-over manager (pre-agreed criteria) | Technical leads |
| Hypercare exit | Business owner + head of operations | PM |

## 4. RAID log
Use `raid.md`. Definitions: **Risk** = uncertain future event; **Assumption** = taken as true, to be validated by a date; **Issue** = materialised problem; **Dependency** = deliverable/decision from outside the team.

**Scoring** (probability 1-4 × impact 1-4): 12-16 Critical, 8-9 High, 4-6 Medium, 1-3 Low. Impact on the worst of: schedule, cost, quality, compliance, production stability, safety (healthcare/defense).

**Rules**: every item has owner, due date, status; every risk has a response (avoid / reduce / transfer / accept) and a trigger; accepted risks above Medium are accepted by the accountable person in writing; assumptions not validated by their date become risks; dependencies carry the external party's committed date and a fallback. Review weekly in COPROJ; top risks go to COPIL.

**Seed risks for integration projects**: interface specs not frozen; source data quality; non-representative pre-production; late flow openings/certificates; partner test windows unavailable; batch window overrun; encoding/format mismatches (EBCDIC/UTF-8, dates, decimals); key-person dependency (legacy skills); vendor delivery slip; DPIA/homologation late; change freeze collision; rollback impossible after partner exchange.

## 5. Planning & critical path
**Typical phases**: cadrage → design (SFG/SFD, interface contracts, DAT, flow matrix) → build & unit tests → integration testing → recette/UAT → performance, security, operability tests → pre-production dress rehearsals → go/no-go → MEP → hypercare → VSR / closure.

**Long-lead items** (indicative, organisation-dependent — calibrate):
| Item | Typical lead time |
|---|---|
| Firewall flow openings | 1-4 weeks per batch, more if cross-entity or partner |
| Certificates (PKI internal/external) | 1-3 weeks |
| Infra provisioning on-prem | 4-12 weeks (hardware: more) |
| Licences / procurement | 4-12 weeks; public procurement longer |
| Partner test slots (banks, health networks, suppliers) | often fixed calendars, book months ahead |
| Security accreditation (homologation), pentest | 4-12 weeks incl. remediation |
| DPIA, CSE consultation | weeks to months |
| Data migration cycles | ≥ 3 mock loads + 2 dress rehearsals |

**Techniques**: critical path method (zero-float chain); PERT estimate (O + 4M + P)/6 for uncertain tasks; explicit buffers at the end of chains rather than padded tasks; track float consumption weekly. Dependency types FS/SS/FF/SF; integration projects are dominated by external FS dependencies.

**Calendar constraints**: banking month/quarter/year-end closings and regulatory reporting dates; payroll days; retail peaks; healthcare staffing and epidemic peaks; defense operational calendars; French holidays (May bridges, August, year-end). Plan MEP away from freezes; plan hypercare to include one full business cycle (e.g., a month-end close for financial flows).

**Key milestones**: scoping validated; design frozen (interface contracts signed); environments ready; build complete; integration tests exited; UAT signed; operability accepted (DEX validated); go/no-go; MEP; hypercare exit; VSR / final acceptance.

## 6. Governance
| Body | Cadence | Chair / members | Purpose / outputs |
|---|---|---|---|
| COPIL | Monthly or per milestone | Sponsor; business, IT, security, ops heads | Arbitration of scope/budget/schedule beyond tolerance, go/no-go of phases, decision log |
| COPROJ | Weekly / bi-weekly | PM; MOA, MOE, vendor and expert leads | Progress, RAID review, plan, escalations to COPIL |
| Comité de suivi | Weekly / monthly | PM and vendor/integrator | Contract follow-up, deliverables, SLAs, invoices |
| Design authority (comité d'architecture) | On demand / bi-weekly | Enterprise architect | Architecture decisions (ADRs), dispensations |
| CAB | Per change policy | Change manager | Production change approval |
| Security / homologation committee | Per milestone | RSSI, homologation authority | Risk analysis, accreditation decision |
| Go/no-go committee | Before MEP | Business owner / sponsor; ops; RSSI | Go, conditional go, no-go |

**Tolerances** (define in the note de cadrage): e.g., milestone slip > 2 weeks, budget overrun > 5-10 %, any scope change affecting a regulatory commitment → escalate to COPIL.
**Reporting**: weather (météo) per stream with factual justification, milestone trend, top risks, decisions needed. Fight "watermelon" reporting (green outside, red inside): each green must be backed by evidence (test results, signed deliverables).

## 7. Environment strategy
| Env | Purpose | Data | Representativeness |
|---|---|---|---|
| Dev | Build, unit tests | Synthetic | Low |
| Integration (intégration/assemblage) | Technical integration across components, contract tests | Synthetic + partner stubs | Medium |
| Recette / qualification | Functional tests, UAT | Anonymised or synthetic, business-realistic | Functional parity |
| Pre-production (préprod) | Dress rehearsals, performance, operability, final validation | Anonymised production-like volumes | Iso-production: versions, topology, security config, flows, scheduling plan |
| Production | Run | Real | — |
| Optional | Performance, training (formation), DR, sandbox | | |

**Rules**
- Never copy production personal, health or banking-secrecy data to non-production without anonymisation (or justified pseudonymisation with controls) and DPO validation.
- Maintain an endpoint/configuration matrix per environment (URLs, queues, file paths, certificates, credentials stored in a vault, never in documents).
- Environment booking calendar and refresh policy; freeze pre-production before dress rehearsals.
- Partner connectivity: real partner test platforms where they exist, stubs otherwise; record which tests ran against stubs (residual risk).
- Pre-production gaps versus production must be listed in the RAID log.

## 8. Test strategy
| Level | Owner | Env | Exit criteria (typical) |
|---|---|---|---|
| Unit | Developers | Dev | Coverage target met, no blocking defect |
| Integration (technical, inter-application, contract) | Integrator | Integration | All flows exercised incl. error paths |
| System / end-to-end | Test lead | Recette | Business scenarios run across all systems |
| Non-regression | Test lead | Recette / préprod | Regression pack green, automated where possible |
| Data migration | Data lead + business | Recette / préprod | Reconciliation (counts, sums, samples) signed by data owners |
| Performance (load, stress, endurance, batch volume) | Perf lead | Préprod / perf | Targets met with production-like volumes; batch fits window with margin |
| Security (SAST/DAST, pentest, config review) | DevSecOps / RSSI | Préprod | No open critical/high, or formally accepted |
| Operability (exploitabilité) | Ops | Préprod | Start/stop, monitoring alerts, logs, backup/restore, scheduling, restart after failure validated |
| Resilience / DR | Infra + ops | Préprod / DR | Failover and restore within RTO/RPO |
| UAT (recette utilisateur) | Business key users | Recette | PV de recette signed, reservations listed |
| VA (VABF) / VSR | Customer vs supplier (contract) | Préprod or prod / prod | Per contract; CCAG-TIC 2021 defaults (arrêté du 30 mars 2021, last amended 29 Dec 2022): VA decided within 30 days (Art. 33.2.1); VSR observed over 30 days, unavailability ≤ 2 % of business hours (Art. 32.4); decision within 7 days — admission, ajournement, réfaction or rejet (Art. 33.2.2). The CCAP may override |

**Integration-specific test cases**: rejects and error queues; replay/resend; duplicates and idempotency; out-of-order messages; partial files; empty files; maximum volume; cut-off times; time zones and DST change; encoding and special characters; decimal separators and rounding; end of month/year; partner unavailable; certificate expiry; restart of interrupted batch.

**Defect severity** (as in `uat-signoff.md`): blocking (no workaround, prevents go-live), major (significant impact, workaround exists), minor, cosmetic. Default go-live rule: 0 blocking; majors only with documented workaround accepted by business and a fix date; minors and cosmetics tracked.
**Traceability**: requirement → test case → result → defect; mandatory for regulated contexts and audits.

## 9. Cut-over (bascule) & rollback
| Strategy | When | Main risk |
|---|---|---|
| Big bang | Tightly coupled systems, short history migration, strong rehearsal | Large blast radius, long window |
| Phased (by site, entity, flow, product) | Separable perimeters | Temporary coexistence bridges to build and run |
| Parallel run | Critical calculations (payroll, accounting) | Double workload, reconciliation effort |
| Pilot then roll-out | Many sites/users | Pilot not representative |
| Blue/green, canary, feature toggles | Stateless or well-versioned apps | Data schema compatibility |

**Cut-over plan content**: freeze of source systems and changes; final extraction/migration; deployment; configuration and flow switching; scheduling plan activation; reconciliation; smoke and business verification tests; opening to users and partners; communication. Use `release-sheet.md`.

**Dress rehearsals (répétitions)**: at least one full timed rehearsal in pre-production with production-like volumes, ideally two; the second must fit the window with ≥ 20-30 % margin. Every deviation feeds the run sheet.

**Point of no return**: the step after which rollback costs more (or is riskier) than fixing forward — typically when new transactions are created in the target, partners have consumed data, or the source has been altered. State it explicitly with its clock time and decision owner. Before PNR: rollback on pre-agreed triggers without debate. After PNR: fix-forward with a degraded-mode plan.

**Rollback types**: restore backups / snapshots (validate restore time!); reverse routing to the old system; feature toggle off; reverse data migration (rarely realistic — rehearse or do not count on it). Rollback must be rehearsed and timed like the forward path.

**Cut-over communication**: pre-announcement to users/partners (with unavailability window), start notice, each go/no-go checkpoint outcome, end-of-intervention notice, incident/rollback notice. Pre-write messages; name a single communication owner; keep a timestamped log (main courante) of decisions and events.

## 10. Go/no-go criteria
| Domain | Criteria |
|---|---|
| Functional | UAT signed; 0 blocking; majors with accepted workaround |
| Technical | Integration, performance, resilience tests passed; production configuration verified; flows and certificates tested in production |
| Data | Last rehearsal reconciliation signed; migration duration within window |
| Operations | DEX validated; monitoring and alerting live; backups configured and tested; scheduling plan loaded; support staffed |
| Security / compliance | Pentest findings closed or accepted; homologation decision (if required); DPIA done; DORA register / contracts updated where relevant |
| Organisation | Users trained; communication sent; business available for verification; hypercare roster |
| External | Partners ready and informed; vendor on-call confirmed |
| Fallback | Rollback plan rehearsed; PNR and triggers agreed |

Decision levels: **Go**, **Conditional go** (only for conditions that can be met before the PNR, with owner and deadline), **No-go** (with new date and recovery plan). Checkpoints: D-7/D-5 readiness, D-1 final, H0 start, pre-PNR checkpoint, post-verification opening.

## 11. Hypercare
- Duration: typically 2-6 weeks; must include at least one full business cycle (month-end, payroll, first regulatory report).
- War room (physical or virtual), daily triage, extended support hours, fast-track change process for fixes, dedicated vendor/integrator capacity.
- KPIs: incidents by priority, backlog trend, flow error/reject rates, batch completion vs window, performance, user tickets, data reconciliation.
- **Exit criteria**: no open P1/P2; incident rate back to agreed baseline; all flows and batches stable over N cycles; known errors documented in DEX/known-error base; knowledge transfer done; support model operational; signed by business owner and head of operations.

## 12. Change management (conduite du changement)
- Impact analysis by population (process, tool, role, volume of change); change readiness assessment.
- Communication plan (who, what, when, channel); key users / champions network; training before go-live, just-in-time; support materials (quick guides).
- Staff representatives (CSE) where work organisation changes — consult early (verify obligations with HR/legal).
- Adoption KPIs (usage, ticket themes, process cycle times) followed during hypercare.
- Do not confuse with IT change management (ITIL change, CAB): standard / normal / emergency changes, change freeze rules — both are needed.

## 13. Coordination with operations (DEX handover)
- Involve operations from design (NFRs, monitoring, scheduling, backup); they are a stakeholder, not a recipient.
- DEX (`dex.md`) drafted during build, validated before go/no-go: architecture summary, flows (`flow-matrix.md`), start/stop procedures, scheduling plan and restart rules, monitoring and alert thresholds, logs, backup/restore, purge/archiving, incident procedures, contacts and escalation, known errors, DR procedure.
- Run book (consignes d'exploitation): step-by-step operator actions per alert / job failure.
- Operability acceptance (recette d'exploitabilité) in pre-production with operators executing the procedures themselves.
- Support model: N1 service desk, N2 application support / ops, N3 TMA / vendor; SLAs and OLAs between levels; on-call.
- Formal handover (prise en charge) signed at hypercare exit; CMDB updated.

## 14. Arbitration between experts
Experts legitimately disagree (security vs delay, ideal architecture vs legacy reality, performance vs cost). Process:
1. State the conflict in one sentence; list options (always include "defer" and "minimal compliant option").
2. Separate facts from opinions: ask each expert for evidence, assumptions, and what would change their view.
3. Apply knock-out criteria first: legal/regulatory obligations, security policy (PSSI), contractual commitments, patient/operational safety, classification rules. An option breaching one is excluded unless a formal dispensation (dérogation) is signed by the competent authority.
4. Score remaining options: residual risk (after mitigation), cost (TCO 3-5 years), delay (critical path impact), reversibility, operability, strategic fit. Use a weighted matrix (`${CLAUDE_PLUGIN_ROOT}/skills/architecture-reference/references/adr.md`).
5. Decide at the right level; record in the decision log or an ADR; update RAID (accepted risks, debt with sunset date).

**Default priority order** (same as the `mission` skill, unless the user sets another): regulatory compliance (incl. hard regulatory deadlines) > security > data integrity > service availability / production stability > delay > cost > elegance.

| Decision | Decides | Advises |
|---|---|---|
| Structural architecture choice | Design authority (enterprise-architect) | Domain experts |
| Security residual risk | Business risk owner / homologation authority | RSSI, devsecops-expert |
| Personal data processing | Data controller | DPO (advisory) |
| Scope/budget/schedule beyond tolerance | COPIL | PM |
| Within tolerance | PM / COPROJ | Experts |
| Production change | CAB | Ops |
| Rollback before PNR | Cut-over manager per agreed triggers | Tech leads |

Patterns: "compliant minimum now, target later" with ADR + debt register + dated sunset; time-box the debate; avoid split-the-difference options that satisfy nobody's constraint; disagree-and-commit once recorded.

## 15. Estimation heuristics (calibrate before use)
| Item | Rule of thumb |
|---|---|
| Interface, simple (transfer, no transformation) | 2-5 person-days build + unit test |
| Interface, medium (mapping, validation, error handling) | 5-15 person-days |
| Interface, complex (orchestration, multi-system, transactional) | 15-40 person-days |
| Integration testing | 30-50 % of build effort per interface |
| All test activities | 30-50 % of build in integration projects |
| Project management | 10-15 % of total effort |
| Architecture / design authority | 5-10 % |
| Data migration | Underestimated by default: plan ≥ 3 mock loads; business data cleansing is extra effort |
| Contingency at scoping | 15-25 %, more with legacy unknowns or new vendors |
| Estimate accuracy at scoping | Present a range (e.g., -30 % / +50 %), never a single number |
| Hypercare | 2-6 weeks, ≥ 1 business cycle |

Method: bottom-up from the interface inventory (count × complexity) cross-checked top-down by analogy; make drivers explicit (flows, systems, environments, partners, migration volume, regulatory deliverables).

## 16. Typical failure modes
| Failure mode | Early signal | Prevention |
|---|---|---|
| Interface specs drift during build | Spec version changes after design freeze | Signed interface contracts, change control |
| Data quality discovered at cut-over | First mock load late | Early profiling, mock loads from month 1 of build |
| Pre-production not representative | "Works in recette" incidents | Iso-prod checklist, gap list in RAID |
| Ops discovers the system at go-live | DEX not started at mid-build | Ops in COPROJ, operability tests |
| Flow openings / certificates late | Requests not filed at design end | Flow matrix frozen early, requests batched |
| Performance tested too late | No perf env booked | Perf test in plan with production-like volumes |
| Batch window overrun | No end-to-end timing | Scheduling-expert review, volume tests |
| No credible rollback | Rollback "to be defined" | Rehearsed rollback, explicit PNR |
| Cut-over longer than window | No timed rehearsal | Two dress rehearsals, margin ≥ 20 % |
| Security / homologation blocks go-live | RSSI not in governance | Security plan from scoping |
| Key-person dependency (legacy) | One person answers all legacy questions | Pairing, documentation, backup named |
| Watermelon reporting | Green status without evidence | Evidence-based reporting |
| Hypercare understaffed | Team released at MEP | Roster and budget planned at scoping |

## 17. Which Tiger Team expert for what
| Trigger in the project | Expert |
|---|---|
| Target architecture, integration pattern choice, NFRs, cloud/sovereignty, ADRs, DORA ICT risk mapping | enterprise-architect |
| CI/CD, secrets, IAM, SAST/DAST, pentest, supply chain, homologation support | devsecops-expert |
| Database design, migration, performance, replication/RPO, backup/restore, test data anonymisation | dba-expert |
| Batch scheduling, production plan, batch windows, restart, dependencies | scheduling-expert |
| Interfaces, middleware (API, messaging, ESB, MFT), interface contracts, flow matrix, error handling | integration-expert |
| ERP integration, customisation, ERP data migration and opening balances | erp-expert |
| Hosting, network, firewall flows, capacity, HA/DR, certificates, cloud landing zone | infra-expert |
| IBM i (AS/400) platform, Db2 for i, RPG/COBOL, journaling, CCSID/EBCDIC, IBM i integration | ibmi-expert |
| Planning, governance, RAID, cut-over orchestration, arbitration | project-manager |

## Sources
- CCAG-TIC 2021, arrêté du 30 mars 2021 (NOR ECOM2106875A), consolidated text with amendments (21 Apr 2021, 30 Sep 2021, 29 Dec 2022): https://www.legifrance.gouv.fr/loda/id/JORFTEXT000043310689
- CCAG-TIC Art. 32 "Vérifications qualitatives" (VA 32.3, VSR 32.4): https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000043320039
