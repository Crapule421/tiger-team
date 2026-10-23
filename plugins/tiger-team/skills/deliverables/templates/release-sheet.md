# Production Release Sheet (Fiche de mise en production — fiche MEP)

## 1. Identification

| Item | Value |
|---|---|
| Release ID / name | `<REL-YYYY-nnn>` / `<name>` |
| Change ticket | `<CHG-nnnnn>` — CAB approval `<YYYY-MM-DD>` |
| System(s) impacted | `<...>` |
| Window | `<YYYY-MM-DD HH:MM> → <HH:MM> Europe/Paris` |
| Service interruption | `<none / HH:MM-HH:MM, services affected>` |
| Point of no return | `<HH:MM>` — _after this time, rollback is no longer possible or becomes a new change_ |
| Rollback decision deadline | `<HH:MM>` — _latest time to start rollback and still finish within the window_ |
| Release manager | `<role>` |
| Status | `<Draft / Approved / Executed / Closed>` |
| Sensitivity label | `<Internal / Confidential>` |

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | `<YYYY-MM-DD>` | `<role>` | Draft |

## 2. Scope

| Component | From version | To version | Artifact / package | Checksum (SHA-256) |
|---|---|---|---|---|
| `<APP-A>` | `<1.4.2>` | `<1.5.0>` | `<repository path>` | `<...>` |

| Change type | Detail | Reversible? |
|---|---|---|
| Database | _scripts, schema changes, data migrations, estimated duration_ | `<yes: script ref / no>` |
| Configuration | _parameters, feature flags_ | |
| Scheduling | _jobs added, modified, removed_ | |
| Network / firewall | _flows FLW-xxx_ | |
| Certificates / secrets | _rotation, new certificates (no values here)_ | |

Linked items: _UAT sign-off `<ref>` (with reservations?), requirements, defects fixed, known issues accepted._

## 3. Prerequisites checklist (D-5 to D-0)

| ID | Check | Owner | Status |
|---|---|---|---|
| PRE-01 | Change approved (CAB), business informed | PM | ☐ |
| PRE-02 | UAT sign-off obtained (`PVR-xxx`); reservations accepted for production | PM | ☐ |
| PRE-03 | Packages staged and checksums verified | DevSecOps | ☐ |
| PRE-04 | Production access and accounts ready for each operator (named, time-bound) | Infra | ☐ |
| PRE-05 | Firewall flows opened and tested | Infra | ☐ |
| PRE-06 | Pre-release backup planned and restore path confirmed | DBA | ☐ |
| PRE-07 | Rollback procedure rehearsed (pre-production) | All | ☐ |
| PRE-08 | Scheduler holds prepared; interface partners informed | Scheduling / Integration | ☐ |
| PRE-09 | Monitoring maintenance mode planned (to avoid false alerts), then re-enabled | Run | ☐ |
| PRE-10 | Release rehearsed in pre-production with timings | All | ☐ |
| PRE-11 | Business testers available for post-release checks | Business owner | ☐ |

## 4. Team and contacts

_Roles, not personal data, in shared versions. Bridge / chat channel for the release: `<...>`._

| Role | Person / team | Availability | Channel |
|---|---|---|---|
| Release manager (go/no-go chair) | `<...>` | `<window + 2 h>` | `<...>` |
| Technical operators | `<...>` | | |
| DBA | `<...>` | | |
| Business validator | `<...>` | | |
| Vendor support (on call) | `<contract ref>` | | |
| Decision escalation (management) | `<...>` | | |

## 5. Go / No-Go checkpoints

| Checkpoint | Time | Criteria | Decision by | Decision |
|---|---|---|---|---|
| GNG-0 (D-5 readiness) | `<...>` | _PRE-01 to PRE-11 on track; every open item has an owner and a date_ | Release manager + PM | ☐ Go ☐ No-go |
| GNG-1 (D-1 final go) | `<...>` | _All prerequisites done; no open P1/P2 incident; freeze respected_ | Release manager + service owner | ☐ Go ☐ No-go |
| GNG-2 (H0 start) | `<HH:MM>` | _Team present; backups OK; production stable_ | Release manager | ☐ Go ☐ No-go |
| GNG-3 (pre-PNR) | `<HH:MM>` | _Steps on schedule; technical checks OK; rollback still fits before the deadline_ | Release manager | ☐ Go ☐ Rollback |
| GNG-4 (opening) | `<HH:MM>` | _Smoke tests and business checks OK_ | Release manager + business | ☐ Open ☐ Rollback |

## 6. Timed run sheet

_One row per atomic action. Times are planned; record actual times live. A step only starts when its predecessor is checked._

| Step | Planned start | Duration | Action | Command / procedure ref | Owner | Checker | Expected result | Actual time | Status | Comment |
|---|---|---|---|---|---|---|---|---|---|---|
| 01 | `<20:00>` | 5 min | Open release bridge, roll call | — | RM | — | All present | | ☐ | |
| 02 | `<20:05>` | 10 min | Hold scheduler jobs `<JOB-xxx>`, stop inbound interfaces | `<ref>` | Scheduling | Run | Queues stable | | ☐ | |
| 03 | `<20:15>` | 5 min | Display maintenance page / block user access | `<ref>` | Infra | Run | Page displayed | | ☐ | |
| 04 | `<20:20>` | 20 min | Pre-release backup | `<ref>` | DBA | Infra | Backup OK, logged | | ☐ | |
| 05 | `<20:40>` | 15 min | Stop application | DEX §4 | Run | Infra | Processes stopped | | ☐ | |
| 06 | `<20:55>` | 30 min | Run database scripts | `<ref>` | DBA | Dev | Scripts OK, row counts as expected | | ☐ | |
| 07 | `<21:25>` | 15 min | Deploy packages, apply configuration | `<ref>` | DevSecOps | Run | Versions match §2 | | ☐ | |
| 08 | `<21:40>` | 10 min | Start application | DEX §4 | Run | Infra | Health checks green | | ☐ | |
| 09 | `<21:50>` | 15 min | Technical smoke tests | `<ref>` | Dev | Run | All pass | | ☐ | |
| 10 | `<22:05>` | — | **GNG-3 (pre-PNR)**: continue or roll back | §5 | RM | — | Decision recorded | | ☐ | |
| 11 | `<22:10>` | 20 min | Business checks | `<ref>` | Business | RM | All pass | | ☐ | |
| 12 | `<22:30>` | — | **GNG-4 (opening)**: open or roll back | §5 | RM | — | Decision recorded | | ☐ | |
| 13 | `<22:35>` | 10 min | Resume interfaces and scheduler; remove maintenance page — **point of no return** | `<ref>` | Scheduling | Run | First flows processed | | ☐ | |
| 14 | `<22:45>` | 10 min | Re-enable monitoring; close bridge; communication | §8 | RM | Run | Alerts active | | ☐ | |

## 7. Rollback plan

**Triggers** (pre-agreed, applied without debate before the point of no return): _GNG-3 or GNG-4 criteria not met; blocking defect without workaround; rollback decision deadline `<HH:MM>` reached with steps still open; data integrity doubt._

| Step | Duration | Action | Command / ref | Owner | Expected result |
|---|---|---|---|---|---|
| RB-01 | `<...>` | Stop application and interfaces | DEX §4 | Run | Stopped |
| RB-02 | `<...>` | Redeploy previous version `<x.y.z>` | `<ref>` | DevSecOps | Previous version running |
| RB-03 | `<...>` | Revert database (rollback scripts or restore backup from step 04) | `<ref>` | DBA | Schema and data at pre-release state |
| RB-04 | `<...>` | Revert configuration, scheduler and flows | `<ref>` | Scheduling / Infra | As before |
| RB-05 | `<...>` | Smoke tests and business checks on previous version | `<ref>` | Dev / Business | Pass |
| RB-06 | `<...>` | Resume service; communicate | §8 | RM | Service restored |

Total rollback duration estimate: `<...>`. Data created after opening and before rollback: _how it is preserved or replayed._

## 8. Communication plan

| When | Message | Audience | Channel | Owner |
|---|---|---|---|---|
| D-5 | Announcement, interruption window | Users, partners | `<...>` | PM |
| Start | Release started | Stakeholders | | RM |
| Any deviation | Delay, rollback decision | Stakeholders, management | | RM |
| End | Result, known issues, support contact | Users, partners | | RM |

## 9. Post-release

- Hypercare period: `<duration>`, reinforced monitoring on `<...>`.
- Checks at D+1: _batch results, interface volumes vs usual, error rates, business feedback._

## 10. Closure

| Item | Value |
|---|---|
| Outcome | ☐ Success ☐ Success with issues ☐ Rolled back ☐ Aborted |
| Actual end time | `<HH:MM>` |
| Incidents raised | `<INC-...>` |
| Deviations from plan | `<...>` |
| Lessons learned / actions | `<RAID items>` |

| Role | Name | Date | Sign-off |
|---|---|---|---|
| Release manager | `<...>` | | |
| Service owner | `<...>` | | |
| Business owner | `<...>` | | |
