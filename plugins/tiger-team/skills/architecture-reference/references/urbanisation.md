# Urbanisation du SI, Application Portfolio Management & Rationalisation

French approach to IS architecture (urbanisation du système d'information) and its practical use with portfolio management. Terms and zone names vary between organisations and authors: treat the structures below as typical, not canonical.

## Contents
1. Concept and positioning
2. Urbanisation rules
3. Breakdown: zones, quartiers, îlots, blocs
4. The four cartographies (maps)
5. Schéma directeur (SDSI)
6. Application portfolio management (APM)
7. TIME model and other disposition models
8. Rationalisation and decommissioning
9. Fictitious example: functional map of a regional hospital group
10. Pitfalls

## 1. Concept and positioning
- Metaphor of city planning: the IS evolves continuously like a city; the urbanist defines zoning rules and a land-use plan so that buildings (applications) can be replaced without destroying neighbourhoods.
- Developed by the French school in the 1990s-2000s (practitioner associations and CIGREF-type communities — verify attribution before citing authors).
- Relation to enterprise architecture: urbanisation ≈ EA focused on the functional decomposition and application landscape, with strong emphasis on decoupling and exchange management. It maps well to TOGAF phases B-C (see `togaf-archimate.md`).
- Typical French deliverables: plan d'urbanisme / plan d'occupation des sols (POS: functional reference map with applications positioned on it), cartographies, schéma directeur, règles d'urbanisme.

## 2. Urbanisation rules (règles d'urbanisme)
Typical rule set — adapt and number them so reviews can cite them:
| # | Rule | Rationale |
|---|---|---|
| R1 | Each îlot belongs to exactly one quartier, each quartier to exactly one zone | Unambiguous ownership |
| R2 | Each data entity has a single master îlot (owner); other îlots hold governed copies | Single source of truth |
| R3 | No îlot accesses another îlot's data store directly; exchanges go through published interfaces (exchange zone: API gateway, ESB/EAI, messaging, MFT) | Decoupling, replaceability |
| R4 | Channels (presentation) are separated from business processing and from data | Multichannel reuse |
| R5 | Reference data (référentiels: customers/patients, products, organisation, third parties, nomenclatures) is managed in a dedicated zone and consumed as a service or replicated copy | Consistency |
| R6 | Steering/reporting is fed from operational zones via controlled flows, never by querying production databases directly | Performance, decoupling |
| R7 | An application should ideally cover one îlot; legacy applications spanning several îlots are flagged as targets for decomposition | Modularity |
| R8 | Every exchange is described (contract, owner, frequency, volume, criticality) | Governance, impact analysis |

## 3. Breakdown: zones, quartiers, îlots, blocs
**Hierarchy**: Zone → Quartier (district) → Îlot (block) → Bloc fonctionnel (functional block). Granularity guide: a zone = major area of concern; a quartier = coherent business domain; an îlot = set of functions sharing the same data and lifecycle, the unit that can be replaced by one application.

Typical zones (generic):
| Zone | Content | Examples (bank / hospital — fictitious) |
|---|---|---|
| Relation / canaux | Channel management, front-office, customer/patient interactions | Online banking, branch desktop / patient portal, appointment booking |
| Opérations / cœur de métier | Core business processing | Accounts, payments, credit / admissions, care pathway, pharmacy |
| Support / ressources | Enterprise resources | HR, finance, purchasing (often ERP) |
| Pilotage | Steering, reporting, analytics, regulatory reporting | Risk and regulatory reports / activity and medical-economic reporting |
| Référentiels | Shared master data | Customer, product, organisation / patient identity, staff directory, structures |
| Échanges | Integration infrastructure (transversal) | API gateway, ESB, MFT, messaging |
| Partenaires / externe | Exchanges with outside parties | Clearing, partner banks / insurers, health networks |

## 4. The four cartographies (maps)
| Map | Content | Owner | Typical use |
|---|---|---|---|
| Métier / processus (business) | Value chain, macro-processes, processes, actors, business events, information | Business / process owners | Scope impact, requirements |
| Fonctionnelle (functional) | Zones/quartiers/îlots, business functions, information objects — independent of applications | Urbanist / enterprise architect | Target reference (POS), duplicate detection |
| Applicative (application) | Applications positioned on the functional map; application flows | Application architects | Impact analysis, rationalisation, integration design |
| Technique / infrastructure | Platforms, servers, networks, sites, middleware, hosting | Infra architects | Capacity, DR, obsolescence, hosting decisions |

Some frameworks add a **strategic** view (goals, capabilities) above the business view. The key value is in the **links** between maps: process → function → application → infrastructure; without them, impact analysis is impossible.

Practical tips: maintain maps in a repository tool (not slide decks); one source of truth for the application list (shared with CMDB and APM); version and date every map; tag applications with lifecycle (keep/evolve/replace/retire) and criticality (DICT, DORA CIF flag where relevant).

## 5. Schéma directeur (SDSI)
IS master plan aligning IT with business strategy over typically 3-5 years, revisited yearly.

**Steps**
1. **État des lieux** (as-is): application/infra inventory, costs, satisfaction survey, maturity, obsolescence, risks, skills, contracts.
2. **Enjeux et orientations**: business strategy translated into IS stakes; regulatory obligations; constraints (budget, sovereignty).
3. **Cible**: target functional and application maps, technical target, organisation/sourcing target, architecture principles.
4. **Trajectoire**: portfolio of projects, sequencing, transition states, decommissioning plan, budget per year, resources.
5. **Gouvernance**: steering of the plan, KPIs, annual review, portfolio arbitration process.

**Outputs**: target maps, roadmap with budgets, project portfolio fiches, decommissioning calendar, risk register, KPIs.
**Pitfalls**: shelf-ware not linked to budget cycles; target too detailed to stay valid; no decommissioning (only additions); IT-only exercise without business ownership; no linkage to obsolescence calendar.

## 6. Application portfolio management (APM)
**Inventory attributes (minimum)**
| Group | Attributes |
|---|---|
| Identity | ID, name, description, functional coverage (îlots), lifecycle status |
| Ownership | Business owner, IT owner, vendor/integrator, support team |
| Usage | Users / entities, criticality, service hours, DICT rating |
| Data | Data domains mastered, personal / health / banking-secrecy data, classification, location |
| Technology | Languages, DB, middleware, OS/platform, versions, end-of-support dates, hosting |
| Integration | Number of interfaces in/out, patterns, partners |
| Economics | Run cost, licences, contracts and renewal dates, project spend |
| Risk / compliance | Incidents, debt score, audit findings, DORA CIF support, third-party dependency, exit plan existence |

**Assessment axes**
- Business value / functional fit: process coverage, user satisfaction, strategic alignment, regulatory necessity.
- Technical health / technical fit: obsolescence, maintainability, performance, security posture, skills availability, integration quality.
- Cost (TCO) and risk (operational, compliance, vendor).
Score with a simple 1-4 scale per criterion, weighted; validate scores with owners (avoid architect-only scoring).

## 7. TIME model and other disposition models
**TIME** (Tolerate, Invest, Migrate, Eliminate; Gartner-originated). Common interpretation on two axes — functional/business fit vs technical fit; quadrant definitions vary slightly between sources, align with your APM tool:
| Quadrant | Business fit | Technical fit | Disposition |
|---|---|---|---|
| Invest | High | High | Evolve, extend, make it a platform |
| Migrate | High | Low | Keep the function, move to a new technical base (replatform, rewrite, replace) |
| Tolerate | Low | High | Keep as is, minimal spend, no new features |
| Eliminate | Low | Low | Decommission or consolidate; stop investment |

**Other models**: cloud migration "R" options (retire, retain, rehost, relocate, replatform, refactor, repurchase); lifecycle statuses (emerging, mainstream/strategic, containment, sunset, retired) for technologies.

Use TIME as a conversation starter, not a verdict: add cost and risk; regulatory systems with low "business value" may still be mandatory; check data and interface dependencies before any "eliminate".

## 8. Rationalisation and decommissioning
**Process**: inventory → assess (value, health, cost, risk) → identify duplicates and gaps on the functional map → target and disposition per application → business case → roadmap with transitions → decommission → measure savings.

**Rationalisation levers**: consolidate duplicates (same îlot covered by several applications); move to shared platforms (ERP, MFT, IAM, scheduling); replace specific developments with standard products where the process is not differentiating; retire unused applications (check real usage logs); renegotiate or terminate licences.

**Decommissioning checklist**
- [ ] Functional coverage transferred and accepted; no hidden users (check access logs, batch outputs, reports consumed).
- [ ] Data: retention obligations per data type (accounting, medical records, banking, HR — retention periods differ, verify legal durations), archive format readable without the application, legal holds, GDPR deletion of data past retention.
- [ ] Interfaces disconnected on both sides; flows removed from flow matrix; firewall rules closed.
- [ ] Scheduling jobs removed; monitoring and alerts removed; DEX archived.
- [ ] Accounts, service accounts, certificates and secrets revoked.
- [ ] Licences, support and hosting contracts terminated (check notice periods).
- [ ] Infrastructure decommissioned; storage media sanitised per security policy.
- [ ] DR plan, CMDB, APM repository, maps, GDPR records of processing and DORA register of information updated.
- [ ] Savings measured against business case.

**KPIs**: number of applications per îlot, % of portfolio in Eliminate/Migrate with dated plan, run cost trend, obsolete component count, interfaces per application, decommissioning rate vs additions.

## 9. Fictitious example: functional map of a regional hospital group
- **Relation**: patient portal, appointment booking, messaging with practitioners.
- **Opérations / soins**: admissions & patient administration, care pathway and electronic patient record, prescriptions and pharmacy, laboratory, imaging, operating theatre planning, billing of care.
- **Support**: HR & payroll, finance & purchasing (ERP), logistics, biomedical equipment maintenance.
- **Pilotage**: activity reporting, medical-economic analysis, quality indicators.
- **Référentiels**: patient identity (national health identifier usage per national rules — verify), structures and units, staff and practitioners directory, nomenclatures.
- **Échanges**: integration engine (HL7 v2 / FHIR messages — verify applicable national interoperability framework), MFT, API gateway.
Findings typical of such a map: three applications covering "appointment booking" (duplicate → consolidate), patient identity mastered in two places (violates R2 → single master + identity server), reporting reading production DBs directly (violates R6 → feed via exchange zone to a data platform).

## 10. Pitfalls
- Maps as a one-off project deliverable, outdated within a year: tie updates to change processes (every project updates the maps at go-live).
- Functional map copied from the current application split: it must be independent of applications to reveal duplicates and gaps.
- Too fine granularity (hundreds of îlots) nobody can maintain; too coarse to support decisions.
- Rules without enforcement: cite rule numbers in design reviews and require dispensations.
- Rationalisation business cases that ignore migration and data archiving costs.
- Forgetting non-production, shadow IT and end-user computing (spreadsheets, macros) in the inventory.

## Sources
- No normative text defines urbanisation du SI: this file is practitioner synthesis (zone names, rules and the TIME quadrants vary by organisation and APM tool). For the TOGAF / ArchiMate mapping used in §1, see the sources listed in `togaf-archimate.md`.
- Retention periods, health-identifier rules and interoperability frameworks cited as "verify" are regulatory: use the `sector-compliance` references.
