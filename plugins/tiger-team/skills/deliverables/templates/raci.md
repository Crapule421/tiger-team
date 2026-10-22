# RACI Matrix (Matrice RACI)

## 0. Document control

| Item | Value |
|---|---|
| Project | `<...>` |
| Document ID | `RACI-<project>-<nnn>` |
| Status | `<Draft / Approved>` |
| Approved by | `<steering committee, date>` |

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | `<YYYY-MM-DD>` | `<role>` | Initial matrix |

## 1. Legend and rules

| Code | Meaning | Rule |
|---|---|---|
| **R** | Responsible: does the work | At least one R per activity |
| **A** | Accountable: approves, answers for the result | **Exactly one A** per activity |
| **C** | Consulted: gives input before (two-way) | Keep the list short |
| **I** | Informed: told after (one-way) | |

_A and R can be the same role. Use "A/R" when so. Leave a cell empty when the role is not involved._

## 2. Roles

_Adapt to the project; use roles, map names in a separate, access-restricted staffing list if needed._

| Code | Role | Organization / team | Notes |
|---|---|---|---|
| SPO | Sponsor | `<...>` | _Arbitrates scope, budget, priorities_ |
| PM | Project manager | | |
| BO | Business owner | | _Owns requirements and acceptance_ |
| EA | Enterprise / solution architect | | |
| SEC | Security (RSSI or delegate) | | |
| DPO | Data protection / compliance | | |
| DSO | DevSecOps | | |
| DBA | Database administration | | |
| SCH | Job scheduling | | |
| INT | Integration (APIs, flows, MFT) | | |
| ERP | ERP team | | |
| INF | Infrastructure (network, systems) | | |
| IBM | IBM i team | | |
| RUN | Operations / run | | |
| VND | Vendor / integrator | | |

## 3. Matrix

_Pre-filled with a typical split for an integration project: review every row with the stakeholders._

| Phase | Activity | SPO | PM | BO | EA | SEC | DPO | DSO | DBA | SCH | INT | ERP | INF | IBM | RUN | VND |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Framing | Business case, scope, budget | A | R | C | C | I | I | | | | | | | | | |
| Framing | Regulatory and data classification analysis | I | R | A | C | C | C | | | | | | | | | |
| Framing | Planning and RAID log | I | A/R | C | C | C | | C | C | C | C | C | C | C | C | C |
| Design | Business requirements | I | C | A/R | C | C | C | | | | C | C | | | | |
| Design | Target architecture (DAT) | I | C | C | A/R | C | C | C | C | C | C | C | C | C | C | C |
| Design | Interface contracts | | C | C | A | C | C | | C | C | R | R | | R | C | C |
| Design | Flow matrix and firewall requests | | I | | C | A | | C | | | R | | R | | C | |
| Design | Security architecture and risk analysis | I | C | C | C | A/R | C | C | | | | | C | | | |
| Design | DPIA, if personal data (controller accountable, DPO advises) | I | R | A | C | C | C | | | | | | | | | |
| Build | Infrastructure provisioning | | I | | C | C | | C | C | | | | A/R | R | C | |
| Build | CI/CD pipeline and security gates | | I | | C | C | | A/R | | | | | C | | | |
| Build | Database design and scripts | | I | | C | | | | A/R | | C | C | | C | | C |
| Build | Interface development | | I | | C | | | C | C | | A/R | R | | R | | R |
| Build | Job scheduling chains | | I | | C | | | | C | A/R | C | C | | C | C | |
| Test | Test strategy and synthetic test data | | A | C | C | C | C | R | R | | R | R | | R | | C |
| Test | Integration and non-regression tests | | A | I | | | | R | R | R | R | R | | R | | R |
| Test | Security tests (scans, pentest) | | I | | C | A | | R | | | | | C | | | C |
| Test | User acceptance (UAT) and sign-off | C | R | A | | I | | | | | C | C | | | | C |
| Deploy | Operations manual (DEX) and handover | | C | | C | C | | C | R | R | R | R | R | R | A | C |
| Deploy | Production release (release sheet, go/no-go) | I | A | C | C | C | | R | R | R | R | R | R | R | R | C |
| Deploy | Homologation / security approval, if required (A = homologation authority) | A | R | C | C | R | C | | | | | | | | | |
| Run | Hypercare and incident management | I | C | C | | C | | C | C | C | C | C | C | C | A/R | C |
| Run | Project closure and lessons learned | A | R | C | C | C | | C | C | C | C | C | C | C | C | C |

## 4. Validation checklist

- [ ] Exactly one A per activity; at least one R.
- [ ] No role is A on everything (bottleneck) or only I everywhere (useless in the matrix).
- [ ] Every R has the capacity and the access needed for the activity.
- [ ] Security, data protection and operations are consulted **before** design decisions, not informed after.
- [ ] Vendor responsibilities match the contract (statement of work, SLAs).
- [ ] Matrix reviewed at each phase change and after any organizational change.
