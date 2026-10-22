# UAT Sign-off (Procès-verbal de recette — PV de recette)

## 1. Identification

| Item | Value |
|---|---|
| Project / system | `<...>` |
| Release / version accepted | `<REL-... / x.y.z>` (build `<id>`) |
| Document ID | `PVR-<project>-<nnn>` |
| Acceptance type | `<functional acceptance (VABF) / operational acceptance (VSR) / partial / final>` |
| Test environment | `<UAT / PREPROD>`; configuration ref `<...>` |
| Test period | `<YYYY-MM-DD> → <YYYY-MM-DD>` |
| Contract reference (if any) | `<contract / statement of work, acceptance clause>` |
| Sensitivity label | `<Internal / Confidential>` |

_VABF (vérification d'aptitude au bon fonctionnement) and VSR (vérification de service régulier) are terms used in French public procurement; use the acceptance stages defined in your contract._

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | `<YYYY-MM-DD>` | `<role>` | Draft for decision meeting |

## 2. Scope

| In scope | Reference |
|---|---|
| `<Feature / user story / requirement>` | `<REQ-...>` |
| `<Interface INT-xxx>` | `<interface contract version>` |
| `<Batch chain / reports / migration lot>` | `<...>` |

| Out of scope | Reason / planned for |
|---|---|
| `<...>` | `<next release>` |

## 3. Test campaign summary

| Measure | Planned | Executed | Passed | Failed | Blocked | Not run |
|---|---|---|---|---|---|---|
| Test cases | `<n>` | `<n>` | `<n>` | `<n>` | `<n>` | `<n>` |
| % of planned | 100 % | `<%>` | `<%>` | `<%>` | `<%>` | `<%>` |

| Coverage | Value |
|---|---|
| Requirements covered by at least one executed test | `<n / N (%)>` |
| Critical business scenarios passed end-to-end | `<n / N>` |
| Non-regression campaign | `<executed / partial / not executed>` |
| Non-functional tests (performance, resilience, security) | `<summary + report refs>` |

Test data: ☐ synthetic ☐ anonymized — _confirm that no real personal, card or health data was used, or reference the approved exception._

Campaign report and evidence: `<test tool / report location>`.

## 4. Defects

### Severity definitions
| Severity | Definition |
|---|---|
| Blocking | _Prevents a critical business process; no workaround; or data integrity / security / regulatory breach_ |
| Major | _Significant functional impact; workaround exists but costly_ |
| Minor | _Limited impact; easy workaround_ |
| Cosmetic | _No functional impact_ |

### Defects by severity
| Severity | Found | Fixed and retested | Open | Deferred (accepted) |
|---|---|---|---|---|
| Blocking | | | | |
| Major | | | | |
| Minor | | | | |
| Cosmetic | | | | |
| **Total** | | | | |

### Open defects at decision time
| ID | Title | Severity | Impact | Workaround | Planned fix (version / date) |
|---|---|---|---|---|---|
| DEF-xxx | `<...>` | `<...>` | `<...>` | `<...>` | `<...>` |

_Acceptance criteria usually agreed: zero open Blocking, Major only with workaround and dated commitment. State the agreed criteria here: `<...>`._

## 5. Reservations (réserves)

_Each reservation is a condition attached to the acceptance, with an owner and a lifting criterion._

| ID | Description | Linked defect(s) | Severity | Workaround | Commitment (fix version / date) | Owner | Lifting criterion | Status |
|---|---|---|---|---|---|---|---|---|
| RES-001 | `<...>` | `DEF-...` | `<Major>` | `<...>` | `<x.y.z / YYYY-MM-DD>` | `<role>` | _Retest TC-... passed in UAT_ | Open |

## 6. Decision

☐ **Accepted without reservations** (recette prononcée sans réserve)
☐ **Accepted with reservations** (recette prononcée avec réserves) — listed in §5, to be lifted by `<YYYY-MM-DD>`
☐ **Rejected / postponed** (recette refusée ou ajournée) — reasons: `<...>`; new campaign planned `<YYYY-MM-DD>`

| Item | Value |
|---|---|
| Authorization for production deployment | ☐ Yes ☐ Yes, under conditions: `<...>` ☐ No |
| Conditions before go-live | `<e.g. RES-001 fixed, DEX approved, homologation decision>` |
| Contractual effects | _e.g. start of warranty period, payment milestone: check the contract_ |

## 7. Signatures

_Signature method per organization policy (handwritten, qualified or advanced electronic signature, approval workflow)._

| Role | Name | Organization | Date | Signature |
|---|---|---|---|---|
| Business owner (decision) | `<...>` | `<...>` | | |
| Project manager | `<...>` | `<...>` | | |
| Test / acceptance manager | `<...>` | `<...>` | | |
| Vendor / integrator representative | `<...>` | `<...>` | | |
| Operations representative (for operational acceptance) | `<...>` | `<...>` | | |
| Security (if required) | `<...>` | `<...>` | | |

## Appendices

- Detailed test execution report
- Full defect list export
- Evidence of synthetic / anonymized test data
