# File transfer (MFT), messaging (IBM MQ, RabbitMQ) and event streaming (Kafka)

## Contents
1. MFT fundamentals and protocol choice
2. Axway Transfer CFT and PeSIT
3. IBM Sterling (Connect:Direct, B2B Integrator, File Gateway)
4. SFTP / FTPS / AS2 / EBICS practicalities
5. File conventions
6. Messaging fundamentals
7. IBM MQ
8. RabbitMQ
9. Apache Kafka and schema registry
10. Choosing MQ, RabbitMQ or Kafka
11. Transactional outbox / inbox
12. Review checklist

## 1. MFT fundamentals and protocol choice
Why an MFT platform rather than ad-hoc scripts: central partner and flow inventory, audit trail per transfer, checkpoint/restart, automatic retries, PKI and key management, pre/post-processing hooks, notifications, DMZ relay, monitoring and reporting.

| Protocol | Typical context | Security | Notes |
|---|---|---|---|
| PeSIT | French banking and industry, Axway CFT estates | PeSIT over TLS | French interbank-origin protocol (GSIT); checkpoint/restart and transfer-level acknowledgment built in |
| SFTP (SSH File Transfer Protocol) | Universal partner exchange | SSH keys or password, host key verification | No native end-to-end ack; restart depends on client/server support |
| FTPS (FTP over TLS) | Legacy partners | TLS (explicit via `AUTH TLS` on 21, implicit on 990) | Separate data channel → firewall/NAT pain with passive port ranges |
| HTTPS (REST/upload) | SaaS file APIs | TLS, OAuth2 | Large files need chunking/resume |
| AS2 (RFC 4130) | Retail/EDI B2B | S/MIME signing + encryption | Signed MDN receipt (sync or async) gives non-repudiation of receipt |
| AS4 (OASIS ebMS 3 profile) | EU eDelivery, Peppol e-invoicing network | WS-Security based | Receipts at message level |
| OFTP2 (RFC 5024) | Automotive (Odette) | TLS, signing, encryption | End-to-end response (EERP) |
| EBICS | Corporate-to-bank in France/Germany/Switzerland | Bank-specific key/certificate initialisation, electronic signatures | French profiles EBICS T / EBICS TS — see §4 |
| SWIFT FileAct | Large corporates/banks on SWIFTNet | SWIFT PKI | Via service bureau or own connectivity |
| IBM Connect:Direct | Mainframe/IBM i/Unix estates, banks | Secure+ (TLS) | Process-language scripts, checkpoint/restart |

## 2. Axway Transfer CFT and PeSIT
Facts below are product-generic; parameter names and options vary by release — verify against your Transfer CFT version documentation.
- Transfer CFT is a file transfer monitor installed on each server (Unix/Linux, Windows, IBM i, z/OS…); each instance is a node exchanging with **partners**.
- Main configuration objects (CFTUTIL objects): `CFTPARM` (general parameters), `CFTPROT` (protocol definitions, e.g. PeSIT, SFTP), `CFTNET` (network resources), `CFTPART` (partner), `CFTTCP` (partner TCP/IP address), `CFTSEND` / `CFTRECV` (send/receive templates per file identifier), `CFTSSL` (TLS profiles), `CFTDEST` (distribution lists). Configuration can be centralised through Axway Central Governance or its successor Flow Manager (which has plugins for Transfer CFT and SecureTransport) — check which one your estate runs.
- **IDF** (file identifier): logical flow name agreed with the partner; send/receive templates are selected by partner + IDF. Treat the IDF as the contract key for the flow.
- Commands (CFTUTIL), e.g. `SEND TYPE=FILE, PART=<partner>, IDF=<idf>, FNAME=<file>`; `RECV`; `LISTCAT` to list the catalog; `HALT` (suspend), `KEEP`, `START` (restart), `END` (force state X), `DELETE`. Options vary by release.
- **Catalog**: every transfer has an entry with direction, partner, IDF, state, diagnostic codes, timestamps. The state is one letter among `C`, `D`, `H`, `K`, `T`, `X` (the values accepted by `LISTCAT`/`DELETE STATE=`): D = ready/waiting (e.g. waiting for a serialized predecessor or a deactivated partner), C = transfer in progress, T = transfer completed, X = ended (set by `END` or after end-of-transfer processing); H and K are the suspended states produced by `HALT` and `KEEP` (a transfer in H or K can be restarted with `START`; a quick stop of the server moves in-progress transfers back to D). Confirm the H/K/T wording in your version's "Transfer states" topic.
- **Procedures**: end-of-transfer procedure (`EXEC` on send/receive templates) for post-processing (move, decrypt, trigger scheduler job); acknowledgment procedures such as `EXECSFA` (sender side, run when the ack arrives); other pre-/post-processing parameters — verify names in your version's CFTSEND/CFTRECV reference.
- **Acknowledgments**: distinguish (1) protocol completion (PeSIT end of transfer: the PeSIT protocol itself has no acknowledgment mechanism), (2) application acknowledgment, which Transfer CFT implements as a separate message transfer back to the sender (`SEND TYPE=REPLY` / `NACK`; `ACKSTATE=REQUIRE` on `CFTSEND` makes the sender wait for it and only costs a new session when really needed), (3) business ack/reject file (e.g. pain.002). The contract must say which one closes the flow.
- **Restart**: PeSIT synchronisation points allow resuming an interrupted transfer; retry count and interval are configured per partner/network — verify parameters.
- Store-and-forward relays and broadcast (distribution lists) are supported; prefer a DMZ relay (Axway SecureTransport, or a Transfer CFT relay node) for external partners — architecture to confirm per estate.
- Tracking: Axway Sentinel collects Transfer CFT transfer events for cross-node tracking and alerting (Flow Manager/Central Governance provide the flow-level view).
- Operational pitfalls: IDF naming drift between partners; local file name collisions (use unique names built from symbolic variables such as `&IDTU` (unique local transfer counter), `&IDT`, `&PART`, `&IDF`, `&SYSDATE`/`&SYSTIME`); EXEC scripts with no error handling (transfer "X" but downstream failed); catalog purge removing evidence needed for audits; certificate expiry on PeSIT/TLS; character conversion (ASCII/EBCDIC) done by the transfer for text files — be explicit about binary vs text mode.

## 3. IBM Sterling
- **Connect:Direct** (formerly NDM): point-to-point node-to-node transfer; **netmap** defines remote nodes; user authorisation (proxies/userfile); **Processes** written in the Connect:Direct process language (`PROCESS`, `COPY`, `RUN TASK`, `RUN JOB`, `SUBMIT`, conditional `IF`); checkpoint/restart; **Secure+** for TLS; statistics records for audit. Verify syntax per platform (z/OS, UNIX, Windows, IBM i).
- **Sterling B2B Integrator**: business processes (BPML), EDI translation (EDIFACT/X12 maps), adapters, trading partner management.
- **Sterling File Gateway** (on top of B2B Integrator): partners, communities, routing channel templates, producer/consumer routing, file arrival triggers, visibility of each file's route.

## 4. SFTP / FTPS / AS2 / EBICS practicalities
**SFTP**
- Pin and verify the server host key (never `StrictHostKeyChecking=no` in production); key-based auth with one key per partner and environment; key rotation plan with overlap.
- Chroot per partner, least privilege (write-only drop folder, read-only pickup folder).
- Uploads must be atomic (§5): partner uploads `.tmp` then renames, or server-side "file stable" detection (size unchanged for N seconds) as a weaker fallback.
- Define who deletes/archives files after pickup; never rely on file timestamps across time zones.
**FTPS**: explicit TLS (`AUTH TLS`) preferred; passive port range opened on firewall; protect the data channel too (`PROT P`); avoid where SFTP is possible.
**AS2**: agree certificates (signing, encryption), MDN mode (sync/async), signed MDN, MIC algorithm; archive MDNs as receipt evidence.
**EBICS (France)**: two profiles — EBICS T (transport; orders authorised separately, e.g. by a signature on another channel) and EBICS TS (transport + personal electronic signature with certificates). EBICS 2.x uses order types (France commonly uses generic upload/download order types FUL/FDL with file format parameters); EBICS 3.0 (current specification V 3.0.2, valid since 30 December 2022) replaces order types and file-format parameters by BTF (Business Transaction Formats: service name, message name, scope, option, container; a BTF mapping table is published on ebics.org). Versions, certificates and supported formats vary per bank — verify with each bank's EBICS contract and implementation guide.

## 5. File conventions
**Naming** (example): `<SRC>_<DST>_<FLOW>_<YYYYMMDD>T<HHMMSS>_<SEQ6>.<ext>` e.g. `APP_COMPTA_ERP_GLJRNL_20260131T220000_000123.csv`
- Fixed tokens, uppercase, ASCII only, no spaces; timestamp in UTC or with explicit zone; sequence number per flow to detect gaps and duplicates.
- Version of the layout in the header record (or in the name) when layouts evolve.
**Atomic delivery**
- Write to a temporary name or temporary directory, then rename on the same filesystem (rename is atomic on POSIX filesystems; cross-filesystem "move" is copy + delete, not atomic).
- Or use a trigger/flag file (`.ok`, `.done`) written after the data file; consumers wait for the flag.
- Never let a consumer poll on a partially written file.
**Integrity and completeness**
- Checksum (SHA-256) in a sidecar file or in the trailer; MD5 only for accidental corruption, not for integrity against tampering.
- Header record: flow ID, layout version, file sequence, creation timestamp, sender.
- Trailer/control record: record count, control totals (sum of amounts, sum of quantities, hash total of IDs).
- Receiver validates header/trailer before processing; mismatch → reject the whole file and notify.
**Other rules**
- Empty-file policy: send an empty file with header/trailer (preferred: proves the run happened) vs no file — state it in the contract.
- Max file size and splitting rule; compression (zip/gzip) and encryption (PGP/CMS) order: compress then encrypt.
- Line endings (CRLF vs LF), BOM or not, encoding, decimal separator, quoting (see business-formats.md).
- Archive after processing (with retention), purge policy, and reprocessing from archive under a new transfer ID but same business file ID.
- Acknowledgment/reject file naming mirrors the original (`..._ACK`, `..._REJ`) and references the original file ID.

## 6. Messaging fundamentals
- Queue (point-to-point, competing consumers) vs topic (publish/subscribe).
- Persistent messages survive broker restart; non-persistent do not. Critical business flows: persistent + transactional get/put or manual ack after commit.
- Ack after processing commit, not before (otherwise at-most-once).
- Prefetch / batch size trades throughput against redelivery volume and fairness.
- Poison messages: backout counter → backout/dead-letter destination; never infinite redelivery.
- Message expiry: only for data that becomes useless (quotes, prices), never silently for business transactions.
- Message size: brokers are not file transfer; store large payloads elsewhere and send a reference (claim check).

## 7. IBM MQ
- **Objects**: queue manager (QMGR); local queue (QLOCAL); remote queue definition (QREMOTE) pointing to a transmission queue (XMITQ); alias queue (QALIAS) to decouple app names; model queue (QMODEL) for dynamic queues (reply queues); topics/subscriptions for pub/sub.
- **Channels**: sender/receiver (SDR/RCVR) and server/requester pairs between queue managers; SVRCONN for client applications (client side CLNTCONN or CCDT); cluster channels (CLUSSDR/CLUSRCVR); channel initiator and listener.
- **Clustering**: workload balancing and simplified administration; not by itself HA for messages already on a queue manager. HA options: multi-instance queue managers (active/standby on a shared network file system), RDQM (Linux, replicated data), Native HA (three replicating instances; container-native, extended to Linux VMs and bare metal in 9.4.4 CD), queue sharing groups (z/OS).
- **Message descriptor (MQMD)**: `MsgId`, `CorrelId`, `Persistence`, `Expiry`, `ReplyToQ`/`ReplyToQMgr`, `BackoutCount`, `Format`, `CodedCharSetId`, `Encoding`. Character conversion on GET (`MQGMO_CONVERT`) works for `MQSTR` format text: set CCSID correctly at PUT time (EBCDIC ↔ ASCII/UTF-8 issues with IBM i and z/OS).
- **Persistence**: per message (MQPER_PERSISTENT) or queue default (`DEFPSIST`); persistent messages are logged (log sizing and disk performance matter).
- **Dead letter queue**: defined by the queue manager `DEADQ` attribute (default object name SYSTEM.DEAD.LETTER.QUEUE must be created/assigned); messages carry a dead-letter header (MQDLH) with reason; `runmqdlq` is the dead-letter handler utility with a rules table.
- **Backout**: queue attributes `BOTHRESH` (threshold; 0 disables poison handling) and `BOQNAME` (backout requeue queue). The queue manager only stores them: IBM MQ classes for JMS/XMS (and most frameworks) requeue a message to `BOQNAME` once `BackoutCount` reaches `BOTHRESH`, falling back to the dead-letter queue if that put fails; native MQI applications must implement the same logic themselves.
- **Limits**: `MAXMSGL` on queue manager, queues and channels (default 4 MB, maximum 100 MB; on z/OS the queue manager value is fixed at 100 MB) — all must allow the size; `MAXDEPTH` per queue.
- **Monitoring**: `DISPLAY QLOCAL(<q>) CURDEPTH`, `DISPLAY QSTATUS(<q>) TYPE(QUEUE)` (open handles, last get/put, message age when queue monitoring enabled), `DISPLAY CHSTATUS(*)`; queue depth high events; `dspmq` for queue manager status.
- **Security**: channel authentication records (`CHLAUTH`), connection authentication (`CONNAUTH`), TLS on channels (`SSLCIPH`, `SSLPEER` / certificate mapping), authority records (`setmqaut`), Advanced Message Security (AMS) for end-to-end message signing/encryption. Never run client channels mapped to an administrative user.
- Pitfalls: messages stuck in XMITQ because a channel is stopped/retrying; client reconnect duplicates (in-doubt units of work); ordering broken by multiple consumers; DLQ not defined → channel stops on undeliverable messages; CCSID 65535/binary data misinterpreted.

## 8. RabbitMQ
- AMQP 0-9-1 model: producers publish to **exchanges** (direct, topic, fanout, headers), **bindings** route to **queues** using routing keys; **vhosts** isolate tenants. AMQP 1.0 is a core protocol since RabbitMQ 4.0 (no plugin needed, alongside AMQP 0-9-1).
- Reliability: publisher confirms; persistent messages on durable queues; manual consumer acks after processing; prefetch (`basic.qos`) to bound in-flight messages.
- Queue types: **quorum queues** (Raft-replicated, recommended for data safety; delivery limit for poison messages, default 20 redeliveries since 4.0, then dead-lettered or dropped); classic queues (single node; classic mirrored queues were removed in RabbitMQ 4.0); **streams** (append-only log with replay).
- Dead lettering: dead-letter exchange (`x-dead-letter-exchange` argument or policy) receives messages rejected without requeue, expired (TTL), dropped for queue length limits, or over the delivery limit (quorum queues).
- Retry pattern: DLX + delay queue with TTL back to the work exchange, with attempt counter in headers; avoid tight `nack(requeue=true)` loops.
- Pitfalls: unbounded queues filling memory/disk (set length limits/alarms); auto-ack consumers losing messages; mixing policies and queue arguments; relying on ordering with multiple consumers.

## 9. Apache Kafka and schema registry
- **Topics** split into **partitions** (ordered, append-only logs); each partition replicated (`replication.factor`, typically 3) with leader + in-sync replicas (ISR).
- **Ordering** only within a partition: choose the message key = business key needing order (customer ID, account ID). Changing partition count changes key-to-partition mapping.
- **Producer durability**: `acks=all` + topic `min.insync.replicas=2` (with RF 3); idempotent producer (`enable.idempotence=true`, default since Kafka 3.0) prevents duplicates from producer retries.
- **Consumer groups**: each partition consumed by one member of a group; parallelism ≤ number of partitions; offsets committed to the internal `__consumer_offsets` topic; rebalances on membership change or when processing exceeds `max.poll.interval.ms`.
- **Delivery semantics**: commit offset after processing → at-least-once (needs idempotent consumer); commit before → at-most-once; transactions (`transactional.id`, consumers with `isolation.level=read_committed`) give exactly-once for read-process-write inside Kafka only — external DB/API side effects still need idempotence or an inbox table.
- **Retention**: time/size-based deletion (broker default 7 days) or **log compaction** (`cleanup.policy=compact`, keeps last value per key; tombstone = null value for deletes). Replay = reset group offsets (by timestamp/offset) or use a new consumer group.
- **Message size**: default max around 1 MB (`message.max.bytes` broker / `max.request.size` producer); use claim check for larger payloads.
- **No native DLQ** in the broker: implemented by clients/frameworks (retry topics + DLQ topic with error headers) or by Kafka Connect for sink connectors (`errors.tolerance=all`, `errors.deadletterqueue.topic.name`).
- **Metadata management**: KRaft replaced ZooKeeper; ZooKeeper mode was removed in Apache Kafka 4.0 (March 2025). Check what your distribution (Apache, Confluent, Strimzi, cloud services) and version actually ship.
- **Kafka Connect**: source/sink connectors; Debezium for log-based CDC (with outbox event router); connector offsets and schema history topics must be protected.
- **Schema registry** (Confluent Schema Registry, Apicurio, cloud equivalents): schemas (Avro, Protobuf, JSON Schema) registered per **subject**; subject naming strategies (TopicNameStrategy default, RecordNameStrategy, TopicRecordNameStrategy); compatibility modes `BACKWARD` (Confluent default), `FORWARD`, `FULL`, their `_TRANSITIVE` variants, and `NONE`. Upgrade order: BACKWARD → upgrade consumers first; FORWARD → producers first; FULL → any order.
- **Monitoring**: consumer lag per partition (and time lag), under-replicated partitions, offline partitions, request latency, rebalance rate, disk usage per broker.
- **Security**: TLS, SASL (SCRAM, OAUTHBEARER, Kerberos/GSSAPI) or mTLS authentication, ACLs per topic and consumer group, encryption at rest by the platform; no personal data in keys or headers if avoidable (they are often logged).
- Pitfalls: hot partitions from skewed keys; too many partitions (metadata, recovery time); auto topic creation in production; `auto.offset.reset=latest` silently skipping data for a new group; consumer doing slow synchronous calls per record → rebalance storms; using Kafka as a database without compaction design; GDPR erasure on immutable logs (design: compaction + tombstones, short retention, or crypto-shredding).

## 10. Choosing MQ, RabbitMQ or Kafka
| Need | IBM MQ | RabbitMQ | Kafka |
|---|---|---|---|
| Transactional point-to-point with mainframe/IBM i | Best fit (XA, z/OS, IBM i) | Possible via bridges | Not designed for it |
| Flexible routing (topic patterns, headers) | Pub/sub available | Best fit (exchanges) | Topic per stream, routing in consumers |
| High-throughput event streaming, replay, many consumers | Limited replay | Streams (newer) | Best fit |
| Per-message ack, priority, TTL, delayed retry | Yes | Yes | Not native (offset per partition) |
| Long retention as source of truth | No | Streams only | Yes (retention/compaction) |
| Operations skills in banks/industry (France) | Very common | Common | Common in digital/data teams |

## 11. Transactional outbox / inbox
- **Outbox**: application writes business row + outbox row in one local transaction; a relay (polling or CDC, e.g. Debezium) publishes outbox rows; consumers dedupe by event ID. Avoids "DB committed but message lost" and "message sent but DB rolled back".
- **Inbox**: consumer stores processed message IDs in the same transaction as its business change; duplicates are skipped atomically.
- Purge outbox/inbox tables by age > max replay window.

## 12. Review checklist
- [ ] Protocol and platform justified (partner constraints, volumes, latency, security).
- [ ] Partner/IDF/topic/queue names, environments and owners listed.
- [ ] Atomic delivery, naming, sequence, checksum and header/trailer rules defined for files.
- [ ] Acknowledgment levels defined (transport, technical, business) with timeouts and missing-ack behaviour.
- [ ] Persistence, ack mode, prefetch, ordering key, partition/consumer counts defined for messaging.
- [ ] Backout/DLQ/retry topics with owners, alerts and replay tooling.
- [ ] Message/file size limits aligned across producer, broker/MFT, channel and consumer.
- [ ] Encoding/CCSID and text vs binary transfer modes explicit.
- [ ] TLS/keys/certificates with owners and expiry monitoring; least-privilege ACLs/authorities.
- [ ] Retention, archive, purge and GDPR erasure strategy.
- [ ] Monitoring: depth/lag/age, absence of flow, channel/connector status, catalog errors.

## Sources
- https://docs.axway.com/bundle/TransferCFT_310_UsersGuide_allOS_en_HTML5/page/Content/CFTUTIL/Parameter_index/symbolic_variables.htm — Transfer CFT 3.10 symbolic variables (&IDTU, &IDT, &PART…)
- https://docs.axway.com/bundle/TransferCFT_36_UsersGuide_allOS_en_HTML5/page/Content/Command_summary.htm — Transfer CFT commands, STATE values C/D/H/K/T/X
- https://support.axway.com/kb/73314/language/en — Axway KB: ACK is application-level, PeSIT has none
- https://support.axway.com/kb/180409/language/fr — Axway KB: ACKSTATE=REQUIRE and EXECSFA procedure
- https://docs.axway.com/bundle/TransferCFT_35_UsersGuide_allOS_en_HTML5/page/Content/Transfers/Transfer_states/Managing_transfer_states.htm — Transfer CFT managing transfer states (D, H, K)
- https://www.ibm.com/docs/SSFKSJ_9.4.0/develop/q032280_.html — IBM MQ classes for JMS poison messages, BOTHRESH/BOQNAME
- https://www.ibm.com/new/announcements/enhanced-resilience-compliance-and-simplicity-with-ibm-mq-9-4-4 — IBM MQ 9.4.4 Native HA beyond containers
- https://www.rabbitmq.com/docs/amqp — RabbitMQ AMQP 1.0 native since 4.0
- https://github.com/rabbitmq/rabbitmq-server/releases/tag/v4.0.1 — RabbitMQ 4.0 release notes, mirroring removed
- https://kafka.apache.org/40/generated/kafka_config.html — Kafka 4.0 broker defaults (message.max.bytes, retention)
- https://kafka.apache.org/40/generated/producer_config.html — Kafka 4.0 producer defaults (enable.idempotence, acks)
- https://archive.apache.org/dist/kafka/4.0.0/RELEASE_NOTES.html — Kafka 4.0.0 release notes, ZooKeeper removal
