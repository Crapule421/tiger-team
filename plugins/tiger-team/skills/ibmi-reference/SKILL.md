---
name: ibmi-reference
description: IBM i knowledge base - RPG ILE and free-form, CL, COBOL, Db2 for i, journaling, jobs and subsystems, spool and IFS, security, integration (data queues, MQ, JDBC, REST, CFT), HA, scheduling, CCSID pitfalls, review checklist.
user-invocable: false
---

# IBM i reference

Baseline: IBM i 7.4 / 7.5 / 7.6. Support status (IBM lifecycle pages, October 2026): 7.3 - standard support ended 30 Sep 2023 (paid service extension to 30 Sep 2028); 7.4 - GA 21 Jun 2019, withdrawn from marketing 30 Apr 2026, standard support ended 30 Sep 2026 (extension offered to 30 Sep 2029); 7.5 - GA 10 May 2022, no end-of-support date announced; 7.6 - GA 18 Apr 2025. A customer still on 7.4 or 7.3 is on paid extension or unsupported: flag it. Many features arrive by Technology Refresh (TR) or PTF group: items flagged "verify against your release" must be checked (command prompt F4, `DSPCMD`, `DSPSYSVAL`, IBM Documentation). Never invent CL commands, keywords, system values or API parameters.

## 1. Object model and source
| Object type | What it is |
|---|---|
| `*LIB` | Library (flat, no nesting; QSYS is the root) |
| `*FILE` | Physical file (PF, SQL table), logical file (LF, SQL index/view), source PF, display (DSPF), printer (PRTF), save file (SAVF), DDM file |
| `*MODULE`, `*PGM`, `*SRVPGM`, `*BNDDIR` | ILE module, program, service program, binding directory |
| `*CMD`, `*MSGF` | Command, message file |
| `*DTAARA`, `*DTAQ`, `*USRSPC` | Data area, data queue, user space |
| `*JOBD`, `*JOBQ`, `*OUTQ`, `*MSGQ`, `*SBSD`, `*CLS` | Work management objects |
| `*USRPRF`, `*AUTL` | User profile, authorization list |
| `*JRN`, `*JRNRCV` | Journal, journal receiver |

Names are 10 characters (SQL long names map to system names). Source lives in source PFs (`QRPGLESRC`, `QCLLESRC`, `QCBLLESRC`, `QDDSSRC`; member types `RPGLE`, `SQLRPGLE`, `CLLE`, `CBLLE`, `SQLCBLLE`, `PF`, `LF`, `DSPF`, `PRTF`) or in IFS stream files (Git-friendly): the `SRCSTMF` parameter (exclusive with `SRCFILE`/`SRCMBR`) exists on `CRTBNDRPG`, `CRTRPGMOD`, `CRTSQLRPGI`, `CRTBNDCL`, `CRTCLMOD`, `CRTBNDCBL` and `CRTCBLMOD` (7.3/7.4 and later), but not on the DDS commands (`CRTPF`, `CRTLF`, `CRTDSPF`...), which still compile from a source member.

## 2. RPG IV / ILE RPG
### 2.1 Free-form evolution
| Level | Capability |
|---|---|
| V5R1+ | `/FREE ... /END-FREE` calculations; H/F/D/P specs still fixed |
| 7.1 TR7 / 7.2 (2013) | Free-form declarations: `CTL-OPT`, `DCL-F`, `DCL-S`, `DCL-C`, `DCL-DS`, `DCL-PR`, `DCL-PI`, `DCL-PROC` |
| 7.2 and 7.1 with PTFs (2015) | `**FREE` in column 1: fully free source, no column limits; fixed-form code only through `/COPY` |
| 7.3 / 7.4 | `DATA-INTO` (7.4 base, 7.2/7.3 with PTFs, 2018), `DATA-GEN` (7.4 and 7.3 with PTFs, 2019); later opcodes/BIFs arrive as PTFs listed on the IBM RPG Cafe page - check the compile and runtime PTF levels of your release |

### 2.2 Batch program skeleton (fictitious)
```rpgle
**FREE
ctl-opt dftactgrp(*no) actgrp(*caller) option(*srcstmt: *nodebugio)
        datfmt(*iso) timfmt(*iso);

dcl-pi *n;
  pProcDate char(8);   // processing date YYYYMMDD from the scheduler
  pRc       char(2);   // '00' = OK, otherwise error (CL wrapper turns it into an escape message)
end-pi;

dcl-s wDate date;
dcl-s wRows int(10);

exec sql set option commit = *chg, naming = *sys, datfmt = *iso, closqlcsr = *endmod;

*inlr = *on;
pRc = '99';
monitor;
  wDate = %date(pProcDate: *iso0);
on-error;
  return;                                   // invalid parameter -> error code
endmon;

exec sql update ECRITURE set STATUT = 'V'
          where DATE_TRT = :wDate and STATUT = 'A';
if %subst(sqlstate: 1: 2) <> '00' and %subst(sqlstate: 1: 2) <> '01'
   and sqlstate <> '02000';
  exec sql rollback;
  return;
endif;
exec sql get diagnostics :wRows = ROW_COUNT;   // log the count for reconciliation
exec sql commit;
pRc = '00';
return;
```
`SET OPTION` must be the first SQL statement in the source. Alternative to a return code: send an `*ESCAPE` message to the caller with the `QMHSNDPM` API.

### 2.3 ILE concepts
- `CRTRPGMOD` -> `*MODULE`; `CRTPGM` binds modules (+ `BNDSRVPGM`, `BNDDIR`); `CRTBNDRPG` = one-step program; `CRTSQLRPGI OBJTYPE(*PGM|*MODULE|*SRVPGM)` for embedded SQL (default `COMMIT(*CHG)` - set it explicitly).
- Service programs: exports controlled by binder source (`STRPGMEXP PGMLVL(*CURRENT) SIGNATURE(...)` / `EXPORT SYMBOL(...)` / `ENDPGMEXP`); append new exports at the end and keep `*PRV` blocks, otherwise callers fail with a signature violation at activation. `UPDPGM`/`UPDSRVPGM` to replace modules.
- Activation groups: `DFTACTGRP(*YES)` = OPM-compatible (no ILE features); `*NEW` = fresh AG per call (costly, cleans up at end); `*CALLER`; named AG = files, overrides, commitment definition and globals persist until `RCLACTGRP` or job end. Global variables in service programs persist across calls in the AG.

### 2.4 Error handling
| Mechanism | Scope / note |
|---|---|
| `MONITOR` / `ON-ERROR` / `ENDMON` | Block-level; ON-ERROR by status code, `*FILE`, `*PROGRAM`, `*ALL` |
| `(E)` extender + `%ERROR`, `%STATUS` | Single operation |
| `*PSSR`, `INFSR` | Legacy program/file exception subroutines |
| PSDS / INFDS | Program/file status (job name/user/number, status, last record) |
| `SQLSTATE` / `SQLCODE` / `GET DIAGNOSTICS` | After every `EXEC SQL`; class `00` OK, `01` warning, `02` no data |
| Unhandled exception | Inquiry message (RNQxxxx) -> batch job waits in MSGW unless a reply is configured |

### 2.5 RPG pitfalls
- Decimal data errors (`MCH1202`) from invalid packed/zoned content (bad loads, `CPYF FMTOPT(*NOCHK)`, overlaid data structures).
- Silent truncation/overflow in assignments; `EVAL(H)` for rounding; check field sizes against the DB definition.
- Record locks: update-capable files lock the record read by `READ`/`CHAIN` until `UPDATE`/`UNLOCK`/next read; use `(N)` for read-only access; lock wait = file `WAITRCD`. Record-in-use errors: `CPF5027` (record in use by another job), RPG file status `01218` "Record already locked" (runtime messages are in `QRNXMSG`), status `01222` for a referential-constraint allocation failure (`CPF502E`).
- Level check `CPF4131` after a file format change without recompiling; `LVLCHK(*NO)` is a dangerous workaround.
- Dates: 2-digit year formats (`*YMD`, `*MDY`, `*DMY`) only cover 1940-2039; legacy numeric dates (8,0) and CYYMMDD (7,0, C = 0 for 19xx, 1 for 20xx); sentinels 0001-01-01 / 9999-12-31.
- Row-by-row SQL in loops instead of set-based statements or multi-row `FETCH`; cursors left open (`CLOSQLCSR`); dynamic SQL built by concatenation (SQL injection - use parameter markers).
- Indicator-driven logic (`*INxx`), `GOTO`/`TAG`, cycle programs with implicit reads: document before changing.
- Hard-coded library names; `*LIBL` dependency without a controlled job description.

## 3. CL
### 3.1 Batch wrapper skeleton (fictitious)
```
PGM        PARM(&PDATE)
  DCL      VAR(&PDATE)   TYPE(*CHAR) LEN(8)
  DCL      VAR(&RC)      TYPE(*CHAR) LEN(2)
  DCL      VAR(&MSGID)   TYPE(*CHAR) LEN(7)
  DCL      VAR(&MSGDTA)  TYPE(*CHAR) LEN(256)
  DCL      VAR(&MSGF)    TYPE(*CHAR) LEN(10)
  DCL      VAR(&MSGFLIB) TYPE(*CHAR) LEN(10)
  MONMSG   MSGID(CPF0000 MCH0000) EXEC(GOTO CMDLBL(ERROR))

  CALL     PGM(CPTVAL01) PARM(&PDATE &RC)
  IF       COND(&RC *NE '00') THEN(SNDPGMMSG MSGID(CPF9898) MSGF(QCPFMSG) +
             MSGDTA('CPTVAL01 failed, RC=' *CAT &RC) MSGTYPE(*ESCAPE))
  RETURN

ERROR:
  RCVMSG   MSGTYPE(*EXCP) MSGDTA(&MSGDTA) MSGID(&MSGID) MSGF(&MSGF) SNDMSGFLIB(&MSGFLIB)
  MONMSG   MSGID(CPF0000)
  SNDPGMMSG MSGID(&MSGID) MSGF(&MSGFLIB/&MSGF) MSGDTA(&MSGDTA) MSGTYPE(*ESCAPE)
  MONMSG   MSGID(CPF0000)
ENDPGM
```
The escape message makes the job end abnormally, so the scheduler sees a failure.

### 3.2 CL pitfalls
- Global `MONMSG CPF0000` that only continues: errors are swallowed, the job ends normally, the scheduler reports success.
- `SBMJOB` inside a scheduled CL: the scheduler only monitors the submitter; the real work escapes monitoring and dependencies.
- `DLYJOB` polling loops waiting for files or other jobs instead of scheduler dependencies.
- `QCMDEXC` with concatenated external input = command injection.
- `ADDLIBLE`/`CHGLIBL` without restoring; `OVRDBF` scope (`OVRSCOPE`) and missing `DLTOVR`; `OPNQRYF` (legacy, prefer SQL).
- Batch diagnostics: job description `LOG(4 00 *SECLVL)` and `LOGCLPGM(*YES)`; `LOG(4 0 *NOLIST)` keeps a job log only when the job ends abnormally.
- Modern CL (7.x): `DOWHILE`/`DOUNTIL`/`DOFOR`, `SELECT`/`WHEN`, `SUBR`/`CALLSUBR`, `INCLUDE`; `RUNSQL`/`RUNSQLSTM` for SQL in CL.

## 4. COBOL on IBM i
- ILE COBOL: `CRTCBLMOD`, `CRTBNDCBL`; embedded SQL: `CRTSQLCBLI`; OPM COBOL (`CRTCBLPGM`) is legacy.
- Bring DDS record formats with `COPY DDS-ALL-FORMATS OF <file>`; check `FILE STATUS` after every I/O: `00` OK, `10` end of file, `22` duplicate key, `23` record not found; IBM i-specific `9x` codes: `90` other errors (file or member not found, unexpected I/O exception), `91` undefined or unauthorized access type, `92` logic error (file locked, file already open, I/O to a closed file, READ after end of file), `94` no file position for REWRITE/DELETE, `95` invalid or incomplete file information, `9D` record locked (`CPF5027`/`CPF5032`), `9H` ACQUIRE failed, `9P` OPEN failed under commitment control, `9R` referential integrity error, `9S` REWRITE/DELETE after a READ with NO LOCK, `9T` trigger program exception, `9W` check constraint exception.
- `COMP-3` = packed, `PIC S9(n)` DISPLAY = zoned; `REDEFINES` mixing text and numeric breaks on character conversion.
- `STOP RUN` ends the run unit (activation group) and closes files of other programs in it: use `GOBACK` in called programs.
- Commitment control via `COMMITMENT CONTROL` clause and `COMMIT`/`ROLLBACK`; files must be journaled.

## 5. DB2 for i
### 5.1 Naming and access
- System naming (`*SYS`): `LIB/FILE`, unqualified objects resolved through the library list. SQL naming (`*SQL`): `SCHEMA.TABLE`, unqualified objects resolved to the default schema (by default the authorization ID = user profile name). JDBC/ODBC default to SQL naming: same SQL, different tables.
- Set naming explicitly: `SET OPTION NAMING`, JDBC property `naming`, ACS "Run SQL Scripts" settings.

### 5.2 DDS vs SQL DDL
| Aspect | DDS PF/LF | SQL table/index/view |
|---|---|---|
| Data validation | On read (bad data surfaces later as decimal data errors) | On write |
| Deleted record reuse | `REUSEDLT(*NO)` default | Reuse by default (arrival-order assumptions break) |
| Constraints, identity, generated timestamps, RCAC, temporal | Limited (`ADDPFCST` for constraints) | Native |
| Select/omit | Logical files | Views; sparse indexes (`CREATE INDEX ... WHERE`, creatable since 6.1 and used by the optimizer since 7.1; the WHERE clause cannot reference a column with a field procedure) |
| Long names | No | Yes, with `FOR SYSTEM NAME` / `RCDFMT` |
| Record format level id | Changes on format change -> `CPF4131` for programs compiled against the old format | Same mechanism for RLA programs over SQL tables |

DDS-to-DDL modernization: keep record format names (`RCDFMT`) and field names so RPG RLA programs keep working; recompile dependants; surrogate logical files technique for staged migration.

### 5.3 Journaling and commitment control
- Objects: `CRTJRNRCV`, `CRTJRN`, `STRJRNPF` (use `IMAGES(*BOTH)` for HA/CDC/before images), `STRJRNOBJ` (data areas, data queues), `STRJRN` (IFS), `STRJRNLIB` (new objects in a library inherit journaling). Tables created by SQL in a schema created with `CREATE SCHEMA` are journaled automatically (journal `QSQJRN`).
- Receivers: `CHGJRN JRNRCV(*GEN)`, system-managed receivers; never delete receivers needed by HA/CDC/audit; save before delete.
- Read: `DSPJRN`, SQL table function `QSYS2.DISPLAY_JOURNAL`; record entries `PT` (insert), `UB`/`UP` (update before/after), `DL` (delete); commitment entries `SC`, `CM`, `RB`.
- Commitment control: `STRCMTCTL LCKLVL(...) CMTSCOPE(*ACTGRP|*JOB)` for native I/O; RPG `COMMIT` file keyword and `COMMIT`/`ROLBK` opcodes; SQL `COMMIT`/`ROLLBACK`.

| SQL isolation | IBM i level | Note |
|---|---|---|
| NC (No Commit) | `*NONE` | No commitment control; no journaling required |
| UR | `*CHG` | Default for `CRTSQLxxxI`; requires journaling |
| CS | `*CS` | |
| RS | `*ALL` | |
| RR | `*RR` | Table-level locking effect |

Pitfalls: `SQL7008` (object not valid for operation - typically not journaled under commitment control); long batch transactions holding locks during online hours; end of scope without explicit COMMIT: an activation-group-scoped commitment definition is committed implicitly when the activation group ends normally and rolled back when it ends abnormally, while the end of the default activation group and the end of a job with job-scoped commitment control roll back pending changes - always commit explicitly; commit every N rows with a restart key for restartable batch.

### 5.4 SQL services for operations and reviews
All services below exist on IBM i 7.3 and later (some via PTF group level); the IBM "IBM i Services (SQL)" page gives the exact level per release.
| Service | Use |
|---|---|
| `QSYS2.ACTIVE_JOB_INFO`, `QSYS2.JOB_INFO`, `SYSTOOLS.ENDED_JOB_INFO` | Active jobs / jobs on queues (e.g. find `MSGW`) / ended jobs from `CPF1164` (7.4 TR, 7.5 TR, base 7.6) |
| `QSYS2.JOBLOG_INFO`, `QSYS2.HISTORY_LOG_INFO` | Job log, QHST history |
| `QSYS2.SYSTABLES`, `SYSCOLUMNS`, `SYSINDEXES`, `SYSVIEWS` | Catalog |
| `QSYS2.OBJECT_STATISTICS`, `QSYS2.IFS_OBJECT_STATISTICS` | Objects in libraries / IFS |
| `QSYS2.USER_INFO`, `QSYS2.OBJECT_PRIVILEGES`, `QSYS2.FUNCTION_USAGE` | Security review |
| `QSYS2.SYSTEM_VALUE_INFO` | System values |
| `QSYS2.SCHEDULED_JOB_INFO` | `WRKJOBSCDE` entries |
| `QSYS2.OUTPUT_QUEUE_ENTRIES` | Spooled files |
| `QSYS2.NETSTAT_INFO` | TCP/IP connections |
| `QSYS2.SYSIXADV` | Index advice |
| `QSYS2.SEND_DATA_QUEUE` / `RECEIVE_DATA_QUEUE` / `DATA_QUEUE_INFO` | Data queues from SQL (7.3 SF99703 level 16, 7.4 SF99704 level 4, base 7.5) |

Security/privacy features: Row and Column Access Control (`CREATE PERMISSION`, `CREATE MASK`, 7.2+; administered with the `QIBM_DB_SECADM` function usage), field procedures for encryption, temporal tables (7.3+) for audit history.
Performance: SQE optimizer, Visual Explain and index advisor in ACS, plan cache; prefer set-based SQL and views/procedures over row-level access from remote clients.

## 6. Work management
- Job identity: `number/user/name` (e.g. `123456/BATCHCPT/CPTJ01`).
- Batch path: `SBMJOB` -> job queue -> subsystem (job queue entry with `MAXACT` and sequence) -> class (`RUNPTY`, time slice) -> job runs under the user of `SBMJOB USER()` or the job description.
- Job description (`*JOBD`): `USER`, `JOBQ`, `INLLIBL`, `LOG`, `LOGCLPGM`, `INQMSGRPY`, `ENDSEV`, `OUTQ`, `HOLD`. One JOBD per application/environment.
- Library list: system part (`QSYSLIBL`), product libraries, current library, user part (`QUSRLIBL` or JOBD `INLLIBL`). Commands `DSPLIBL`, `CHGLIBL`, `ADDLIBLE`, `RMVLIBLE`, `CHGCURLIB`. The library list differs between interactive tests, batch (JOBD), scheduler agent jobs and host-server jobs (ODBC/JDBC: connection property or user profile) - a classic "works in test, wrong data in prod" cause.
- Subsystems: `QCTL` (controlling), `QBATCH`, `QINTER`, `QSPL`, `QCMN`, `QSERVER`, `QSYSWRK`, `QUSRWRK` (host server jobs such as `QZDASOINIT`), `QHTTPSVR`. Isolate applications in their own subsystem/job queue with `MAXACT` sized to their concurrency.
- Commands: `WRKACTJOB`, `WRKSBS`, `WRKSBSD`, `WRKJOBQ`, `WRKSBMJOB`, `WRKUSRJOB`, `WRKJOB`, `DSPJOBLOG`, `CHGJOB`, `ENDJOB OPTION(*CNTRLD)`, `HLDJOBQ`/`RLSJOBQ`, `STRSBS`/`ENDSBS`, `WRKSYSSTS`, `WRKDSKSTS`, `DSPMSG QSYSOPR`.
- Inquiry messages: a batch job hitting an inquiry waits in `MSGW` (the scheduler sees "running"). Control with `INQMSGRPY(*RQD|*DFT|*SYSRPYL)` and the system reply list (`WRKRPYLE`, `ADDRPYLE`); `*DFT` is dangerous (default reply may cancel or ignore). Monitor `MSGW` jobs and `QSYSOPR`.
- `ENDSEV`: the job ends when a message of severity >= ENDSEV is not handled (default 30).
- Job completion: message `CPF1164` carries the end code: 0 completed normally; 10 completed normally during controlled ending; 20 exceeded `ENDSEV`; 30 ended abnormally; 40 ended before becoming active; 50 ended while active; 60 subsystem ended abnormally while the job was active; 70 system ended abnormally; 80 ended by `ENDJOBABN`; 90 forced to end after the `ENDJOBABN` time limit. `SYSTOOLS.ENDED_JOB_INFO` exposes these codes from QHST. Job log output governed by `QLOGOUTPUT` (`*JOBEND`, `*JOBLOGSVR`, `*PND`).

## 7. Spool and output queues
- `*OUTQ`, spooled files owned by jobs, writers (`STRPRTWTR`, `STRRMTWTR` for remote LPR queues). Commands `WRKOUTQ`, `WRKSPLF`, `CPYSPLF`, `CHGSPLFA`, `DLTSPLF`, `CLROUTQ`.
- Spooled files keep job structures alive: thousands of old spooled files bloat the system. Set an expiration (`EXPDATE` or `DAYS` on `CRTPRTF`/`CHGPRTF`/`OVRPRTF`/`CHGSPLFA`; default `*NONE`) and schedule `DLTEXPSPLF` (available since V5R4). The per-job maximum is the system value `QMAXSPLF` (default 9999, maximum 999999; raising it requires applications to handle larger spooled file numbers).
- Integration: prefer data outputs (DB, CSV/JSON in IFS) over parsing spool; to export spool use `CPYSPLF` to a database file or, with `TOFILE(*TOSTMF) TOSTMF('/path/file')`, to a stream file; `WSCST(*PDF)` converts `*SCS`/`*AFPDS` spooled files to PDF when IBM Transform Services (5770-TS1) is installed.

## 8. IFS
- File systems: `/` (root), `/QSYS.LIB`, `/QOpenSys` (case-sensitive), `/QDLS` (legacy), `/QNTC` (SMB shares), `/QFileSvr.400`.
- Commands: `WRKLNK`, `CPY`, `MOV`, `RMVLNK`, `MKDIR`, `RMVDIR`, `CHGAUT`, `WRKAUT`, `CHGOWN`, `CHGATR`, `CPYTOSTMF`/`CPYFRMSTMF`, `CPYTOIMPF`/`CPYFRMIMPF` (CSV with `STMFCCSID`, `RCDDLM`), `QSH`, PASE shells.
- Pitfalls: stream file CCSID tag not matching content (tag UTF-8 files 1208); CRLF vs LF; `*PUBLIC *RWX` directories; NetServer shares mapped by PCs (ransomware exposure - restrict, scan with the integrated file scanning exit points); case sensitivity in `/QOpenSys`.

## 9. Security
- System values: `QSECURITY` 40 minimum (50 preferred); `QPWDLVL`, `QPWDRULES`; `QMAXSIGN`/`QMAXSGNACN`; `QINACTITV`; `QCRTAUT` (default `*CHANGE` - restrict at library `CRTAUT`); `QALWOBJRST`/`QVFYOBJRST`; `QLMTSECOFR`; `QRMTSIGN`; `QAUDCTL`/`QAUDLVL` with `QAUDJRN`; `QSSLPCL`/`QSSLCSL` (TLS protocols/ciphers).
- Special authorities (8): `*ALLOBJ`, `*SECADM`, `*JOBCTL`, `*SPLCTL`, `*SAVSYS`, `*SERVICE`, `*AUDIT`, `*IOSYSCFG`. Application and batch profiles need none of them as a rule.
- Object authorities: `*ALL`, `*CHANGE`, `*USE`, `*EXCLUDE`, `*AUTL`; detailed object (`*OBJOPR`, `*OBJMGT`, `*OBJEXIST`, `*OBJALTER`, `*OBJREF`) and data (`*READ`, `*ADD`, `*UPD`, `*DLT`, `*EXECUTE`) authorities; `*PUBLIC` default, private authorities, group profiles and supplemental groups, authorization lists.
- Batch/service profiles: `PASSWORD(*NONE)` (no sign-on), owned by security, used via `SBMJOB USER()`/JOBD (the submitter needs `*USE` on the profile); `LMTCPB(*YES)` for interactive users.
- Adopted authority: program `USRPRF(*OWNER)` runs with the owner's authority, propagated down the call stack unless `USEADPAUT(*NO)`; risky when the owner is powerful and the program offers a command line, `QCMDEXC` with user input, or calls user-replaceable programs via `*LIBL`. Audit with `PRTADPOBJ`; for dynamic SQL see `DYNUSRPRF`.
- Exit points (`WRKREGINF`): without exit programs, users with object authority can read/update data through ODBC/JDBC, FTP, remote command or file server regardless of application menus. Key exit points: `QIBM_QZDA_INIT` (database server initiation), `QIBM_QZDA_SQL1`/`SQL2` (SQL statements; SQL2 takes precedence when both are registered), `QIBM_QTMF_SERVER_REQ` and `QIBM_QTMF_SVR_LOGON` (FTP server request validation and logon), `QIBM_QZRC_RMT` (remote command/program call, format CZRC0100), `QIBM_QPWFS_FILE_SERV` (file server, formats PWFS0100/0200; restart `QSERVER` after registration), `QIBM_QZHQ_DATA_QUEUE` (data queue server, format ZHQ00100). Prestart server jobs must be restarted for a new exit program to be called. Function usage IDs (`WRKFCNUSG`/`CHGFCNUSG`): `QIBM_DB_ZDA` (database host server, ODBC/JDBC, Run SQL Scripts), `QIBM_DB_DDMDRDA` (DDM/DRDA), `QIBM_DB_SQLADM` (database administrator), `QIBM_DB_SECADM` (security administrator, RCAC) - `QIBM_DB_ZDA` and `QIBM_DB_DDMDRDA` ship as `*ALLOWED` by default.
- Audit journal entry types: `AF` authority failure, `PW` incorrect password or user ID, `CP` user profile created/changed, `CA` authority or authorization list change, `SV` system value change, `CO` object created, `DO` object deleted, `ZC` object changed, `ZR` object read, `CD` command run, `PA` program changed to adopt owner authority, `GR` exit program / function registration change, `JS` job submitted/changed/ended.
- Tools: `ANZDFTPWD` (default passwords), `ANZPRFACT`, `PRTUSRPRF`, `PRTPUBAUT`, `PRTPVTAUT`, `PRTADPOBJ`, `PRTSYSSECA`. IBM profiles (`QSECOFR`, `QSYSOPR`, `QPGMR`, `QUSER`, `QSRV`, `QSRVBAS`) must not keep default passwords.
- TLS: certificates managed in Digital Certificate Manager (DCM) and assigned to host servers, Telnet, FTP, HTTP; disable plaintext services where possible.

## 10. Integration
| Mechanism | Use | Key points / pitfalls |
|---|---|---|
| JDBC (IBM Toolbox for Java / JTOpen `jt400.jar`) | Java apps, ETL, middleware | URL `jdbc:as400://<host>`; properties `naming`, `libraries`, `secure=true` (TLS), `prompt=false`, `errors=full`, `date format`, `translate binary`, `transaction isolation`; on-box native driver `jdbc:db2:*local`. Server jobs `QZDASOINIT` (TLS `QZDASSINIT`). |
| ODBC (IBM i Access ODBC driver, from ACS application packages) | Windows/Linux tools, BI | Same host server; set naming, default libraries, commit mode explicitly; protect with exit programs. |
| DRDA / DDM | IBM i to IBM i or other Db2 | RDB directory `WRKRDBDIRE`; port 446 (448 TLS); three-part names. |
| Data queues (`CRTDTAQ`; APIs `QSNDDTAQ`, `QRCVDTAQ`, `QCLRDTAQ`; SQL `QSYS2.SEND_DATA_QUEUE` / `RECEIVE_DATA_QUEUE`) | Low-latency signalling, request/response inside IBM i or via host server (JTOpen `DataQueue`/`KeyedDataQueue`) | FIFO/LIFO/keyed; not transactional, not guaranteed delivery; `FORCE(*YES)` writes each entry to disk before returning (fewer losses on abnormal end, slower); `RECEIVE_DATA_QUEUE` removes the entry, `DATA_QUEUE_ENTRIES` only peeks. |
| IBM MQ for IBM i | Guaranteed, transactional messaging with the rest of the IS | Queue manager CL commands (`CRTMQM`, `STRMQM`, `WRKMQM`, ...); MQI from RPG/COBOL; TLS channels; DLQ and poison-message handling. Two commit models: queue-manager-coordinated local units of work (`MQCMIT`/`MQBACK`, no job-level commitment definition), or IBM i commitment control as external syncpoint coordinator (`STRCMTCTL LCKLVL(*ALL) CMTSCOPE(*JOB)`, commit with the CL `COMMIT` or the language commit; `MQCMIT`/`MQBACK`/`MQBEGIN` then fail with `MQRC_ENVIRONMENT_ERROR`; two-phase commit, `WRKMQMTRN` for in-doubt units). |
| IWS (Integrated Web Services server) | Expose RPG/COBOL programs and service programs as REST or SOAP services (PCML-based) | Admin via HTTP admin GUI; versioning, authentication, TLS; parameter size limits; keep business logic in service programs. |
| HTTP from SQL | Consume REST/JSON from DB2 for i | `QSYS2.HTTP_GET` / `HTTP_POST` (and `_BLOB`, `_VERBOSE` variants) run without a JVM and add HTTP authentication, proxy, redirection and SSL options; the older Java-based `SYSTOOLS.HTTPGET*` functions remain available but need HTTPS for basic authentication from 7.5 SF99950 level 8 / 7.4 SF99704 level 29. Pair with `JSON_TABLE`; certificate store, timeouts. |
| Open source in PASE | Node.js, Python, Java, OpenSSH, Git via RPM/yum | Call RPG via XMLSERVICE/itoolkit or ODBC; manage packages with ACS Open Source Package Management. |
| FTP | Legacy transfers | Plaintext credentials; `NAMEFMT` 0 (`LIB/FILE.MBR`) vs 1 (paths); ASCII vs binary mode drives EBCDIC conversion; guard with FTP exit points; prefer SFTP/MFT. |
| SFTP/SSH (PASE OpenSSH) | Secure file transfer | Key-based auth for a dedicated profile; `known_hosts` managed; batch mode (`sftp -b`); file CCSID handling explicit. |
| Transfer CFT (Axway) | MFT standard in many French banks; IBM i edition exists | Partners/flows defined with CFTUTIL; transcoding EBCDIC <-> ASCII configured per flow (verify parameters in the Axway documentation of your version); acknowledgments; scheduler waits on transfer end/ack, not on the send command. |
| Journal-based CDC | Feed data platforms without touching programs | `IMAGES(*BOTH)`, receiver retention coordinated with HA/backup; commit boundaries respected. |

Host server ports (TLS in brackets): server mapper `as-svrmap` 449, central 8470 (9470), database 8471 (9471), data queue 8472 (9472), file 8473 (9473), network print 8474 (9474), remote command 8475 (9475), sign-on 8476 (9476); DRDA/DDM 446 (448); Telnet 23 (992). Values can be changed with `WRKSRVTBLE`.

## 11. High availability, DR, backup
| Approach | Mechanism | Watch points |
|---|---|---|
| PowerHA SystemMirror for IBM i | Clustering with IASP: geographic mirroring, storage replication (Metro/Global Mirror, FlashCopy, HyperSwap on supported storage) | Application data in the IASP; SYSBAS objects (profiles, system values, JOBDs, subsystems...) synchronized by the cluster administrative domain. |
| Db2 Mirror for i | Synchronous active-active between two nodes (7.4+) | Distance limits, licensing, application suitability. |
| Logical replication (journal-based) | Remote journal (`ADDRMTJRN`) + apply on target; commercial products (e.g. MIMIX, iTERA, Maxava, Quick-EDD - verify current vendor names) | Non-journaled objects, IFS, spool, user profiles/passwords, identity/sequence values at switchover, triggers/constraints on target, apply lag monitoring, regular role-swap tests. |
| Backup | `SAVSYS`, `SAVLIB`, `SAVOBJ`, `SAVCHGOBJ`, `SAV` (IFS), `GO SAVE` options 21/22/23, BRMS; save-while-active `SAVACT` | Restricted state for full saves; save window vs batch window; restore tests. |

## 12. Scheduling on IBM i
- Native `WRKJOBSCDE` (`ADDJOBSCDE`, `CHGJOBSCDE`, `RMVJOBSCDE`, `HLDJOBSCDE`, `RLSJOBSCDE`): time-based only (`FRQ(*ONCE|*WEEKLY|*MONTHLY)`, `SCDDATE`, `SCDDAY`, `SCDTIME`, `RELDAYMONTH`, `OMITDATE`, `RCYACN`); no dependencies; inventory with `QSYS2.SCHEDULED_JOB_INFO`.
- Advanced Job Scheduler (licensed program 5770-JS1): dependencies, calendars, notifications. Third-party native schedulers exist (e.g. Robot Schedule).
- Enterprise schedulers (Control-M, Dollar Universe, VTOM) run IBM i jobs through their IBM i agents (Dollar Universe and VTOM document an OS/400 agent; Control-M uses its Agent for IBM i). Agent contract to verify for each tool/version:
  - submission: `SBMJOB` with which JOBD, JOBQ and user profile; library list source;
  - status: how success/failure is computed (job end code, escape message, return code) - a CL that swallows errors reports success;
  - `MSGW` detection and timeout; job log retrieval (spool `QPJOBLOG`) and its CCSID conversion;
  - restart: rerun = new job; checkpoint/restart must be in the program;
  - time: `QTIMZON` drives local time and DST; align with the scheduler's time zone.

## 13. EBCDIC / CCSID pitfalls
| CCSID | Meaning |
|---|---|
| 37 / 1140 | EBCDIC US / with euro |
| 297 / 1147 | EBCDIC France / with euro |
| 500 / 1148 | EBCDIC International / with euro |
| 819 / 923 / 1252 | ISO-8859-1 / ISO-8859-15 / Windows-1252 |
| 1208 / 1200 / 13488 | UTF-8 / UTF-16 / UCS-2 |
| 65535 | `*HEX`: no conversion |

- `QCCSID` 65535 and fields tagged 65535: no conversion, clients receive raw EBCDIC or binary (JDBC `translate binary`). Job CCSID vs default job CCSID (`DFTCCSID`) - set a real CCSID (e.g. 1147 or 297 for French).
- Variant characters (`# @ $ [ ] { } \ | ! ^ ~ £ §` and accented letters) sit at different code points in 37, 297 and 500: object names using `#@$`, SQL using `[ ]` or `|`, and source moved between systems with different CCSIDs get corrupted.
- Euro sign exists only in the euro CCSIDs (1140/1147/1148...); 297 data converted to 1252 loses it.
- Packed (`COMP-3`) and binary fields must never go through character conversion; zoned signed numbers show letters/`{`/`}` in the last position when converted to ASCII. Convert to display/text format before transfer, or transfer in binary and decode on the other side.
- Collation: EBCDIC sorts lowercase < uppercase < digits; ASCII sorts digits < uppercase < lowercase. Merges, range keys and "sorted file" assumptions break across platforms.
- Fixed-length records with trailing blanks, no line delimiters in DB files; `CHAR` vs `VARCHAR`; null-capable fields need `ALWNULL(*USRCTL)` handling in RPG.
- Reconciliation: counts and control totals on decoded values on both sides, plus round-trip tests with accented characters, euro sign, negative packed values.

## 14. Common messages and SQLCODEs
| ID | Meaning |
|---|---|
| `CPF9801` / `CPF9802` / `CPF9810` | Object not found / not authorized / library not found |
| `CPF2103` | Library already in library list (monitor on `ADDLIBLE`) |
| `CPF4131` | Level check on file |
| `CPF5027` / `CPF5032` | Record in use by another job (COBOL status `9D`, RPG status `01218`) |
| `CPF1164` | Job ended (end code 0-90 in message data, see section 6) |
| `CPF9898` | Generic message used for custom escape messages |
| `MCH1202` / `MCH3601` | Decimal data error / pointer not set |
| `RNQxxxx` / `RNXxxxx` | RPG runtime inquiry / escape messages (`QRNXMSG`; number = RPG status code) |
| `SQL7008` | Object not valid for operation (often: not journaled) |
| SQLCODE 100 / -803 / -811 / -913 / -204 / -551 | No row / duplicate key / more than one row on `SELECT INTO` / row or object in use / object not found / not authorized |
Check second-level text with `DSPMSGD` (message file `QCPFMSG`, `QRNXMSG`, `QSQLMSG`).

## 15. Code review checklist
| Area | Check |
|---|---|
| Structure | Free-form or plan to convert; procedures in service programs; no dead code; copybooks for prototypes; binder source with signatures managed. |
| Error handling | Every SQL statement checked (`SQLSTATE`); `MONITOR` around risky operations; no unhandled exceptions in batch (no MSGW); CL resends escape messages; return codes propagated to the scheduler. |
| Data integrity | Commitment control where several updates must be atomic; files journaled; commit frequency and restart key for long batches; idempotent reruns. |
| Locking | Read-only access with `(N)`/`FOR READ ONLY`; short lock duration; `WAITRCD` and lock errors handled. |
| SQL | Set-based; parameter markers (no concatenated dynamic SQL); explicit naming and commit options; indexes for predicates; no `SELECT *` in programs. |
| Dates/numerics | Formats explicit; 2-digit years absent; overflow/truncation checked; packed data validated at boundaries. |
| Libraries | No hard-coded libraries; JOBD/library list controlled per environment; same behaviour in batch and remote access. |
| Security | No hard-coded credentials; adopted authority justified and limited; no `QCMDEXC` with external input; objects owned by an application owner profile, `*PUBLIC *EXCLUDE` on data. |
| Integration | CCSID handled explicitly; transfers acknowledged; data queues not used where guaranteed delivery is required; exit programs cover remote access. |
| Operations | Job log level adequate; messages meaningful; run book: restart procedure, dependencies, JOBD/JOBQ, expected duration. |
| Change | Source in Git (IFS) or controlled change management; recompile dependants after file changes; object ownership and authorities set at deployment. |

## 16. Sources
- https://www.ibm.com/support/pages/release-life-cycle - IBM i release life cycle table (7.3 to 7.6)
- https://www.ibm.com/support/pages/node/1200298 - IBM i 7.4 product lifecycle dates
- https://www.ibm.com/docs/en/i/7.5?topic=services-ended-job-info-table-function - CPF1164 job end codes (ENDED_JOB_INFO)
- https://www.ibm.com/support/pages/ibm-i-services-sql - IBM i Services list with release/PTF levels
- https://www.ibm.com/docs/api/v1/content/ssw_ibm_i_74/rzasb/filestatuskeyvals.htm - ILE COBOL file status key values
- https://www.ibm.com/docs/en/i/7.1.0?topic=structure-file-status-codes - ILE RPG file status codes (01211, 01218, 01222)
- https://www.ibm.com/docs/api/v1/content/ssw_ibm_i_74/cl/crtrpgmod.htm - CRTRPGMOD SRCSTMF parameter (also checked CRTBNDCBL, CRTCLMOD, CRTCBLMOD, CRTPF)
- https://www.ibm.com/docs/api/v1/content/ssw_ibm_i_75/rzasd/rpgrelv7r4.htm - ILE RPG What's new in 7.4 (DATA-INTO, DATA-GEN)
- https://www.ibm.com/support/pages/fully-free-form-rpg-new-71-and-72 - **FREE support in 7.1/7.2 via PTFs
- https://www.ibm.com/docs/en/i/7.5.0?topic=actions-security-auditing-journal-entries - QAUDJRN entry types
- https://www.ibm.com/support/pages/add-qibmdbzda-and-qibmdbddmdrda-function-usage-ids - QIBM_DB_ZDA and QIBM_DB_DDMDRDA function usage
- https://www.ibm.com/support/pages/tcpip-ports-required-ibm-i-access-and-related-functions - host server port numbers
