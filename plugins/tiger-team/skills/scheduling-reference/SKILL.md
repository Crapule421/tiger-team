---
name: scheduling-reference
description: Batch scheduling knowledge base - robust chain principles, review checklist, restart method; references for VTOM, Dollar Universe and Control-M (Automation API) with a cross-tool mapping.
user-invocable: false
---

# Scheduling reference - robust batch chains

Product-neutral principles first; product specifics are in `references/`. Scheduler features, field names and CLI options differ between major versions: anything flagged "verify against your version" must be checked in the vendor documentation of the installed release before it goes into a deliverable. Never invent commands, flags, JSON keys or object attributes.

## 1. Reference files

- `references/vtom.md` - read when the chain runs on Visual TOM (environments, applications, jobs, exploitation dates, links, resources, queues/submitters, restart, vtexport/vtimport) - full path `${CLAUDE_PLUGIN_ROOT}/skills/scheduling-reference/references/vtom.md`
- `references/dollar-universe.md` - read when the chain runs on Dollar Universe (company, node, areas X/S/I/A, uprocs, sessions, tasks, MUs, conditions, launch windows, uxlst/uxshw/uxext/uxins/uxordre) - full path `${CLAUDE_PLUGIN_ROOT}/skills/scheduling-reference/references/dollar-universe.md`
- `references/control-m.md` - read when the chain runs on Control-M or when you must produce Automation API JSON / use the `ctm` CLI (folders, smart folders, conditions, resources, calendars, If/Do actions) - full path `${CLAUDE_PLUGIN_ROOT}/skills/scheduling-reference/references/control-m.md`
- `references/mapping.md` - read when comparing tools or converting a chain between VTOM, Dollar Universe and Control-M (equivalence table, conversion pitfalls: calendars, cyclic, restart, resources, variables, cross-application dependencies, time zones, DST) - full path `${CLAUDE_PLUGIN_ROOT}/skills/scheduling-reference/references/mapping.md`

## 2. Neutral vocabulary (use it in cross-tool documents)

| Term | Meaning |
|---|---|
| Chain | Set of jobs with dependencies delivering one business outcome (e.g. accounting close, payment file generation). |
| Job | Smallest schedulable unit; runs one script/program on one host under one account. |
| Processing date | Business date the run is about (VTOM exploitation date, $U processing date, Control-M ODATE). Never the system clock. |
| Window | Time interval during which a chain may run (start not before / must end before = cut-off). |
| Dependency | Precedence rule between jobs (on success, on failure, on any end, on time, on file, on external event). |
| Resource | Shared asset protected by the scheduler: exclusive lock, quota/semaphore, file presence. |
| Restart point | Where a failed chain may resume without corrupting data. |
| Critical path | Longest duration path through the dependency graph to the cut-off; zero slack. |
| Run book | Operator documentation: purpose, inputs/outputs, restart procedure, escalation. |

## 3. Core principles of a robust batch chain

### 3.1 Idempotence (a rerun gives the same result)
- Load pattern: stage then swap/merge (MERGE/upsert on business key) instead of blind INSERT; or delete-then-insert scoped to the processing date/partition, in one transaction.
- Every job derives its scope from the processing date parameter, never from "today" or "last run".
- Output files: write to `name.tmp`, verify (count, checksum, trailer), then atomic rename. A rerun overwrites, never appends.
- Outbound transfers and notifications are NOT idempotent: track "already sent" (transfer ID, acknowledgment, control table) and make the send job check it.
- Sequence/counter consumption (invoice numbers, IBAN-like references): allocate per processing date and reuse on rerun, or flag the job as non-rerunnable and document compensation.

### 3.2 Restartability and checkpoints
- Each job is atomic (all-or-nothing) or has explicit checkpoints (commit every N records + restart table storing last key processed).
- First step of a job cleans its own partial output (truncate staging, delete tmp files) - never someone else's input.
- Do not delete or move input files until the consuming job ended OK; archive (move) rather than delete; purge in a separate scheduled job with retention.
- Restart granularity: job (all tools), step inside job ($U steps; z/OS step restart products), chain/sub-chain (rerun from a node). Document for each job: rerun as-is / rerun after cleanup / never rerun (compensate).
- Long jobs (> 30 min) without checkpoint are a window risk: a failure at 90% costs 100% again.

### 3.3 Parameters and processing date
- Pass the processing date and environment-specific values as scheduler variables/parameters; scripts must fail fast if a mandatory parameter is missing.
- Same definitions in all environments; only variables differ (host, account, paths, DB alias). Variables per environment are versioned.
- Date formats explicit (YYYYMMDD). Beware Control-M `%%ODATE` = YYMMDD vs `%%$ODATE` = YYYYMMDD.

### 3.4 Windows, cut-offs and critical path
- For each chain: earliest start, external prerequisites (files, upstream chains, online closure), cut-off (online reopening, partner deadline, T2/SEPA cut-off, regulatory reporting time), backup slot.
- Compute the critical path with P90 durations (not averages) plus waits (resources, file arrivals, time gates). Keep a margin of at least the duration of one rerun of the longest critical-path job, or document why not.
- Collisions: backups, DB maintenance (stats, reorg), month-end/quarter-end peaks, other chains on the same DB/tables, antivirus/scan jobs, patching windows.
- Monitor drift: duration trend per job; alert when a job exceeds P90 x 1.5 or a "must start by" time is missed.

### 3.5 Dependencies
- Explicit dependencies only. No "sleep 600" and no time-based ordering to simulate a dependency.
- Each dependency states its condition (OK, NOTOK, any end) and its date scope (same processing date, previous, any). Cross-chain dependencies are documented in both chains.
- File dependencies: trigger file or watcher + completeness check (size stable, trailer, checksum, expected count), never "file exists" alone.
- Avoid deep fan-in on a single job without timeout; avoid conditions that can never be satisfied (orphan conditions after a job is removed).

### 3.6 Resources and concurrency
- Protect shared assets with scheduler resources (exclusive lock for "only one writer on table X", quota for "max 4 jobs on DB Y"), not with ad hoc lock files.
- Size quotas from the target's capacity (DB sessions, CPU, licence counts, partner connection limits).
- Resource leaks: a killed job must release its resource; check each tool's behaviour on kill/force-OK.

### 3.7 Files and transfers
- Naming with processing date and sequence; encoding/charset declared (UTF-8 vs ISO-8859-15 vs EBCDIC); line endings; record count in trailer.
- Transfer via the MFT tool (e.g. CFT, SFTP gateway) with acknowledgment; the scheduler waits for the ack event, not for the end of the send command.
- Purge and archive jobs scheduled, with retention aligned to legal/regulatory needs.

### 3.8 Exit-code contract and logs
- 0 = OK; non-zero = failure; optionally reserved codes for warning (e.g. 1-3 = warning, >= 4 = error) mapped explicitly in the scheduler. A script must never exit 0 after an error (check `set -e`/`pipefail`, `$?` after each critical command, `%ERRORLEVEL%` on Windows).
- Logs: start/end timestamps, parameters (no secrets), counts in/out/rejected, return code; one log per run (processing date + run number in the name); retention defined.

### 3.9 Monitoring and alerting
- Alerts: job failed, job late to start (missed "must start by"), job running too long, chain not finished by cut-off minus margin, resource wait too long, agent unavailable.
- Each alert is actionable: routed to an on-call group with a run book link. No alert on expected states.
- Business SLA view: chain-level service (Control-M services/BIM, equivalent dashboards elsewhere).

### 3.10 Security and compliance
- Run-as accounts: least privilege, one per application/domain, no interactive login, no root/Administrator/QSECOFR-class accounts for application jobs.
- No secrets in scripts, command lines, job definitions or exported files: use a vault or the scheduler's credential store; command lines are visible in process lists and job outputs.
- Traceability of operator actions (force OK, skip, hold, rerun with modified parameters): who, when, why - auditable (DORA ICT incident and change records in banking, HDS in healthcare).
- Segregation of duties: definition changes go through change management; production operators do not edit definitions.

### 3.11 Environments and change management
- Definitions as code: export (XML/JSON/text), version in Git, diff before promotion, promote the same artifact DEV -> test -> pre-prod -> PROD with environment variables substituted.
- Validate after import: forecast/simulation for the next N days compared with the previous version.

### 3.12 Calendars (France/EU)
- French public holidays: 1 Jan, Easter Monday, 1 May, 8 May, Ascension Thursday, Whit Monday, 14 Jul, 15 Aug, 1 Nov, 11 Nov, 25 Dec. Alsace-Moselle adds Good Friday and 26 Dec. Overseas departments have additional days.
- T2 (ex-TARGET2) closing days: 1 Jan, Good Friday, Easter Monday, 1 May, 25 Dec, 26 Dec. Banking settlement chains follow the T2 calendar, not the national one.
- Distinguish calendar types: working days, settlement days, closing days, month-end close calendar (e.g. "D-3 working days before month end"). Shift rules: if non-working, run previous/next working day/do not run.
- Calendars expire: tools with yearly calendars need an owner and a yearly update before Q4; prefer rule-based definitions.
- EU DST: last Sunday of March 02:00 -> 03:00; last Sunday of October 03:00 -> 02:00. Jobs between 02:00 and 03:00 and cyclic jobs need an explicit decision (see `references/mapping.md`).

### 3.13 Run book - minimum content per job
Purpose; owner; host/account; inputs (files, tables) and outputs; dependencies up/down; expected duration (P50/P90) and latest end; restart procedure (rerun as-is / cleanup + rerun / do not rerun + compensation); what "force OK" implies downstream; escalation contacts and hours; criticality; known errors and fixes.

## 4. Review checklist (use for any chain)

| # | Axis | Check |
|---|---|---|
| 1 | Inventory | All jobs, hosts, run-as accounts, scripts, resources, calendars listed; no orphan objects; naming convention respected. |
| 2 | Dependencies | DAG without cycles; every job reachable; no implicit ordering by time; condition type and date scope explicit; cross-chain dependencies documented both sides. |
| 3 | Scheduling | Calendars correct for the business (national vs T2 vs close calendar); shift rules; month-end/year-end; DST handled; time zone of server vs agents. |
| 4 | Windows | Earliest start, cut-off, external prerequisites documented; critical path within window with margin. |
| 5 | Restartability | Each job: idempotent or checkpointed; cleanup step; restart procedure documented; non-rerunnable jobs flagged. |
| 6 | Error handling | Exit-code contract; warning vs error mapping; on-failure branch defined (stop chain, alert, compensating job); retries only for transient errors with delay and bound. |
| 7 | Resources | Shared targets protected (exclusive/quota); quotas sized; release on kill verified. |
| 8 | Files | Completeness checks, atomic rename, encoding, archive/purge, MFT acknowledgments. |
| 9 | Monitoring | Fail, late start, long run, cut-off at risk, agent down; alert routing; run book links. |
| 10 | Security | Least-privilege run-as; no secrets in definitions/scripts/args; operator actions audited. |
| 11 | Operability | Run book complete; logs with counts; job output retention; holiday/peak behaviour known. |
| 12 | Change | Definitions versioned; environment variables separated; forecast compared after change. |

## 5. Incident and restart method

1. **Detect and qualify**: which job, which processing date, exit code, first error in log, since when; is the chain on the critical path; time left before cut-off.
2. **Contain**: hold downstream jobs that are not yet started if the failed output may be consumed partially; stop cyclic triggers if they will multiply the failure; do not delete anything.
3. **Diagnose**: classify the cause -
   - transient (lock timeout, network, agent restart, file late) -> rerun as-is after cause is gone;
   - data (bad input, reject threshold) -> fix/replace input with business owner approval, rerun;
   - code/config (deployment, parameter, credential expiry) -> fix through emergency change, rerun;
   - infrastructure (disk full, DB down) -> hand off, wait, rerun.
4. **Assess side effects**: what did the failed run already write/send? Partial DB commits, files transferred, messages published, mails sent. Decide cleanup or compensation before any rerun.
5. **Decide** (decision table):

| Situation | Action |
|---|---|
| Job atomic or idempotent, cause removed | Rerun the job. |
| Job checkpointed | Restart from checkpoint/step; verify the restart table. |
| Partial output, not idempotent | Cleanup (documented procedure) then rerun; or restore point then rerun. |
| Output not needed today / business accepts | Force OK (set to OK/finished) with written approval; record downstream impact. |
| Job must not run twice (sent payment file) | Never rerun blindly: verify partner receipt, then force OK or targeted resend. |
| Cut-off cannot be met | Escalate early (business + management), apply degraded mode from run book. |

6. **Execute and verify**: restart, watch the next jobs, verify counts/totals against expected, confirm downstream consumers.
7. **Record**: incident ticket with timeline, operator actions (who forced what), root cause, permanent fix; feed the run book; for DORA-regulated entities assess classification as major ICT incident.

## 6. Critical path - quick method
1. Build the DAG (jobs = nodes, dependencies = edges); add virtual nodes for external waits (file arrival times, upstream chains, time gates).
2. Duration per job = P90 over the last 30-60 comparable runs (separate month-end runs).
3. Forward pass: earliest start/finish; backward pass from the cut-off: latest start/finish; slack = latest - earliest.
4. Critical path = zero/minimal slack; margin = cut-off - projected end. Report the top 5 jobs by contribution and the "rerun cost" of each.
5. Levers: parallelize independent branches, split long jobs with checkpoints, move non-critical jobs off the path, start earlier on partial prerequisites, tune resources/quotas, DB indexing (hand off to dba-expert).

## 7. Anti-patterns (flag them)
- Time-based sequencing ("job B at 02:00 because A usually ends at 01:30").
- `exit 0` at the end of a script regardless of errors; `|| true` on critical commands.
- System date inside scripts instead of the processing date parameter.
- One giant job doing extract + transform + load + send, without checkpoint.
- Force OK as a routine fix; reruns with silent parameter changes not traced.
- Hard-coded host names, paths and passwords in scripts; same account for all applications.
- Calendars maintained by hand each year without owner; holidays defined in scripts.
- Cyclic jobs without end time or overlap protection.
- Conditions/events never cleaned (stale condition releasing a job on the wrong day).
- Alerts on every warning; no alert on "not started".
