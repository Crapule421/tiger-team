# Interface Contract (Contrat d'interface)

## 1. Identification

| Item | Value |
|---|---|
| Interface ID | `INT-<nnn>` |
| Name | `<Source>-to-<Target> <business object>` |
| Version / status | `<1.0>` / `<Draft / In review / Approved / Deprecated>` |
| Business criticality | `<High / Medium / Low>`; _supports a critical or important function: yes/no_ |
| Data classification | `<Public / Internal / Confidential / Regulated: personal, card, health, secrecy>` |
| Related requirements / ADRs | `<REQ-..., ADR-...>` |
| Related flows | `<FLW-...>` (flow matrix) |
| Sensitivity label of this document | `<Internal / Confidential>` |

## 2. Parties

| Role | System / application | Organization / team | Business owner | Technical owner | Support (hours, channel) |
|---|---|---|---|---|---|
| Provider (source) | `<APP-A>` | `<...>` | `<role>` | `<role>` | `<...>` |
| Consumer (target) | `<APP-B>` | `<...>` | | | |
| Intermediary (middleware, MFT, API gateway) | `<...>` | `<...>` | — | | |

## 3. Business purpose

_What business event or need the interface serves, what the target does with the data, consequences of a delay or loss._

## 4. Trigger and frequency

| Item | Value |
|---|---|
| Mode | `<real time / near real time / batch / on demand>` |
| Trigger | `<business event / schedule / request>` |
| Schedule | `<e.g. business days 02:00 Europe/Paris; calendar ref>` |
| Cut-off / delivery deadline | `<data available before 06:00>` |
| Dependencies | `<jobs or interfaces that must complete first>` |
| Exceptional runs | `<month-end, year-end, catch-up>` |

## 5. Transport

| Item | Value |
|---|---|
| Pattern | `<REST API / SOAP / MQ / Kafka / SFTP / PeSIT / AS2 / DB link / other>` |
| Direction | `<push from source / pull by target>` |
| Endpoint(s) | `<https://api.example.test/v1/...>` / `<queue or topic name>` / `<directory>` |
| Environments | `<DEV, UAT, PREPROD, PROD endpoints: references only>` |
| File naming (if files) | `<PREFIX_YYYYMMDD_HHMMSS_SEQ.ext>` |
| Compression / packaging | `<none / gzip / zip>` |
| Acknowledgment | `<HTTP status / functional ACK message / ACK file / MQ COA>` |
| Completion signal | `<trailer record / .done file / atomic rename>` |

## 6. Format and schema

| Item | Value |
|---|---|
| Format | `<JSON / XML / CSV / fixed-width / EDIFACT / HL7 v2 / FHIR / ISO 20022 / IDoc>` |
| Encoding | `<UTF-8 / EBCDIC CCSID ... / ISO-8859-15>`; line ending `<LF / CRLF>` |
| Schema reference and version | `<OpenAPI / XSD / JSON Schema / message spec ref, version>` |
| Standard profile | _e.g. CI-SIS volet, ISO 20022 message version, IHE profile_ |
| Structure | _header / detail / trailer; one message per business object or batch_ |
| Decimal / date conventions | `<decimal point, ISO 8601 dates, time zone or UTC>` |

## 7. Field mapping

_One row per target field. Examples are fictitious. Mark personal or regulated fields in the last column._

| # | Target field | Type / length | Mandatory | Source field | Transformation rule | Default | Fictitious example | Classification |
|---|---|---|---|---|---|---|---|---|
| 1 | `<customerId>` | `<string(20)>` | Y | `<CLI.ID>` | _left-trim, uppercase_ | — | `CUST000123` | Personal |
| 2 | `<amount>` | `<decimal(15,2)>` | Y | `<TRX.AMT>` | _cents → units_ | — | `1250.00` | Internal |
| 3 | `<currency>` | `<string(3)>` | Y | `<TRX.CUR>` | _ISO 4217_ | `EUR` | `EUR` | Internal |
| 4 | `<status>` | `<code>` | Y | `<TRX.STS>` | _mapping table MAP-01_ | — | `ACCEPTED` | Internal |

Mapping tables (code translations): `<MAP-01: source code → target code>`, owner and change process.

## 8. Volumetry

| Measure | Average | Peak | Growth / 3 years | Notes |
|---|---|---|---|---|
| Messages or records per day | `<...>` | `<...>` | `<+x %>` | |
| Peak throughput | — | `<msg/s>` at `<period>` | | _month-end, campaigns_ |
| Message / file size | `<KB>` | `<MB>` | | |

## 9. Service levels

| Item | Commitment |
|---|---|
| Availability of the interface | `<...>` during `<hours>` |
| End-to-end latency | `<p95 < x s>` / _delivery before HH:MM_ |
| Data freshness (RPO for the flow) | `<...>` |
| Recovery after outage | `<backlog processed within x h>` |
| Support hours and response times | `<...>` |

## 10. Error handling and replay

| Error type | Detection | Handling | Notification | Owner |
|---|---|---|---|---|
| Transport (unreachable, timeout) | `<...>` | _retry N times with backoff, then park_ | `<alert>` | `<...>` |
| Technical validation (schema, encoding) | | _reject message / file; dead-letter queue_ | | |
| Functional (unknown reference, business rule) | | _reject record, continue batch; reject report to source_ | | |
| Duplicate | _idempotence key `<field>`_ | _ignore and log_ | | |
| Out of sequence | _sequence number / timestamp_ | _hold and reorder / reject_ | | |

- Idempotence key: `<field(s)>`. Ordering guarantee: `<none / per key / global>`.
- Replay procedure: _who can replay, from where (archive, DLQ), how duplicates are avoided, approval needed._
- Reconciliation: _control totals (record count, sum of amounts) source vs target, frequency, discrepancy handling._
- Retention of messages / files / DLQ: `<duration>`, location, protection (same regime as the data).

## 11. Security

| Item | Value |
|---|---|
| Authentication | `<mutual TLS / OAuth2 client credentials / SSH keys / signed messages>` |
| Authorization | `<scopes, roles, directory permissions; least privilege>` |
| Encryption in transit | `<TLS 1.2+ / 1.3; cipher policy ref>` |
| Encryption at rest | _staging, queues, archives, DLQ_ |
| Integrity / non-repudiation | `<signature, hash, sequence>` |
| Secrets management | _vault path reference; rotation `<period>`; never in code or job definitions_ |
| Personal / regulated data | _minimization justification; legal basis ref; location; masking in logs_ |
| Logging | _metadata only (IDs, counts, status, timings); no payloads with regulated data_ |
| Applicable rules | `<GDPR / DORA / PCI DSS / HDS / II 901...>` |

## 12. Monitoring

| Check | Threshold | Alert to | Runbook |
|---|---|---|---|
| Message / file not received by `<HH:MM>` | — | `<L1>` | DEX §9 |
| Error or reject rate | `<above x %>` | | |
| Queue depth / backlog | `<...>` | | |
| Latency | `<p95 > x s>` | | |
| Certificate expiry | `<30 d>` | | |

Business KPIs: _volumes per day vs usual, rejects per cause._

## 13. Test cases

_Synthetic data only. Link to the test campaign._

| ID | Type | Scenario | Input (fictitious) | Expected result |
|---|---|---|---|---|
| TC-INT-001 | Nominal | `<single valid message>` | `<ref>` | _processed, ACK OK_ |
| TC-INT-002 | Error | `<invalid schema>` | | _rejected, DLQ, alert_ |
| TC-INT-003 | Error | `<unknown reference>` | | _record rejected, report sent_ |
| TC-INT-004 | Duplicate | `<same message twice>` | | _processed once_ |
| TC-INT-005 | Volume | `<peak volume x 1.5>` | | _within SLA_ |
| TC-INT-006 | Resilience | `<target down 30 min>` | | _retries, backlog cleared within SLA_ |
| TC-INT-007 | Security | `<invalid certificate / token>` | | _refused, logged_ |
| TC-INT-008 | Replay | `<replay one day>` | | _no duplicates, reconciled_ |

## 14. Change history and versioning policy

- Compatibility rules: _additive changes (new optional field) = minor version; removal or type change = major version with coexistence period `<...>`._
- Notice period for changes: `<x weeks>`; deprecation process.

| Version | Date | Author | Changes | Approved by |
|---|---|---|---|---|
| 0.1 | `<YYYY-MM-DD>` | `<role>` | Draft | — |

## 15. Approval

| Party | Role | Name / function | Date | Decision |
|---|---|---|---|---|
| Provider | Technical owner | `<...>` | | |
| Consumer | Technical owner | `<...>` | | |
| Security | RSSI / delegate | `<...>` | | |
