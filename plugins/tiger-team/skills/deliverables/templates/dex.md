# Operations Manual (Dossier d'Exploitation — DEX)

## 0. Document control

| Item | Value |
|---|---|
| System / service | `<name>` |
| Document ID | `DEX-<system>-<nnn>` |
| Sensitivity label | `<Internal / Confidential>` |
| Status | `<Draft / In review / Approved>` |
| Audience | _Level 1-2 operators, run team, on-call engineers, service manager_ |

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | `<YYYY-MM-DD>` | `<role>` | Initial draft |

Acceptance by operations: `<name/role, date>` — _the run team validates that it can operate the system with this document alone._

Related documents: _DAT `DAT-xxx`, flow matrix `FLM-xxx`, interface contracts `INT-xxx`, release sheets `REL-xxx`._

## 1. Service overview

| Item | Value |
|---|---|
| Description | _One paragraph: what the service does for the business_ |
| Business criticality | `<High / Medium / Low>`; _critical or important function: yes/no_ |
| Service hours | `<24/7 or Mon-Fri 07:00-20:00 Europe/Paris>` |
| Availability target / RTO / RPO | `<...>` |
| Upstream dependencies | `<systems, partners, infrastructure>` |
| Downstream dependents | `<...>` |
| Change windows / freeze periods | `<...>` |

## 2. Contacts and escalation

_Use roles and team mailboxes or on-call numbers managed by the organization; no personal data in shared versions._

| Role | Team / provider | Hours | Channel | Backup |
|---|---|---|---|---|
| Level 1 (monitoring desk) | `<...>` | `<24/7>` | `<ticket queue / phone line>` | `<...>` |
| Level 2 (run team) | `<...>` | | | |
| Level 3 (application / vendor) | `<...>` | | `<support contract ref>` | |
| Service owner | `<...>` | | | |
| Security (SOC / CERT) | `<...>` | | | |

| Severity | Definition | Response time | Escalation path and delay |
|---|---|---|---|
| P1 | _Service down or data integrity at risk for critical function_ | `<15 min>` | _L1 → L2 immediately → L3 + service owner at 30 min → crisis cell at 1 h_ |
| P2 | _Degraded service, workaround exists_ | `<30 min>` | `<...>` |
| P3 | _Minor impact_ | `<4 h>` | `<...>` |

Regulatory notification: _who decides whether an incident is reportable (DORA, GDPR, NIS2, HDS, sector rules), with the clock and templates location._

## 3. Architecture summary for operations

_Short view; the DAT is the reference._

| Component | Host / service name | Environment | Role | Logs location | Runbook section |
|---|---|---|---|---|---|
| `<APP-A>` | `<srv-app-01>` | PROD | `<...>` | `<path / log index>` | §4, §9 |

URLs and ports: _reference the flow matrix._ Accounts used by the service: _service account names, privileges, where secrets are stored (vault path), rotation frequency; never the secrets themselves._

## 4. Start and stop procedures

| Step | Action | Command / tool | Expected result / check | Duration |
|---|---|---|---|---|
| Stop 1 | _Stop incoming flows (suspend scheduler, disable listeners)_ | `<command>` | `<queue depth stable>` | `<min>` |
| Stop 2 | _Stop application_ | `<command>` | `<process absent>` | |
| Stop 3 | _Stop database (if dedicated)_ | `<command>` | | |
| Start 1 | _Start database_ | `<command>` | `<status OPEN>` | |
| Start 2 | _Start application_ | `<command>` | `<health endpoint 200>` | |
| Start 3 | _Resume flows and scheduler_ | `<command>` | `<first message processed>` | |

## 5. Monitoring and alerting

| ID | Check / metric | Tool | Threshold (warning / critical) | Severity | Action / runbook | Notified |
|---|---|---|---|---|---|---|
| MON-01 | Health endpoint | `<...>` | _fail 3 times in 3 min_ | P1 | §9 KE-01 | L1 |
| MON-02 | Queue depth `<queue>` | | `<1 000 / 10 000>` | P2 | | |
| MON-03 | Interface INT-001 no file received by | | `<06:00>` | P2 | | |
| MON-04 | Certificate expiry | | `<30 d / 7 d>` | P3 | §11 | |
| MON-05 | Disk / filesystem usage | | `<80 % / 90 %>` | P2 | §12 | |

Dashboards: `<names/links>`. Business KPIs monitored: _e.g. messages processed per hour, rejects rate._

## 6. Batch and scheduling

| Job ID | Scheduler / application | Schedule / trigger | Predecessors | Avg / max duration | Restart point | On failure | Contact |
|---|---|---|---|---|---|---|---|
| JOB-001 | `<scheduler>` / `<app>` | `<daily 02:00, business days>` | `<JOB-000>` | `<20 / 45 min>` | _rerun from start / from step N_ | _hold successors, alert L2_ | `<team>` |

Calendars and cut-offs: _bank holidays, month-end, year-end specific runs._ Batch window: `<start-end>`; critical path: `<jobs>`.

## 7. Interfaces and file transfers

| Interface | Direction | Expected time | Control | Replay procedure |
|---|---|---|---|---|
| INT-001 | `<in / out>` | `<before 06:00>` | _record count and control total vs trailer_ | _§10 step R-2; reference interface contract §10_ |

## 8. Backups and restore

| Scope | Method / tool | Frequency | Retention | Location / copy (segregated, immutable?) | RPO | Restore test frequency / last result |
|---|---|---|---|---|---|---|
| Database `<name>` | `<full + incremental + logs>` | `<daily + 15 min>` | `<35 d>` | `<...>` | `<15 min>` | `<quarterly / YYYY-MM-DD OK>` |
| Application config | | | | | | |
| File exchange zone | | | | | | |

Restore procedure: _step by step with commands, checks and expected duration; who authorizes a production restore._

## 9. Run book: known errors

| ID | Symptom / alert | Probable cause | Diagnosis (commands, logs) | Resolution | Escalate if |
|---|---|---|---|---|---|
| KE-01 | `<health check failing>` | `<...>` | `<...>` | `<...>` | _not resolved in 15 min_ |
| KE-02 | `<interface rejects > threshold>` | | | | |

## 10. Restart and recovery procedures

| Step | Action | Check | Owner |
|---|---|---|---|
| R-1 | _Identify last consistent point (last committed transaction, last processed file/sequence)_ | `<query / log>` | L2 |
| R-2 | _Replay or reprocess flows from that point (idempotence ensures no duplicates)_ | _counts reconciled_ | L2 |
| R-3 | _Resume batch from restart point; release held jobs in order_ | _scheduler status_ | Scheduling |
| R-4 | _Business validation of data consistency_ | _business checks list_ | Business owner |

Disaster recovery switchover and switchback: _reference the DR plan; decision authority; expected durations._

## 11. Routine operations

| Task | Frequency | Procedure / command | Owner |
|---|---|---|---|
| Daily health review | Daily | `<...>` | L1 |
| Log and temp file purge | `<...>` | `<...>` | L2 |
| Certificate renewal | _Before expiry, per MON-04_ | `<...>` | `<...>` |
| Secret rotation (service accounts) | `<90 d / policy>` | _via vault_ | `<...>` |
| Access review (accounts, privileges) | `<quarterly>` | `<...>` | Service owner |
| Patching | `<monthly window>` | `<...>` | Infra |

## 12. Capacity and data lifecycle

_Growth assumptions, thresholds triggering extension, purge and archiving rules (retention per data category), archive restore procedure._

## 13. Security operations

- Privileged access: _bastion, MFA, approvals, session recording_
- Security events forwarded to SIEM: `<list>`
- Vulnerability management: _scanning frequency, patch SLA by severity_
- Security incident procedure: _contact SOC/CERT, preserve evidence, do not reboot before agreement_

## 14. Changes and releases

_Change process reference; release sheets archived at `<location>`; configuration items list._

## Appendices

- Command reference
- Log formats and locations
- Glossary
