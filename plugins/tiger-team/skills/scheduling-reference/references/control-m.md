# Control-M (BMC) - reference

Scope: architecture, folders and jobs, scheduling and calendars, conditions/events, resources, cyclic jobs, variables, actions and notifications, restart, Automation API JSON and the `ctm` CLI, classic utilities, design and review rules. Control-M exists on-premises (Control-M/EM + Control-M/Server + Agents, plus Control-M for z/OS) and as SaaS (Helix Control-M). JSON keys below are those of the Automation API "Code Reference" (documents.bmc.com, monthly/SaaS edition, cross-checked with the 9.0.21 edition in October 2026); renamed keys are noted with their version. Items still marked **verify against your version** could not be settled from the public documentation. Never add keys that are not in the Code Reference: `ctm build` rejects unknown structures.

## Contents
1. Architecture
2. Folders, sub-folders, jobs
3. Scheduling: order date, New Day, calendars
4. Conditions (events)
5. Resources
6. Time windows, cyclic jobs, reruns
7. Variables
8. Post-processing: If statements, actions, notifications
9. Statuses, operator actions, restart
10. Automation API JSON - structure and examples
11. `ctm` CLI cheat sheet
12. Classic utilities and XML exports
13. Design rules
14. Review points and pitfalls
15. Sources

## 1. Architecture

| Component | Role |
|---|---|
| Control-M/Enterprise Manager (EM) | Central definitions, GUI/web, global conditions, services, users/authorizations. |
| Control-M/Server | Scheduling engine for a data center: daily ordering (New Day), Active Jobs (the runtime "Active Jobs file"), events (conditions), resource pools and locks. |
| Control-M/Agent | Executes jobs on a host. Agentless hosts (no agent installed; managed through the config service, only the `ctmfw` utility is uploaded to them by default) are supported. |
| Host group | Logical group of agents (load balancing / failover target for `Host`; `RunOnAllAgentsInGroup: true` runs the job on every member). |
| Plug-ins / integrations | Typed jobs (databases, file transfer MFT, ERP, cloud, etc.) and Application Integrator for custom job types. |
| Automation API | REST API + `ctm` CLI at `https://<em-host>:8443/automation-api`; jobs-as-code in JSON; Control-M Workbench = local Docker-based instance for development (`ctm environment workbench::add`, ports 8443 and 7005). |

## 2. Folders, sub-folders, jobs

| Object | Notes |
|---|---|
| Folder | `"Type": "Folder"`: the default folder type (the GUI "smart folder"). `When`, events, resources, notifications and variables defined at folder level are inherited by its jobs and sub-folders; the folder runs as a unit. |
| SimpleFolder | `"Type": "SimpleFolder"`: plain container without folder-level definitions. Both types take `ControlmServer`, `OrderMethod`, `SiteStandard`, `Description`. |
| SubFolder | `"Type": "SubFolder"` nested in a Folder, with its own `When` (RBC `"USE PARENT"` inherits the parent's scheduling). |
| Flow | `"Type": "Flow"`, `"Sequence": ["job1", "job2"]` (paths such as `"FolderA:Job1"` or `"Sub1:job1"` across sub-folders): creates the events between consecutive jobs. |
| Job | Attributes: type, what to run, `Host`, `RunAs`, `When`, events, resources, variables, If/Notify objects. |
| Application / SubApplication | Descriptive grouping fields used for views, authorizations and workload policies. Keep a strict taxonomy. |

Common job types: OS jobs `Job:Command` (`Command`, optional `PreCommand` / `PostCommand`), `Job:Script` (`FileName`, `FilePath`, `Arguments` array), `Job:EmbeddedScript` (script body in the JSON, deployed to the agent at submission), `Job:DetachedEmbeddedScript`, `Job:Dummy`; `Job:FileWatcher:Create` / `Job:FileWatcher:Delete` (`Path` with `*` and `?`, `SearchInterval` seconds, `TimeLimit` minutes - 0 = none, `StartTime` / `StopTime` as HHMM or yyyymmddHHMM, `MinimumSize` such as `"10B"` or `"5MB"`, `Wildcard`, `MinimalAge` / `MaximalAge`); plug-in types such as `Job:Database:SQLScript` / `Job:Database:StoredProcedure` / `Job:Database:EmbeddedQuery`, File Transfer, `Job:SAP*`, `Job:zOS:Member`, `Job:WebServices*`, `Job:Kubernetes`, `Job:Hadoop`, `Job:SLAManagement`, Application Integrator jobs - usable only where the plug-in is deployed. The Code Reference lists no IBM i-specific job type: IBM i work is defined as OS jobs on a host served by the Control-M/Agent for IBM i (CL command lines) - verify agent-specific parameters against the agent documentation of your version.

## 3. Scheduling: order date, New Day, calendars

- **New Day procedure**: at the configured New Day time (e.g. 07:00), the server orders all jobs whose scheduling criteria match the new order date (ODATE) into the Active Jobs. Jobs belong to an ODATE, not to the calendar day: a job running at 03:00 after a 07:00 New Day belongs to the previous ODATE.
- **Order vs force**: order = add to Active Jobs if scheduling criteria match the date; force = add regardless of criteria.
- **Calendars**: regular calendars (list of days per year), periodic calendars, and rule-based calendars (RBC) defined by rules; folder-level RBCs are declared under the folder `When` as `"Type": "Calendar:RuleBased"`. Regular calendars must be extended yearly; RBCs reduce that maintenance.
- **`When` keys** (job, folder or sub-folder; a folder `When` is inherited and a job's own `When` is combined with it by AND):
  - `WeekDays`: `"SUN"`..`"SAT"`, `"ALL"`, `"NONE"`, or `D<day>W<n>` for a week of the month (`"DMONW2"` = Monday of week 2); `Months`: `"JAN"`..`"DEC"`, `"ALL"`, `"NONE"`; `MonthDays`: `"1"`..`"31"`, `"ALL"`, `"NONE"`; `DaysRelation`: `"AND"` (default) / `"OR"` between MonthDays and WeekDays.
  - `FromTime` / `ToTime`: `"HHMM"`; `ToTime: ">"` lets the job be submitted after its original order date.
  - `SpecificDates`: `["MM/DD", ...]` (up to 400; set WeekDays, Months and MonthDays to `"NONE"`); `StartDate` / `EndDate`: `"YYYYMMDD"` with `ActivePeriod` true (default) / false; `Schedule`: `"Everyday"` / `"Never"` (order manually).
  - `WeekDaysCalendar` / `MonthDaysCalendar`: named calendar, then rules in the day lists: `+MON` include regardless, `-TUE` exclude, `>WED` / `<THU` shift to the next / previous working day, `D6` = 6th working day, `L3` = 3rd from last (month days: `+2`, `-3`, `>4`, `<5`, `D6`, `L7`; `D6PA` for a period of a periodic calendar).
  - `ConfirmationCalendars`: `Calendar`, `ExceptionPolicy` = `DoNotOrder` (default) | `OrderOnNextConfirmedDay` | `OrderOnPreviousConfirmedDay` | `OrderAnyway` | `ShiftAndDoNotRun` | `ShiftAndRunOnNextConfirmedDay` | `ShiftAndRunOnPreviousConfirmedDay` | `ShiftAndRunAnyway`, `ShiftBy` -62..62.
  - `RuleBasedCalendars`: `Included` / `Excluded` lists, `Relationship` `"OR"` (default) / `"AND"` with the other criteria; an RBC `When` cannot carry `FromTime` / `ToTime` nor nested RBCs.
- **Order method**: `OrderMethod` on Folder / SimpleFolder: `"Automatic"` (default; ordered by New Day on `When` days) or `"Manual"` (`When` ignored; order with `ctm run order` or an `Action:Run`).
- **Keep active**: `DaysKeepActive` = `"0"`..`"98"` days or `"Forever"` (default 0): how long a job that did not run on its order date stays in Active Jobs (a folder stays until the largest value of its jobs has passed). After expiry the job is removed without running: a silent gap if unmonitored. `RetroactiveOrder: true` orders the missed days when Control-M was down.
- **Time zones**: `TimeZone` = 3-letter Control-M code (e.g. `"MST"`), from a list configured in Control-M; BMC asks for definition at least 48 h before execution and recommends one time zone per folder. Ordering and New Day semantics for such jobs differ from the server's - test explicitly.

## 4. Conditions (events)

| Concept | Classic name | Automation API |
|---|---|---|
| Wait for | In condition | object `{"Type": "WaitForEvents", "Events": [{"Event": "name", "Date": "..."}]}` |
| Produce | Out condition (+ add) | `{"Type": "AddEvents", "Events": [...]}` |
| Consume/clean | Out condition (- delete) | `{"Type": "DeleteEvents", "Events": [...]}` |
| Implicit chain | Flow | `"Type": "Flow"`, `"Sequence": [...]` (creates the events for you) |

- The object names (`eventsToWaitFor`, `eventsToAdd`, `eventsToDelete` in BMC examples) are free; the `Type` carries the meaning. Events can be set on a job, folder or sub-folder.
- Events carry a date. `Date` values: `OrderDate` (default), `PreviousOrderDate`, `NextOrderDate`, `AnyDate` (wait and delete only), `"MMDD"`, offsets `"+001"` / `"-002"`; `NoDate` exists for `Event:Add` actions. Classic notation: ODAT, PREV, NEXT, STAT (not date-specific), MMDD.
- AND/OR: `"Events": ["(", {"Event": "a"}, "OR", {"Event": "b"}, ")", {"Event": "c"}]` - default relationship AND; parentheses allowed, nesting not supported.
- Out conditions are added when the job ends OK (classic default); producing an event on failure requires an If statement with `Event:Add`.
- Cross-folder dependencies = same event name on both sides. Cross-server dependencies require global conditions configured in EM.
- Naming convention example: `<PRODUCER>-TO-<CONSUMER>` or `<PRODUCER>-ENDED-OK`; keep it consistent and grep-able.
- Clean-up: dated events become irrelevant after their date but accumulate until purged; STAT / `NoDate` events persist until explicitly deleted - review every one of them.

## 5. Resources

| Type | Classic | Automation API (inside a job, as a named object) |
|---|---|---|
| Quantitative (pool) | Resource pool ("quantitative resource"), max defined on the server (`ctm run resource::add <server> <name> <max>`, 0-9999) | `{"Type": "Resource:Pool", "Quantity": "1"}` - `Resource:Semaphore` is the pre-9.0.20.025 name, now deprecated |
| Control (lock) | Lock ("control resource") Exclusive / Shared | `{"Type": "Resource:Lock", "LockType": "Exclusive"}` or `"Shared"` - `Resource:Mutex` / `MutexType` is the pre-9.0.20.025 name, now deprecated |

- A `Resources` array with a `Name` per entry is needed when a pool and a lock share the same name (system setting `allowDuplicateResourceNames`).
- Pool capacity is defined on the Control-M/Server, not in the job: deploy both.
- Workload Policies limit concurrency by application/host/folder without editing jobs (`ctm run workloadpolicies:detailed::get`) - prefer them for temporary throttling.
- Verify that resources are released on job end, kill and manual status change in your version.

## 6. Time windows, cyclic jobs, reruns

- `FromTime` / `ToTime`: submission window for the order date; a job not submitted by `ToTime` is not submitted that day unless `ToTime` is `">"`, and leaves Active Jobs after `DaysKeepActive`. `ToTime` earlier than `FromTime` (window across midnight) - verify behaviour in your version.
- Cyclic jobs or folders: `Rerun` = `{"Every": "N", "Units": "Minutes" | "Hours" | "Days", "From": "Start" | "End" | "Target", "Times": "n"}` (defaults Minutes, Start, 0 = forever); `RerunIntervals` = `{"Intervals": ["12m", "11h", "12d", "1m"], "From": ...}`; `RerunSpecificTimes` = `{"At": ["0900", "1230"], "Tolerance": "20"}` (minutes). `Action:StopCyclicRun` stops the cycle.
- Automatic rerun of a non-cyclic job: `RerunLimit` = `{"Every": "3", "Units": "Hours", "Times": "5"}` (default 1 minute; `Times` 0 = no limit) - only for transient errors.
- Cyclic pitfalls: "from start" with a run longer than the interval -> continuous running; failure stops cycling unless handled; DST changes alter interval timing; cyclic jobs keep the same ODATE across midnight.

## 7. Variables

- `"Variables": [{"NAME": "value"}, ...]` on a job, folder or sub-folder; referenced as `%%NAME`. Folder-shared variables are set as `{"\\\\NAME": "value"}` and read as `%%NAME`; named pools as `{"\\\\pool1\\date": "..."}` read with `%%\\\\pool1\\date` (JSON doubles each backslash).
- System variables such as `%%$DATE`, `%%JOBNAME`, `%%RUNCOUNT`, `%%NODEID`, `%%COMPSTAT`, `%%APPLIC`; `%%ODATE` is YYMMDD and `%%$ODATE` YYYYMMDD.
- Runtime updates: `Action:Set` (`"Variable"`, `"Value"`) in an If statement, or the classic `ctmvar` utility.
- Never put secrets in variables: they appear in job definitions, outputs and logs.

## 8. Post-processing: If statements, actions, notifications

- If statements (job, folder or sub-folder): `{"Type": "If", "CompletionStatus": "NOTOK" | "OK" | "ANY", <actions>}`; `If:NumberOfReruns` (`"NumberOfReruns": ">=4"`), `If:NumberOfFailures`, `If:JobNotSubmitted`, `If:JobOutputNotFound`, `If:NumberOfExecutions`, `If:Output` (`Code` = string(s) to find, wildcards `*` and `$`/`?`, optional `Statement`), `If:VariableValue` (`VariableName`, `VariableValue`, `Operator`; EM 9.0.21+).
- Actions nested in an If: `Action:Mail` (`To`, `CC`, `Subject`, `Message`, `Urgency` = `Regular` | `Urgent` | `VeryUrgent`, `AttachOutput`), `Action:Rerun`, `Action:Set`, `Action:SetToOK`, `Action:SetToNotOK`, `Action:StopCyclicRun`, `Action:Run` (`Folder`, `Job`, optional `Date`, `Variables`, `RunAsIndependentFlow`), `Action:Notify` (`Message`, `Destination`, `Urgency`), `Action:Remedy`, `Event:Add` / `Event:Delete` (`Event`, `Date`), `Action:Output` (`Operation` such as `Copy`, `Destination`), `Action:CaptureOutput`.
- Notifications (not tied to an If): `Notify:OK`, `Notify:NotOK`, `Notify:DoesNotStart` (`By: "HHMM"`), `Notify:ExecutionTime` (`Criteria` such as `LessThan`, `Value` minutes), `Notify:DoesNotEnd` (`By`), `Notify:ReRun`, `Notify:LateCyclicSubmit` (`By` minutes); keys `Message`, `Destination` (`JobLog`, `Console`, `mail`, alert destinations), `Urgency`.
- Shout destinations route to EM alerts, mail or external monitoring; connect EM alerts to the monitoring/ticketing tool.
- SLA: `Job:SLAManagement` (Batch Impact Manager) monitors a chain against a deadline and predicts lateness - verify licensing.

## 9. Statuses, operator actions, restart

| Status | Meaning |
|---|---|
| Wait Condition / Wait Resource / Wait Host / Wait User / Wait Time | Not submitted: events, resources, agent, confirmation, window. |
| Executing | Running on the agent. |
| Ended OK / Ended Not OK | Completed with success/failure as evaluated by exit code and post-processing (`status=Ended OK,Ended Not OK,Executing` in API filters). |
| Held | Operator hold (flag). |

Operator actions (GUI and `ctm run job::<action> <jobId>`): hold/free, rerun, setToOk / setNotOk, kill, confirm, delete/undelete, runNow, bypass (`job::bypass -f <options.json>`), waitingInfo ("why": what the job waits for), modify (one-off edit in Active Jobs, traced), output / log retrieval.

Restart semantics:
- Distributed (Agent) jobs: rerun = full rerun of the command/script; step-level restart must be in the script.
- z/OS: Control-M/Restart provides step-level restart and dataset cleanup for JCL - verify licensing.
- Set to OK satisfies downstream events immediately: record approval and downstream impact.
- Rerun of a job that already added events: decide whether to delete them first to avoid releasing successors twice.

## 10. Automation API JSON - structure and examples

Fictitious example: daily accounting close, two jobs, explicit events, exclusive lock, alert on failure.

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
      "QR_DB_COMPTA": { "Type": "Resource:Pool", "Quantity": "1" },
      "eventsToAdd": {
        "Type": "AddEvents",
        "Events": [ { "Event": "CPT_010-TO-CPT_020" } ]
      }
    },
    "CPT_020_LOAD": {
      "Type": "Job:Command",
      "Command": "/opt/app/compta/bin/cpt_load.sh %%$ODATE",
      "Description": "Load extracted movements into the ledger",
      "CR_LEDGER": { "Type": "Resource:Lock", "LockType": "Exclusive" },
      "eventsToWaitFor": {
        "Type": "WaitForEvents",
        "Events": [ { "Event": "CPT_010-TO-CPT_020" } ]
      },
      "eventsToDelete": {
        "Type": "DeleteEvents",
        "Events": [ { "Event": "CPT_010-TO-CPT_020" } ]
      },
      "IfNotOK": {
        "Type": "If",
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
- `Defaults` apply to all jobs of the file; per-job values override. Only `Job`, `Folder` and `Defaults` objects are processed by `ctm build` / `ctm deploy`.
- Named objects (`QR_DB_COMPTA`, `CR_LEDGER`, `IfNotOK`, `MailOps`, `eventsToAdd`) are arbitrary unique names; the `Type` gives meaning.
- Equivalent dependency with a flow: `"Flow1": { "Type": "Flow", "Sequence": ["CPT_010_EXTRACT", "CPT_020_LOAD"] }` placed in the folder.
- For Automation API older than 9.0.20.025 use `Resource:Semaphore` / `Resource:Mutex` with `MutexType`; run `ctm build` against the target to confirm.
- Environment-specific values (server, hosts, run-as) are substituted at deploy time with a deploy descriptor (`ctm deploy <file.json> <descriptor.json>`; `ctm deploy transform <file.json> <descriptor.json>` shows the result) - verify the descriptor rule syntax of your version.

Other keys frequently needed: `Confirm: true` (wait for `job::confirm`), `Critical: true` (priority to reserve resources), `Priority` (`"Very High"` .. `"Very Low"`, or 2-character codes `AA` lowest .. `99` highest), `DaysKeepActive`, `TimeZone`, `Rerun` / `RerunLimit`, `CreatedBy` (subject to EM `AuthorSecurity`), `SiteStandard` (folder), `Comment` (not uploaded to Control-M), `DocumentationFile` `{"Path", "FileName"}` / `DocumentationUrl` `{"Url"}` (run book link), `RunAsDummy: true` (temporarily neutralise a job), `EndFolder: true`.

## 11. `ctm` CLI cheat sheet

| Command | Purpose |
|---|---|
| `ctm environment add <env> <endPoint> <user> [<password>]` or `ctm environment add <env> <endPoint> <token>` | Register an endpoint (`https://<em-host>:8443/automation-api`); prefer the token form, never store real passwords in scripts. `ctm environment workbench::add` for a local Workbench. |
| `ctm environment set <env>` / `ctm environment show` | Select / list environments. |
| `ctm build <file.json> [descriptor.json]` | Validate definitions against the server (syntax, site standards) without deploying. |
| `ctm deploy <file.json> [descriptor.json]` | Deploy definitions. `ctm deploy transform <file.json> <descriptor.json>` applies the descriptor rules only. |
| `ctm deploy jobs::get -s "server=<srv>&folder=<folder>"` (also `folders::get`, `calendars::get`) | Export deployed definitions as JSON (review, versioning, conversion source). |
| `ctm run <file.json> [descriptor.json]` | Deploy to a temporary location and run immediately (testing). |
| `ctm run order <server> <folder> [<jobs>]` | Order a deployed folder / jobs. |
| `ctm run status <runId>` | Status of a run. |
| `ctm run jobs:status::get [limit] -s "<query>"` | Search Active Jobs: fields `jobname`, `jobid`, `folder`, `server`, `application`, `subApplication`, `host`, `hostGroup`, `runAs`, `status`, `orderDateFrom` / `orderDateTo` (YYMMDD), `fromTime` / `toTime`; wildcards `*` and `?`; e.g. `-s "folder=APP_*&status=Ended Not OK"`. |
| `ctm run job:output::get <jobId> [runNo]` / `ctm run job:log::get <jobId>` | Output / log of a job. |
| `ctm run job::rerun <jobId>` (likewise `job::hold`, `job::free`, `job::kill`, `job::confirm`, `job::setToOk`, `job::setNotOk`, `job::delete`, `job::undelete`, `job::runNow`, `job::waitingInfo`, `job::bypass`) | Operator actions, one sub-command per action. |
| `ctm run event::add <server> <name> <date>` / `ctm run event::delete <server> <name> <date>` / `ctm run events::get -s "name=<pattern>&date=<MMDD>"` | Manage events; `<date>` = `MMDD`, `ODAT` (current Control-M date) or `STAT`. |
| `ctm run resource::add <server> <name> <max>` / `resource::update` / `resource::delete` / `ctm run resources::get` | Resource pools (`max` 0-9999). |
| `ctm run forecast:timeline::get -s "filterType=year&year=2027&folder=<folder>"` | Forecast of planned runs (validation of calendars after a change). |
| `ctm config server:agents::get <server> [-s "agent=<pattern>"]` / `ctm config server:agent::ping <server> <agent>` | List / ping agents of a server. |

Some sub-commands and filters change between Automation API versions; check `ctm <command> -h` (or the documentation of your version) before scripting.

## 12. Classic utilities and XML exports

- Control-M/Server utilities commonly used: `ctmorder` (order/force folder jobs), `ctmcontb` (events: `-ADD` / `-DELETE` / `-LIST <name> <date>`, date `mmdd`, `ODAT` or `STAT`, wildcards in list/delete), `ctmloadset` (records resource usage of an agent host into the resource pools table, run by a cyclic job), `ctmvar` (variables), `ctmpsm` (menu-driven operations on Active Jobs), `ctmcreate` (create a job / folder directly in Active Jobs), `ctmshout`, `ctmfw` (file watcher on the agent, also used on agentless hosts); `ag_diag_comm` (agent communication diagnostics) - options vary, verify.
- EM definition exports are XML produced by the `emdef` family (`exportdeffolder`, `deffolder`, `defjob`...), deprecated from 9.0.21.100 and unsupported from 9.0.22: BMC maps `exportdeffolder` to `ctm deploy jobs::get` and `deffolder` to `ctm deploy`. Structure: `DEFTABLE` root, `FOLDER` / `SMART_FOLDER`, `JOB` elements with the `defjob` parameters, e.g. `JOBNAME`, `TASKTYPE` (Job, Detached, Command, Dummy, External, Started_Task), `CMDLINE`, `RUN_AS`, `TIMEFROM` / `TIMETO` (hhmm), `CYCLIC` (0/1), `INTERVAL` (minutes), `MAXRERUN` (0-99), `APPLICATION`, `SUB_APPLICATION`. Host (`NODEID` in exports, `HOSTID` in the `defjob` reference), script (`MEMNAME` / `MEMLIB`), `INCOND`, `OUTCOND`, `QUANTITATIVE`, `CONTROL`, `VARIABLE`, `ON` with `DOACTION` / `DOCOND` / `DOMAIL`, `SHOUT` - verify attribute names on a real export of your version before parsing.

## 13. Design rules

- One folder per business chain; sub-folders for stages; Application/Sub-application taxonomy enforced by Site Standards.
- Jobs-as-code: JSON in Git, `ctm build` in CI, deploy via pipeline with descriptors per environment; no manual edits in production except traced emergencies.
- Explicit events with a naming convention, or `Flow` for linear sequences; delete consumed events (or rely on dated events with a documented clean-up).
- Pools and locks for shared targets; host groups for agent redundancy.
- Every critical chain monitored as a service (`Job:SLAManagement`) with a deadline; alerts routed to on-call.
- `DaysKeepActive` set deliberately, with a `Notify:DoesNotStart` (or equivalent alert) on jobs that risk removal without running.

## 14. Review points and pitfalls

| Pitfall | Effect | Mitigation |
|---|---|---|
| Ignoring New Day time vs calendar day | Jobs after midnight attached to the wrong ODATE; date-based logic off by one day | Use `%%$ODATE` in scripts; document the New Day time. |
| STAT / `NoDate` events never deleted | Successor released on every future day | Avoid them unless needed; delete in post-processing. |
| Events added on OK only, no failure path | Chain stuck silently after a failure | `Notify:NotOK` / If NOTOK actions; service deadlines. |
| Regular calendars not extended | Jobs stop being ordered in January | RBCs; yearly calendar review; alert on "not ordered". |
| Resource pool used in jobs but not defined on the server | Jobs wait forever on resource | Deploy pool capacities with the definitions. |
| Cyclic `From: Start` interval shorter than run time | Back-to-back runs, resource starvation | `From: End`; overlap protection. |
| `ToTime` too tight / keep-active expiry | Job never submitted, removed silently | `Notify:DoesNotStart`; review windows from P90. |
| Force OK / rerun without considering produced events | Successors run twice or on incomplete data | Run book per job: effect of set to OK and rerun. |
| Run-as with privileged accounts, passwords in command lines | Security exposure | Dedicated run-as users, credentials managed by Control-M or vault. |
| Time zone on jobs vs server vs agents | One-hour or one-day shifts, DST double/missed runs | One reference time zone; DST weekend simulation. |

## 15. Sources

- https://documents.bmc.com/supportu/API/Monthly/en-US/Documentation/API_CodeRef_JobProperties.htm - Code Reference: When, events, resources, If, Notify, Rerun
- https://documents.bmc.com/supportu/API/Monthly/en-US/Documentation/API_CodeRef_Folder.htm - Folder, SimpleFolder, SubFolder, Flow, OrderMethod
- https://documents.bmc.com/supportu/API/Monthly/en-US/Documentation/API_CodeRef_JobTypes.htm - catalogue of Automation API job types
- https://documents.bmc.com/supportu/API/Monthly/en-US/Documentation/API_CodeRef_JobTypes_FileWatcher.htm - Job:FileWatcher:Create / Delete parameters
- https://documents.bmc.com/supportu/API/Monthly/en-US/Documentation/API_Services_RunService.htm - ctm run commands, filters, event and resource dates
- https://documents.bmc.com/supportu/API/Monthly/en-US/Documentation/API_Services_DeployService.htm - ctm deploy, transform, jobs::get
- https://documents.bmc.com/supportu/API/Monthly/en-US/Documentation/API_Services_BuildService.htm - ctm build syntax
- https://documents.bmc.com/supportu/API/Monthly/en-US/Documentation/API_Services_EnvironmentService.htm - ctm environment add, endpoint, workbench::add
- https://documents.bmc.com/supportu/API/Monthly/en-US/Documentation/API_Services_ConfigService_Agent.htm - server:agents::get, server:agent::ping
- https://docs.bmc.com/docs/automation-api/9021/job-properties-1123726042.html - 9.0.21 edition: Semaphore/Mutex deprecated since 9.0.20.025
- https://documents.bmc.com/supportu/9.0.21/en-US/Documentation/Utilities/ctmcontb.htm - ctmcontb options and date formats
- https://docs.bmc.com/xwiki/bin/view/Control-M-Orchestration/Control-M/Announcements/Deprecation-and-End-of-Support/emdef-Utility-Suite-Deprecation/ - emdef deprecation and replacements
