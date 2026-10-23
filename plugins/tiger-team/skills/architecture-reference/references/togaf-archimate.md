# TOGAF & ArchiMate — Pragmatic Reference

Version note: content reflects the TOGAF Standard, 10th Edition (The Open Group, first published 2022; its Fundamental Content and Series Guides are updated independently, latest product update May 2025) and the ArchiMate 3.2 Specification (October 2022). ADM concepts are stable since TOGAF 9.x; notation details still differ between repository tools, so check what your tool implements.

## Contents
1. TOGAF in a nutshell
2. ADM phases
3. Requirements management and ADM iterations
4. Deliverables, artifacts and building blocks
5. Architecture governance and compliance
6. Tailoring TOGAF for an integration project
7. ArchiMate framework (layers and aspects)
8. ArchiMate core elements
9. ArchiMate relationships
10. Useful viewpoints and modelling conventions
11. Mapping ADM ↔ ArchiMate ↔ Tiger Team deliverables
12. Pitfalls (dogmatism checklist)

## 1. TOGAF in a nutshell
- Open Group framework for enterprise architecture. Core: the **Architecture Development Method (ADM)**, a content framework (what to produce), the Enterprise Continuum and Architecture Repository (where to store and classify), and architecture capability/governance guidance.
- 10th Edition splits the standard into the **Fundamental Content** — six documents: Introduction and Core Concepts; Architecture Development Method; ADM Techniques; Applying the ADM; Architecture Content; Enterprise Architecture Capability and Governance — and the **TOGAF Series Guides** (topic guidance, e.g., Business Capabilities, Value Streams, Information Mapping, Integrating Risk and Security, Enabling Enterprise Agility, Applying the ADM using Agile Sprints, Using the TOGAF Standard in the Digital Enterprise, Microservices Architecture, Architecture Project Management).
- Four architecture domains: **Business**, **Data**, **Application**, **Technology** (data + application = Information Systems Architectures).
- TOGAF is a toolbox: it explicitly expects tailoring.

## 2. ADM phases
| Phase | Purpose | Key outputs | Pragmatic minimum for a project |
|---|---|---|---|
| Preliminary | Set up the architecture capability: scope, principles, framework tailoring, governance | Architecture principles, tailored framework, organisational model for EA | Reuse enterprise principles; state which apply |
| A. Architecture Vision | Scope, stakeholders and concerns, high-level target, business case, approval to proceed | Statement of Architecture Work, Architecture Vision, stakeholder map, communications plan | 2-4 page vision in the note de cadrage + stakeholder/concern table |
| B. Business Architecture | Baseline/target capabilities, processes, organisation, gap | Business architecture sections of the Architecture Definition Document (ADD), requirements | Capability/process map of the impacted perimeter |
| C. Information Systems Architectures | Data and Application baseline/target, gap | Data entities and ownership, application portfolio, interfaces | Data ownership matrix, application communication view, flow matrix |
| D. Technology Architecture | Platforms, infrastructure, hosting, network, gap | Technology standards, platform decomposition, environments | DAT, hosting decision, environments diagram |
| E. Opportunities & Solutions | Consolidate gaps into work packages, define transition architectures | Architecture Roadmap (draft), implementation and migration strategy | Transition states + coexistence bridges list |
| F. Migration Planning | Sequence, cost/benefit, finalise roadmap | Implementation and Migration Plan, final roadmap | Planning with decommissioning dates (link to PM plan) |
| G. Implementation Governance | Ensure delivered solutions conform | Architecture Contract, compliance assessments | Design reviews (G1-G3), dispensations |
| H. Architecture Change Management | Manage changes to the architecture, decide when a new cycle is needed | Change requests, updated architecture | ADR log, debt register, periodic review |
| Requirements Management (centre) | Continuously manage requirements across all phases | Architecture Requirements Specification, requirements repository | NFR catalogue with traceability |

Main named deliverables (Architecture Content document; names unchanged since TOGAF 9.2): Request for Architecture Work, Statement of Architecture Work, Architecture Vision, Architecture Definition Document, Architecture Requirements Specification, Architecture Roadmap, Transition Architecture, Implementation and Migration Plan, Implementation Governance Model, Architecture Contract, Compliance Assessment, Change Request, Architecture Principles, Architecture Repository.

## 3. Requirements management and ADM iterations
- Requirements are captured in any phase and managed centrally; changes are impact-assessed against the current architecture.
- ADM is iterative: across phases (e.g., cycling B-C-D), and in iteration cycles commonly described as **Architecture Context** (Preliminary, A), **Architecture Definition** (B, C, D), **Transition Planning** (E, F), **Architecture Governance** (G, H).
- Levels: strategic (enterprise, multi-year), segment (domain/programme), capability/solution (project). An integration project usually works at segment or capability level and must inherit enterprise principles.
- Each phase works baseline → target → gap → roadmap candidates → impact → stakeholder review.

## 4. Deliverables, artifacts and building blocks
- **Deliverable**: contractually specified, reviewed and signed output (e.g., ADD).
- **Artifact**: a work product describing one viewpoint — **catalogs** (lists), **matrices** (relationships), **diagrams** (views).
- **Building blocks**: **ABB** (Architecture Building Block: required capability, vendor-neutral) realised by **SBB** (Solution Building Block: product or component).

Useful artifacts (Architecture Content names):
| Domain | Catalogs | Matrices | Diagrams |
|---|---|---|---|
| Preliminary / Vision | Principles catalog | Stakeholder map matrix | Value chain, solution concept |
| Business | Organisation/actor, business service/function, process, capability | Actor/role, business interaction | Business capability map, process flow, value stream |
| Data | Data entity / data component | Data entity / business function, application / data | Logical data, data dissemination, data migration, data lifecycle |
| Application | Application portfolio, interface | Application / organisation, application / function, application interaction | Application communication, application and user location, process / application realisation |
| Technology | Technology standards, technology portfolio | Application / technology | Environments and locations, platform decomposition, network computing |
| Opportunities | — | — | Project context, benefits |

**Enterprise Continuum**: classification from generic to specific: Foundation → Common Systems → Industry → Organisation-specific architectures/solutions. **Architecture Repository**: metamodel, capability, landscape (baseline/target/transition), standards information base, reference library, governance log, requirements repository, solutions landscape.

## 5. Architecture governance and compliance
- **Architecture Board**: cross-organisation body owning standards, compliance reviews and dispensations; consistent decisions; escalation path.
- **Architecture Contract**: agreement between architecture function and delivery (project/vendor) on what will be delivered and how conformance is checked.
- **Compliance review** checkpoints during implementation; TOGAF defines graded conformance levels: Irrelevant, Consistent, Compliant, Conformant, Fully Conformant, Non-conformant (the definitions sit in the Architecture Compliance chapter of the EA Capability and Governance document, behind The Open Group login — quote from it, not from memory).
- **Dispensation**: time-limited, conditional waiver granted when a solution cannot comply; must carry expiry, conditions and owner.
- Practical mapping: Architecture Board ↔ design authority / comité d'architecture; Architecture Contract ↔ DAT validation + ADR log + dispensation register.

## 6. Tailoring TOGAF for an integration project
Keep:
- Principles (inherit, do not rewrite), stakeholder/concern table, baseline/target/gap on the impacted perimeter only.
- Application communication view + flow matrix + interface catalog (= the integration backbone).
- Data ownership matrix (data entity ↔ master application ↔ owner).
- Transition architectures with coexistence bridges and decommissioning dates.
- Compliance reviews at 3-4 gates, ADRs, dispensations.

Skip or lighten:
- Full enterprise-wide baseline modelling; exhaustive catalogs nobody maintains; formal Request/Statement of Architecture Work when the note de cadrage already covers it.

Signals of right-sizing: every artifact has a reader and a decision it supports; models are updated after go-live (otherwise do fewer of them).

## 7. ArchiMate framework (layers and aspects)
Open Group modelling language aligned with TOGAF. Current version 3.2 (19 October 2022) supersedes 3.1: refined definitions (outcome, constraint, business function, product), Physical elements folded into the Technology Layer chapter, device / system software / facility / equipment re-typed as technology internal active structure elements.

**Layers**: Strategy; Business; Application; Technology (incl. Physical elements); Implementation & Migration. Plus the **Motivation** aspect/elements that apply across layers.
**Aspects** (columns of the core framework): **Active structure** (who/what acts), **Behaviour** (what is done), **Passive structure** (what is acted on).

| Layer | Active structure | Behaviour | Passive structure |
|---|---|---|---|
| Business | Business actor, role, collaboration, interface | Business process, function, interaction, event, service | Business object, contract, representation (+ product as composite) |
| Application | Application component, collaboration, interface | Application function, process, interaction, event, service | Data object |
| Technology | Node, device, system software, technology collaboration, technology interface, path, communication network | Technology function, process, interaction, event, service | Artifact |
| Physical (within the Technology Layer since 3.2) | Equipment, facility, distribution network | (technology behaviour) | Material |

## 8. ArchiMate core elements (selection)
**Strategy**: Resource, Capability, Value stream, Course of action.
**Motivation**: Stakeholder, Driver, Assessment, Goal, Outcome, Principle, Requirement, Constraint, Meaning, Value.
**Implementation & Migration**: Work package, Deliverable, Implementation event, Plateau, Gap.
**Composite / other**: Grouping, Location, Junction (and/or).

Key distinctions people get wrong:
| Pair | Distinction |
|---|---|
| Function vs process | Function = grouping by skill/capability, no sequence; process = sequence producing a result |
| Service vs interface | Service = externally visible behaviour (what); interface = access point (where/how) |
| Application component vs node | Software unit vs computational resource hosting it |
| Data object vs artifact | Logical data vs physical file/deployable/table realising it |
| Capability vs business function | Capability = what the enterprise can do (strategy view, stable); function = how the organisation groups behaviour |
| Plateau vs gap | Stable state (baseline/transition/target) vs difference between two plateaus |

## 9. ArchiMate relationships
| Category | Relationship | Meaning | Example |
|---|---|---|---|
| Structural | Composition | Whole made of parts that cannot exist alone | Component composed of modules |
| Structural | Aggregation | Grouping of parts that can exist independently | Group of applications in a quartier |
| Structural | Assignment | Allocation of responsibility/behaviour or deployment | Component assigned to function; artifact assigned to node |
| Structural | Realisation | Logical entity realised by a more concrete one | Application service realised by component; data object realised by artifact |
| Dependency | Serving | One element provides its functionality to another | Application service serves business process |
| Dependency | Access | Behaviour/active structure reads or writes passive structure | Function writes data object |
| Dependency | Influence | Affects motivation elements (+/-) | Driver influences goal |
| Dependency | Association | Unspecified relation (optionally directed) | Annotations, loose links |
| Dynamic | Triggering | Temporal/causal sequence | Event triggers process |
| Dynamic | Flow | Transfer (data, goods, value) between behaviours | Application flow between two functions (= an interface flow) |
| Other | Specialisation | Is-a-kind-of | "Payment flow" specialises "Flow" |

Derivation rules allow inferring indirect relationships across chains (e.g., serving through realisation); use derived relationships for summary views, but keep the detailed model correct.

**Modelling integration**: represent each flow as a **Flow** relationship (or as application interface + serving for API exposure), carrying properties aligned with the flow matrix (protocol, frequency, volume, criticality). Middleware is an application component (or system software for the platform) that flows pass through; avoid drawing it as a mere line.

## 10. Useful viewpoints and modelling conventions
Viewpoints most used in integration projects (names per the example-viewpoints appendix of ArchiMate 3.x):
| Viewpoint | Shows | Typical reader |
|---|---|---|
| Capability map | Capabilities and their maturity/heat | Sponsor, COPIL |
| Business process cooperation | Processes across actors and the applications serving them | Business owner |
| Application cooperation | Components and the flows between them | Integration-expert, architects |
| Application usage | Which processes use which application services | Business + IT |
| Information structure | Data objects and relationships | DBA, data owners |
| Technology usage / implementation & deployment | Components deployed on nodes/system software | Infra, ops |
| Layered | Business → application → technology for one perimeter | Design authority |
| Migration / implementation & migration | Plateaus, gaps, work packages | PM, COPIL |
| Motivation (goal realisation, requirements realisation) | Drivers → goals → requirements → elements | Compliance, auditors |

Conventions: one viewpoint per question; ≤ 20-30 elements per view; consistent naming (noun for structure, verb phrase for behaviour); colour by lifecycle (keep/change/new/retire) not by taste; properties for metadata (owner, criticality, DICT, CIF flag for DORA, end-of-support date); model is the source, diagrams are views; version the repository.

## 11. Mapping ADM ↔ ArchiMate ↔ Tiger Team deliverables
| ADM phase | ArchiMate views | Deliverable (templates in `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/`) |
|---|---|---|
| A | Motivation, capability map, stakeholder | Scoping note (note de cadrage) |
| B | Business process cooperation, application usage | Functional specs (SFG) |
| C (data) | Information structure | Data ownership matrix, interface contracts (`interface-contract.md`) |
| C (application) | Application cooperation | Flow matrix (`flow-matrix.md`) |
| D | Technology usage, implementation & deployment | DAT (`dat.md`) |
| E-F | Migration, implementation & migration | Roadmap, transition plan, release plans |
| G | — (compliance checks against models) | Review reports, ADRs, dispensations |
| H | Updated landscape | ADR log, debt register, DEX (`dex.md`) updates |

## 12. Pitfalls (dogmatism checklist)
- Running all ADM phases "by the book" on a 6-month project: tailor, and document the tailoring in one paragraph.
- Producing a repository nobody updates: fewer, maintained views beat many stale ones.
- Modelling technology before agreeing business capabilities and data ownership.
- Confusing ArchiMate notation correctness with architecture quality: a correct diagram of a bad decision is still a bad decision.
- Using TOGAF vocabulary with stakeholders who do not know it: translate to their terms (COPIL wants options, costs, risks, dates).
- Ignoring the gap analysis's "removed" column: decommissioning is where savings and risk reduction materialise.
- Treating certification knowledge as delivery experience: validate every artifact against a real decision it must support.

## Sources
- The Open Group, TOGAF Standard, 10th Edition — product page listing the six Fundamental Content documents and the Series Guides: https://publications.opengroup.org/c220
- The Open Group, ArchiMate 3.2 Specification — product page with publication date and changes from 3.1: https://publications.opengroup.org/c226
- The Open Group, TOGAF overview (Fundamental Content vs Series Guides): https://www.opengroup.org/togaf
- The full standard texts (pubs.opengroup.org) require a free Open Group account; definitions quoted in deliverables must be checked there.
