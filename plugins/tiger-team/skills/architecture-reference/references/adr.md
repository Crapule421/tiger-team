# Architecture Decision Records (ADR) & Decision Matrices

## Contents
1. When to write an ADR (and when not)
2. Lifecycle, numbering, storage
3. Format A — Nygard (minimal)
4. Format B — MADR
5. Format C — Y-statement (one-liner)
6. Tiger Team extended template (regulated contexts)
7. Decision criteria matrices
8. Example 1 (Nygard, fictitious)
9. Example 2 (extended, fictitious, with matrix)
10. Example 3 (supersession, fictitious)
11. Target-architecture note structure
12. ADR review checklist and pitfalls

## 1. When to write an ADR
Write one when at least one applies:
- Hard or expensive to reverse (platform, database, hosting, integration pattern, vendor, data ownership).
- Affects several teams, systems or experts; or sets a precedent/standard.
- Significant cost (CAPEX/OPEX, licences) or long-term operational impact.
- Compliance or risk impact: security, GDPR, DORA (critical or important functions, third parties, exit), sovereignty, accreditation (homologation).
- Deviates from an architecture principle or standard (then it also needs a dispensation).
- Several viable options were seriously considered.
Do **not** write one for reversible local choices (library version within a standard, naming inside one component) — use code review or design notes.

## 2. Lifecycle, numbering, storage
- Statuses: **Proposed** → **Accepted** | **Rejected**; later **Deprecated** or **Superseded by ADR-NNN**. Accepted ADRs are immutable: change = new ADR that supersedes.
- Numbering: sequential `ADR-0001`, never reused. Title = the decision as a short imperative phrase ("Use MFT hub for partner file exchanges"), not the question.
- Storage: versioned with the code or the architecture repository (`docs/adr/NNNN-title.md`); index file listing number, title, status, date. Open-source tooling exists (e.g., adr-tools, Log4brains) — optional.
- Approval: design authority accepts; record deciders, consulted (experts, RSSI, DPO, ops) and informed parties.
- Review date: set one for decisions based on assumptions likely to change (vendor roadmap, regulation, volumes).

## 3. Format A — Nygard (minimal)
From Michael Nygard's 2011 post "Documenting Architecture Decisions".
```
# ADR-NNNN: <decision title>
Status: Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
## Context
<forces at play: technical, business, regulatory, organisational; facts, not the solution>
## Decision
<"We will ..." — active voice, full sentences>
## Consequences
<all consequences: positive, negative, neutral; what becomes easier or harder>
```
Best for: small, fast decisions; teams new to ADRs.

## 4. Format B — MADR
"Markdown Any Decision Records" (originally "Markdown Architectural Decision Records"); 3.x/4.x versions exist — verify the current template and field names (e.g., "deciders" became "decision-makers" in recent versions).
```
---
status: proposed | accepted | rejected | deprecated | superseded by ADR-XXXX
date: YYYY-MM-DD
decision-makers: <names/roles>
consulted: <names/roles>
informed: <names/roles>
---
# <short title of solved problem and solution>
## Context and Problem Statement
## Decision Drivers
## Considered Options
## Decision Outcome
Chosen option: "<option>", because <justification>.
### Consequences
* Good, because ...
* Bad, because ...
### Confirmation
<how compliance with the decision will be verified: review, test, fitness function>
## Pros and Cons of the Options
### <Option 1>
* Good, because ...
* Neutral, because ...
* Bad, because ...
## More Information
```
Best for: decisions with several options and explicit drivers.

## 5. Format C — Y-statement (one-liner)
Attributed to Olaf Zimmermann and colleagues:
> In the context of <use case / component>, facing <concern>, we decided for <option> and neglected <other options>, to achieve <qualities / benefits>, accepting <downside / cost>.
Use in decision logs, COPIL slides, or as the summary line of a longer ADR.

## 6. Tiger Team extended template (regulated contexts)
```
# ADR-NNNN: <decision title>
Status | Date | Deciders | Consulted | Informed | Review date | Supersedes / Superseded by
## 1. Context and problem statement
## 2. Decision drivers and constraints
   - Knock-out criteria (must-haves): regulatory, security policy, contractual, safety
   - Weighted criteria (see matrix)
## 3. Options considered (incl. "do nothing / defer")
## 4. Evaluation (knock-out screen + weighted matrix + sensitivity)
## 5. Decision ("We will ...") and rationale
## 6. Consequences (positive / negative / neutral; impacts per expert domain)
## 7. Compliance impacts
   - Security & accreditation (homologation), DICT
   - Personal data (GDPR: legal basis, DPIA need, transfers outside EEA)
   - DORA (critical or important function? third party? register of information, exit strategy, RTO/RPO)
   - Sovereignty / hosting class (SecNumCloud, HDS, II 901 ... as applicable)
   - Sector rules (banking, health, defense)
## 8. Reversibility (exit path, cost and duration to reverse, point of no return)
## 9. Risks (risk | criticality | mitigation) and technical debt created (with sunset date)
## 10. Implementation and confirmation (how conformance will be checked, owners, dates)
```

## 7. Decision criteria matrices
**Method**
1. **Knock-out screen** first: pass/fail on non-negotiables. Excluded options are listed with the reason; do not score them.
2. **Criteria and weights** agreed with deciders *before* scoring (weights sum to 100 %). 5-8 criteria; more dilutes.
3. **Scale** 1-5 with anchored definitions (what is 1, 3, 5 for each criterion) to reduce subjectivity.
4. **Score** with evidence per cell (benchmark, PoC, vendor doc, expert estimate — say which).
5. **Sensitivity**: vary the top weights ±10 points; if the winner changes, the decision is weight-driven — make that explicit to deciders.
6. **Narrative**: the matrix supports, it does not decide; explain the decisive trade-off in two sentences.

**Criteria catalogue** (pick, do not use all)
| Criterion | Anchors (1 → 5) |
|---|---|
| Fit to functional/integration need | Major gaps → full fit without customisation |
| Operational resilience (RTO/RPO, HA) | Cannot meet targets → meets with margin, tested pattern |
| Security & compliance effort | Heavy compensating controls/dispensation → compliant by design |
| Sovereignty / data residency | Non-EU legal exposure for sensitive data → qualified/accredited hosting for data class |
| Reversibility / lock-in | Proprietary, no export → open standards, tested exit |
| TCO 3-5 years | Highest → lowest (state figures and assumptions) |
| Time to deliver / critical path impact | Delays milestone → fits plan |
| Operability (ops skills, tooling, monitoring) | New stack, no skills → existing standard platform |
| Skills and vendor ecosystem | Scarce → widely available |
| Strategic alignment (target architecture, principles) | Contradicts target → is the target |
| Delivery risk | Unproven, many unknowns → proven in similar context |

**Pitfalls**: weights tuned after scoring to fit a preferred option; false precision (3.47 vs 3.45 is a tie); cost counted only as licences; criteria overlapping (double counting); ignoring "do nothing"; one expert scoring alone.

## 8. Example 1 (Nygard, fictitious)
```
# ADR-0012: Use the shared MFT hub for all partner file exchanges
Status: Accepted (2026-03-02)
## Context
The fictitious "Banque Exemple" exchanges ~40 file flows with partners via scripts on
three servers (SFTP push/pull, no central monitoring, keys managed manually). Audit
found missing integrity checks and no end-to-end traceability. A shared MFT platform
already exists for internal flows, operated 24/7 by production.
## Decision
We will route every partner file exchange through the shared MFT hub, with per-partner
endpoints, checksum verification, encryption at rest, and alerts on missed deliveries.
Point-to-point scripts are forbidden for new flows; existing ones migrate by Q4.
## Consequences
+ Central monitoring, traceability and key management; audit finding closed.
+ Standard onboarding (partner fiche, flow matrix entry, interface contract).
- MFT hub becomes critical: its HA/DR must match the most critical partner flow.
- Migration effort ~40 flows; partner re-certification windows constrain the schedule.
- Ops team needs MFT partner-onboarding procedure in DEX.
```

## 9. Example 2 (extended, fictitious, with matrix)
**ADR-0021: Propagate customer master-data changes from the ERP to the IBM i order system by event streaming with CDC** — Status: Proposed.

**Context**: fictitious distributor "Exemplia". Customer master data moves from the IBM i order system to the new ERP (master per urbanisation rule R2). The IBM i order system (RPG, Db2 for i) keeps processing orders for 3 more years and needs customer updates within 5 minutes (today: nightly batch). Volumes: ~20 000 changes/day, peaks 2 000/hour at campaign start.

**Knock-out criteria**: no direct write by the ERP into Db2 for i tables (principle P4); end-to-end traceability (audit); RPO of the flow ≤ 5 min; no new non-EU SaaS for customer personal data.

**Options**: A) keep nightly batch file (do nothing); B) synchronous API calls from ERP to an IBM i service on each change; C) ERP business events published to the existing event broker, consumed by an IBM i adapter; D) CDC on the ERP database feeding the broker. Option A fails the 5-minute requirement (knock-out). Option D is screened out: CDC on the ERP's internal schema is unsupported by the ERP vendor (upgrade risk) — it stays documented as rejected.

| Criterion | Weight | B: sync API | C: events via broker |
|---|---|---|---|
| Resilience (decoupling, IBM i downtime tolerated) | 25 % | 2 | 5 |
| Fit (latency ≤ 5 min, ordering per customer) | 20 % | 5 | 4 |
| Operability (existing platform, monitoring) | 15 % | 3 | 4 |
| Delivery risk / skills (IBM i adapter) | 15 % | 4 | 3 |
| TCO 3 years | 15 % | 4 | 3 |
| Strategic alignment (event-driven target) | 10 % | 2 | 5 |
| **Weighted score** | 100 % | **3.35** | **4.05** |

Sensitivity: raising TCO to 30 % and lowering resilience to 10 % gives B 3.65 vs C 3.75 — C stays ahead but narrowly; resilience weighting is decisive (IBM i nightly maintenance windows would block synchronous calls).

**Decision**: we will publish "CustomerChanged" business events from the ERP's supported eventing/outbox mechanism to the existing broker; an IBM i adapter consumes them idempotently (event ID + per-customer sequence) and updates Db2 for i through a service program, with journaling enabled. Nightly reconciliation file kept for 3 months as safety net.
**Consequences**: + IBM i downtime no longer blocks the ERP; reusable events for other consumers. − Eventual consistency (orders may use data up to 5 min old: accepted by business owner); ordering per customer must be guaranteed (partition key = customer ID); CCSID conversion UTF-8 → EBCDIC in the adapter (special characters list tested).
**Compliance**: customer personal data stays on EU-hosted broker; no new transfer; records of processing updated. Not a DORA context (non-financial entity). Reversibility: fallback to batch file flow kept documented.
**Risks**: adapter skills concentrated on one IBM i developer (High → pairing + DEX run book); broker becomes critical path for orders (Medium → HA verified, DLQ monitoring).
**Handoffs**: integration-expert (event contract, DLQ, replay), ibmi-expert (adapter, journaling, CCSID), erp-expert (supported eventing mechanism), scheduling-expert (retire nightly batch after safety period), infra-expert (broker capacity/HA).

## 10. Example 3 (supersession, fictitious)
```
# ADR-0030: Host the claims document archive on a SecNumCloud-qualified object storage
Status: Accepted — supersedes ADR-0008 ("Host claims archive on public cloud region X")
## Context
Classification review re-rated the archive as containing health data of insured persons
(fictitious mutual insurer). ADR-0008 assumed non-sensitive documents. Health data hosting
requires an HDS-certified provider; the security policy now requires a SecNumCloud-
qualified service for this data class.
## Decision
We will migrate the archive to an object-storage offer that holds both HDS certification
and SecNumCloud qualification for the service used (certificates checked for exact scope).
## Consequences
+ Compliance restored. - Migration of 120 TB over 3 months; egress costs from the current
provider; some managed features unavailable (lifecycle rules re-implemented).
ADR-0008 status set to "Superseded by ADR-0030".
```

## 11. Target-architecture note structure
When the question is broader than one decision (a perimeter's target state):
1. Purpose, scope, horizon; drivers (business, regulatory, obsolescence).
2. Baseline summary (application cooperation view, pain points, debt).
3. Target architecture: principles applied; functional/application view; integration patterns; data ownership; technology and hosting (with data classes); NFR targets.
4. Gap analysis (add / change / remove).
5. Transition architectures (plateaus), coexistence bridges with sunset dates, decommissioning plan.
6. Key decisions (list of ADRs, proposed or accepted) and open decisions.
7. Compliance impacts (security, GDPR, DORA, sovereignty, sector rules).
8. Roadmap (macro), cost drivers, risks, handoffs to experts.

## 12. ADR review checklist and pitfalls
- [ ] Title states the decision; status and date present; deciders named.
- [ ] Context contains facts and constraints, not the conclusion.
- [ ] At least two real options plus "do nothing / defer"; rejected options explain why.
- [ ] Knock-out criteria explicit; weights agreed before scoring; sensitivity checked.
- [ ] Consequences include negatives and operational impacts (ops, DEX, monitoring, skills).
- [ ] Compliance impacts addressed or explicitly "not applicable" with reason.
- [ ] Reversibility and point of no return stated.
- [ ] Debt created is registered with a sunset date; review date set if assumptions are volatile.
- [ ] Handoffs to the experts who must implement or verify.
Pitfalls: ADR written after the fact to justify a done deal (acceptable only if labelled as retro-documentation); ADRs as essays (keep 1-3 pages); editing accepted ADRs instead of superseding; no link from code/config/DAT back to the ADR.
