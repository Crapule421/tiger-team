---
name: dba-reference
description: DBA knowledge base for Oracle, PostgreSQL, SQL Server, Db2 LUW and MySQL/MariaDB - performance, locking, HA/DR, backup/PITR, security, Oracle-to-PostgreSQL migration, release-script practices and review checklist.
user-invocable: false
---

# DBA reference

Rules of use: commands below are the stable, well-known forms. Behaviour differs across versions and editions (licensing!) - when a line says "verify against your version", check the vendor documentation for the exact release before relying on it. Never run diagnostic statements that modify data in production without a change record.

## 1. Engine quick comparison

| Topic | Oracle | PostgreSQL | SQL Server | Db2 LUW | MySQL / MariaDB (InnoDB) |
|---|---|---|---|---|---|
| Concurrency model | MVCC (undo); readers never block writers | MVCC (row versions in table; VACUUM) | Locking by default; MVCC if RCSI/snapshot enabled | Locking; "currently committed" reads (`CUR_COMMIT`) | MVCC (undo) + next-key/gap locks in REPEATABLE READ (default) |
| Transactional DDL | No (implicit commit before/after) | Yes (except e.g. `CREATE INDEX CONCURRENTLY`, `CREATE DATABASE`, `VACUUM`) | Yes for most DDL | Yes for most DDL (verify per statement) | No (implicit commit; MySQL 8 DDL is atomic per statement only) |
| Lock escalation | Never | Never | Yes (row/page -> table, ~5000 locks per object per statement) | Yes (`LOCKLIST`/`MAXLOCKS`) | No (but gap locks) |
| Query stats | AWR/ASH (Diagnostics Pack), Statspack | `pg_stat_statements` | Query Store, DMVs | `MON_GET_*` table functions | `performance_schema`, `sys` schema, slow log |
| Session lock timeout | `ALTER SESSION SET DDL_LOCK_TIMEOUT = 30;` (DDL, seconds) | `SET lock_timeout = '5s';` | `SET LOCK_TIMEOUT 5000;` (ms) | `SET CURRENT LOCK TIMEOUT 30;` (s) | `SET SESSION lock_wait_timeout = 30;` (metadata locks) + `innodb_lock_wait_timeout` (row locks) |

## 2. Performance diagnosis

Method: (1) define the symptom (one query, one time window, whole instance); (2) look at waits/time model before tuning SQL; (3) get the actual plan (not only estimated); (4) compare estimated vs actual rows - cardinality misestimates are the usual root cause (stale stats, skew, correlated predicates, parameter sniffing/bind peeking); (5) change one thing, measure.

### Oracle
- Estimated plan: `EXPLAIN PLAN FOR <stmt>;` then `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);`
- Actual plan: run with `/*+ GATHER_PLAN_STATISTICS */` then `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR('<SQL_ID>', NULL, 'ALLSTATS LAST'));`
- AWR/ASH/ADDM (`@?/rdbms/admin/awrrpt.sql`, `ashrpt.sql`, `addmrpt.sql`, `V$ACTIVE_SESSION_HISTORY`, `DBA_HIST_*`) require the Diagnostics Pack (Enterprise Edition); SQL Monitor and SQL Tuning Advisor require the Tuning Pack. Check `CONTROL_MANAGEMENT_PACK_ACCESS`. No license: Statspack.
- Live waits: `V$SESSION` (`event`, `wait_class`, `sql_id`, `blocking_session`), `V$SYSTEM_EVENT`, `V$SQL` / `V$SQLSTATS`.
- Common waits: `db file sequential read` (single-block, index access), `db file scattered read` / `direct path read` (full scans), `log file sync` (commit frequency / redo I/O), `enq: TX - row lock contention` (application locking), `enq: TM - contention` (often unindexed foreign keys), `latch: cache buffers chains` (hot blocks), `gc *` (RAC interconnect).
- Plan stability: SQL Plan Management (baselines); SQL profiles need Tuning Pack.

### PostgreSQL
- `EXPLAIN (ANALYZE, BUFFERS) <stmt>;` - ANALYZE executes the statement: wrap DML in `BEGIN; ... ROLLBACK;`.
- `pg_stat_statements` (needs `shared_preload_libraries`): top SQL by `total_exec_time` (column names changed in PG13: `total_exec_time`, `mean_exec_time`).
  `SELECT queryid, calls, round(total_exec_time) total_ms, round(mean_exec_time::numeric,1) mean_ms, rows, left(query,80) FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;`
- Live: `pg_stat_activity` (`state`, `wait_event_type`, `wait_event`, `xact_start`, `query`); `idle in transaction` sessions hold locks and block VACUUM.
- `auto_explain` module for slow plans in logs; `track_io_timing = on` for I/O timings.
- Health: `pg_stat_user_tables` (`seq_scan`, `n_dead_tup`, `last_autovacuum`, `last_autoanalyze`); bloat; transaction ID wraparound: `SELECT datname, age(datfrozenxid) FROM pg_database;`.
- Kill: `pg_cancel_backend(pid)` (query) then `pg_terminate_backend(pid)` (session).

### SQL Server
- Actual plan: SSMS "Include Actual Execution Plan" or `SET STATISTICS XML ON;`; `SET STATISTICS IO, TIME ON;` for reads/CPU.
- Query Store (2016+; ON by default for new databases in 2022): `sys.query_store_query`, `sys.query_store_query_text`, `sys.query_store_plan`, `sys.query_store_runtime_stats`, `sys.query_store_wait_stats` (2017+); regressions -> plan forcing `EXEC sp_query_store_force_plan @query_id = <q>, @plan_id = <p>;`.
- DMVs: `sys.dm_exec_requests` (`wait_type`, `blocking_session_id`), `sys.dm_os_wait_stats`, `sys.dm_exec_query_stats` + `CROSS APPLY sys.dm_exec_sql_text(sql_handle)` + `sys.dm_exec_query_plan(plan_handle)`.
- Common waits: `PAGEIOLATCH_*` (data reads), `LCK_M_*` (blocking), `WRITELOG` (log I/O / commit rate), `CXPACKET`/`CXCONSUMER` (parallelism - check MAXDOP/cost threshold), `SOS_SCHEDULER_YIELD` (CPU), `ASYNC_NETWORK_IO` (client not consuming results), `RESOURCE_SEMAPHORE` (memory grants).
- Parameter sniffing: compare plans per parameter; options `OPTION (RECOMPILE)`, `OPTIMIZE FOR`, Query Store hints (2022) - choose per case.
- Extended Events; `system_health` session keeps recent deadlock graphs.

### Db2 LUW
- Explain: create explain tables (`SYSPROC.SYSINSTALLOBJECTS` or `EXPLAIN.DDL`), `EXPLAIN PLAN FOR <stmt>`, format with `db2exfmt -d <DB> -1 -o plan.txt`; quick view `db2expln`.
- Monitoring table functions: `MON_GET_PKG_CACHE_STMT` (top SQL: `STMT_EXEC_TIME`, `NUM_EXECUTIONS`, `ROWS_READ`), `MON_GET_CONNECTION`, `MON_GET_ACTIVITY`, `MON_GET_TABLE`, `MON_GET_BUFFERPOOL`.
- Locks: `SYSIBMADM.MON_LOCKWAITS`, `db2pd -db <DB> -wlocks`, `db2pd -db <DB> -locks`.
- Statistics: `RUNSTATS ON TABLE <SCHEMA>.<TABLE> WITH DISTRIBUTION AND DETAILED INDEXES ALL;` - `REORGCHK` to assess reorg needs; `db2advis` for index advice.

### MySQL / MariaDB
- `EXPLAIN <stmt>`; actual: MySQL 8.0.18+ `EXPLAIN ANALYZE <stmt>`; MariaDB `ANALYZE <stmt>` (both execute the statement).
- Top SQL: `sys.statement_analysis`, `performance_schema.events_statements_summary_by_digest`; slow query log (`slow_query_log`, `long_query_time`) + `pt-query-digest`.
- InnoDB: `SHOW ENGINE INNODB STATUS\G` (latest deadlock, history list length), `information_schema.INNODB_TRX`, `sys.innodb_lock_waits`; MySQL 8: `performance_schema.data_locks` / `data_lock_waits`; MariaDB: `information_schema.INNODB_LOCKS` / `INNODB_LOCK_WAITS` and the `METADATA_LOCK_INFO` plugin; MySQL metadata locks: `performance_schema.metadata_locks`.

## 3. Locking and concurrency - traps

| Engine | Trap | Mitigation |
|---|---|---|
| All | Long transaction + DDL: the DDL waits, and every later query queues behind it | Short lock timeout on DDL, retry loop, run when no long transactions; check before (active sessions) |
| Oracle | Unindexed foreign keys -> TM locks on child when parent rows deleted/PK updated | Index FK columns |
| Oracle | DDL fails `ORA-00054` on busy object | `DDL_LOCK_TIMEOUT`; online variants (`CREATE INDEX ... ONLINE`, `ALTER TABLE ... MOVE ONLINE` 12.2+, `DBMS_REDEFINITION`) - all Enterprise Edition only (not in SE2) |
| Oracle | Commit inside a loop over an open cursor -> `ORA-01555 snapshot too old` | Chunk by key/rowid ranges (`DBMS_PARALLEL_EXECUTE`), size undo retention |
| PostgreSQL | Most `ALTER TABLE` take ACCESS EXCLUSIVE; waiting for it blocks all readers | `SET lock_timeout`; `CREATE INDEX CONCURRENTLY`; FK/CHECK `NOT VALID` then `VALIDATE CONSTRAINT` |
| PostgreSQL | Column type change rewrites the table (except safe cases such as increasing varchar length) | Expand/contract with new column + backfill |
| PostgreSQL | `idle in transaction` sessions | `idle_in_transaction_session_timeout`, fix application |
| SQL Server | Readers block writers under default READ COMMITTED | Evaluate `READ_COMMITTED_SNAPSHOT ON` (tempdb version store impact; test) |
| SQL Server | Lock escalation to table on large DML | Batches below ~5000 rows; `ALTER TABLE ... SET (LOCK_ESCALATION = ...)` with care |
| SQL Server | `NOLOCK` used as a "fix" | Dirty reads, missing/duplicate rows - reject in reviews |
| Db2 | `LOCKTIMEOUT = -1` (wait forever) default | Set `CURRENT LOCK TIMEOUT` in release sessions |
| Db2 | `ALTER TABLE ... DROP COLUMN`, most `ALTER COLUMN SET DATA TYPE`, `SET NOT NULL`/`DROP NOT NULL` put a row-organized table in reorg-pending state (SQLSTATE 57007): until `REORG TABLE` only scans, DROP/RENAME/TRUNCATE and most other ALTERs are allowed; at most 31 units of work of such operations before REORG becomes mandatory | Plan `REORG TABLE` in the window; check `REORG_PENDING` / `NUM_REORG_REC_ALTERS` in `SYSIBMADM.ADMINTABINFO` |
| MySQL | Metadata lock (MDL) waits: DDL blocked by an open transaction then blocks everyone | `lock_wait_timeout` low in release session; kill idle long transactions |
| MySQL | Online DDL silently falls back to table copy | Always state `ALGORITHM=INSTANT` (or `INPLACE`) with `LOCK=NONE` so it errors instead; or gh-ost / pt-online-schema-change |
| MySQL | Gap/next-key locks on range updates under REPEATABLE READ | Index the predicate; consider READ COMMITTED where acceptable |

Deadlocks: always a design issue (inconsistent access order, missing indexes). Capture: Oracle trace file / alert log (`ORA-00060`), PostgreSQL log (`log_lock_waits = on` for waits > `deadlock_timeout`), SQL Server `system_health` XE, Db2 event monitor for locking, MySQL `innodb_print_all_deadlocks`.

## 4. HA / DR

| Engine | Local HA | DR / replicas | Key operations & checks |
|---|---|---|---|
| Oracle | RAC (shared storage, active-active, extra license) | Data Guard physical standby (redo apply); Active Data Guard = open read-only with apply (extra license) | Protection modes: Maximum Performance (ASYNC, default), Maximum Availability (SYNC, falls back), Maximum Protection (SYNC, primary stops if no standby). Broker `dgmgrl`: `SHOW CONFIGURATION;`, `VALIDATE DATABASE <stby>;`, `SWITCHOVER TO <stby>;`, `FAILOVER TO <stby>;`. Lag: `V$DATAGUARD_STATS`. Primary in `FORCE LOGGING`. Fast-Start Failover needs an observer (ideally on a third site). |
| PostgreSQL | Patroni (DCS: etcd/Consul/ZooKeeper) + HAProxy/VIP | Streaming replication (physical, WAL); logical replication (publications/subscriptions, PG10+) | `pg_stat_replication` (`sent_lsn`, `write_lsn`, `flush_lsn`, `replay_lsn`), `pg_is_in_recovery()`, `pg_promote()` (PG12+). Sync: `synchronous_standby_names` + `synchronous_commit`. Replication slots retain WAL if a replica is down -> disk full: monitor, cap with `max_slot_wal_keep_size` (PG13+). Patroni: `patronictl -c <cfg> list` / `switchover` / `failover`; REST health endpoints (`/primary`, `/replica`) for the load balancer. Logical replication replicates neither DDL nor sequence values (as of PG 18): apply additive schema changes on the subscriber first and reset sequences before failing over to a subscriber. |
| SQL Server | Failover Cluster Instance (shared storage, WSFC) | Always On Availability Groups (WSFC, or Pacemaker on Linux); log shipping | Automatic failover only between synchronous-commit replicas. Listener for clients (`MultiSubnetFailover=True`). Logins, Agent jobs, linked servers, credentials are NOT replicated (contained AG, SQL Server 2022 Enterprise, helps). Full AGs need Enterprise; Basic AG on Standard Edition (1 DB, 2 replicas). Check `sys.dm_hadr_database_replica_states`. Planned failover: `ALTER AVAILABILITY GROUP [<AG>] FAILOVER;` on the target sync secondary. Readable secondaries have licensing impact. |
| Db2 LUW | pureScale (active-active) or HADR + Pacemaker/TSA automation | HADR (up to 3 standbys, `HADR_TARGET_LIST`) | `HADR_SYNCMODE`: SYNC, NEARSYNC, ASYNC, SUPERASYNC. Monitor `db2pd -db <DB> -hadr` or `MON_GET_HADR`. Role switch on standby: `TAKEOVER HADR ON DATABASE <DB>` (`BY FORCE` for failover). Reads on standby via `DB2_HADR_ROS` (limitations). |
| MySQL / MariaDB | InnoDB Cluster (Group Replication + MySQL Router); Galera (MariaDB) | Async / semi-sync replication, GTID-based | `SHOW REPLICA STATUS` (MySQL 8.0.22+; MariaDB 10.5.1+ accepts `REPLICA` as a synonym of `SLAVE`; older versions: `SHOW SLAVE STATUS`). Watch replication lag and errant GTIDs; Galera needs a primary-component quorum (3 nodes or arbitrator). |

Design rules: define RPO/RTO per application before choosing sync/async; DR test at least yearly with documented results (DORA requires ICT continuity testing for financial entities); clients must reconnect transparently (connection strings with multiple hosts/listener/SCAN, retry logic); monitor lag and alert; split-brain protection (quorum, fencing, observer/witness on a third site).

## 5. Backup, restore, PITR

| Engine | Full / incremental | PITR | Validate |
|---|---|---|---|
| Oracle (RMAN) | `BACKUP DATABASE PLUS ARCHIVELOG;` incremental level 0/1; `CONFIGURE CONTROLFILE AUTOBACKUP ON;` `CONFIGURE RETENTION POLICY TO RECOVERY WINDOW OF 14 DAYS;` | ARCHIVELOG mode required. `RUN { SET UNTIL TIME "TO_DATE('2026-10-01 12:00','YYYY-MM-DD HH24:MI')"; RESTORE DATABASE; RECOVER DATABASE; }` then `ALTER DATABASE OPEN RESETLOGS;` | `RESTORE DATABASE VALIDATE;`, `CROSSCHECK BACKUP;`, `LIST BACKUP SUMMARY;`, `REPORT NEED BACKUP;`, `DELETE OBSOLETE;` |
| PostgreSQL | `pg_basebackup -D <dir> -Ft -z -X stream -P`; pgBackRest `--type=full` / `diff` / `incr` `backup`; Barman. `pg_dump` is logical only (no PITR) | WAL archiving (`archive_mode`, `archive_command`); restore base + `restore_command` + `recovery_target_time` + `recovery.signal` (PG12+). pgBackRest: `pgbackrest --stanza=<s> --type=time "--target=2026-10-01 12:00:00+02" restore` | `pgbackrest --stanza=<s> check`, `pgbackrest --stanza=<s> info`; periodic real restore test |
| SQL Server | Recovery model FULL; `BACKUP DATABASE [<db>] TO DISK = N'<path>' WITH CHECKSUM, COMPRESSION;` differential; `BACKUP LOG` | Restore full `WITH NORECOVERY`, diff, logs, last with `STOPAT = '2026-10-01T12:00:00', RECOVERY`; take a tail-log backup first if possible | `RESTORE VERIFYONLY` (not proof), `RESTORE HEADERONLY`, `DBCC CHECKDB` after test restore; history in `msdb.dbo.backupset` |
| Db2 LUW | `BACKUP DATABASE <DB> ONLINE TO <path> COMPRESS INCLUDE LOGS` (needs archive logging `LOGARCHMETH1`); incremental needs `TRACKMOD` | `RESTORE DATABASE <DB> FROM <path> TAKEN AT <ts>` then `ROLLFORWARD DATABASE <DB> TO <ts> USING LOCAL TIME AND STOP` (or `TO END OF LOGS AND STOP`) | `db2ckbkp <image>`; `LIST HISTORY BACKUP ALL FOR <DB>` |
| MySQL / MariaDB | Physical: Percona XtraBackup / Mariabackup / MySQL Enterprise Backup; logical: `mysqldump --single-transaction` or MySQL Shell dump utilities | Binary logs + `mysqlbinlog --start-datetime/--stop-datetime` (or positions/GTIDs) replayed on the restored backup | Test restore; keep binlog retention > backup interval |

Rules: ad hoc backups must not break the chain (SQL Server `COPY_ONLY`); TDE keys/certificates/wallets backed up separately and tested (an encrypted backup without its key is lost); backups encrypted, offsite/immutable copy (ransomware); restore tests scheduled with measured duration (= real RTO); backups contain personal data: same GDPR controls as prod.

Pre-release safety net: Oracle guaranteed restore point `CREATE RESTORE POINT before_rel_123 GUARANTEE FLASHBACK DATABASE;` (rollback: `FLASHBACK DATABASE TO RESTORE POINT before_rel_123;` in MOUNT state then `OPEN RESETLOGS`; drop the restore point afterwards - it consumes FRA space; Flashback Database is an Enterprise Edition feature, not in SE2). Others: full/differential backup or storage snapshot immediately before the release, with tested restore time.

## 6. Security

| Control | Oracle | PostgreSQL | SQL Server | Db2 LUW | MySQL / MariaDB |
|---|---|---|---|---|---|
| Encryption at rest | TDE (Advanced Security option, EE) | No native TDE in community PG: volume/FS encryption; some distributions offer TDE - verify | TDE (Enterprise; Standard from 2019); Always Encrypted for client-side column encryption | Native encryption (`ENCRYPT` at create, keystore via `KEYSTORE_TYPE`/`KEYSTORE_LOCATION`) | InnoDB data-at-rest encryption (keyring) / MariaDB data-at-rest encryption |
| In transit | Native network encryption or TLS (TCPS) | `ssl = on` + `hostssl` in `pg_hba.conf` | Force encryption / TLS certificate | SSL/TLS (`SSL_SVCENAME`) | `require_secure_transport = ON` |
| Auditing | Unified Auditing (`CREATE AUDIT POLICY`, `AUDIT POLICY`, `UNIFIED_AUDIT_TRAIL`) | pgAudit (`pgaudit.log = 'ddl, role'`) | SQL Server Audit (server + database audit specifications) | `db2audit`, `CREATE AUDIT POLICY` + `AUDIT ... USING POLICY` | MySQL Enterprise Audit; MariaDB `server_audit` plugin; Percona audit plugin |
| Row/column control | VPD, Data Redaction (Advanced Security) | Row-level security policies | Row-level security; Dynamic Data Masking (presentation only, not a security boundary) | RCAC (`CREATE PERMISSION`, `CREATE MASK`) | Views + grants |
| Authentication | Lock default accounts; `DBA_USERS_WITH_DEFPWD` | `scram-sha-256` (default `password_encryption` since PG14); never `trust` | Windows auth / gMSA; disable or rename `sa`; `xp_cmdshell` off | Separate SECADM / DBADM / DATAACCESS | `caching_sha2_password` (MySQL 8 default); scope `'user'@'host'` |

Least privilege model (all engines): schema owner account (no login in run time, used only by release tooling) / application account (DML on its objects, no DDL) / read-only account / named DBA accounts via PAM. Reject: application connecting as owner or DBA, `GRANT ... TO PUBLIC`, Oracle `ANY` privileges, SQL Server `db_owner`/`sysadmin` for apps, PostgreSQL superuser apps (note: since PG15 the `public` schema no longer grants CREATE to PUBLIC on new databases; on older or upgraded databases run `REVOKE CREATE ON SCHEMA public FROM PUBLIC;`).

### GDPR and non-production data
- Production personal data copied to dev/test is still personal data: GDPR art. 5 (minimisation), art. 25 (privacy by design/default), art. 32 (security, citing pseudonymisation and encryption); breach notification to the CNIL within 72 h (art. 33).
- Pseudonymised data remains personal data (recital 26); only true anonymisation exits GDPR scope.
- Use static masking on copies (not dynamic masking): deterministic masking to keep referential integrity across systems (same input -> same output in every database/interface), format-preserving where apps validate formats (IBAN, NIR, phone), subsetting to reduce volume.
- Tools (examples): Oracle Data Masking and Subsetting (license), PostgreSQL Anonymizer extension, IBM InfoSphere Optim, scripted masking with documented rules.
- Do not forget: backups, exports, logs, replicas, search indexes, files in BLOBs, free-text comments.
- Sector: health data (HDS hosting in France), banking secrecy - copies outside the certified perimeter are generally forbidden even masked unless approved.

## 7. Oracle -> PostgreSQL migration pitfalls

| Area | Oracle behaviour | PostgreSQL behaviour / action |
|---|---|---|
| Empty string | `''` is NULL | `''` is not NULL: review `IS NULL` logic, constraints and string concatenation (a NULL operand makes the result NULL in PG; Oracle treats it as empty) - use `concat()`/`COALESCE` |
| NUMBER | Generic `NUMBER` | Map `NUMBER(p,0)` to `integer`/`bigint`, money to `numeric(p,s)`; plain `numeric` everywhere is slow |
| DATE | Includes time | `timestamp(0)`; PG `date` has no time |
| Current time | `SYSDATE`/`SYSTIMESTAMP` | `now()`/`current_timestamp` = transaction start; `clock_timestamp()` = actual time |
| Strings | `VARCHAR2(n BYTE)` / `VARCHAR2(n CHAR)` | `varchar(n)` counts characters; `text` is fine |
| LOBs | CLOB/BLOB | `text` / `bytea` (or large objects); check sizes > 1 GB |
| Identifiers | Unquoted folded to UPPER | Folded to lower; quoted mixed-case names become a lifelong pain |
| Syntax | `ROWNUM`, `(+)` joins, `CONNECT BY`, `DECODE`, `NVL`, `DUAL`, `MINUS`, `seq.NEXTVAL` | `LIMIT`/`ROW_NUMBER()`, ANSI joins, `WITH RECURSIVE`, `CASE`, `COALESCE`, no DUAL, `EXCEPT`, `nextval('seq')` |
| PL/SQL | Packages, package state, autonomous transactions, `%TYPE` | PL/pgSQL functions/procedures, schemas as namespaces, no package state (orafce helps for some functions), no autonomous transactions (dblink/pg_background workarounds) |
| Errors in transactions | Failed statement rolled back alone | Any error aborts the whole transaction until ROLLBACK (use savepoints/exception blocks) |
| Transaction control | COMMIT in procedures | Procedures (PG11+) can COMMIT; functions cannot |
| Global temporary tables | Permanent definition, private data | Session temp tables created at runtime (or extension) |
| Synonyms / DB links | Native | `search_path`/views; `postgres_fdw`/`oracle_fdw` |
| Implicit casts | Lenient | Strict typing: explicit casts needed |
| Sorting/collation | NLS settings | Collation provider (libc/ICU) - verify sort order and case sensitivity |
| Optimizer hints | Common | No hints in core (pg_hint_plan extension); fix stats/indexes instead |
| MERGE | Yes | PG15+ |

Tooling: ora2pg (assessment + conversion), oracle_fdw for data moves, cloud schema conversion tools. Validate with row counts + per-column checksums/aggregates, compare business reports, replay a performance baseline. Similar care for SQL Server -> PG (case-insensitive default collations, `datetime` precision, `IDENTITY`, T-SQL temp tables) and Db2 -> PG.

## 8. Release script best practices

### Script skeleton
| Client | Stop on error / logging |
|---|---|
| SQL*Plus / SQLcl | `WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK` + `WHENEVER OSERROR EXIT FAILURE ROLLBACK`, `SET ECHO ON TIMING ON`, `SPOOL rel_<ver>.log` |
| psql | `psql -v ON_ERROR_STOP=1 -f rel.sql` (add `--single-transaction` only if no `CONCURRENTLY`/COMMIT-in-procedure), `\timing on` |
| sqlcmd | `sqlcmd -b -i rel.sql -o rel.log` or `:on error exit`; `SET XACT_ABORT ON;` in each transactional batch (an error in one `GO` batch does not stop the next without `-b`) |
| Db2 CLP | `db2 -tvsf rel.sql` (`-s` stops on error; `+c` disables autocommit for explicit transactions) |
| mysql | Batch mode stops at first error unless `--force`; remember DDL implicitly commits |

Header: target engine/version, schema, prerequisites (previous version installed), expected duration, lock impact, rollback script name, author, ticket. Use a migration tool (Flyway, Liquibase) with a version table so a script cannot run twice or out of order.

### Rules
1. **Idempotent / re-runnable**: guard every DDL.
   - PostgreSQL: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX [CONCURRENTLY] IF NOT EXISTS`, `DROP ... IF EXISTS`.
   - SQL Server: `IF COL_LENGTH(N'dbo.Orders', N'StatusCode') IS NULL ALTER TABLE dbo.Orders ADD StatusCode varchar(10) NULL;`; `IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Orders_Status' AND object_id = OBJECT_ID(N'dbo.Orders'))`; `CREATE OR ALTER` (2016 SP1+) for views/procs/functions/triggers; `DROP ... IF EXISTS` (2016+).
   - Oracle: `CREATE OR REPLACE` for code objects; `IF [NOT] EXISTS` on CREATE/ALTER/DROP from 23ai (not in 19c; not combinable with `OR REPLACE`); before that, check `USER_TABLES`/`USER_TAB_COLUMNS`/`USER_INDEXES` in a PL/SQL block with `EXECUTE IMMEDIATE`.
   - Db2: `CREATE TABLE IF NOT EXISTS` / `DROP TABLE IF EXISTS` (11.5+, tables only, not with `AS SELECT`); `CREATE OR REPLACE` for views/routines; for other objects check `SYSCAT.TABLES`/`SYSCAT.COLUMNS`/`SYSCAT.INDEXES` in a compound SQL block.
   - MySQL: `CREATE TABLE IF NOT EXISTS`, `DROP ... IF EXISTS`; `ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` exist in MariaDB, not MySQL - check `information_schema` instead.
   - DML: `INSERT ... WHERE NOT EXISTS` / `MERGE` / `ON CONFLICT DO NOTHING` (PG) / `INSERT ... ON DUPLICATE KEY UPDATE` (MySQL) for reference data.
2. **Online index creation**: Oracle `CREATE INDEX ... ONLINE` (EE); PostgreSQL `CREATE INDEX CONCURRENTLY` (not in a transaction block; on failure leaves an INVALID index - `DROP INDEX CONCURRENTLY` and retry); SQL Server `WITH (ONLINE = ON[, RESUMABLE = ON])` (Enterprise; resumable create 2019+); MySQL `ALGORITHM=INPLACE, LOCK=NONE`; Db2 allows concurrent read/write access during `CREATE INDEX` (writes blocked briefly at the end; in pureScale, concurrent writes by default only from 11.5). Oracle: `INVISIBLE` index to test before exposing to the optimizer.
3. **Cheap vs expensive DDL**: adding a nullable column is metadata-only almost everywhere; adding a column with a default is metadata-only in Oracle (11g+ NOT NULL, 12c+ nullable), PostgreSQL 11+ (non-volatile default), MySQL 8.0.12+ `ALGORITHM=INSTANT`, SQL Server 2012+ Enterprise edition (NOT NULL column with a runtime-constant default; other editions update every row). Type changes, NOT NULL on existing columns, and table moves are typically expensive (rewrite or full scan).
4. **Large DML in batches**: 1k-50k rows per commit by key range; restartable (predicate excludes already-processed rows); throttle to protect replication lag and log/undo; SQL Server stay under ~5000 rows per statement to avoid escalation; index the batch predicate. Examples:
   - SQL Server: `WHILE 1=1 BEGIN UPDATE TOP (4000) dbo.Orders SET StatusCode = 'ARCH' WHERE OrderDate < '2020-01-01' AND (StatusCode IS NULL OR StatusCode <> 'ARCH'); IF @@ROWCOUNT = 0 BREAK; END`
   - PostgreSQL 11+ (`DO` block not inside an explicit transaction): loop `UPDATE ... WHERE id IN (SELECT id ... LIMIT 10000)`, `GET DIAGNOSTICS n = ROW_COUNT; EXIT WHEN n = 0; COMMIT;`
   - Oracle: `DBMS_PARALLEL_EXECUTE` (chunk by rowid/number column) or key-range loops; avoid fetch-across-commit.
5. **Lock timeouts** in every release session (section 1 table) + retry; never let a DDL queue indefinitely in business hours.
6. **Transaction scope**: one logical change per transaction; DDL in Oracle/MySQL commits implicitly (a later failure cannot roll back earlier steps - hence step-wise rollback scripts); avoid mixing DDL and long DML in one transaction in PG/SQL Server (locks held until commit).
7. **Statistics** after large data changes or new indexes: Oracle `EXEC DBMS_STATS.GATHER_TABLE_STATS(ownname => 'APP', tabname => 'ORDERS');` PostgreSQL `ANALYZE app.orders;` SQL Server `UPDATE STATISTICS dbo.Orders;` Db2 `RUNSTATS ON TABLE APP.ORDERS WITH DISTRIBUTION AND DETAILED INDEXES ALL;` MySQL `ANALYZE TABLE orders;`.
8. **Code objects**: recompile and check invalid objects after DDL (Oracle `DBA_OBJECTS WHERE status = 'INVALID'`, `UTL_RECOMP` / `utlrp.sql`; Db2 `ADMIN_REVALIDATE_DB_OBJECTS`; SQL Server `sp_refreshview` for non-schemabound views).
9. **Rollback script** for every step, tested in pre-prod:

| Forward change | Rollback approach |
|---|---|
| Add column/table/index | Drop it (data in new column is lost - acceptable if documented) |
| Drop column/table | Never in the same release as the code change: rename or keep, drop in release N+1 (expand/contract); or back up first (`CREATE TABLE <t>_bkp_<ver> AS SELECT ...`) |
| Update/delete data | Save before-image keyed by PK into a backup table; rollback = restore from it |
| Type/constraint change | Reverse DDL + data conversion; check for data written in new format |
| Code objects (procs/views) | Redeploy previous version from source control |
| Whole release | Restore point / backup / snapshot (last resort; loses data written since) |

10. **Volumetry**: estimate rows/size before running - Oracle `DBA_TABLES.NUM_ROWS`, `DBA_SEGMENTS.BYTES`; PG `pg_class.reltuples`, `pg_total_relation_size('app.orders')`; SQL Server `EXEC sp_spaceused N'dbo.Orders';`; Db2 `SYSCAT.TABLES.CARD` (after RUNSTATS); MySQL `information_schema.TABLES` (approximate for InnoDB). Check free space for log/undo/temp/tablespace and for index builds (roughly index size again, more for sorts).
11. **Pre-checks and post-checks**: version table, object existence, row counts, invalid objects, constraint validity, smoke queries, application connectivity.
12. **Rehearse** on a production-like volume copy and record durations; deploy outside batch windows (coordinate with the scheduler).

## 9. Review checklist
- [ ] Engine and version identified; edition-dependent features (ONLINE, TDE, packs) licensed
- [ ] Stop-on-error, spool/log, timing enabled; header with prerequisites and duration
- [ ] Every DDL/DML idempotent or protected by a version table
- [ ] Lock timeout set; no blocking DDL during business hours; online variants used
- [ ] Large DML batched, restartable, committed in chunks, predicate indexed
- [ ] Transaction scope explicit; implicit DDL commits understood (Oracle/MySQL)
- [ ] Rollback script exists per step, tested; destructive changes deferred (expand/contract)
- [ ] Backup / restore point taken before release; restore time known
- [ ] Statistics refreshed; invalid objects recompiled; post-checks defined
- [ ] Grants least privilege; no personal data in scripts/logs; no secrets in clear
- [ ] HA impact assessed: replication lag, log volume, standby apply, logical replication of DDL
- [ ] Coordination: application deploy order, batch scheduling freeze, monitoring silenced/annotated

## Sources

- https://docs.oracle.com/en/database/oracle/oracle-database/23/dblic/Licensing-Information.html - Oracle features by edition (Flashback, online DDL, packs)
- https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/release-changes.html - Oracle `IF [NOT] EXISTS` DDL syntax support
- https://www.postgresql.org/docs/current/logical-replication-restrictions.html - logical replication: no DDL, no sequences
- https://www.postgresql.org/docs/current/sql-createindex.html - `CREATE INDEX CONCURRENTLY` transaction and INVALID behaviour
- https://www.postgresql.org/docs/current/runtime-config-client.html - `lock_timeout`, `idle_in_transaction_session_timeout`
- https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-table-transact-sql - metadata-only NOT NULL column add, Enterprise
- https://learn.microsoft.com/en-us/sql/sql-server/editions-and-components-of-sql-server-2022 - online index, TDE, AG by edition
- https://www.ibm.com/docs/en/db2/12.1?topic=statements-alter-table - Db2 reorg-pending ALTER operations
- https://www.ibm.com/docs/en/db2/12.1?topic=statements-create-index - Db2 concurrent access during CREATE INDEX
- https://www.ibm.com/docs/en/db2/11.5?topic=statements-create-table - Db2 11.5 `CREATE TABLE IF NOT EXISTS`
- https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html - `SHOW REPLICA STATUS` from MySQL 8.0.22
- https://mariadb.com/kb/en/mariadb-1051-release-notes/ - MariaDB 10.5.1 `REPLICA` synonym
