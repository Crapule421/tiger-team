# Control-M (BMC) - reference

Scope: architecture, folders and jobs, scheduling and calendars, conditions/events, resources, cyclic jobs, variables, actions and notifications, restart, Automation API JSON and the `ctm` CLI, classic utilities, design and review rules. Control-M exists on-premises (Control-M/EM + Control-M/Server + Agents, plus Control-M for z/OS) and as SaaS. JSON keys below are those of the Automation API "Code Reference"; where a key or value set varies by version it is flagged **verify against your version**. Never add keys that are not in the Code Reference: `ctm build` rejects unknown structures.

## Contents
1. Architecture
2. Folders, smart folders, jobs
3. Scheduling: order date, New Day, calendars
4. Conditions (events)
5. Resources
6. Time windows, cyclic jobs, reruns
7. Variables
8. Post-processing: On/Do, If actions, notifications
9. Statuses, operator actions, restart
10. Automation API JSON - structure and examples
11. `ctm` CLI cheat sheet
12. Classic utilities and XML exports
13. Design rules
14. Review points and pitfalls

## 1. Architecture

| Component | Role |
|---|---|
| Control-M/Enterprise Manager (EM) | Central definitions, GUI/web, global conditions, services, users/authorizations. |
| Control-M/Server | Scheduling engine for a data center: daily ordering (New Day), Active Jobs (the runtime "Active Jobs file"), conditions, resources. |
| Control-M/Agent | Executes jobs on a host; agentless hosts (SSH/WMI) are possible - verify edition. |
| Host group | Logical group of agents (load balancing / failover target for `Host`). |
| Plug-ins / integrations | Typed jobs (databases, file transfer MFT, ERP, cloud, etc.) and Application Integrator for custom job types. |
| Automation API | REST API + `ctm` CLI; jobs-as-code in JSON; local test environment via Control-M Workbench (verify availability). |

## 2. Folders, smart folders, jobs

| Object | Notes |
|---|---|
| Folder | Container of jobs (historically "scheduling table"). In Automation API `"Type": "Folder"` - verify whether it maps to a smart or regular folder in your version (a `SimpleFolder` type also exists - verify). |
| Smart folder | Folder with its own scheduling (rule-based calendars), In/Out conditions, resources, On/Do and variables applying to the folder as a unit; jobs run within the folder's order. |
| Sub-folder | Folder nested in a smart folder for structuring large flows. |
| Job | Attributes: type, what to run, host, run-as, scheduling, conditions, resources, variables, actions. |
| Application / Sub-application | Descriptive grouping fields used for views, authorizations and workload policies. Keep a strict taxonomy. |

Common job types (Automation API): `Job:Command`, `Job:Script`, `Job:EmbeddedScript`, `Job:Dummy`, `Job:FileWatcher:Create` / `Job:FileWatcher:Delete`, plus plug-in types (databases, file transfer, ERP...) - verify the plug-ins installed. IBM i jobs run through the agent for IBM i (command jobs issuing CL, or the IBM i specific job type when the plug-in is installed - verify).

## 3. Scheduling: order date, New Day, calendars

- **New Day procedure**: at the configured New Day time (e.g. 07:00), the server orders all jobs whose scheduling criteria match the new order date (ODATE) into the Active Jobs. Jobs belong to an ODATE, not to the calendar day: a job running at 03:00 after a 07:00 New Day belongs to the previous ODATE.
- **Order vs force**: order = add to Active Jobs if scheduling criteria match the date; force = add regardless of criteria.
- **Calendars**: regular calendars (list of days per year), periodic calendars, and rule-based calendars (RBC) defined by rules; smart folders use RBCs and jobs refer to them. Regular calendars must be extended yearly; RBCs reduce that maintenance.
- **Scheduling criteria** (Automation API `When`): `WeekDays`, `MonthDays`, `Months`, `FromTime`, `ToTime`, `SpecificDates`, `WeekDaysCalendar`, `MonthDaysCalendar`, `DaysRelation`, `RuleBasedCalendars`, confirmation calendar - verify value formats (e.g. `"MON"`, `"0315"` for dates) and the RBC structure in your version.
- **Order method**: automatic (by New Day) vs manual (only on explicit order) - Automation API `OrderMethod` on the folder - verify values.
- **Keep active / max wait**: number of days a job not yet submitted stays in Active Jobs (Automation API `DaysKeepActive` - verify). After that, it is removed without running: a silent gap if unmonitored.
- **Time zones**: jobs/folders can carry a time zone (Automation API `TimeZone` - verify values); ordering and New Day semantics for such jobs differ from the server's - test explicitly.

## 4. Conditions (events)

| Concept | Classic name | Automation API |
|---|---|---|
| Wait for | In condition | `eventsToWaitFor` (`"Type": "WaitForEvents"`) |
| Produce | Out condition (+ add) | `eventsToAdd` (`"Type": "AddEvents"`) |
| Consume/clean | Out condition (- delete) | `eventsToDelete` (`"Type": "DeleteEvents"`) |
| Implicit chain | Flow | `"Type": "Flow"`, `"Sequence": [...]` (creates the events for you) |

- Conditions carry a date: the ODATE of the producing job by default; In conditions can target ODAT, PREV, NEXT, STAT (static) or any date (`****`/`$$$$` in classic notation). Automation API events accept an `OrderDate` attribute with values such as `Odat`, `Prev`, `Next`, `AnyDate`, `NoDate` - verify.
- Out conditions are added when the job ends OK (classic default); producing a condition on failure requires an On/Do or If action.
- Cross-folder dependencies = same condition name on both sides. Cross-server dependencies require global conditions configured in EM.
- Naming convention example: `<PRODUCER>-TO-<CONSUMER>` or `<PRODUCER>-ENDED-OK`; keep it consistent and grep-able.
- Clean-up: dated conditions become irrelevant after their date but accumulate until purged; STAT conditions persist until explicitly deleted - review every STAT condition.
- AND/OR logic and parentheses in In conditions exist; in JSON, OR is expressed inside the `Events` list - verify syntax before using it.

## 5. Resources

| Type | Classic | Automation API (inside a job, as a named object) |
|---|---|---|
| Quantitative (semaphore) | Quantitative resource, max defined on the server (`ctmloadset` / `ctm run resource::add`) | `{"Type": "Resource:Semaphore", "Quantity": "1"}` |
| Control (lock) | Control resource Exclusive / Shared | `{"Type": "Resource:Mutex", "MutexType": "Exclusive"}` or `"Shared"` |

- Quantitative resource capacity is defined on the Control-M/Server, not in the job: deploy both.
- Workload Policies limit concurrency by application/host/folder without editing jobs - prefer them for temporary throttling.
- Verify that resources are released on job end, kill and manual status change in your version.

## 6. Time windows, cyclic jobs, reruns

- `FromTime` / `ToTime`: submission window; a job not submitted by `ToTime` waits for the next window or is not submitted (behaviour depends on settings - verify). `ToTime` earlier than `FromTime` spans midnight - verify.
- Cyclic jobs: interval (rerun every N minutes from start, end or target time), interval sequence, or specific times; bounded by max reruns and the time window. Automation API uses a `Rerun` object for this - verify its sub-keys (interval, units, from, times) in the Code Reference.
- Cyclic pitfalls: "from start" with a run longer than the interval -> continuous running; failure stops cycling unless handled; DST changes alter interval timing; cyclic jobs keep the same ODATE across midnight.
- Automatic rerun on failure (max reruns + interval) only for transient errors.

## 7. Variables

- AutoEdit variables `%%NAME`: system variables such as `%%ODATE` (YYMMDD), `%%$ODATE` (YYYYMMDD), `%%DATE`, `%%TIME`, `%%JOBNAME`, `%%ORDERID`, `%%RUNCOUNT`; job/folder variables defined by the user; pool/global variables (syntax varies - verify).
- Automation API: `"Variables": [{"DATA_DIR": "/data/compta"}]` at job or folder level; referenced as `%%DATA_DIR`.
- `ctmvar` (classic) or If-action "set variable" for runtime updates - verify.
- Never put secrets in variables: they appear in job definitions, outputs and logs.

## 8. Post-processing: On/Do, If actions, notifications

- Classic On/Do: on a condition (end code, statement in output) do: set OK/NOTOK, rerun, add/delete condition, force job, mail, shout, set variable, stop cyclic.
- Automation API If: an object with `"Type": "If:CompletionStatus"` (`"CompletionStatus": "NOTOK"`, `"OK"`, `"ANY"`, or numeric codes - verify syntax) or `"Type": "If:Output"` (`"Code": "*ERROR*"` pattern), containing actions such as `Action:Mail`, `Action:Rerun`, `Action:SetToOK`, `Action:SetToNotOK`, `Action:StopCyclicRun`. Other actions (run another job, add/delete event, set variable, output handling) exist - verify exact `Type` names.
- Notifications: `Notify:*` objects (e.g. on not OK, execution time, late submission) with a destination and urgency - verify types and keys.
- Shout destinations route to EM alerts, mail, or external monitoring; connect EM alerts to the monitoring/ticketing tool.
- SLA: Services (Batch Impact Manager / SLA management) monitor a chain against a deadline and predict lateness from job averages - verify licensing.

## 9. Statuses, operator actions, restart

| Status | Meaning |
|---|---|
| Wait Condition / Wait Resource / Wait Host / Wait User / Wait Time | Not submitted: conditions, resources, agent, confirmation, window. |
| Executing | Running on the agent. |
| Ended OK / Ended Not OK | Completed with success/failure as evaluated by exit code and post-processing. |
| Held | Operator hold (flag). |

Operator actions: hold/free, rerun, set to OK (force OK), kill, confirm, delete/undelete, bypass of specific criteria (verify options), why (shows what a job is waiting for), view output/log, edit job in Active Jobs (one-off; traced).

Restart semantics:
- Distributed (Agent) jobs: rerun = full rerun of the command/script; step-level restart must be in the script.
- z/OS: Control-M/Restart provides step-level restart and dataset cleanup for JCL - verify licensing.
- Set to OK satisfies downstream conditions immediately: record approval and downstream impact.
- Rerun of a job that already added conditions: decide whether to delete them first to avoid releasing successors twice.

## 10. Automation API JSON - structure and examples

Fictitious example: daily accounting close, two jobs, explicit events, exclusive resource, alert on failure.

```json
{
  "Defaults": {
    "Application": "APP_COMPTA",
    "SubApplication": "DAILY_CLOSE",
    "Host": "SRV-BATCH-01",
    "RunAs": "batchcpt"
  },
  "APP_COMPTA_DAILY": {
    "Type": "Folder",
    "ControlmServer": "CTM-SRV-01",
    "Description": "Daily accounting close",
    "When": {
      "WeekDays": ["MON", "TUE", "WED", "THU", "FRI"]
    },
    "Variables": [
      { "DATA_DIR": "/data/compta" }
    ],
    "CPT_010_EXTRACT": {
      "Type": "Job:Script",
      "FileName": "cpt_extract.sh",
      "FilePath": "/opt/app/compta/bin",
      "Arguments": ["%%$ODATE", "%%DATA_DIR"],
      "Description": "Extract ledger movements for the processing date",
      "When": { "FromTime": "2100" },
      "QR_DB_COMPTA": { "Type": "Resource:Semaphore", "Quantity": "1" },
      "eventsToAdd": {
        "Type": "AddEvents",
        "Events": [ { "Event": "CPT_010-TO-CPT_020" } ]
      }
    },
    "CPT_020_LOAD": {
      "Type": "Job:Command",
      "Command": "/opt/app/compta/bin/cpt_load.sh %%$ODATE",
      "Description": "Load extracted movements into the ledger",
      "CR_LEDGER": { "Type": "Resource:Mutex", "MutexType": "Exclusive" },
      "eventsToWaitFor": {
        "Type": "WaitForEvents",
        "Events": [ { "Event": "CPT_010-TO-CPT_020" } ]
      },
      "eventsToDelete": {
        "Type": "DeleteEvents",
        "Events": [ { "Event": "CPT_010-TO-CPT_020" } ]
      },
      "IfNotOK": {
        "Type": "If:CompletionStatus",
        "CompletionStatus": "NOTOK",
        "MailOps": {
          "Type": "Action:Mail",
          "To": "batch-ops@example.org",
          "Subject": "%%JOBNAME failed for ODATE %%$ODATE",
          "Message": "See run book RB-CPT-020."
        }
      }
    }
  }
}
```

Notes on the example:
- `Defaults` apply to all jobs of the file; per-job values override.
- Named objects (`QR_DB_COMPTA`, `CR_LEDGER`, `IfNotOK`, `MailOps`) are arbitrary unique names; the `Type` gives meaning.
- Equivalent dependency with a flow: `"Flow1": { "Type": "Flow", "Sequence": ["CPT_010_EXTRACT", "CPT_020_LOAD"] }` placed in the folder (creates the events automatically).
- Inheritance of folder `When` by jobs, folder-level RBC usage, and the exact smart/regular folder mapping - verify for your version, then run `ctm build`.
- Environment-specific values (server, hosts, run-as) are best substituted at deploy time with a deploy descriptor (`ctm deploy <file.json> <descriptor.json>`) - verify descriptor syntax.

Other keys frequently needed (verify each): `Confirm` (wait user confirmation), `Critical` (critical path priority), `Priority`, `DaysKeepActive`, `TimeZone`, `Rerun` (cyclic), `RerunLimit`, `CreatedBy`, `SiteStandard` (enforced naming/value rules), `Comment`, `DocumentationFile`/`DocumentationUrl` (run book link).

## 11. `ctm` CLI cheat sheet

| Command | Purpose |
|---|---|
| `ctm environment add <env> <endpoint> <user> <password>` | Register an Automation API endpoint (endpoint typically `https://<em-host>:8443/automation-api` - verify; prefer token-based authentication where supported, never store real passwords in scripts). |
| `ctm environment set <env>` / `ctm environment show` | Select / list environments. |
| `ctm build <file.json>` | Validate definitions against the server (syntax, site standards) without deploying. |
| `ctm deploy <file.json> [descriptor.json]` | Deploy definitions. |
| `ctm deploy jobs::get -s "server=<srv>&folder=<folder>"` | Export deployed definitions as JSON (review, versioning, conversion source). |
| `ctm run <file.json>` | Deploy to a temporary location and run immediately (testing). |
| `ctm run order <server> <folder> [<jobs>]` | Order a deployed folder/jobs. |
| `ctm run status <runId>` | Status of a run. |
| `ctm run jobs:status::get -s "<query>"` | Search jobs in Active Jobs (e.g. `folder=...&status=Ended Not OK` - verify filter values). |
| `ctm run job:output::get <jobId>` / `ctm run job:log::get <jobId>` | Output / log of a job. |
| `ctm run job::rerun <jobId>` (likewise `job::hold`, `job::free`, `job::kill`, `job::confirm`, `job::setToOk`) | Operator actions, one sub-command per action. |
| `ctm run event::add <server> <name> <date>` / `ctm run event::delete ...` / `ctm run events::get -s "<query>"` | Manage conditions (date e.g. `ODAT`, `STAT` or MMDD - verify). |
| `ctm run resource::add <server> <name> <max>` / `ctm run resources::get` | Quantitative resources. |
| `ctm config server:agents::get <server>` | List agents of a server. |

Some sub-commands and filters change between Automation API versions; check `ctm <command> -h` (or the documentation of your version) before scripting.

## 12. Classic utilities and XML exports

- Control-M/Server and Agent utilities commonly used: `ctmorder` (order/force), `ctmcontb` (conditions), `ctmloadset` (quantitative resource usage), `ctmvar` (variables), `ctmpsm` (menu-driven operations), `ctmcreate` (create a job in Active Jobs), `ctmshout`, `ctmfw` (file watcher on the agent), `ag_diag_comm` (agent communication diagnostics) - options vary, verify.
- EM definition exports are XML (utilities of the `emdef` family - verify names and arguments). Typical elements: `DEFTABLE` root, `FOLDER` / `SMART_FOLDER`, `JOB` with attributes such as `JOBNAME`, `NODEID` (host), `RUN_AS`, `CMDLINE`, `MEMNAME`/`MEMLIB` (script), `TASKTYPE`, `TIMEFROM`, `TIMETO`, `CYCLIC`, `INTERVAL`, `MAXRERUN`, `WEEKDAYS`, `DAYS`, `DAYSCAL`, `CONFIRM`, `CRITICAL`, `APPLICATION`, `SUB_APPLICATION`, and child elements `INCOND`, `OUTCOND`, `QUANTITATIVE`, `CONTROL`, `VARIABLE`, `ON` with `DOACTION`/`DOCOND`/`DOMAIL`, `SHOUT`. Use them to parse exports for reviews; verify attribute names on a real export of the version.

## 13. Design rules

- One smart folder per business chain; sub-folders for stages; Application/Sub-application taxonomy enforced by Site Standards.
- Jobs-as-code: JSON in Git, `ctm build` in CI, deploy via pipeline with descriptors per environment; no manual edits in production except traced emergencies.
- Explicit events with a naming convention, or `Flow` for linear sequences; delete consumed events (or rely on dated conditions with a documented clean-up).
- Resources for shared targets; host groups for agent redundancy.
- Every critical chain monitored as a Service with a deadline; alerts routed to on-call.
- `DaysKeepActive`/max wait set deliberately, with an alert on jobs removed without running.

## 14. Review points and pitfalls

| Pitfall | Effect | Mitigation |
|---|---|---|
| Ignoring New Day time vs calendar day | Jobs after midnight attached to the wrong ODATE; date-based logic off by one day | Use `%%$ODATE` in scripts; document the New Day time. |
| STAT conditions never deleted | Successor released on every future day | Avoid STAT unless needed; delete in post-processing. |
| Conditions added on OK only, no failure path | Chain stuck silently after a failure | Alerting If/Notify on NOTOK; Service deadlines. |
| Regular calendars not extended | Jobs stop being ordered in January | RBCs; yearly calendar review; alert on "not ordered". |
| Quantitative resource defined in jobs but not on the server | Jobs wait forever on resource | Deploy resource capacities with the definitions. |
| Cyclic "from start" interval shorter than run time | Back-to-back runs, resource starvation | Interval from end; overlap protection. |
| `ToTime` too tight / keep-active expiry | Job never submitted, removed silently | Alert on late submission; review windows from P90. |
| Force OK / rerun without considering produced events | Successors run twice or on incomplete data | Run book per job: effect of set to OK and rerun. |
| Run-as with privileged accounts, passwords in command lines | Security exposure | Dedicated run-as users, credentials managed by Control-M or vault. |
| Time zone on jobs vs server vs agents | One-hour or one-day shifts, DST double/missed runs | One reference time zone; DST weekend simulation. |
