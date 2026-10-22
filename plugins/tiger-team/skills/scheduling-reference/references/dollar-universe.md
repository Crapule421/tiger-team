# Dollar Universe ($U, Broadcom, ex-ORSYP) - reference

Scope: architecture, object model (company, node, areas, uprocs, sessions, tasks, management units), conditions, calendars and rules, launch windows, execution and restart, command line, exports, design and review rules. Product lineage: ORSYP -> Automic -> CA -> Broadcom; current architecture is DUAS (Dollar Universe Application Server, the node) administered through UVMS (UniViewer Management Server) and the UniViewer Console (UVC). French labels are given where they are common in operations. **Verify against your version** for command keywords, status labels and field names (v5 vs v6+ differ significantly).

## Contents
1. Architecture
2. Object model
3. Uprocs
4. Sessions
5. Management units (MU) and HDP
6. Tasks, launch windows, processing dates
7. Calendars and rules
8. Conditions and launch formula
9. Resources
10. Launches, executions, statuses
11. Restart and operator actions
12. Variables and environment
13. Command line
14. Export, import, promotion
15. Design rules, review points and pitfalls

## 1. Architecture

| Component | Role |
|---|---|
| Company (société) | Logical $U installation name shared by the nodes that work together. |
| Node (DUAS) | A $U server instance on a host: repository + engines; executes and schedules locally. |
| Engines | Typically a calculator (computes planned launches from tasks/rules), a launcher (checks conditions and submits), a surveyor (tracks executions), an exchanger (inter-node communication), plus an I/O server - verify names/processes for your version. |
| UVMS | Central management server: node registry, users/roles, central views. |
| UVC (UniViewer Console) | GUI for design and operations. |
| Areas | X = Production (Exploitation), S = Simulation, I = Integration, A = Application (development). Same objects can exist in several areas; promotion moves them A -> I -> S -> X. |

Each node schedules autonomously: a node can keep running its chains if UVMS is unavailable; cross-node conditions require node-to-node communication.

## 2. Object model

| Object (EN / FR) | Purpose |
|---|---|
| Uproc (Universal procedure) | Unit of work: script/command + conditions + completion instructions + variables. Versioned. |
| Session | Tree of uprocs with a normal (success) path and an error path. |
| Task (tâche) | Schedules a session or a uproc on a management unit: type, planning rules, launch window, submission account, queue, processing date computation. |
| Management Unit - MU (Unité de Gestion, UG) | Logical execution target (e.g. a site, an entity, a host role), mapped to a node; tasks run "on" an MU. |
| MU type | Classification of MUs (e.g. per site type) used for multi-MU tasks and dependencies. |
| HDP (hierarchy of MU dependencies) | Defines which MUs a condition may target (e.g. head office vs branches) - verify syntax. |
| Calendar | Working/holiday/closing days, general or per MU. |
| Rule (règle) | Periodicity definition (e.g. every working day, first working day of month). |
| Resource | File or logical resource used in resource conditions (exclusive/shared, quotas). |
| Submission account (user) | OS account used to run the uproc. |
| Queue | Batch queue controlling concurrency on the node - verify behaviour for your version. |

## 3. Uprocs

| Attribute | Notes |
|---|---|
| Type | `CL_INT` (script stored in $U), `CL_EXT` (external script referenced by path), `CMD` (command line); other specialised types may exist depending on version/extensions - verify. |
| Functional period | Period the processing date represents (e.g. day, week, month, ... or none) - drives how conditions compare processing dates. |
| Memorisation | Number of past executions (events) kept for this uproc; affects conditions that reference previous runs. |
| Conditions | Dependency, incompatibility (non-simultaneity), resource; combined in a launch formula (section 8). |
| Completion instructions (consignes de terminaison) | Actions on completion, e.g. reset (delete) events of other uprocs so the next cycle waits again - verify options. |
| Variables | Typed uproc variables (text, numeric, date...) with defaults, overridable at launch - verify types and syntax. |
| Steps | Uprocs can expose steps ("jalons") so a restart resumes at a given step; implementation depends on uproc type and script conventions - verify. |
| Status from script | Exit code 0 = completed; non-zero = aborted. Map warnings deliberately. |

Rule: prefer `CL_EXT` with scripts versioned in Git when you need code review and CI; `CL_INT` keeps script and definition together (easier promotion, harder diff/review). Do not mix both styles within one application without a reason.

## 4. Sessions

- A session is a tree: each uproc has children on the normal path (run if parent completed) and on the error path (run if parent aborted).
- A session is launched as a whole by a task; all uprocs inherit the session's processing date and MU unless a uproc targets another MU (verify options).
- Error path: use for alerting/compensation uprocs. The business continuation must not be on the error path.
- Sessions express precedence inside one chain; dependencies between chains use uproc conditions (section 8).

## 5. Management units (MU) and HDP

- An MU is where work runs logically; a node hosts one or more MUs. Tasks on an MU type (or task templates) deploy the same session on many MUs (e.g. per branch or per entity).
- Conditions may target: the same MU, a specific MU, all MUs of a type, or MUs related through the HDP - verify syntax.
- Keep MU design simple: MU = host role or business entity, not both. Document the MU -> node mapping (it changes during migrations and DR).

## 6. Tasks, launch windows, processing dates

| Task type | Behaviour |
|---|---|
| Scheduled (planifiée) | Launches computed from rules + calendar on given days/times. |
| Optional (optionnelle) | Defined but launched only on demand (template for manual/explicit launches). |
| Provoked (provoquée) | Triggered by an event/command (e.g. `uxordre` or another uproc) - verify triggering mechanisms. |
| Cyclic (cyclique) | Repeated launches at a period within a window. |

- Launch window: start time + duration (or end time). If conditions are not met before the window closes, the launch ends in "time overrun" (horaire dépassé) and does not run - the operator must decide (relaunch with new window, skip).
- Processing date: computed by the task (launch date with offset, or according to the uproc functional period). Make it explicit for D-1 chains (night run processing the previous business day).
- Submission account, queue, priority are technical parameters of the task; keep them per environment.
- Task templates / multi-MU tasks generate one launch per MU: check concurrency and resource quotas.

## 7. Calendars and rules

- Calendars: general and per MU (or MU type); days are working, holiday or closing - verify inheritance rules between general and MU calendars.
- Rules define periodicity (period type day/week/month/year, period length, position, working vs calendar days, offset). Combine rules and explicit inclusions/exclusions in the task.
- Simulate the planning for a full year after any change (UVC provides forecast/simulation views - verify), check month-end, year-end, Easter-dependent holidays and T2 days.
- Calendars must be extended for future years; plan the yearly update with an owner.

## 8. Conditions and launch formula

| Condition type | Meaning | Key parameters |
|---|---|---|
| Dependency | Wait for an event of another uproc (completed, aborted, or absent = did not run) | Target uproc, session (same/any), MU (same/specific/type/HDP), processing date (same/offset/any), expected status. |
| Incompatibility | Do not run while another uproc is running (or has a given state) | Target, MU, date scope. |
| Resource | Wait for a file or logical resource, with exclusive/shared access and quotas | Resource name, quota(s), exclusivity, file existence. |

- Launch formula combines numbered conditions, e.g. `=C01 AND (C02 OR C03)`. Keep formulas short; complex logic belongs in a dedicated control uproc.
- Events are what conditions test: they are recorded when a uproc completes/aborts and kept according to memorisation. Stale events from a previous cycle can satisfy a condition on the wrong date if the date scope is too loose (e.g. "any date"); completion instructions or explicit event purge prevent it.
- "Absent" conditions (run only if X did not run) are fragile: they depend on event retention and timing; document them.
- Some conditions can be marked as fatal/blocking or bypassed at launch time - verify options.

## 9. Resources

- File resource: wait for existence (and optionally check attributes) - add a completeness check.
- Logical resource with quotas: emulate semaphores (quota = max concurrent users) and exclusive locks.
- Verify how quotas are released on abort/kill and on manual completion.

## 10. Launches, executions, statuses

| Stage | Typical statuses (labels vary, verify) |
|---|---|
| Launch (lancement) | Launch wait (window not open), event wait (conditions not met), time overrun (window closed), held/disabled, refused. |
| Execution | Running, completed (terminé), aborted (incident), plus intermediate states. |

The operations view shows launches computed for the coming period and executions; an execution keeps the processing date, MU, session, uproc version and launch number.

## 11. Restart and operator actions

| Action | Use | Caution |
|---|---|---|
| Restart (relance) of an aborted execution | After fixing the cause | Check idempotence; restart from a step only if the uproc implements steps. |
| Force completion | Accept and move on | Downstream conditions become satisfied; record approval. |
| Bypass condition check / launch now | Unblock a launch whose conditions are known to be satisfied | Risk of running on incomplete inputs. |
| Hold / release, cancel launch | Contain an incident | Cancelled launches do not create events: dependants may wait or, with "absent" conditions, run. |
| Manual launch (`uxordre` or UVC) | Run a uproc/session outside planning, with explicit MU and processing date | Always give the processing date explicitly. |

Exact action names and rights depend on the version and UVMS roles - verify. Operator actions are logged; keep the log as audit evidence.

## 12. Variables and environment

- Uproc variables are passed to the script as environment variables; $U also sets execution context variables commonly prefixed `S_` (e.g. processing date `S_DATRAIT`, MU `S_CODUG`, company `S_SOCIETE`, area `S_ESPEXE`, execution number `S_NUMPROC`, step `S_NUMJALON`) - names vary by version, verify on your node before relying on them.
- Load the $U environment in shells with the `uxsetenv` script of the node before running CLI commands (Windows: `uxsetenv.bat`) - verify location.
- Never pass passwords as uproc variables; use the platform's credential store or a vault lookup in the script.

## 13. Command line

Commands follow a pattern `ux<verb> <object> [area] [selection]`. Commonly used verbs (verify keywords, area syntax and options for your version, e.g. with the command's help):

| Command | Use |
|---|---|
| `uxlst` | List objects or runtime items (e.g. uprocs, sessions, tasks, launches, executions, events). |
| `uxshw` | Show the detailed definition of an object. |
| `uxadd` / `uxupd` / `uxdlt` | Create / update / delete objects. |
| `uxext` | Extract object definitions to a file (backup, versioning, review, promotion). |
| `uxins` | Insert (import) definitions from an extraction file. |
| `uxordre` | Order (manually launch) a uproc or session with MU and processing date. |
| Hold/release/restart verbs | Exist for runtime control - verify their names before use. |
| Node start/stop scripts | e.g. `unistart` / `unistop` in the node's binary directory - verify. |

Object keywords commonly seen with these verbs include uprocs (`UPR`), sessions (`SES`), tasks (`TSK`), calendars (`CAL`), rules (`RUL`), resources (`RES`), events (`EVT`), executions (`CTL`) and launches (`FLA`); areas are designated by keywords such as `EXP` for production - verify every keyword against your version's command reference.

## 14. Export, import, promotion

- Promotion path: A -> I -> S -> X via transfer/distribution functions (UVC or CLI) - verify mechanism and rights; production changes must come through this path, not direct edits in X.
- `uxext` / `uxins` (or UVC export/import) for versioning and migrations; keep extracts in Git, diff before promotion.
- After import: run a planning simulation for the next weeks and compare with the previous version; check that tasks are enabled only where intended.

## 15. Design rules, review points and pitfalls

Design rules:
- One session per business chain; uprocs small and named by function; error path = alert/compensation only.
- Processing date computed by the task and passed through `S_` variables or uproc variables; scripts never read the system date.
- Inter-chain dependencies via dependency conditions with explicit MU and date scope ("same processing date" by default).
- Resources for shared targets (DB, partner links); quotas sized from target capacity.
- Launch windows sized from the critical path; time overrun triggers an alert.

| Pitfall | Effect | Mitigation |
|---|---|---|
| Date scope "any" on dependency conditions | Yesterday's event releases today's run | Same processing date; completion instructions resetting events. |
| Launch window too short | Silent "time overrun", chain not run | Alert on time overrun; size windows from P90 durations. |
| Wrong functional period on uproc | Conditions never match (or always match) | Align functional periods across dependent uprocs. |
| Multi-MU tasks without quotas | Dozens of parallel runs saturating DB | Resource quotas; staggered windows. |
| Edits directly in X area | Divergence from A/I/S, untested changes | Promotion only; periodic diff X vs S. |
| `CL_INT` scripts never reviewed | Hidden logic, secrets in scripts | Extract and scan; move to `CL_EXT` + Git where possible. |
| Calendar not extended for next year | Tasks stop computing launches in January | Yearly calendar review in Q4. |
| Cancelling a launch instead of forcing completion | Dependants wait forever or "absent" conditions trigger | Choose action by downstream effect; document in run book. |
| Node time zone / DST differences | Runs shifted by one hour | Align nodes; test DST weekends in simulation. |
