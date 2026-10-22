# Cross-scheduler mapping - VTOM / Dollar Universe / Control-M

Use this file to compare the three tools and to convert chains between them. Equivalences are conceptual: no row is a guaranteed 1:1 conversion. Product-specific names, keys and commands are detailed (with their "verify" flags) in `vtom.md`, `dollar-universe.md` and `control-m.md` of this folder.

## Contents
1. Concept equivalence table
2. Neutral intermediate model (pivot)
3. Conversion procedure
4. Conversion pitfalls
   4.1 Calendars and planning
   4.2 Processing date / order date
   4.3 Cyclic jobs
   4.4 Restart and operator semantics
   4.5 Resources and concurrency
   4.6 Variables and parameters
   4.7 Dependencies inside and across applications
   4.8 Time zones and DST
   4.9 Error paths, exit codes, alerting
   4.10 Execution context (hosts, accounts, queues, wrappers)
5. Manual-points checklist (what never converts 1:1)
6. Validation strategy

## 1. Concept equivalence table

| Concept | VTOM | Dollar Universe | Control-M |
|---|---|---|---|
| Scheduling domain | VTOM server (domain) | Company + node(s), UVMS | Control-M/EM + Control-M/Server (data center) |
| Lifecycle stage | Separate environments or servers | Areas A / I / S / X | Separate servers/EM or folders per environment + deploy descriptors |
| Business grouping | Environment | Application/domain fields, MU, naming | Application / Sub-application fields |
| Chain container | Application | Session (launched by a task) | Smart folder (or folder) |
| Unit of work | Job (traitement) | Uproc | Job |
| What runs | Script + parameters (via queue submitter) | Uproc type CL_INT / CL_EXT / CMD | `Job:Script` / `Job:Command` / `Job:EmbeddedScript` |
| No-op / milestone | Job with no-op script or simulated mode (verify) | Uproc doing nothing (dummy script) | `Job:Dummy` |
| Execution target | Machine (agent) | MU mapped to a node | `Host` (agent or host group) |
| Fan-out on N targets | One job per machine, or version-specific multi-machine features (verify) | Task on MU type / task template (one launch per MU) | Host group (one run on one member; a multi-agent option runs on all members - verify) or one job per host |
| Run-as account | Submission unit | Submission account of the task | `RunAs` |
| Submission queue | Queue (submitter wrapper) | Batch queue | No direct equivalent (agent, workload policies, quantitative resources) |
| Schedule trigger | Application/job planning | Task (scheduled) + rules + calendar | Folder/job `When` + calendars/RBC, ordered at New Day |
| Manual-only chain | Unplanned application launched by operator (verify) | Optional task / `uxordre` | `OrderMethod` manual + `ctm run order` |
| Event-triggered chain | Resource condition / external trigger (verify) | Provoked task | Event (condition) added externally (`ctm run event::add`), file watcher |
| Processing date | Exploitation date object (date switch) | Processing date computed by the task (functional period) | Order date (ODATE), New Day procedure |
| Working-day calendar | Calendar | Calendar (general / MU) | Regular / periodic calendar, rule-based calendar |
| Complex periodicity | Formula | Rule(s) + exceptions | RBC / calendar combinations (`DaysRelation`) |
| Earliest start | Start time | Launch window start | `FromTime` |
| Latest start | Latest start time (action on overrun) | End of launch window (time overrun) | `ToTime` (+ late-submission notification) |
| Cyclic run | Cyclic application/job (period in window) | Cyclic task | Cyclic job (interval / interval sequence / specific times) |
| Precedence in chain | Link | Session tree (normal path) | Event add/wait or `Flow` |
| Run on failure of X | On-error link (verify) | Session error path | If `NOTOK` -> add event / run job, or On/Do |
| Cross-chain dependency | Inter-application / inter-environment link | Uproc dependency condition (session/MU/date scope) | Same event name across folders (global conditions across servers) |
| "Did not run" condition | No direct equivalent (verify) | "Absent" expected status | No direct equivalent (design with events + time) |
| Mutual exclusion | Weight/numeric resource capacity 1 | Incompatibility condition or exclusive resource | `Resource:Mutex` Exclusive (control resource) |
| Concurrency quota | Weight resource capacity N | Resource with quotas | `Resource:Semaphore` (quantitative) + server capacity |
| File prerequisite | File resource | File resource condition | `Job:FileWatcher:*` / `ctmfw` |
| Business flag | Text/numeric/date resource | Logical resource / event | Event (condition) or pool/global variable |
| Parameters | Job parameters, `TOM_*` variables | Uproc variables, `S_*` variables | Variables `%%NAME`, `Arguments` |
| Date variable | Exploitation date value | `S_DATRAIT` (verify) | `%%$ODATE` (YYYYMMDD), `%%ODATE` (YYMMDD) |
| Retry on failure | Retry count/delay on job (verify) | Automatic retry options (verify) | Rerun (max reruns + interval) / If -> `Action:Rerun` |
| Force success | Force to finished | Force completion | Set to OK |
| Operator instructions | Consignes | Uproc/task comments, documentation | `Description`, documentation file/URL |
| Alerting | Alarms | Alerts/monitoring via UVMS, error-path uprocs | Shout / `Notify:*` / Services (SLA) |
| Export format | XML (`vtexport`) | Extraction file (`uxext`) / UVC export | JSON (`ctm deploy jobs::get`) / EM XML |

## 2. Neutral intermediate model (pivot)

Normalise the source into this model before generating the target; it makes gaps visible.

| Entity | Fields |
|---|---|
| Chain | name, owner, criticality, processing-date rule (D, D-1...), calendar ref, window (earliest start, cut-off), environment variables |
| Job | id, name, description, type (script/command/dummy/file-watch/plugin), command or script path, arguments, host or host group, run-as, queue, planning (inherit/own), time constraints (from/until/latest start), cyclic (mode, interval, from start/end, window, max runs), retries (count, delay), exit-code mapping, resources used, variables read, run book ref |
| Dependency | from, to, condition (OK / NOTOK / ANY / absent), date scope (same / previous / any / static), cross-chain? cross-server? |
| Resource | name, type (exclusive/quota/file/flag), capacity, release semantics |
| Calendar | name, definition (explicit dates or rules), holidays set (national, T2, regional), years covered |
| Alert | trigger (fail, late start, long run, cut-off risk), destination, urgency |

## 3. Conversion procedure

1. Get exports from the source (never a hand-written description only), plus scripts or wrappers if they set statuses or variables.
2. Inventory and normalise into the pivot model; list every object attribute that has no pivot field (they are manual points).
3. Map using section 1, apply the target's naming convention and taxonomy.
4. Generate target definitions (Control-M: Automation API JSON validated by `ctm build`; Dollar Universe and VTOM: a structured specification or the format of a real export from the target version - never invent a file format).
5. Produce the manual-points list (section 5) with an owner for each.
6. Validate (section 6) before switching production.

## 4. Conversion pitfalls

### 4.1 Calendars and planning
- Holiday sets differ by tool and by owner (national vs T2 vs regional); rebuild calendars from the business definition, not by copying computed dates.
- Rule semantics differ ("Nth working day", shift to previous/next working day, "last day of month" when it is a holiday). Compare a full-year forecast of source vs target, day by day, including Easter-dependent holidays and year boundaries.
- Control-M regular calendars are lists of dates per year: converting a VTOM formula or a $U rule into a static calendar creates a yearly maintenance burden - prefer rule-based calendars.
- Job-level planning exceptions (job runs only on Mondays inside a daily chain) must be kept as job-level criteria; do not silently promote to chain level.

### 4.2 Processing date / order date
- VTOM date switch (event-driven), $U task-computed processing date, Control-M New Day ordering (time-driven) do not fire at the same moment. A night chain on D-1 data must keep the same business date semantics: map explicitly (e.g. Control-M script parameter `%%$ODATE` plus an offset computed in the script or a variable, or New Day time aligned with the business day start).
- Jobs running after midnight: in Control-M they keep the ODATE of their order; in VTOM they keep the exploitation date until the switch; in $U they keep the processing date of the launch. Check that scripts use the passed date, not the system date.

### 4.3 Cyclic jobs
- Interval reference differs (from start vs from end vs fixed times); overlap handling differs; behaviour on failure differs (stop cycling vs continue).
- $U cyclic tasks generate launches (each with its own conditions evaluation); Control-M cyclic job is one job rerun at interval; VTOM cycles a job/application within a window. Re-check resource and condition interactions per cycle.
- Define an end time, a max number of runs and overlap protection in the target even if the source did not have them; flag the change.

### 4.4 Restart and operator semantics
- $U steps (restart at a step) have no direct equivalent in Control-M distributed jobs or VTOM: move step logic into the script (restart table, "from step" parameter) or split into several jobs.
- "Force OK"/"force completion"/"force to finished" all release successors but may differ in produced events/conditions and in resource release - document per target.
- "Absent" ($U) and "on error" paths need explicit redesign in Control-M (If NOTOK -> add event / run job).
- Operator habits change: update run books and train operators before go-live.

### 4.5 Resources and concurrency
- VTOM weights / $U quotas -> Control-M quantitative resources need server-side capacity definitions; exclusive -> `Resource:Mutex` Exclusive.
- $U incompatibility conditions (do not run while X runs) map to a shared exclusive control resource on both jobs - both sides must be edited.
- Queues (VTOM queue submitters, $U batch queues) carry implicit concurrency and environment setup: reproduce concurrency with resources/workload policies and environment with a wrapper or profile on the target agent.
- Release on kill/force may differ: test.

### 4.6 Variables and parameters
- `TOM_*` and `S_*` context variables do not exist in Control-M: replace by `%%` AutoEdit variables passed as arguments or exported by a wrapper; grep scripts for them (`grep -nE 'TOM_|S_[A-Z]+'`).
- Date formats: `%%ODATE` is YYMMDD - use `%%$ODATE` when the script expects YYYYMMDD.
- Scripts that call tool-specific commands (`tsend`, `ux*` commands, `ctm*` utilities) must be rewritten; list them as manual points.
- Variable scoping (job vs folder vs global/pool) changes visibility - map each variable to the narrowest scope.

### 4.7 Dependencies inside and across applications
- Session trees ($U) and link graphs (VTOM) become explicit events in Control-M; keep a deterministic naming (`<SRC>-TO-<DST>`) and delete consumed events (or rely on dated conditions).
- Cross-chain conditions with MU scope ($U) or inter-environment links (VTOM) need an explicit target design: same Control-M server (local events) or different servers (global conditions in EM).
- Date scope ("same processing date", PREV, any) must be preserved; "any date" in the source is a smell to raise, not to copy.
- Dependencies to chains not migrated yet (coexistence period): bridge with events added by a job/API call from the source scheduler or with file triggers; document the temporary bridge and its removal date.

### 4.8 Time zones and DST
- Scheduler server, agents/nodes and databases may use different time zones; map each time constraint to a reference zone (Europe/Paris for most French chains).
- EU DST: in March 02:00-03:00 does not exist (jobs at 02:30 may run at 03:00 or be skipped, depending on the tool); in October 02:00-03:00 occurs twice (time-triggered jobs may run twice, cyclic intervals stretch or shrink). Behaviour differs per tool and version - verify and simulate both DST weekends.
- Recommendation: avoid scheduling time-triggered jobs between 02:00 and 03:00 local time; for cyclic jobs, accept one shifted cycle and protect idempotence.

### 4.9 Error paths, exit codes, alerting
- Exit-code interpretation (warning ranges, output-scanning rules) lives in different places: VTOM submitter/queue, $U uproc status handling, Control-M On/Do or If:Output rules. Collect all of them; reproduce explicitly.
- Alarms (VTOM), alerts ($U), Shouts/Notifications/Services (Control-M) - rebuild the alert matrix, including "late start" and "not finished by cut-off".

### 4.10 Execution context (hosts, accounts, queues, wrappers)
- The source wrapper (VTOM submitter, $U launcher environment) often loads profiles, sets umask, redirects logs or locale (LANG, NLS_LANG): reproduce it on the target agent or the job will behave differently.
- Account mapping (submission unit / submission account -> RunAs) must keep least privilege; credentials for Windows run-as are managed differently per tool.
- IBM i targets: job description, job queue, library list and user profile are part of the execution context (hand off to ibmi-expert).

## 5. Manual-points checklist (what never converts 1:1)

| # | Point | Why |
|---|---|---|
| 1 | Calendars and complex rules/formulas | Semantics and holiday sets differ; must be rebuilt and compared by forecast. |
| 2 | Processing-date model (date switch vs task date vs New Day) | Different triggers and lifetimes. |
| 3 | Cyclic definitions | Interval reference, overlap, failure behaviour. |
| 4 | Step-level restart ($U steps) | No direct equivalent; script redesign. |
| 5 | "Absent" / "did not run" conditions | No direct equivalent. |
| 6 | Incompatibility conditions | Become shared resources on both jobs. |
| 7 | Queues and wrappers | Hidden environment and concurrency. |
| 8 | Context variables (`TOM_*`, `S_*`, `%%`) and tool commands in scripts | Script changes needed. |
| 9 | Cross-chain / cross-server dependencies and coexistence bridges | Topology-specific. |
| 10 | Alerting, SLA services, operator instructions | Different mechanisms; run books to update. |
| 11 | Multi-target fan-out (MU types, machine lists, host groups) | Different semantics (all targets vs one of a group). |
| 12 | Security: run-as credentials, rights on objects, audit | Tool-specific stores and role models. |
| 13 | Time zones and DST behaviour | Tool/version-specific. |
| 14 | Retention: logs, outputs, events/conditions | Different defaults and purge jobs. |

## 6. Validation strategy

1. **Static**: target definitions validated by the tool (`ctm build` for Control-M; import into a test area/server for $U and VTOM); naming and site standards checked.
2. **Forecast comparison**: for 13 months (covers year-end and both DST changes), compare planned run days per job between source and target; every difference explained.
3. **Graph comparison**: same nodes and edges (after mapping), same condition types and date scopes.
4. **Dry run**: run the chain on a test environment with dummy or real scripts; check order, resources, alerts, restart scenarios (fail each critical job once).
5. **Parallel run** (where feasible): source in production, target in simulation/no-op mode for one or more business cycles (including a month-end); compare timings and dependencies.
6. **Cut-over plan**: freeze changes, export last source state, deploy target, disable source chains atomically, keep rollback (source definitions re-enabled) for an agreed period.
