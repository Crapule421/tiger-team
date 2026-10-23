# APIs: REST/OpenAPI, SOAP/WSDL, API gateways, ESB/iPaaS

## Contents
1. REST resource design rules
2. HTTP methods and status codes
3. Headers, caching and concurrency
4. Pagination, filtering, bulk
5. Errors: RFC 9457 problem details
6. Rate limiting and quotas
7. Long-running operations and webhooks
8. OpenAPI 3.x and AsyncAPI
9. SOAP, WSDL, WS-Security
10. Choosing REST, SOAP, gRPC, GraphQL or events
11. API gateways
12. ESB and iPaaS
13. API review checklist

## 1. REST resource design rules
- Resources are nouns, collections plural: `/customers/{customerId}/orders/{orderId}`; nesting ≤ 2 levels, otherwise use query filters.
- Path segments in lowercase kebab-case; one JSON property convention (camelCase is the most common) applied everywhere.
- Actions that do not map to CRUD become sub-resources or explicit action resources: `POST /payments/{id}/cancellation` rather than `POST /cancelPayment`.
- IDs are opaque strings; never expose sequential DB keys on external APIs (enumeration). UUIDs per RFC 9562 (v7 is time-ordered and index-friendly).
- Data conventions: timestamps RFC 3339 with offset (`2026-03-31T22:00:00Z`); dates without time as `YYYY-MM-DD`; amounts as decimal string (`"1234.50"`) or integer minor units, always with ISO 4217 currency; countries ISO 3166-1 alpha-2; languages BCP 47; booleans never as "Y"/"N" strings in new APIs.
- Enums documented with meaning; the contract states that consumers must tolerate unknown values.
- Null vs absent: define the semantics (critical for PATCH: absent = unchanged, null = clear).
- No sensitive data in URLs (paths and query strings are logged by proxies and gateways): IBAN, NIR, names, tokens → body of a `POST .../search`.
- `Location` header on 201; `Content-Type` with `charset=utf-8` for JSON when the stack requires it.
- Version: major version in path (`/v1`) or media type; minor changes must be backward compatible.

## 2. HTTP methods and status codes
HTTP semantics are defined in RFC 9110.

| Method | Safe | Idempotent | Typical use |
|---|---|---|---|
| GET | yes | yes | Read resource or collection |
| HEAD | yes | yes | Metadata only |
| OPTIONS | yes | yes | Capabilities, CORS preflight |
| PUT | no | yes | Full replacement, or create at a client-known URI |
| DELETE | no | yes | Delete (second call → 404 or 204, document which) |
| POST | no | no | Create in collection, trigger processing/actions |
| PATCH (RFC 5789) | no | not by default | Partial update: JSON Merge Patch (RFC 7396) or JSON Patch (RFC 6902); make safe with `If-Match` |

| Code | Use |
|---|---|
| 200 OK | Success with body |
| 201 Created | Resource created; `Location` header |
| 202 Accepted | Accepted for async processing; `Location` of a status resource |
| 204 No Content | Success without body |
| 304 Not Modified | Conditional GET matched (`If-None-Match`) |
| 400 Bad Request | Malformed request, schema violation |
| 401 Unauthorized | Missing/invalid authentication (`WWW-Authenticate`) |
| 403 Forbidden | Authenticated, not authorised |
| 404 Not Found | Unknown resource (also used to avoid disclosing existence) |
| 405 Method Not Allowed | With `Allow` header |
| 406 / 415 | Content negotiation failure / unsupported media type |
| 409 Conflict | State conflict, duplicate business key |
| 410 Gone | Permanently removed (after sunset) |
| 412 Precondition Failed | `If-Match` ETag mismatch (optimistic locking) |
| 422 Unprocessable Content | Well-formed but violates business rules (choose 400 vs 422 once, document it) |
| 428 Precondition Required (RFC 6585) | Server requires conditional request |
| 429 Too Many Requests (RFC 6585) | Rate limit; `Retry-After` |
| 500 | Unexpected server error — never for validation |
| 502 / 504 | Upstream error / upstream timeout (gateway) |
| 503 | Temporarily unavailable; `Retry-After` |

Client retry policy: retry network errors, 408, 429, 502, 503, 504 on idempotent methods (or POST with an idempotency key), with backoff + jitter and `Retry-After`. Never retry 4xx validation errors.

## 3. Headers, caching and concurrency
| Header | Purpose |
|---|---|
| `Accept`, `Content-Type` | Negotiation (`application/json`, `application/problem+json`, `application/xml`) |
| `Authorization: Bearer <TOKEN>` | OAuth2 access token (RFC 6750) |
| `ETag`, `If-None-Match` | Caching / conditional GET |
| `ETag`, `If-Match` | Optimistic concurrency on PUT/PATCH/DELETE → 412 on mismatch, 428 if missing |
| `Cache-Control` | `no-store` for personal/sensitive data |
| `Location` | URI of created resource or async status |
| `Retry-After` | With 429/503/202 polling |
| `traceparent`, `tracestate` | W3C Trace Context |
| `Idempotency-Key` | Idempotent POST (IETF HTTPAPI draft `draft-ietf-httpapi-idempotency-key-header`, not an RFC as of October 2026) |
| `Deprecation` (RFC 9745), `Sunset` (RFC 8594), `Link` (RFC 8288) | Lifecycle and navigation |

## 4. Pagination, filtering, bulk
| Style | Pros | Cons | Use for |
|---|---|---|---|
| Offset/limit | Simple, random access | Slow at depth; pages drift when data changes | Small admin lists |
| Page number/size | Same as offset | Same | UIs |
| Cursor / keyset (opaque token from last sort key) | Stable and scalable | No random access | Integration sync, large datasets |
| Delta (`updatedSince` + cursor) | Incremental sync | Clock skew, identical timestamps | Change feeds: use composite (timestamp, id) and an overlap window |

Rules: enforce a max page size; return `next` link (body or `Link: <...>; rel="next"`); avoid total counts by default (expensive); stable sort with a unique tiebreaker. Filtering: explicit parameters (`status=OPEN&createdFrom=...`) rather than a free query language unless governed. Sparse fieldsets (`fields=`) for heavy resources.

Bulk: dedicated endpoint with max items per call, per-item result (status, ID, error) and documented partial-failure semantics (all-or-nothing vs per item). For large volumes prefer asynchronous bulk (202 + job resource) or file transfer.

## 5. Errors: RFC 9457 problem details
RFC 9457 (obsoletes RFC 7807). Media type `application/problem+json` (or `+xml`). Members: `type` (URI identifying the problem type; default `about:blank`), `title` (short, stable per type), `status` (HTTP code), `detail` (occurrence-specific, human-readable), `instance` (URI of the occurrence). Extension members are allowed.

```json
{
  "type": "https://api.example.org/problems/invalid-field",
  "title": "Invalid request field",
  "status": 422,
  "detail": "Field 'dueDate' must not be before 'issueDate'.",
  "instance": "/v1/invoices/requests/7f3c",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "errors": [{ "pointer": "/dueDate", "code": "DATE_BEFORE_ISSUE" }]
}
```
Rules: machine-readable `type`/`code` that clients can branch on; one error format for all APIs including gateway-generated errors (401/429); no stack traces, SQL or internal hostnames; include the correlation/trace ID; document every problem type in the contract.

## 6. Rate limiting and quotas
- **Spike arrest / rate limit** (per second/minute) protects backends; **quota** (per day/month) enforces commercial or fair-use limits; **concurrency limit** protects slow backends.
- Algorithms: token bucket (allows bursts), leaky bucket (smooths), fixed window (edge bursts at window boundaries), sliding window.
- Key by consumer (client ID / API key / subscription), not only by IP.
- Response: 429 + `Retry-After`. The `RateLimit` / `RateLimit-Policy` header fields are still an IETF HTTPAPI draft (`draft-ietf-httpapi-ratelimit-headers`, not an RFC as of October 2026); many gateways emit vendor `X-RateLimit-*` headers — document which.
- Batch consumers must self-throttle and spread load; publish limits in the contract.

## 7. Long-running operations and webhooks
- Long-running: `202 Accepted` + `Location: /v1/jobs/{id}`; status resource with `PENDING/RUNNING/SUCCEEDED/FAILED`, result link, `Retry-After` for polling; or callback.
- Webhook provider: sign payload (HMAC-SHA256 over raw body + timestamp, or asymmetric signature / HTTP Message Signatures RFC 9421), include event ID and timestamp, retry with backoff for a documented period, offer an "events since" endpoint for reconciliation.
- Webhook receiver: verify signature on raw bytes, reject stale timestamps (replay), respond 2xx quickly then process asynchronously, deduplicate by event ID, never assume ordering.

## 8. OpenAPI 3.x and AsyncAPI
- **3.0.x**: schema object is an extended subset of an early JSON Schema draft (Wright draft 00); `nullable: true`.
- **3.1.x**: full JSON Schema 2020-12 alignment (`type: ["string","null"]` replaces `nullable`), top-level `webhooks`, `mutualTLS` security scheme type.
- **3.2.x**: 3.2.0 published 19 September 2025 (3.2.1 patch, September 2026): `$self` document URI, `querystring` parameter location, `additionalOperations` and the QUERY method, sequential/streaming media types. Check generator, gateway and linter support before adopting 3.2.
- Design-first: the OpenAPI document is the contract, reviewed and versioned in Git; lint with a team ruleset (e.g. Spectral); detect breaking changes in CI with an OpenAPI diff tool; generate mocks and contract tests.
- Mandatory content per operation: unique `operationId`, summary, all responses incl. error responses referencing a shared problem schema, examples, security requirement, pagination parameters for collections.
- `securitySchemes`: `oauth2` (flow `clientCredentials` with `tokenUrl` and scopes), `http` bearer, `apiKey` (in header), `mutualTLS` (3.1), `openIdConnect`.
- `info.version` = contract version (not implementation build). Use `servers` per environment without secrets.
- Event-driven contracts: AsyncAPI (2.x, 3.0.0; 3.1.0 released January 2026 with no breaking changes) describes channels, operations, messages and bindings (Kafka, AMQP, MQTT, IBM MQ…); check that your parser/generator supports 3.x before adopting it.

## 9. SOAP, WSDL, WS-Security
| Aspect | SOAP 1.1 | SOAP 1.2 |
|---|---|---|
| Envelope namespace | `http://schemas.xmlsoap.org/soap/envelope/` | `http://www.w3.org/2003/05/soap-envelope` |
| HTTP Content-Type | `text/xml` | `application/soap+xml` |
| Action | `SOAPAction` HTTP header | `action` parameter of the Content-Type |
| Fault structure | `faultcode`, `faultstring`, `faultactor`, `detail` | `Code/Value` (+ Subcode), `Reason/Text`, `Node`, `Role`, `Detail` |
| Fault codes | VersionMismatch, MustUnderstand, Client, Server | VersionMismatch, MustUnderstand, DataEncodingUnknown, Sender, Receiver |

- **WSDL 1.1** sections: types (XSD), message, portType (operations), binding (SOAP style/use), service (endpoint). Use **document/literal wrapped** (WS-I Basic Profile); avoid RPC/encoded.
- **MTOM/XOP** for binary attachments instead of base64 inline for large content.
- **WS-Addressing**: `MessageID`, `RelatesTo`, `ReplyTo`, `Action` — async correlation over SOAP.
- **WS-Security (OASIS WSS 1.0/1.1)**: `Security` header with `Timestamp`, `UsernameToken` (avoid; PasswordDigest relies on SHA-1 — use only over TLS and only if nothing better), `BinarySecurityToken` (X.509), SAML token profile, XML Signature over body + timestamp, XML Encryption. WS-SecurityPolicy expresses requirements in the WSDL.
- **WS-ReliableMessaging**: in-order/exactly-once at protocol level, rarely interoperable in practice — verify both stacks.
- SOAP pitfalls: namespace or element order changes break strict clients; `xsi:nil="true"` vs absent element; `SOAPAction` mismatch; clock skew rejecting `Timestamp`; signed messages broken by intermediaries that reformat or re-encode XML; huge DOM parsing of large payloads; XXE if parsers are not hardened; SOAP faults returned with HTTP 200 by some stacks.

## 10. Choosing REST, SOAP, gRPC, GraphQL or events
| Style | Fits | Weak at |
|---|---|---|
| REST/JSON | Resource-oriented APIs, partners, web/mobile, gateway tooling | Strict typing without discipline, streaming |
| SOAP/XML | Existing enterprise/B2B services, WS-Security message-level signing, strict XSD contracts | Developer experience, payload size, modern gateway features |
| gRPC (HTTP/2 + Protobuf) | Internal low-latency service-to-service, streaming | Browser/partner exposure, gateway/WAF inspection, human debugging |
| GraphQL | Front-ends aggregating many resources with variable needs | Caching, rate limiting by cost, authorisation per field, B2B contracts |
| Events (Kafka/AMQP/MQ) | Decoupled notifications, fan-out, streaming | Request-reply needing immediate answer |

## 11. API gateways
Generic responsibilities: TLS termination, authentication (OAuth2 token validation, mTLS, API keys), authorisation (scopes/claims), rate limit/quota/spike arrest, request/response transformation, routing and versioning, threat protection (JSON/XML size and depth limits, schema validation, injection patterns), caching, CORS, logging and analytics, developer portal and subscription workflow, environment promotion of API definitions as code.

| Product | Core vocabulary (concepts only — verify features per edition/version) |
|---|---|
| Apigee (Google) | API proxies with policies attached to flows (request/response), target endpoints, environments, API products bundling proxies + quotas, developer apps holding credentials |
| Kong | Services (upstream API), routes (matching rules), plugins (auth, rate limiting, transformations), consumers (credentials), upstreams/targets for load balancing; declarative configuration |
| Axway API Management | API Gateway runtime with policies designed in Policy Studio, API Manager (catalogue, applications, quotas), API Portal for developers |
| Azure API Management | APIs and operations, products, subscriptions (subscription keys), policies (XML) in `inbound`, `backend`, `outbound`, `on-error` sections, developer portal, self-hosted gateway option |

Gateway pitfalls: business logic in gateway policies (untestable, vendor lock-in); gateway as the only security layer (backends must still authorise); different error formats between gateway and backend; timeouts at gateway shorter than backend processing; logging full bodies with personal data; configuration edited manually in production instead of promoted as code.

## 12. ESB and iPaaS
Concepts: connectors/adapters, mediation (routing, transformation, enrichment), orchestration (central process) vs choreography (events, no central controller), canonical data model (scope it to a domain), message store and resubmission, error hospital, process-level transactions/compensation, deployment units and runtime clustering.

| Product | Concepts (verify current packaging and naming) |
|---|---|
| MuleSoft Anypoint Platform | Mule runtime applications and flows, DataWeave transformation language, Anypoint Exchange (reusable assets), API Manager, CloudHub or customer-hosted runtimes; "API-led connectivity" layering: system, process, experience APIs |
| Talend (acquired by Qlik, May 2023; now "Qlik Talend") | Talend Studio jobs (graphical design generating Java), data integration/quality focus, scheduled or service execution — confirm which product line is in scope |
| Boomi | Low-code processes built from shapes and connectors, runtimes called Atoms/Molecules (clustered) or Atom Clouds, central platform for design and monitoring |
| webMethods (acquired by IBM from Software AG, July 2024) | Integration Server (services, adapters), messaging (Universal Messaging / Broker in older estates), Trading Networks for B2B — check IBM's current roadmap and packaging |
| TIBCO | BusinessWorks (process-based integration), Enterprise Message Service (EMS, JMS broker) — verify current product set |

Selection criteria: connector coverage for the ERPs/SaaS in scope; on-premise/hybrid runtime and data residency; B2B/EDI capability; transformation power and testability; CI/CD and config-as-code; monitoring and resubmission for operations teams; licensing model (cores, flows, messages, connectors) at target volume; skills market in the region; exit plan.

Anti-patterns: business rules buried in the bus; one giant canonical model; synchronous chains through the ESB for every call; no resubmission tooling; flows deployed manually; ESB as a "god component" nobody can upgrade.

## 13. API review checklist
- [ ] OpenAPI/WSDL present, versioned, linted, examples for success and errors.
- [ ] Resource naming and HTTP methods consistent; idempotency defined for every non-idempotent operation.
- [ ] Status codes and RFC 9457 errors documented, including gateway errors.
- [ ] Pagination with max page size and stable ordering; delta sync strategy for integration consumers.
- [ ] Optimistic concurrency (ETag/If-Match) where concurrent updates are possible.
- [ ] AuthN (OAuth2 client credentials / mTLS), scopes per operation, no secrets or personal data in URLs.
- [ ] Rate limits, quotas and timeouts documented; client retry guidance.
- [ ] Versioning, deprecation and sunset policy; consumer inventory.
- [ ] Payload size limits, schema validation and threat protection at the gateway.
- [ ] Observability: correlation/trace IDs in and out, metrics per operation and consumer.
- [ ] Contract tests and performance tests at expected peak.

## Sources
- https://www.rfc-editor.org/info/rfc9457 — RFC 9457 Problem Details, obsoletes RFC 7807
- https://www.rfc-editor.org/info/rfc9745 — RFC 9745 Deprecation header field (2025)
- https://www.rfc-editor.org/info/rfc8594 — RFC 8594 Sunset header (Informational)
- https://www.rfc-editor.org/info/rfc9562 — RFC 9562 UUIDs, version 7 time-ordered
- https://www.rfc-editor.org/info/rfc9421 — RFC 9421 HTTP Message Signatures
- https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/ — Idempotency-Key header, active Internet-Draft
- https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/ — RateLimit header fields, active Internet-Draft
- https://spec.openapis.org/oas/v3.2.0.html — OpenAPI 3.2.0 specification, September 2025
- https://spec.openapis.org/oas/latest.html — OpenAPI latest version (3.2.1)
- https://www.asyncapi.com/blog/release-notes-3.1.0 — AsyncAPI 3.1.0 release notes
- https://newsroom.ibm.com/2024-07-01-IBM-Completes-Acquisition-of-StreamSets-and-webMethods,-Bolstering-its-Automation,-Data-and-AI-Portfolios — IBM completes webMethods acquisition
- https://www.qlik.com/us/news/company/press-room/press-releases/qlik-acquires-talend — Qlik closes Talend acquisition
