---
name: integration-reference
description: Integration knowledge base - pattern selection (sync/async, request-reply, pub/sub, file transfer, CDC, batch vs real-time), idempotence, replay, error handling and dead letters, correlation IDs, observability, versioning, interface security (OAuth2, mTLS, JWT, API keys, signing) and an interface review checklist; references cover REST/SOAP/gateways/ESB, MFT/MQ/Kafka and business formats (ISO 20022, CFONB, EDIFACT, HL7 v2, FHIR). Load when designing, specifying, reviewing or troubleshooting an application interface or data flow.
user-invocable: false
---

# Integration Reference (Integration Expert)

Product facts that vary by version are marked "verify against your version"; standards facts marked "verify" must be checked against the current specification before being written into a contract.

## References index
- `references/api-rest-soap.md` — read when designing or reviewing an HTTP API (REST/OpenAPI, HTTP semantics, pagination, RFC 9457 errors, rate limiting, webhooks), a SOAP/WSDL/WS-Security service, an API gateway set-up or an ESB/iPaaS flow. Full path `${CLAUDE_PLUGIN_ROOT}/skills/integration-reference/references/api-rest-soap.md`
- `references/mft-mq-kafka.md` — read when the flow uses file transfer (Axway Transfer CFT, PeSIT, SFTP/FTPS, AS2, EBICS, IBM Sterling), messaging (IBM MQ, RabbitMQ) or event streaming (Kafka, schema registry), or when defining file conventions (naming, atomic delivery, checksums, trailers). Full path `${CLAUDE_PLUGIN_ROOT}/skills/integration-reference/references/mft-mq-kafka.md`
- `references/business-formats.md` — read when specifying or mapping payloads: XML/XSD, JSON Schema, CSV, fixed-width/COBOL, encodings (UTF-8, ISO-8859-15, EBCDIC/CCSID), EDIFACT/X12, banking (ISO 20022 pain/camt, SEPA SCT/SDD/Inst, CFONB), healthcare (HL7 v2, FHIR R4, INS), e-invoicing, mapping specifications. Full path `${CLAUDE_PLUGIN_ROOT}/skills/integration-reference/references/business-formats.md`

Related: interface contract template `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/interface-contract.md`; ERP side of interfaces `${CLAUDE_PLUGIN_ROOT}/skills/erp-reference/SKILL.md`.

## 1. Pattern selection

| Pattern | Use when | Avoid when | Design points |
|---|---|---|---|
| Synchronous request-reply (REST, SOAP, gRPC) | Caller cannot continue without the answer (lookup, validation, pricing, authorisation); small payloads | Provider less available than caller; processing > a few seconds; bulk | Timeout at every hop (caller timeout > callee timeout + margin), retry only idempotent calls, circuit breaker, defined degraded mode |
| Asynchronous request-reply (queue + reply-to + correlation ID) | Variable or long processing, provider offline windows, need for buffering | A user waits on screen with no timeout UX | Reply destination, correlation ID, reply timeout, handling of late replies |
| Fire-and-forget command | One owner must act; sender does not need the result immediately | Sender must know the business outcome | Business acknowledgment flow if outcome matters |
| Event notification / pub-sub | Fan-out to N consumers; consumers added without changing the producer | Command with a single owner disguised as an event | Event ownership, schema governance, per-key ordering, retention for replay |
| Event-carried state transfer | Consumers need a local copy (read models, caches) | Per-consumer confidentiality on fields | Full state vs delta, compaction, snapshot for late joiners |
| Thin event + callback (claim check) | Large or sensitive payloads; consumer-specific authorisation | Very high volume (callback storms) | Callback API capacity; state may have changed between event and callback |
| File transfer (MFT) | Bulk, batch windows, banks/authorities/partners, legacy | Per-record latency in seconds | Naming, atomic delivery, control totals, ack/reject files, archive-based replay |
| CDC, log-based (DB transaction log) | Propagate DB changes without changing the application; feed events/DWH | Business meaning only exists in application logic; unstable schema | Initial snapshot + streaming, per-key ordering, DDL changes, delete propagation, outbox instead of raw tables when possible |
| CDC, query/trigger-based | Log access impossible | High volume, hard deletes, clock skew | Watermark (timestamp, id) with overlap, soft deletes or tombstones, trigger cost on OLTP |
| Batch ETL/ELT | Large volumes, reconciliation-driven, analytics | Operational real-time needs | Restartability, checkpoints, partial-failure policy, run-once guarantee |
| Shared database | Never as an integration contract between owned applications | — | Tolerated only as read-only view/replica with an explicit contract and owner |

**Batch vs real-time**
| Criterion | Favours real-time (API/event) | Favours batch (file/ETL) |
|---|---|---|
| Business latency | Seconds to minutes | Hours, end-of-day |
| Partner capability | API, broker | File only (banks, authorities, legacy, IBM i/mainframe) |
| Unit of reconciliation | Per message | Per file with control totals |
| Consistency | Per business key | Snapshot consistent at a cut-off time |
| Peak profile | Smooth | Concentrated (month-end, payroll) |
| Failure blast radius | One record | Whole file (unless per-record rejects are designed) |
| Cost of operation | Broker/gateway run, 24/7 support | Scheduling chain, batch windows |

Coupling to check for each flow: **temporal** (both must be up), **format** (shared schema), **location** (hard-coded endpoints), **semantic** (shared code lists/meaning). Async messaging removes temporal coupling only.

## 2. Delivery semantics and idempotence
| Semantics | Reality | Requirement |
|---|---|---|
| At-most-once | Loss possible, no duplicates | Only for telemetry/non-critical notifications |
| At-least-once | No loss if acked correctly, duplicates possible | Default of MQ, RabbitMQ, Kafka, MFT retries, HTTP retries: consumers MUST be idempotent |
| Exactly-once | Only inside a closed transactional scope (XA two-phase commit; Kafka transactions for read-process-write within Kafka) | End to end it is "effectively once" = at-least-once + idempotent processing |

**Idempotence techniques**
| Technique | How | Notes |
|---|---|---|
| Natural business key | Unique constraint on (source, business ID), e.g. invoice number + supplier | Best when the business key is truly unique and stable |
| Idempotency key | Producer generates a unique key per business operation (UUID); consumer stores key + result | Keep keys ≥ max replay/retry window; return the stored result on duplicate. HTTP header `Idempotency-Key` is an IETF draft — verify status |
| Upsert / set-state semantics | "Set status = SHIPPED" instead of "increment" | Combine with version numbers to reject stale updates |
| Version / sequence per key | Reject or park messages older than the stored version | Handles out-of-order delivery |
| File registry | Store file ID + SHA-256 of received files; reject or flag duplicates | Same name with different content is a different case: alert |
| Outbox (producer) | Write business change + outgoing message in the same DB transaction; relay publishes | Avoids dual-write loss; relay is at-least-once |
| Inbox (consumer) | Store processed message IDs in the same transaction as the business change | Atomic dedup |

Rules: never use the trace ID as an idempotency key; POST without an idempotency key must not be retried automatically for money-moving or stock-moving operations; dedup store retention > retry horizon + replay horizon.

**Ordering**: guaranteed only per partition/queue with a single active consumer; design for per-business-key ordering (Kafka key, MQ message groups, single-threaded consumer per key). Cross-entity ordering (customer before order) is handled by parking + retry or by including the dependency in the payload, not by hoping.

## 3. Replay and reprocessing
Prerequisites before any replay:
- [ ] Source retained: broker retention/offset, MFT archive, payload archive, or source system re-extraction possible.
- [ ] Consumers idempotent for the replayed range; side effects identified (payments, emails, stock movements, notifications to third parties) and suppressed or deduplicated.
- [ ] Scope identified precisely (time range, IDs, file names) and counted before and after.
- [ ] Ordering preserved for the replayed keys; newer data not overwritten by older replayed data (version check).
- [ ] Authorisation: who can replay; four-eyes for financial or health flows; replay action logged (who, what, when, why).
- [ ] Reconciliation after replay (counts and amounts vs source).

Replay mechanisms: reset consumer offset / dedicated replay consumer group (Kafka); move messages from DLQ/backout queue back to input (MQ, RabbitMQ) with tooling, not manual copy-paste; resend file from MFT catalog/archive under a new transfer ID but same business file ID; re-extract by business key range for APIs. Document a "replay runbook" per interface.

## 4. Error handling and dead letters
| Error class | Examples | Handling |
|---|---|---|
| Transient technical | Timeout, connection reset, HTTP 429/502/503/504, DB lock timeout, broker failover | Retry with exponential backoff + jitter, bounded; honour `Retry-After`; then park/DLQ + alert |
| Permanent technical | Malformed payload, schema violation, unknown version, deserialisation error, HTTP 400 | No retry; DLQ immediately with diagnostics; alert owner |
| Functional (business) | Unknown customer, closed period, duplicate invoice, amount above limit | Reject to sender with business code (RFC 9457 problem, pain.002, HL7 ACK AE/AR, EDIFACT APERAK) or route to a business work queue; no technical retry |
| Dependency not ready | Order arrives before customer master data | Delayed retry/parking with a bounded wait, then functional error |
| Poison message | Crashes the consumer at every attempt | Backout count threshold → backout/DLQ; never block the whole queue |

Retry baseline (adapt per SLA): 3-5 attempts, base 1-2 s, factor 2, cap 1-5 min, full jitter. Retry at ONE layer only (3 layers × 3 retries = 27 calls). Total retry time < message expiry and < caller timeout.

**Dead letter design**: keep original payload untouched + headers + error code/text + timestamp + attempt count + source destination + consumer version. Each DLQ has an owner, an alert on "depth > 0" or age, a replay tool, a retention rule, and the same data protection as the main flow (DLQs often hold personal data). Never purge a DLQ without reconciliation. Functional rejects should not land in the technical DLQ: business users need their own work queue.

**Acknowledgments**: distinguish transport ack (file received, message accepted), technical ack (syntax/schema valid) and business ack (accepted/posted, with references). Contracts must state which ones exist, their format and timeout, and what the sender does when no ack arrives.

## 5. Correlation and traceability
| Identifier | Scope | Set by | Carried in |
|---|---|---|---|
| Message ID | One technical message | Producer | IBM MQ MQMD MsgId, JMSMessageID, AMQP message-id, Kafka header, HTTP header |
| Correlation ID | Links reply to request / steps of one exchange | Requester | MQMD CorrelId, JMSCorrelationID, AMQP correlation-id, HTTP header |
| Trace context | Distributed technical trace | First instrumented component | W3C Trace Context `traceparent`/`tracestate` (HTTP), copied into message headers |
| Business key | Business object | Business system | Payload (order number, EndToEndId, invoice number, visit number) |
| File / batch ID | File or batch | Sender | File name, header record, ISO 20022 GrpHdr/MsgId, EDIFACT UNB control reference |

Rules: log all relevant IDs at every hop (ingress, transformation, egress); propagate, never regenerate mid-flow; one business key must allow end-to-end search across middleware, ERP and partner reports.

## 6. Observability
Per interface, monitor:
- **Throughput** (messages/files per period) vs expected profile (same weekday/last month ± threshold).
- **Error rate** split technical vs functional.
- **Latency** end to end and per hop (p95/p99).
- **Backlog**: queue depth, consumer lag, age of oldest message, files waiting.
- **Freshness / absence of flow**: "no file by 07:00", "no message for 30 min during business hours" — the most frequently missing alert.
- **Reconciliation status**: sent vs received vs posted counts and amounts.
- **Certificates and credentials expiry** (alert ≥ 30 days before).

Logs: structured (JSON), correlation IDs, no secrets, no full payloads or personal data in standard logs; payload archive separate, access-controlled, with retention aligned to legal and GDPR rules. Traces: OpenTelemetry across gateways, ESB and consumers where supported. Every alert has an owner, a severity and a runbook entry. Regulated contexts: banking incident classification data (DORA) and healthcare access traceability must be obtainable from these signals.

## 7. Versioning and compatibility
| Change | Compatibility |
|---|---|
| Add optional field / new operation / new event type | Compatible if consumers are tolerant readers |
| Add enum value | Breaks strict consumers — contract must state "consumers must accept unknown values" |
| Tighten validation, change default, change ordering, change field meaning with same schema | Breaking (semantic) |
| Remove/rename field, change type/format, shorten length, optional → mandatory, change ID semantics or error codes | Breaking |

Rules: semantic versioning of the contract (MAJOR.MINOR.PATCH); major version visible (URL `/v2`, media type, topic name, file layout version in header record); run N and N-1 in parallel with a published deprecation date (HTTP `Deprecation` RFC 9745 and `Sunset` RFC 8594 headers); consumer inventory (gateway analytics, broker ACLs, MFT partner list) before removal; tolerant reader + strict writer; consumer-driven contract tests in CI; for events use a schema registry with an enforced compatibility mode (see mft-mq-kafka.md); never change a fixed-width layout without a new version identifier.

## 8. Interface security
| Mechanism | Use | Must-haves | Pitfalls |
|---|---|---|---|
| OAuth 2.0 client credentials (RFC 6749 §4.4) | Machine-to-machine API calls | Short-lived access tokens, one client per consuming application, minimal scopes, audience restriction, token cached until near expiry; client authentication by `private_key_jwt` (RFC 7523) or mTLS (RFC 8705) rather than shared secrets where possible; follow OAuth security BCP (RFC 9700) | One client for many apps; secrets in config repos; a token request per API call; no revocation/rotation process |
| mTLS | Mutual authentication between systems/partners, zero-trust internal flows | Trusted CA chain validation, subject/SAN allowlist, expiry monitoring, rotation with overlap (old + new accepted), CRL/OCSP policy | TLS terminated at a load balancer without securely forwarding the verified client identity; pinning that blocks rotation |
| JWT (RFC 7519) | Access tokens, client assertions, signed claims | Validate signature with algorithm allowlist (never `none`), `iss`, `aud`, `exp`, `nbf`, `kid` resolved via JWKS with caching; JWT BCP RFC 8725 | Sensitive data in a signed (not encrypted) token; long lifetimes; accepting tokens issued for another audience |
| API keys | Consumer identification, quotas, low-risk APIs | Header (never URL), one key per consumer and environment, rotation, combined with OAuth2/mTLS for sensitive data | Treated as strong authentication; leaked in logs and URLs |
| Message / file signing | Integrity and non-repudiation independent of transport | JWS (RFC 7515), XML-DSig, HTTP Message Signatures (RFC 9421), CMS/PGP for files; signed timestamps where non-repudiation matters | Intermediaries reformatting signed XML (canonicalisation breaks); keys without lifecycle |
| Payload encryption | Confidentiality across intermediaries/storage | JWE, XML-Enc, CMS/PGP; key rotation; integrity protection too | Encryption without integrity; inability to scan content |
| Webhook verification | Inbound callbacks from SaaS/partners | HMAC or signature over raw body + timestamp, reject stale timestamps, idempotent by event ID | Verifying signature on a re-serialised body |

Baseline: TLS 1.2 minimum, TLS 1.3 preferred, cipher suites per ANSSI TLS guidance (verify current version); secrets in a vault, rotated, never in repositories or scripts; dedicated least-privilege technical account per interface and environment; schema validation, size limits, XXE disabled, archive bomb limits; network filtering and DMZ relay for external partners; GDPR minimisation (only fields the purpose requires) and retention of payload archives; health data hosted per HDS rules; financial entities: DORA third-party and incident rules; classified/Diffusion Restreinte flows out of scope of cloud tooling (hand off to devsecops-expert / infra-expert).

## 9. Interface review checklist
**Business and ownership**
- [ ] Purpose, business process, data owner and technical owner on both sides; consumer list.
- [ ] Criticality (impact of 1 h / 1 day outage), regulatory scope (GDPR, banking, health, defense classification).
**Contract**
- [ ] Formal schema (OpenAPI, AsyncAPI, XSD, JSON Schema, copybook, file layout) versioned and stored in a repository.
- [ ] Field-level mapping with rules, mandatory/optional, null vs absent, code lists and owners, units, rounding.
- [ ] Encoding, decimal separator, date/time format and time zone, number formats explicitly stated.
- [ ] Examples with fictitious data for nominal and error cases.
**Flow**
- [ ] Trigger, frequency, calendar (business days, TARGET2 days for SEPA, bank holidays), cut-off times, batch windows.
- [ ] Volumes average/peak/growth, max message/file size, latency SLA.
- [ ] Ordering requirement and how it is guaranteed.
**Reliability**
- [ ] Delivery semantics, idempotency key, duplicate detection.
- [ ] Timeouts, retry policy (one layer), DLQ/backout with owner.
- [ ] Partial failure policy (all-or-nothing vs per-record rejects).
- [ ] Acknowledgments (transport/technical/business) and behaviour when missing.
- [ ] Replay procedure and reconciliation (counts, amounts, control totals).
**Security**
- [ ] Authentication and authorisation per party; secrets storage and rotation; certificate owners and expiry dates.
- [ ] Encryption in transit (and at rest for archives/DLQ); signing where integrity or non-repudiation is required.
- [ ] Data classification; personal/health/banking fields identified and minimised; masking in logs.
**Operations**
- [ ] Monitoring incl. absence-of-flow alert; dashboards; runbook; support levels and escalation.
- [ ] Capacity, purge/archive, DR (RPO/RTO) and behaviour after failover (duplicates, gaps).
- [ ] Environments, test partners, test data anonymised.
**Change**
- [ ] Versioning and deprecation policy; consumer inventory.
- [ ] Tests: contract, integration end to end, error cases, volume/performance, replay, failover.
- [ ] Initial load, cut-over and in-flight message handling.

## 10. Pitfalls seen in production
- "Exactly once" promised over an at-least-once broker; no dedup.
- Automatic retry of non-idempotent POST creating duplicate payments/orders.
- Caller timeout shorter than callee processing → orphan processing and duplicates on retry.
- Floating-point amounts; implicit rounding differences between systems.
- Local times without offset; batch windows across DST changes (02:00-03:00).
- Encoding mismatch (UTF-8 vs Windows-1252 vs EBCDIC CCSID) discovered in production on accented names.
- Silent truncation in fixed-width layouts or DB columns.
- No alert when the flow simply stops.
- DLQ nobody watches; functional rejects mixed with technical errors.
- Replay re-triggering side effects (emails, payments, stock moves).
- Producer-first deployment of a breaking schema change.
- Partner certificate expiry discovered by the outage.
- Test environments fed with copies of production personal data.
