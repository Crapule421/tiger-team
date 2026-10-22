# RAID Log (Registre des risques, hypothèses, problèmes et dépendances)

## 0. Document control

| Item | Value |
|---|---|
| Project | `<...>` |
| Document ID | `RAID-<project>` |
| Owner | Project manager |
| Review cadence | `<weekly project meeting; monthly steering committee for High/Critical items>` |
| Sensitivity label | `<Internal / Confidential>` |

| Version | Date | Author | Changes |
|---|---|---|---|
| `<n>` | `<YYYY-MM-DD>` | `<role>` | _Review of `<date>`: items added, closed, escalated_ |

## 1. Scales

### Probability (risks)
| Level | Value | Meaning |
|---|---|---|
| 1 | Rare | `< 10 %` |
| 2 | Possible | `10-40 %` |
| 3 | Likely | `40-70 %` |
| 4 | Almost certain | `> 70 %` |

### Impact (risks and issues)
| Level | Value | Meaning (adapt thresholds) |
|---|---|---|
| 1 | Minor | _No milestone impact; cost < x_ |
| 2 | Moderate | _Delay < 2 weeks; workaround exists_ |
| 3 | Major | _Milestone missed; regulatory or security exposure_ |
| 4 | Critical | _Go-live compromised; regulatory breach; data loss_ |

### Criticality = probability × impact
| Score | Criticality | Handling |
|---|---|---|
| 1-3 | Low | Monitor |
| 4-6 | Medium | Mitigation plan, owner, due date |
| 8-9 | High | Mitigation plan, steering committee visibility |
| 12-16 | Critical | Immediate escalation, decision required |

### Status values
`Open` · `In progress` · `Monitoring` · `Escalated` · `Closed` (with closure date and reason) · for risks also `Occurred` (converted to an issue).

## 2. Risks

_Describe as cause → event → consequence. A risk is uncertain; if it happened, it is an issue._

| ID | Description (cause → event → consequence) | Category | Prob. | Impact | Criticality | Mitigation (reduce probability) | Contingency (if it occurs) | Owner | Due date | Status | Last update |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RSK-001 | _Partner API spec not frozen → late changes → interface rework and UAT delay_ | Planning | 3 | 3 | 9 High | _Freeze date in contract; contract-first mocks_ | _Descope to v2; adapter layer_ | `<role>` | `<YYYY-MM-DD>` | Open | `<YYYY-MM-DD>` |
| RSK-002 | _No synthetic test data for identity edge cases → defects found in production_ | Quality | 2 | 4 | 8 High | _Synthetic dataset built in sprint `<n>`_ | _Hypercare with identity checks_ | `<role>` | | Open | |
| RSK-003 | _Provider not yet assessed (outsourcing / ICT third party) → contract signed late → go-live slip_ | Compliance | 3 | 4 | 12 Critical | _Start assessment and register entry now_ | _Interim on-premises solution_ | `<role>` | | Open | |

Categories: _Planning, Scope, Resources, Technical, Security, Compliance, Data, Third party, Operations, Budget._

## 3. Assumptions

_Something taken as true for planning without proof yet; each needs a validation action and date._

| ID | Assumption | Impact if false | Validation action | Owner | Due date | Status |
|---|---|---|---|---|---|---|
| ASM-001 | _The target ERP version supports the required API_ | _Custom development, + `<x>` weeks_ | _Vendor confirmation in writing_ | `<role>` | `<YYYY-MM-DD>` | Open |
| ASM-002 | _Production volumes do not exceed 2× current_ | _Re-sizing_ | _Business forecast_ | | | |

## 4. Issues

_A problem that is happening now and needs action._

| ID | Description | Impact | Criticality | Action plan | Owner | Due date | Status | Escalated to | Linked items |
|---|---|---|---|---|---|---|---|---|---|
| ISS-001 | _UAT environment unavailable since `<date>`_ | _UAT campaign blocked_ | High | _Infra ticket `<ref>`; temporary environment_ | `<role>` | `<YYYY-MM-DD>` | In progress | `<steering committee>` | `<RSK-..., DEP-...>` |

## 5. Dependencies

_Inbound: the project waits for something. Outbound: someone waits for the project._

| ID | Type | Description | From (provider) | To (receiver) | Needed by | Criticality | Owner | Due date | Status |
|---|---|---|---|---|---|---|---|---|---|
| DEP-001 | Inbound | _Firewall flows FLW-001 to 005 opened in PREPROD_ | `<network team>` | Project | `<YYYY-MM-DD>` | High | `<role>` | `<YYYY-MM-DD>` | Open |
| DEP-002 | Inbound | _Security clearance / production access for integrator staff_ | `<security>` | Project | | | | | |
| DEP-003 | Outbound | _Interface INT-002 delivered to partner for their tests_ | Project | `<partner>` | | | | | |
| DEP-004 | Inbound | _Regulator notification / homologation decision before go-live_ | `<compliance / homologation authority>` | Project | | | | | |

## 6. Review rules

- Every item has one owner (a role that can act) and a due date; "team" is not an owner.
- Overdue items are reviewed first; Critical items go to the steering committee with a decision request.
- Closed items stay in the log (filter them out of views); record closure date and reason.
- Link items to deliverables: DAT sections, interface contracts, release sheets, UAT reservations.
- No confidential details in item text when the log is widely shared: reference a restricted ticket instead.
