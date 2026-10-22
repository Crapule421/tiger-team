# VTOM (Visual TOM, Absyss) - reference

Scope: object model, scheduling logic, dependencies, resources, execution chain, restart, export/import, design and review rules. VTOM exists with French and English labels; both are given where useful. Field names, statuses, command options and ports change between major versions (5.x / 6.x / 7.x): **verify against your version** before quoting a command or a field in a deliverable. When an export of the customer's version is available, its structure is the authority.

## Contents
1. Architecture
2. Object model
3. Scheduling: exploitation dates, planning, calendars, formulas
4. Dependencies (links)
5. Resources
6. Execution chain: machines, submission units, queues, scripts, parameters
7. Statuses and operator actions
8. Error handling, retries, restart
9. Cyclic processing and time constraints
10. Alarms, instructions, monitoring
11. Export/import and command line
12. Design rules
13. Review points and pitfalls

## 1. Architecture

| Component | Role | Notes |
|---|---|---|
| VTOM server | Scheduling engine + repository database + communication with agents and clients | Single point of scheduling for its domain; plan an HA design (active/passive, backup/restore of the repository) - verify supported HA modes for your version. |
| Agent | Runs jobs on a target host (Unix/Linux, Windows; agents also exist for other platforms such as IBM i - verify list for your version) | Unix agent daemon commonly named `bdaemon` - verify. |
| Clients | Thick GUI client and web access for design and operation | Access rights managed by users/profiles in VTOM. |

Flows: the server contacts the agent to submit a job, and the job/agent reports status back to the server (status return from the job wrapper). A firewall matrix therefore needs both directions; ports are configurable - verify defaults for your version and document them for infra-expert.

## 2. Object model

| Object (FR / EN) | Purpose | Key attributes / remarks |
|---|---|---|
| Environnement / Environment | Top-level container grouping applications (often per business domain, sometimes per stage) | Attached to an exploitation date; holds rights. |
| Application | Chain of jobs scheduled together | Own planning, start/latest-start times, cyclic option, status; jobs may inherit its planning. |
| Traitement / Job | Unit of execution | Script, parameters, machine, submission unit, queue, planning (own or inherited), links, resources, error behaviour, retries, instructions, alarms. |
| Machine | Execution host where an agent runs | Agent status is a prerequisite to submission. |
| Unité de soumission / Submission unit | OS account used to run the job | Least privilege; one per application domain. |
| Queue | Submission method on the agent (e.g. Unix shell queue, Windows queue) | Maps to a submitter wrapper script on the agent (see section 6). |
| Script | Program/script executed by the job | Path on the agent or managed script - verify how your installation stores scripts. |
| Date d'exploitation / Exploitation date | Business processing date object | Applications/environments are attached to it; it is advanced by a date switch (automatic or by a job). |
| Calendrier / Calendar | Working / non-working days | Used by planning. |
| Formule / Formula | Planning expression for rules that weekday/month-day grids cannot express | Syntax version-dependent - verify. |
| Ressource / Resource | Shared asset or condition (file, numeric, text, date, weight...) | Jobs wait on resource conditions or consume weight - verify available resource types. |
| Lien / Link | Dependency between jobs or applications | See section 4. |
| Consigne / Instruction | Operator instruction attached to a job/application | Part of the run book. |
| Alarme / Alarm | Notification triggered by a status or time event | Routes to mail/monitoring scripts. |
| Utilisateurs, profils / Users, profiles | Access control on objects and actions | Segregate design vs operation rights. |

Naming: VTOM object names are limited in length and character set - verify the limits of your version and define a convention, e.g. `<ENV>` = `PROD_FIN`, application `APP_COMPTA_J` (daily), job `CPT_J_010_EXTRACT` (ordered step number).

## 3. Scheduling: exploitation dates, planning, calendars, formulas

### 3.1 Exploitation date (core VTOM concept)
- The processing date is an object (not the system clock). Applications are planned relative to the value of their date.
- The date switch ("passage de date") advances the date: either automatically at a defined time or by a dedicated job at the end of the night chain. Choose one and document it.
- On a date switch, applications planned for the new date are (re)initialised to "waiting". Verify the behaviour for applications still running or in error at switch time in your version - this is a classic incident cause (chain re-planned while the previous day is not finished, or previous-day errors silently left behind).
- Pass the date value to scripts as a parameter or via the wrapper environment (`TOM_*` variables - names version-dependent, verify in your submitter) and never use the system date inside scripts.

### 3.2 Planning
- Planning options at application and job level: days of week, days of month, months, calendar-based (working days), formula, explicit dates; jobs can inherit the application planning.
- Time constraints: start time, latest start time ("heure limite de démarrage") with configurable behaviour if exceeded - verify options.
- Keep planning at application level when all jobs share it; per-job planning creates hidden variants of a chain that are hard to test (document them in a matrix: job x day type).

### 3.3 Calendars and formulas
- Calendars define working days; maintain holidays (national, T2, regional) with an owner and yearly review.
- Formulas express rules such as "last working day of month" or "N-th working day" - verify syntax and test with the forecast/planning view over a full year, including year-end and Easter-dependent holidays.

## 4. Dependencies (links)

| Link aspect | Notes |
|---|---|
| Within an application | Job-to-job links forming the chain graph. |
| Between applications / environments | Supported; make them visible in both chains' documentation; check the date scope (same exploitation date or not). |
| Link condition | Normal link waits for successful end; links can also express an "on error" path - verify the link types available (e.g. on success, on error, unconditional) in your version. |
| Start of application | First jobs typically depend only on time, date and resources. |

Rules: no orphan links after removing a job; no time-based ordering in place of links; error-path links must lead to an explicit handling job (alert, compensation), not to the next business step.

## 5. Resources

| Use case | Typical VTOM resource approach (verify types available) |
|---|---|
| Wait for a file | File resource with an existence (or absence) condition; add a completeness check job (size stable, trailer) because existence is not completeness. |
| Exclusive access to a table/system | Weight or numeric resource with capacity 1 taken by each job using the asset. |
| Max N concurrent jobs on a target | Weight resource with capacity N. |
| Business flag (e.g. "closing done") | Text/numeric/date resource set by a job and tested by others. |

Check release semantics: a weight taken by a job is released at its end; verify behaviour on kill, on error and on manual status change.

## 6. Execution chain: machines, submission units, queues, scripts, parameters

- The job runs on the machine's agent, under the submission unit's account, through the queue's submitter wrapper (shell or batch script provided with the agent, frequently customised: environment loading, log redirection, status return - submitter file names are version-dependent, verify on the agent).
- Treat the submitter as code: version it, review changes, test on all agents; a bug in it breaks every job of that queue.
- Parameters: positional parameters defined on the job; VTOM also exposes `TOM_*` environment variables (job/application/environment names, date value, etc.) - list the exact names from your submitter before relying on them.
- Exit status: the submitter maps the script return code to a VTOM status; ensure non-zero means error, and that warnings (if used) are mapped deliberately.
- Status/message return from scripts uses the `tsend` command on the agent (e.g. to send a status or a message to the server) - verify its options for your version rather than copying examples.
- Logs: job stdout/stderr are captured by the agent and viewable from the clients; define retention/purge and disk sizing on agents.

## 7. Statuses and operator actions

Typical job/application states (labels vary by version and language - verify): waiting/"à venir", running/"en cours", finished/"terminé", error/"en erreur", and not planned/descheduled. Applications aggregate job states.

Operator actions typically available (verify names and rights): restart a job, force to finished, set not planned for this date, stop/kill a running job, hold/release, acknowledge an error, rerun an application. Restrict "force to finished" and "not planned" to authorised profiles and require a ticket reference in the comment.

## 8. Error handling, retries, restart

- Per job: behaviour on error (block the branch vs continue), automatic retries (count and delay) - verify field names. Retries only for transient errors, with delay and a low bound.
- Restart = rerun of the job script from the beginning: VTOM does not know the internals of the script. Step-level restart must be implemented in the script (restart table, checkpoint, parameter "from step").
- After a job is forced to finished, downstream links are satisfied: document what that implies (missing data downstream).
- Rerun of an application: check which jobs will run again and whether they are idempotent.

## 9. Cyclic processing and time constraints

- Applications or jobs can be cyclic with a period inside a time window - verify whether the cycle interval counts from start or end and what happens if a run is still active when the next cycle is due (overlap).
- Always define an end time for the cycle, protect against overlap (resource capacity 1), and decide behaviour on error (stop cycling vs continue).
- Latest start time: define the action on overrun (alarm, set to error, skip) and align it with the cut-off of the chain.

## 10. Alarms, instructions, monitoring

- Alarms on: error, latest start exceeded, abnormal duration (if available), agent unreachable - route to the monitoring tool (hypervision) with the job/application identifiers.
- Instructions ("consignes") carry the run book summary: restart procedure, contact, criticality. Keep them short and point to the full run book.
- Monitor the VTOM server itself: engine processes, repository database space, agent connectivity, date switch success.

## 11. Export/import and command line

| Tool | Use | Remarks |
|---|---|---|
| `vtexport` | Export definitions (XML) for backup, versioning, review, migration | Options (scope by environment/application, output file) - verify with the command help of your version. |
| `vtimport` | Import definitions from an export file | Test on a non-production server first; check what happens to existing objects (replace vs merge) - verify. |
| `tsend` | Called from a job (via the agent) to send a status or message to the server | Verify options. |
| `tlist` | List objects/states from the command line | Verify availability and options. |
| Other `vt*` / `t*` utilities | Object creation/modification, start/stop of server processes, administration | Names and options are version-dependent - use the command manual of your version; never guess flags. |

Recent versions also expose a REST API for operations and integration - verify availability, authentication and endpoints for your version.

Practice: export each environment nightly, commit the XML to Git, diff before and after each change, and use the export as the input for reviews and conversions.

## 12. Design rules

- One application = one coherent business outcome with one owner; split very large applications (> ~50 jobs) into sub-chains linked explicitly.
- Job naming encodes order and function; descriptions say what the job does in business terms.
- Planning held at application level; job-level exceptions documented in a matrix.
- Every application ends with a "control/report" job (counts, totals) that fails if expectations are not met.
- File waits via resources with a timeout policy (latest start + alarm), never infinite waits.
- Submission units per application domain; no shared root/Administrator account.
- The date switch is a monitored, explicit step of the night.

## 13. Review points and pitfalls

| Pitfall | Effect | Mitigation |
|---|---|---|
| Date switch while previous-day applications are not finished or in error | Previous-day work reset or forgotten, duplicates or gaps | Gate the date switch on completion of critical applications; alarm on unfinished applications at switch time. |
| Scripts using the system date | Wrong data after midnight or on reruns of past dates | Pass the exploitation date value as parameter. |
| Submitter customised differently per agent | Same job behaves differently by host | Version and deploy the submitter centrally. |
| File resource on "exists" only | Partial file processed | Trigger file or completeness check job. |
| Links forgotten after job deletion/rename | Job never starts or starts too early | Review links on each change; diff exports. |
| Force to finished used as routine fix | Silent data gaps | Restricted profile, mandatory comment, weekly report of forced jobs. |
| Cyclic job without end time / overlap protection | Runaway executions, double processing | End time, capacity-1 resource, stop-on-error. |
| Inter-environment links with different dates | Dependency satisfied by the wrong day | Document date scope; test across date switch. |
| Agents with different time zones/DST settings than the server | Jobs early/late by one hour twice a year | Align time settings; test DST weekends in the forecast. |
| Secrets in job parameters or scripts | Exposure in GUI, logs, exports | Vault/credential mechanism; exports scanned before commit. |
