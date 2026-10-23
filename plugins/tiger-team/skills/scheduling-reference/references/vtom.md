# VTOM (Visual TOM, Absyss) - reference

Scope: object model, scheduling logic, dependencies, resources, execution chain, restart, export/import, design and review rules. VTOM exists with French and English labels; both are given where useful. Facts below come from the Absyss public documentation of Visual TOM 6.7.1 (docs.absyss.com, checked in October 2026); the current release line is 8.x and field names, statuses, command options and ports may differ: **verify against your version** before quoting a command or a field in a deliverable. When an export of the customer's version is available, its structure is the authority.

## Contents
1. Architecture
2. Object model
3. Scheduling: operation dates, planning, calendars, formulas
4. Dependencies (links)
5. Resources
6. Execution chain: machines, submission units, queues, scripts, parameters
7. Statuses and operator actions
8. Error handling, retries, restart
9. Cyclic processing and time constraints
10. Alarms, instructions, monitoring
11. Export/import, command line, REST API
12. Design rules
13. Review points and pitfalls
14. Sources

## 1. Architecture

| Component | Role | Notes |
|---|---|---|
| VTOM server | Scheduling engine + repository database + communication with agents and clients | Processes: `vtserver` (server), `vtsgbd` (database), one `tengine` per environment, `vtmonitor` (alarms), `vthttpd`, `vtomapiserver` (REST API), `tsnmp`. HA: Backup Server (VT-SBU, `TOM_BACKUP_MODE` = replication only or automatic switch) or active/passive cluster (`TOM_SERVER_CLUSTER`, `restartEngine=1` in `vtom.ini`). |
| Agent | Runs jobs on a target host | One process, `bdaemon` (Windows service or UNIX daemon; stopped with `bdown`). Agents exist for UNIX/Linux, Windows, OpenVMS/VAX-VMS, AS400 (IBM i), GCOS7/GCOS8 and z/OS. |
| Clients | Thick client (`vtlclient`), web/HTTP access and REST API for design and operation | Access rights managed by users/profiles in VTOM. |

Default ports (6.7.1, SSL variant in brackets): `vtmanager` 30000 (30010), `tomDBd` 30001, `vtomapiserver` 30002, `bdaemon` 30004 (30014), `vtserver` 30007 (30017), `vtnotifier` 30008 (30018), `vtsgbd` 30009, HTTP server 30080, SNMP 30161/30162. The server contacts the agent to submit a job and the job wrapper reports back with `tsend` (to `TOM_REMOTE_SERVER`): a firewall matrix needs both directions. Document the actual ports for infra-expert.

## 2. Object model

| Object (FR / EN) | Purpose | Key attributes / remarks |
|---|---|---|
| Environnement / Environment | Top-level container grouping applications (often per business domain, sometimes per stage) | Attached to an operation date; holds rights. Date objects must not be shared between environments. |
| Application | Chain of jobs scheduled together | Own planning, earliest/latest start times, cyclic option, status; jobs may inherit its planning. |
| Traitement / Job | Unit of execution | Script, parameters, machine, submission unit, queue, planning (own or inherited), links, resources, restart options, instructions, alarms. |
| Machine | Execution host where an agent runs | Agent status is a prerequisite to submission. |
| Unité de soumission / Submission unit | OS account used to run the job | Least privilege; one per application domain. |
| Queue | Batch queue on the agent (e.g. Unix shell queue, Windows queue) | Maps to a submitter script on the agent (see section 6). |
| Script | Program/script executed by the job | Path on the agent or managed script - verify how your installation stores scripts. |
| Date d'exploitation / Operation date | Business processing date object (the "production day") | Applications/environments are attached to it; advanced by the date change (section 3.1). |
| Calendrier / Calendar | Working / non-working days | Used by planning. |
| Formule / Formula | Planning expression in SNL syntax for rules that day grids cannot express | Example: `test {today=3.day.work.month}` (3rd working day of the month). |
| Ressource / Resource | Shared asset or condition | Types: Text, Numerical, Date, Weight, Stack, File, Generic (script-based), SAP Event, SGBD, Remote File. |
| Lien / Link | Dependency between jobs or applications | Types: Mandatory, Optional, Conditional, Exclusive, In error (and "Valued" variants on return code / range). See section 4. |
| Consigne / Instruction | Operator instruction attached to a job/application | Part of the run book. |
| Alarme / Alarm | Notification triggered by a status or time event | Routes to mail (`tmail`), SMS (`tsms`), SNMP (`tsnmp`), messages (`tmessage`), scripts. |
| Utilisateurs, profils / Users, profiles | Access control on objects and actions | Segregate design vs operation rights. |

Naming: object name length and character limits are not stated in the 6.7.1 guides read - verify in your version and define a convention, e.g. `<ENV>` = `PROD_FIN`, application `APP_COMPTA_J` (daily), job `CPT_J_010_EXTRACT` (ordered step number). Job parameters: 255 characters each, 1024 in total.

## 3. Scheduling: operation dates, planning, calendars, formulas

### 3.1 Operation date (core VTOM concept)
- The processing date is an object (not the system clock); the production day runs from midnight to midnight by default. Applications are planned relative to the value of their date.
- Date change modes: **Automatic** - the engine advances the date only if no dependent job is Pending, Running or in difficulty, no job blocks the date, the system date is later and the engine is active; **System** - at midnight regardless of job statuses; **Constant** - never changed by the engine (operator or a job updates it). A minimum switch hour can be set (24:00:00 to 47:59:59); after a long stop the engine processes the intermediate days (default 2, up to 10).
- A date blocked by a job in error cannot change, but current-day jobs can still be submitted: this is a classic incident cause (previous-day errors left behind, chain not re-planned). Decide and document the mode; gate it on completion of critical applications.
- Pass the date to scripts through `TOM_DATE` (date object) and `TOM_DATE_VALUE` (the day value) or as a parameter; never use the system date inside scripts. CLI: `tgetdate`, `vtadddate`, `vtchkdate`, `tdateinfo`.

### 3.2 Planning
- Planning fields at application and job level: Calendar (inherited), Days, Week, Month, Day number, frequency (Daily / Weekly / Monthly / Yearly), all combined by AND; jobs can inherit the application planning; "Planning preview" shows the result.
- Time constraints: earliest start time and latest start time (default 23:59:59 = unlimited, maximum 47:59:59). An object not launched by its latest start time is descheduled (cancelled for the day); on-request objects not requested in time are descheduled too.
- Keep planning at application level when all jobs share it; per-job planning creates hidden variants of a chain that are hard to test (document them in a matrix: job x day type).

### 3.3 Calendars and formulas
- Calendars define working days; maintain holidays (national, T2, regional) with an owner and yearly review.
- Formulas (SNL) express rules such as `test {today=first.day.work.week}` or `test {01.03.2013 % day.3}` (every 3 days from a date); evaluate with `vtplan /evalFormula` and test over a full year, including year-end and Easter-dependent holidays.

## 4. Dependencies (links)

| Link aspect | Notes |
|---|---|
| Within an application | Job-to-job links forming the chain graph. |
| Between applications / environments | Supported; make them visible in both chains' documentation; check the date scope (same operation date or not). |
| Link types | Mandatory (wait for the predecessor's success), Optional, Conditional, Exclusive, In error (successor runs when the predecessor is in error); "Valued" variants test the return code or a return-code range. |
| Descheduling | When a predecessor ends in error or is descheduled, its successors are descheduled unless the link is optional. |
| Start of application | First jobs typically depend only on time, date and resources. |

Rules: no orphan links after removing a job (`vtdellink`); no time-based ordering in place of links; "In error" links must lead to an explicit handling job (alert, compensation), not to the next business step.

## 5. Resources

| Use case | VTOM resource approach |
|---|---|
| Wait for a file | File resource with operator Present / Absent (agent defaults to the server); add a completeness check job (size stable, trailer) because existence is not completeness. |
| Exclusive access to a table/system | Weight resource with maximum 1 taken ("Borrowed") by each job using the asset. |
| Max N concurrent jobs on a target | Weight resource with maximum N (`tval -name <res> -max <n>`). |
| Business flag (e.g. "closing done") | Text / Numerical / Date resource set by a job (`tval -value`, `-inc`) and tested by others (equality, inequality, greater/less than). |
| Work list | Stack resource (`tpush`, `tpop`, `tempty`). |
| External check | Generic resource driven by a script result (OK/KO; default time limit 5 s, `timeoutResGen`). |

Check release semantics: a weight taken by a job is released at its end; verify behaviour on kill, on error and on manual status change.

## 6. Execution chain: machines, submission units, queues, scripts, parameters

- The job runs on the machine's agent, under the submission unit's account, through the queue's submitter script: UNIX `tom_submit.ksh` copied to `tom_submit.<queue>` in `$TOM_ADMIN` (queue settings in `$ABM/config/queues/queue_<name>/queue.conf`); Windows `submit_queue_wnt.bat` copied to `submit_queue_<queue>.bat` in `%ABM_BIN%` and declared in `ABM_QUEUES` of `vtom.ini`. Submitters are frequently customised (environment loading, log redirection).
- Treat the submitter as code: version it, review changes, test on all agents; a bug in it breaks every job of that queue.
- Parameters: positional parameters defined on the job (`TOM_SCRIPT_ARGS`); environment variables available to the job: `TOM_ENVIRONMENT`, `TOM_APPLICATION`, `TOM_JOB`, `TOM_JOB_ID`, `TOM_DATE`, `TOM_DATE_VALUE`, `TOM_USER`, `TOM_HOST`, `TOM_SCRIPT`, `TOM_QUEUE`, `TOM_QUEUE_PRIORITY`, `TOM_JOB_RETRY` (retry count), `TOM_JOB_POINT` (restart label), `TOM_JOB_EXEC`, `TOM_FAMILY`, `TOM_REMOTE_SERVER`.
- Exit status: the submitter maps the script return code to a VTOM status with `tsend -s<T|E|N> [-m"message"] [-r<retcode>]` (`T` finished, `E` error, `N` not scheduled; `-i"<job id>"` or `-e<env> -a<app> -j<job> -u<agent>` identify the job). Ensure non-zero means `E`, and that warnings (if used) are mapped deliberately. `tsend` retries: `TOM_TSEND_MAX_RETRY` (120), `TOM_TSEND_WAIT_RETRY` (30 s).
- Logs: job stdout/stderr are captured by the agent and viewable from the clients ("Logs retention" per agent type); define retention/purge and disk sizing on agents.

## 7. Statuses and operator actions

Job and application statuses: Pending (waiting for constraints: times, resources, links or request), Running, Finished, In error, Not scheduled, Descheduled (alarm letter codes W, R, F, U, E, X warning, D). Applications aggregate job states.

Operator actions (6.7.1 names): change status with a mandatory comment through the Job "Actions" menu (force to Finished, set to Waiting, force application to error), Stop (kills the process), suspend / release, Restart (also `vtstep` to restart from a step label), request an on-request object (`vtstart <env> <app> [<job>] /par=...`), reset to waiting with the engine stopped (`treset`, `tresetApp`, `tresetJob`). Restrict forcing and descheduling to authorised profiles and require a ticket reference in the comment.

## 8. Error handling, retries, restart

- Per job: Restart type Automatic or Manual (default Manual), Number of restarts, Delay (hh:mm:ss) between retries, Restart label (passed as `TOM_JOB_POINT`), Recovery script. Retries only for transient errors, with delay and a low bound.
- Restart = rerun of the job script from the beginning unless the script uses the restart label: VTOM does not know the internals of the script. Step-level restart must be implemented in the script (restart table, checkpoint, "from step" parameter).
- After a job is forced to Finished, downstream links are satisfied: document what that implies (missing data downstream).
- Rerun of an application: check which jobs will run again and whether they are idempotent.

## 9. Cyclic processing and time constraints

- Cyclic modes: permanent (period 00:00:00: a new execution starts as soon as the previous one ends), fixed period HH:MM:SS (counted from start to start), or cron-like `MINUTES [HOURS]`; in cron mode an iteration that cannot run (previous run still active) is skipped. The window is bounded by the earliest and latest start times.
- Always define an end time for the cycle, protect against overlap (weight resource with maximum 1), and decide behaviour on error (stop cycling vs continue).
- Latest start time: a job past it is descheduled; align it with the cut-off of the chain and raise an alarm on descheduling.

## 10. Alarms, instructions, monitoring

- Alarms exist for dates, machines, jobs and applications (status- and time-based triggers; exact trigger list - verify in your version): route them to the monitoring tool (hypervision) with the job/application identifiers; actions include `tmail`, `tsms`, `tsnmp`, scripts. Text and Numerical resources can be used in alarm actions.
- Instructions ("consignes") carry the run book summary: restart procedure, contact, criticality. Keep them short and point to the full run book.
- Monitor the VTOM server itself: `vtping` (processes, engines, sessions), repository database space, agent connectivity, date change success.

## 11. Export/import, command line, REST API

| Tool | Use | Remarks |
|---|---|---|
| `vtexport` | Dump the domain to a text or XML file for backup, versioning, review, migration | Options: `-x` / `/xml` (XML), `-f` / `/filter` (selected object), `-v` / `/view`, `-o` / `/sepopt` (list separator), `/forceExport` (export despite integrity errors). Allowed on a backup server. |
| `vtimport` | Import definitions from an export file | Listed in the 6.7.1 command index but its options are not documented there: check `vtimport -h`; test on a non-production server first (replace vs merge behaviour - verify). |
| `vtadd*` / `vtdel*` | Create/update/delete objects from the command line (`vtaddenv`, `vtaddapp`, `vtaddjob`, `vtaddres`, `vtaddcal`, `vtadddate`, `vtaddalarm`, `vtaddqueue`, `vtaddunit`, `vtadduser`, `vtdellink`...) | Pre-authenticate with `vtcmd`. |
| `vtplan` | Planning of applications/jobs for a date; `/evalFormula` evaluates a formula | Forecast comparison tool for reviews. |
| `vtping`, `vtserver`, `vtbackup`, `vtmigrate`, `vtstools` | Server status, server process control, database backup, database migration, statistics | Administration. |
| `tsend`, `tval`, `tfile`, `tpush`/`tpop`, `tgetdate`, `tmail` | Agent-side commands used in scripts | See sections 5 and 6. |

REST API (6.7.1): `vtomapiserver` on port 30002, Swagger UI at `https://<server>:30002/swagger-ui/`, authentication by security tokens (header or URL parameter, with validity, IP filters and strategies); endpoint groups `/domain/1.0/`, `/graph/1.0/`, `/monitoring/1.0/`, `/security/1.0/`, `/auth/1.0/`, `/server/1.0/`.

Practice: export each environment nightly (`vtexport -x`), commit the XML to Git, diff before and after each change, and use the export as the input for reviews and conversions.

## 12. Design rules

- One application = one coherent business outcome with one owner; split very large applications (> ~50 jobs) into sub-chains linked explicitly.
- Job naming encodes order and function; descriptions say what the job does in business terms.
- Planning held at application level; job-level exceptions documented in a matrix.
- Every application ends with a "control/report" job (counts, totals) that fails if expectations are not met.
- File waits via resources with a timeout policy (latest start time + alarm), never infinite waits.
- Submission units per application domain; no shared root/Administrator account.
- The date change is a monitored, explicit step of the night (Automatic or Constant mode driven by the chain, not System mode, when previous-day work must be complete).

## 13. Review points and pitfalls

| Pitfall | Effect | Mitigation |
|---|---|---|
| Date change while previous-day applications are not finished or in error | Previous-day work reset or forgotten, duplicates or gaps | Automatic mode gated on critical applications; alarm on unfinished applications at change time. |
| Scripts using the system date | Wrong data after midnight or on reruns of past dates | Pass `TOM_DATE_VALUE` or an explicit parameter. |
| Submitter customised differently per agent | Same job behaves differently by host | Version and deploy the submitter centrally. |
| File resource on "Present" only | Partial file processed | Trigger file or completeness check job. |
| Links forgotten after job deletion/rename | Job never starts or starts too early | Review links on each change; diff exports. |
| Force to Finished used as routine fix | Silent data gaps | Restricted profile, mandatory comment, weekly report of forced jobs. |
| Cyclic job without end time / overlap protection | Runaway executions, double processing | End time, weight resource maximum 1, stop-on-error. |
| Inter-environment links with different dates | Dependency satisfied by the wrong day | Document date scope; test across the date change. |
| Agents with different time zones/DST settings than the server | Jobs early/late by one hour twice a year | Align time settings; test DST weekends with `vtplan`. |
| Secrets in job parameters or scripts | Exposure in GUI, logs, exports | Vault/credential mechanism (`bcrypt` for stored passwords); exports scanned before commit. |

## 14. Sources

- https://docs.absyss.com/vtom/671c/en/vthelp/ - Visual TOM 6.7.1 command reference (tsend, tval, tfile, vtexport, vtstart, treset)
- https://docs.absyss.com/vtom/671i/en/Visual_TOM_Administrator_Guide/ - processes, ports, agents, TOM_* job variables, submitters, REST API, cluster/backup
- https://docs.absyss.com/vtom/671c/en/Visual_TOM_User_Guide/ - statuses, date change modes, planning, formulas, link types, resources, retries, cyclic modes
- https://absyss.fr/wp-content/uploads/2026/06/fr_plq_visual_tom_differentiel_fonctionnel_8.1.pdf - Visual TOM 8.1 functional sheet (current release line)
