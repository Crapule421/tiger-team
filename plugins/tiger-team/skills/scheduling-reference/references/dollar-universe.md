# Dollar Universe ($U, Broadcom, ex-ORSYP) - reference

Scope: architecture, object model (company, node, areas, uprocs, sessions, tasks, management units), conditions, calendars and rules, launch windows, execution and restart, command line, exports, design and review rules. Product lineage: ORSYP -> Automic -> CA -> Broadcom; current architecture is DUAS (Dollar Universe Application Server, the node) administered through UVMS (UniViewer Management Server) and the UniViewer Console (UVC). French labels are given where they are common in operations. Keywords and syntax below come from the Broadcom TechDocs for versions 6.10, 7.00 and 7.01 (checked in October 2026); v5 differs significantly. Items still marked **verify against your version** could not be settled from the public documentation.

## Contents
1. Architecture
2. Object model
3. Uprocs
4. Sessions
5. Management units (MU) and HDP
6. Tasks, launch windows, processing dates
7. Calendars, rules, forecast
8. Conditions and launch formula
9. Resources
10. Launches, executions, statuses
11. Restart and operator actions
12. Variables and environment
13. Command line
14. Export, import, promotion
15. Design rules, review points and pitfalls
16. Sources

## 1. Architecture

| Component | Role |
|---|---|
| Company (société) | Logical $U installation name shared by the nodes that work together. |
| Node (DUAS) | A $U server instance on a host: repository + engines; executes and schedules locally. |
| I/O server | Foundation of the node: must be running before any batch or interactive access to an area's data; one thread per functional service from v6. |
| Engines | Calculator (CAL: computes planned launches from tasks, rules and calendars), Launcher (LAN: checks conditions, queries remote launchers through the Exchanger, submits to a batch queue), Supervisor (SUR: watches resource conditions and wakes the Launcher), Exchanger (EXC: inter-node communication with retries); plus DQM (batch queue manager), CDJ, BVS (Business View Server), alert manager and the JEE Java engine. |
| UVMS | Central management server: node registry, users/roles, central views. |
| UVC (UniViewer Console) | GUI for design, monitoring and administration. |
| Areas | X = Production (Exploitation), S = Simulation, I = Integration, A = Application (development). CLI keywords `EXP`, `SIM`, `INT`, `APP`; transfers use `TESP=X|S|I`. Promotion moves objects A -> I -> S -> X. |

Each node schedules autonomously: a node can keep running its chains if UVMS is unavailable; cross-node conditions require node-to-node communication (`uxordre` across nodes needs both nodes on the same UVMS and company).

## 2. Object model

| Object (EN / FR) | Purpose |
|---|---|
| Uproc (Universal procedure) | Unit of work: script/command + conditions + completion instructions + variables. Versioned (`VUPR`, 3 digits). |
| Session | Tree of uprocs with a normal path, an error path and a return-code path. Versioned (`VSES`). |
| Task (tâche) | Schedules a session or a uproc on a management unit: type, planning rules, launch window, submission account, queue, priority, processing date computation. A task flagged `MODEL` is a task template. |
| Management Unit - MU (Unité de Gestion, UG) | Logical execution target (e.g. a site, an entity, a host role), mapped to a node; tasks run "on" an MU (`MU=` or `UG=`). |
| MU type | Classification of MUs used for multi-MU tasks and condition targets (`MUT(type)`). |
| HDP (hierarchy of MU dependencies) | Defines which MUs a condition may target; written `HDP({XY})` in condition parameters - verify the hierarchy codes of your installation. |
| Calendar | Working/holiday/closing days, general or per MU. |
| Rule (règle) | Periodicity definition (e.g. every working day, first working day of month). |
| Resource | File or logical resource used in resource conditions (exclusive/shared, quotas). |
| Submission account (user) | OS account used to run the uproc (`USER=`). |
| Queue | DQM batch queue controlling concurrency on the node (`uxaddque`; task `QUEUE=`, default `SYS_BATCH`). |

## 3. Uprocs

| Attribute | Notes |
|---|---|
| Type (`UPT=`) | `CL_INT` (script stored in $U, default), `CL_EXT` (external script referenced by path), `CMD` (command line), `FTP_GET` / `FTP_PUT`, plus Manager-specific types when installed. |
| Functional period (`FPERIOD=`) | `N` none, `D` day, `W` week, `T`/`F` fortnight variants, `M` month, `2`, `3`, `Q` quarter, `S` semester, `Y` year - drives how conditions compare processing dates. |
| Memorisation (`MEMO=`) | `N` not memorised, `O` one execution, `A` all executions (with `NBPER` periods kept); affects conditions that reference previous runs. |
| Conditions | Dependency (`DEPCON`), incompatibility / non-simultaneity (`INCCON`, or by class `INCCLASS`), resource (`RESCON`); combined in a launch formula (section 8). |
| Completion instructions (`TERMINS`, consignes de terminaison) | Numbered instructions naming a uproc whose events are purged when this uproc completes (status `TERMINATED`, default, or `ABNORMAL`), so the next cycle waits again. |
| Variables (`LAUNCHVAR`) | Launch variables with defaults, overridable at launch (`uxordre`, `uxrst CTL LAUNCHVAR=`). |
| Steps (jalons) | Restart resumes at a step: `uxrst CTL ... STEP=<n>`; the script reads `S_NUMJALON` and `S_REPRISE` to skip completed work. |
| Status from script | Exit code 0 = completed; non-zero = aborted. Map warnings deliberately. |

Rule: prefer `CL_EXT` with scripts versioned in Git when you need code review and CI; `CL_INT` keeps script and definition together (easier promotion, harder diff/review). Do not mix both styles within one application without a reason.

## 4. Sessions

- A session is a tree: `HEADER=` is the first uproc; for each uproc, `SONOK=` lists successors on the normal path, `SONKO=` on the error path, `SONRC=` on a return-code path. There is no `uxupd SES`: sessions are redefined or duplicated (`uxdup SES`).
- A session is launched as a whole by a task; all uprocs inherit the session's processing date and run on the task's MU unless a uproc targets another MU (verify options for your version).
- Error path: use for alerting/compensation uprocs. The business continuation must not be on the error path.
- Sessions express precedence inside one chain; dependencies between chains use uproc conditions (section 8).

## 5. Management units (MU) and HDP

- An MU is where work runs logically; a node hosts one or more MUs. Tasks on an MU type or task templates (`MODEL`) deploy the same session on many MUs (e.g. per branch or per entity).
- Condition targets: `MU=SAME` (default), `MU(<mu>)` a specific MU, `MUT(<type>)` all MUs of a type, or `HDP({XY})` MUs related through the hierarchy.
- Keep MU design simple: MU = host role or business entity, not both. Document the MU -> node mapping (it changes during migrations and DR).

## 6. Tasks, launch windows, processing dates

| Task type (`TYPE=`) | Behaviour |
|---|---|
| `S` scheduled (planifiée) | Launches computed from rules + calendar on given days/times. |
| `O` optional (optionnelle) | Defined but launched only on demand (`uxordre` or UVC). |
| `P` provoked (provoquée) | Triggered by an event/command within its window (`PRLW=`, possibly `ONDEMAND`). |
| `C` cyclical (cyclique) | Repeated launches at a period within a window (`CYCLICAL=`). |
| `W` watcher | Launch driven by a watched event (file, etc.). |

- Launch window: daily window `DALW=(hhmm,hhh,mm)` = start time + duration, with per-weekday overrides; several windows per day with `MULW`; auto-relaunch windows `RELW` (`AUTOREL`). If conditions are not met before the window closes, the launch ends in time overrun (`O`, horaire dépassé) and does not run - the operator must decide (relaunch with a new window `uxrst CTL LW=(hhmm,hhmm)`, or skip). A time limit on the execution itself is `CTLDUR HEULIM=(HHMM,B)`.
- Processing date: `PDATE=(J,U,T)` (default `(0,0,C)`, `C` calendar / `W` working days) and `OFFSET=±nn[D|C|H|W]`. Make it explicit for D-1 chains (night run processing the previous business day).
- Submission account `USER=`, queue `QUEUE=` (default `SYS_BATCH`), priority `PRTY=` 1-255 (default 100), `HOLD|NOHOLD`, `DISABLE|ENABLE` are task parameters; keep them per environment.
- Task templates / multi-MU tasks generate one launch per MU: check concurrency and resource quotas.

## 7. Calendars, rules, forecast

- Calendars: general and per MU (or MU type); days are working, holiday or closing - verify inheritance rules between general and MU calendars for your version. For simulations a calendar must cover at least four years: the year before, the current year and two years after.
- Rules define periodicity (period type day/week/month/year, period length, position, working vs calendar days, offset). Combine rules and explicit inclusions/exclusions (`IMPL`, `EXPLI`, `EXCLU` families) in the task.
- Forecast: when editing a task, UVC shows its provisional schedule over four months; the Workload Forecast (monitoring mode) predicts start dates for a date range and, with "Simulate", takes production exceptions into account (end dates come from statistics). Run it over a full year after any change: month-end, year-end, Easter-dependent holidays and T2 days.
- Calendars must be extended for future years; plan the yearly update with an owner.

## 8. Conditions and launch formula

| Condition type | Meaning | Key parameters |
|---|---|---|
| Dependency (`DEPCON`) | Wait for an event of another uproc (completed, aborted, or absent = did not run) | Target uproc, session (same/any), MU (`SAME` / `MU()` / `MUT()` / `HDP()`), processing date (same/offset/any), expected status. |
| Incompatibility (`INCCON`, `INCCLASS`) | Do not run while another uproc (or a class of uprocs) is running | Target, MU, date scope. |
| Resource (`RESCON`) | Wait for a file or logical resource, with exclusive/shared access and quotas | Resource name, quota(s), exclusivity, file existence. |

- The launch formula combines numbered conditions and is evaluated at each launch attempt, e.g. `FORMULA LFORM="=C01 AND =C02"`. Keep formulas short; complex logic belongs in a dedicated control uproc.
- Events are what conditions test: they are recorded when a uproc completes/aborts and kept according to memorisation. Stale events from a previous cycle can satisfy a condition on the wrong date if the date scope is too loose (e.g. "any date"); completion instructions (`TERMINS`) or explicit event deletion (`uxdlt EVT`) prevent it.
- "Absent" conditions (run only if X did not run) are fragile: they depend on event retention and timing; document them.
- Conditions can be bypassed at relaunch (`uxrst CTL BYPASS`); the task `FORCE` option submits without condition check - record every use.

## 9. Resources

- File resource: wait for existence (and optionally check attributes) - add a completeness check.
- Logical resource with quotas: emulate semaphores (quota = max concurrent users) and exclusive locks.
- Verify how quotas are released on abort/kill and on manual completion.

## 10. Launches, executions, statuses

| Stage | Statuses (codes of `uxlst CTL STATUS=`) |
|---|---|
| Launch (lancement) | `P` pending (window not open), `W` event wait (conditions not met), `O` time overrun (window closed), `R` refused at condition check, `M` watching; held/disabled launches via `uxhld FLA` / `DISABLE`. |
| Execution | `S` started, `E` running, `F` completion in progress, `T` completed (terminé), `A` aborted (incident). |

The operations view shows planned launches (`FLA`) for the coming period and executions (`CTL`); an execution keeps the processing date, MU, session, uproc version and launch number (`S_NUMLANC`, `S_NUMPROC`, `S_NUMSESS`).

## 11. Restart and operator actions

| Action | Use | Caution |
|---|---|---|
| Relaunch an aborted execution (`uxrst CTL` with `STEP=`, `BYPASS`, `LAUNCHVAR=`, `LW=`) | After fixing the cause | Check idempotence; restart from a step only if the uproc implements steps. |
| Force completion | Accept and move on | Downstream conditions become satisfied; record approval. Exact mechanism (UVC action or command) - verify for your version. |
| Bypass condition check | Unblock a launch whose conditions are known to be satisfied | Risk of running on incomplete inputs. |
| Hold / release / cancel a planned launch (`uxhld FLA`, `uxrls FLA`, `uxdlt FLA`) | Contain an incident | Cancelled launches do not create events: dependants may wait or, with "absent" conditions, run. |
| Stop a running execution (`uxend CTL`) | Kill | The execution is set to aborted (`A`); a zone protected by `uxsetabort` postpones the stop. |
| Manual launch (`uxordre` or UVC) | Run a uproc/session outside planning, with explicit MU and processing date | Always give the processing date explicitly; parameters arrive as `S_P1`..`S_P30`. |

Rights depend on UVMS roles; operator actions are logged - keep the log as audit evidence.

## 12. Variables and environment

- Execution context variables are set by $U at start-up and available in the pre-processing step (`U_ANTE_UPROC`), the script and the post-processing step (`U_POST_UPROC`): processing date `S_DATRAIT` (YYYYMMDD; `S_DATRAIT_A` YYMMDD, `S_DATRAIT_X` in the `U_FMT_DATE` format), MU `S_CODUG`, company `S_SOCIETE`, area `S_ESPEXE` (X/S/I/A), uproc `S_PROCEXE` / version `S_VEREXE`, session `S_CODSESS`, numbers `S_NUMPROC` / `S_NUMSESS` / `S_NUMLANC`, step `S_NUMJALON`, restart flag `S_REPRISE` (O/N), parameters `S_P1`..`S_P30`, node `S_NODENAME`, application `S_APPLI`. Custom variables: `unienv_specific`, node variables, MU variables.
- Load the $U environment before CLI commands: source `unienv.ksh` from the DUAS directory on Unix/Linux, run `unienv.bat` on Windows. `uxsetenv`, `uxstartup` and `uxshutdown` remain in the `mgr` directory for V5 compatibility only; start/stop the node with `unistart` / `unistop` (`unistart -m` = maintenance mode, Production I/O server only).
- Never pass passwords as uproc variables; use the platform's credential store or a vault lookup in the script.

## 13. Command line

Pattern: `ux<verb> <OBJECT> [EXP|SIM|INT|APP] key=value ...` (area defaults to `S_ESPEXE`; object codes in upper case; `<command> <object> help` prints the syntax; the I/O servers must be running and the user declared on UVMS).

| Command | Use |
|---|---|
| `uxlst` | List objects or runtime items (`INF` / `FULL`, `OUTPUT=` file). |
| `uxshw` | Show the detailed definition of an object (`SCRIPT` for a uproc). |
| `uxadd` / `uxupd` / `uxdlt` / `uxdup` | Create / update (one parameter family per call) / delete / duplicate objects. |
| `uxext` | Extract object definitions to a file (`OUTPUT=`, `REPL`) for backup, versioning, review, promotion. |
| `uxins` | Insert definitions from an extraction file (`INPUT=`, `REPL`, `ENABLE|NOENABLE`). |
| `uxtra` | Transfer an object to another area (`TESP=I|S|X`). |
| `uxordre` | Order (manually launch) a uproc or session with MU and processing date. |
| `uxhld FLA` / `uxrls FLA` / `uxdlt FLA` / `uxadd FLA` | Hold / release / cancel / create a planned launch. |
| `uxrst CTL` / `uxend CTL` / `uxpur CTL` | Relaunch / stop / purge executions. |
| `unistart` / `unistop` | Start / stop the node (after loading `unienv.ksh` / `unienv.bat`). |

Object keywords confirmed in the TechDocs: uprocs `UPR`, sessions `SES`, tasks `TSK`, management units `MU` (`UG`), MU directories `MUD`, events `EVT`, executions `CTL`, planned launches `FLA`. Calendars, rules and resources (`CAL`, `RUL`, `RES`) - verify the keyword in the command reference of your version.

## 14. Export, import, promotion

- Promotion path: A -> I -> S -> X with `uxtra <object> ... TESP=I|S|X` or the UVC transfer functions - verify rights; production changes must come through this path, not direct edits in X.
- `uxext` / `uxins` (or UVC export/import) for versioning and migrations; keep extracts in Git, diff before promotion.
- After import: run the Workload Forecast for the next weeks and compare with the previous version; check that tasks are enabled only where intended.

## 15. Design rules, review points and pitfalls

Design rules:
- One session per business chain; uprocs small and named by function; error path = alert/compensation only.
- Processing date computed by the task and passed through `S_DATRAIT` or launch variables; scripts never read the system date.
- Inter-chain dependencies via dependency conditions with explicit MU and date scope ("same processing date" by default).
- Resources for shared targets (DB, partner links); quotas sized from target capacity.
- Launch windows sized from the critical path; time overrun triggers an alert.

| Pitfall | Effect | Mitigation |
|---|---|---|
| Date scope "any" on dependency conditions | Yesterday's event releases today's run | Same processing date; completion instructions purging events. |
| Launch window too short | Silent time overrun (`O`), chain not run | Alert on time overrun; size windows from P90 durations. |
| Wrong functional period on uproc | Conditions never match (or always match) | Align functional periods across dependent uprocs. |
| Multi-MU tasks without quotas | Dozens of parallel runs saturating DB | Resource quotas; staggered windows. |
| Edits directly in X area | Divergence from A/I/S, untested changes | Promotion only; periodic diff X vs S. |
| `CL_INT` scripts never reviewed | Hidden logic, secrets in scripts | Extract and scan; move to `CL_EXT` + Git where possible. |
| Calendar not extended for next year | Tasks stop computing launches in January | Yearly calendar review in Q4 (keep 2 future years). |
| Cancelling a launch instead of forcing completion | Dependants wait forever or "absent" conditions trigger | Choose action by downstream effect; document in run book. |
| Node time zone / DST differences | Runs shifted by one hour | Align nodes; test DST weekends in the forecast. |

## 16. Sources

- https://techdocs.broadcom.com/us/en/ca-enterprise-software/intelligent-automation/dollar-universe/7-01-21/Command-Line-Interface/Parameter_Commands/Uprocs.html - uproc commands, UPT types, MEMO, FPERIOD, condition families
- https://techdocs.broadcom.com/us/en/ca-enterprise-software/intelligent-automation/dollar-universe/7-01-01/Command-Line-Interface/Parameter_Commands/Tasks.html - task TYPE, launch windows, PDATE, queue, priority
- https://techdocs.broadcom.com/us/en/ca-enterprise-software/intelligent-automation/dollar-universe/7-01-01/Command-Line-Interface/Parameter_Commands/Sessions.html - session HEADER, SONOK, SONKO, SONRC
- https://techdocs.broadcom.com/us/en/ca-enterprise-software/intelligent-automation/dollar-universe/7-00-11/Command-Line-Interface/Operations_Commands_1/Executions.html - uxlst/uxrst/uxend/uxpur CTL, status codes
- https://techdocs.broadcom.com/fr/fr/ca-enterprise-software/intelligent-automation/dollar-universe-guides/6-9/Manuel_commandes_4/Commandes_d_exploitation/Lancements_prevus.html - planned launches: uxadd/uxhld/uxrls/uxdlt FLA
- https://techdocs.broadcom.com/us/en/ca-enterprise-software/intelligent-automation/dollar-universe/6-10/Command-Line-Interface/Operations_Commands_1/Events.html - event commands (EVT)
- https://techdocs.broadcom.com/us/en/ca-enterprise-software/intelligent-automation/dollar-universe/6-10-91/Command-Line-Interface/Introduction/Use_Commands.html - CLI conventions, area keywords, help
- https://techdocs.broadcom.com/fr/fr/ca-enterprise-software/intelligent-automation/dollar-universe-guides/6-9/Manuel_de_r_f_rence_3/Parametrage/Uprocs/Parametres_d_execution.html - S_* execution variables
- https://techdocs.broadcom.com/us/en/ca-enterprise-software/intelligent-automation/dollar-universe/6-10-71/Installing_0/Install_on_UNIX_LINUX/Start_and_Stop_on_UNIX_LINUX.html - unienv.ksh, unistart, unistop, uxsetenv compatibility
- https://techdocs.broadcom.com/us/en/ca-enterprise-software/intelligent-automation/dollar-universe/6-10/Univiewer-Console/monitoringmode/duserverengines.html - engines: Calculator, Launcher, Supervisor, Exchanger
- https://techdocs.broadcom.com/us/en/ca-enterprise-software/intelligent-automation/dollar-universe/7-00-11/Univiewer-Console/monitoringmode/duworkloadforecast.html - Workload Forecast and simulation
- https://knowledge.broadcom.com/external/article/266667/uxordre-command-cross-uvms.html - uxordre across nodes needs same UVMS and company
