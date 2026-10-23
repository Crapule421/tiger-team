# Microsoft Dynamics 365 - integration reference (F&O, Business Central, Dataverse)

## Contents
1. Product landscape
2. Finance & Operations essentials
3. F&O data entities and Data Management Framework (DMF)
4. F&O OData, custom services, business events
5. F&O ↔ Dataverse: dual-write, virtual entities, data export
6. Business Central integration
7. Dataverse integration
8. Authentication and security
9. Pitfalls and review checklist

Microsoft ships continuous updates; endpoint names, limits and feature status change. Verify against current Microsoft Learn documentation and your environment version.

## 1. Product landscape
| Product | Nature | Main integration surface |
|---|---|---|
| Dynamics 365 Finance, Supply Chain Management, Commerce, Project Operations (finance and operations apps, "F&O") | Large-enterprise ERP (X++ platform) | Data entities via DMF and OData, custom services, business events, dual-write |
| Dynamics 365 Business Central (BC) | SMB/mid-market ERP (AL extensions) | REST API v2.0, custom API pages, OData web services, webhooks |
| Dataverse (Power Platform) | Data platform under CE apps (Sales, Customer Service…) and Power Apps | Web API (OData v4), SDK, plug-ins, webhooks, Synapse Link |

## 2. Finance & Operations essentials
- Legal entities (company, `DataAreaId`), financial dimensions (configurable, with dimension sets per main account), main accounts, posting profiles, number sequences, fiscal calendars and period statuses per ledger.
- Customisation via extensions (models/packages) in X++; overlayering is not allowed in current versions.
- Environment tiers: development/build, sandbox (UAT), production; lifecycle tooling historically in Lifecycle Services (LCS), now moving to the Power Platform admin center "unified experience" (F&O as an app in a Dataverse environment, capacity-based instead of environment slots) — check which model each of your environments uses.
- One Version: Microsoft service updates several times per year; regression testing of interfaces is mandatory (use the update cadence in the project plan).
- Batch framework: batch jobs and batch groups; DMF imports/exports run as batch jobs.

## 3. F&O data entities and Data Management Framework (DMF)
- **Data entities**: abstraction over one or more tables; public entities have `PublicEntityName`/`PublicCollectionName` and are exposed via OData; composite entities group header/lines (e.g. for documents); many entities support set-based processing (faster, but skips some row-level logic — verify per entity).
- **DMF** (Data management workspace):
  - Data projects for import/export with entity, source format (CSV, Excel, XML, package), mapping (source ↔ staging), and execution history.
  - Two-step processing: source → **staging** tables (validation, transformation) → **target**; errors visible per staging record; fix and re-run from staging.
  - **Data packages** (zip with manifest, package header and data files) to move configuration and data; entity sequencing (execution units, levels, sequence) to respect dependencies.
  - **Templates** of entities and sequence for configuration/migration.
- **Recurring integrations**: scheduled data projects with REST endpoints `POST /api/connector/enqueue/<activityId>?entity=<name>` (import), `GET /api/connector/dequeue/<activityId>` and `POST /api/connector/ack/<activityId>` (export; an unacknowledged message is offered again every 30 minutes), plus `GetMessageStatus`; scheduling inside F&O; cloud only (not on-premises).
- **Data management package REST API**: OData actions on `DataManagementDefinitionGroups` — `GetAzureWriteUrl`, `ImportFromPackage` (+`Async`), `ExportToPackage` (+`Async`), `GetExecutionSummaryStatus`, `GetExportedPackageUrl`, `GetExecutionErrors`, `GetImportStagingErrorFileUrl` — orchestrate bulk imports/exports from middleware (scheduling outside F&O; packages only; exported blobs kept 7 days).
- Change tracking on entities enables incremental exports.
- Choose DMF/package API for volume (thousands of records), OData for low-volume near real-time.

## 4. F&O OData, custom services, business events
- **OData**: `https://<environment>/data/<PublicCollectionName>`; query options `$filter`, `$select`, `$expand` (first level only), `$top`, `$skip`, `$count`, `$orderby`; `cross-company=true` to read across legal entities; server-driven paging with a maximum page size of 10,000; `$batch` with change sets supported. Not designed for bulk loads.
- **Throttling**: resource-based service protection limits (since 10.0.19) throttle OData and custom-service requests with HTTP 429 and `Retry-After` when web-server resources are under pressure; user-based limits (6,000 requests / 20 min execution / 52 concurrent per 5-minute window) were disabled from 10.0.36. Set Low/Medium/High priorities per Entra application or user on the "Throttling priority mapping" page; DMF, recurring integrations and virtual tables are exempt.
- **Custom services**: X++ service classes grouped in service groups, exposed as JSON (`/api/services/<group>/<service>/<operation>`) and SOAP endpoints — for business operations not covered by entities.
- **Business events**: catalogue of events (e.g. document posted, workflow events) delivered to endpoint types Azure Service Bus queue/topic, Azure Event Grid, Azure Event Hubs, Azure Blob Storage, HTTPS, Power Automate and Dataverse (plug-in/SDK step); ordering is not guaranteed and a non-sequential control number in the payload supports deduplication; design consumers to be idempotent and to fetch full data via OData if the payload is thin (events are not a data export mechanism).
- **Electronic reporting (ER)**: configurable format engine used for regulatory and banking formats (e.g. ISO 20022 payment files, statements import, French FEC — verify configurations available for your localisation).
- Recurring/batch exports: DMF export projects to files/packages, consumed via package API or recurring dequeue.

## 5. F&O ↔ Dataverse: dual-write, virtual entities, data export
- **Dual-write**: near real-time, bidirectional synchronisation between F&O entities and Dataverse tables (e.g. customers, products, sales orders with CE apps); initial sync, error handling and pause/resume per table map; requires careful company/legal entity mapping — verify maps supported.
- **Virtual entities**: F&O data exposed in Dataverse without copy (read/write through to F&O).
- **Analytics export**: "Export to Azure Data Lake" was retired on 1 November 2024 and stops permanently on 30 November 2026 (no extensions), replaced by Azure Synapse Link for Dataverse / Microsoft Fabric link with F&O tables; BYOD (entity export to your own Azure SQL database, full or incremental via change tracking) remains documented and supported as of 2026 for batch integration and T-SQL access.

## 6. Business Central integration
- **Standard API v2.0**: `https://api.businesscentral.dynamics.com/v2.0/<tenant domain or id>/<environment>/api/v2.0/companies(<id>)/<entity>` (customers, vendors, items, salesOrders, salesInvoices, purchaseInvoices, journals, generalLedgerEntries…); on-premises `https://<host>:<port>/<instance>/api/v2.0/`. API v1.0 was removed in version 28 (2026 release wave 1).
- **Custom APIs**: AL API pages/queries (`APIPublisher`, `APIGroup`, `APIVersion`) published by extensions; preferred over exposing UI pages.
- **OData/SOAP web services**: pages/queries published via the Web Services page. SOAP endpoints have been flagged for removal since version 19; exposing Microsoft UI pages as SOAP endpoints is disabled by default from version 26 and removed in version 29 (2026 release wave 2), and as OData endpoints removed in version 30 (2027 release wave 1) — build custom API pages instead.
- **Webhooks**: subscriptions on API entities with a notification URL; handshake requires echoing the `validationToken`; subscriptions expire after 3 days and must be renewed (PATCH); notifications carry change type and resource URL (fetch data afterwards); retries over 36 hours only on 408/429/5xx responses.
- **Data migration**: configuration packages (RapidStart) and migration tools; journals for opening balances.
- Authentication: OAuth 2.0 (Microsoft Entra ID) is the only option for BC online since web service access keys (basic auth) stopped working on 1 October 2022; access keys remain available on-premises.
- Limits (BC online, per user): OData/API 6,000 requests per 5-minute sliding window, 5 concurrent requests (others queue up to 95, then 429; queued requests time out after 8 minutes with 503), 100 connections, max page size 20,000 entities (413 above), 100 operations per `$batch`, 8-minute operation timeout (408), 200 webhook subscriptions per environment; the same rate limit applies to SOAP, which Microsoft intends to throttle further and deprecate.
- Accounting concepts to map: posting groups (general business/product, customer/vendor posting groups, VAT business/product posting groups), dimensions (global/shortcut), journal templates and batches, number series.

## 7. Dataverse integration
- **Web API** (OData v4): `https://<org>.crm<region>.dynamics.com/api/data/v9.2/<entitysetname>` (`crm` North America, `crm4` EMEA, etc.; v9.2 is the current version); `$batch` with change sets; **upsert** via PATCH on alternate key (`/accounts(accountnumber='A-0001')`) for idempotent loads; URL limit 32 KB (64 KB inside `$batch`).
- **SDK / Organization service** (.NET) with `ExecuteMultiple` for batching.
- **Alternate keys** on tables for external IDs — essential for idempotent upserts and integration keys.
- **Service protection API limits** per user and per web server over a 5-minute sliding window: 6,000 requests, 20 minutes of combined execution time, 52 concurrent requests (defaults, may vary) → 429 with `Retry-After`; use application users, let the server pace you and spread load (plug-in-originated operations are not counted).
- **Plug-ins** (synchronous/asynchronous, pre/post operation) and **Power Automate** flows for event-driven logic; webhooks and Azure Service Bus integration for outbound events; change tracking for delta reads; Synapse Link / Fabric for analytics.
- Application users (server-to-server) mapped to an Entra app registration with security roles — least privilege.

## 8. Authentication and security
- Microsoft Entra ID app registration with client credentials (certificate preferred over client secret); token audience = environment URL.
- F&O: register the application ID under System administration > Setup > "Microsoft Entra applications" and map it to an F&O user with minimal security roles.
- BC: register the Entra app in BC and grant permission sets; Dataverse: application user with security role.
- Separate app registrations per integration and environment; secrets/certificates in a vault with expiry monitoring.
- Segregation of duties: integration users must not hold roles allowing approval of what they create where controls require it.

## 9. Pitfalls and review checklist
Pitfalls:
- Using OData for bulk loads (throttling, timeouts) instead of DMF/package API.
- Entity choice: similar entities with different validation (V2/V3 versions) — pick the current one and document it.
- Set-based processing skipping business logic expected by the business.
- Financial dimension values sent in the wrong format/order (dimension integration format configuration) — verify the configured format per legal entity.
- Number sequences: manual vs automatic; external document numbers needing uniqueness checks.
- Legal entity context missing (`DataAreaId`, `cross-company`) → records created in the default company.
- Dual-write initial sync conflicts and company mapping errors; loops between dual-write and other integrations.
- BC webhook subscriptions silently expiring; Dataverse plug-ins causing timeouts on bulk upserts.
- Service updates changing entity behaviour without regression tests.
Checklist:
- [ ] Product, version, legal entities and environments identified.
- [ ] Mechanism matched to volume (DMF/package API vs OData vs custom service vs events).
- [ ] Entities and fields chosen, mapping includes dimensions, number sequences, posting profiles/groups.
- [ ] Idempotency via external IDs/alternate keys; duplicate prevention on retry.
- [ ] Throttling handling (429, Retry-After), batching and scheduling outside peak.
- [ ] Error handling: staging errors / execution history / plug-in traces monitored with owners.
- [ ] Entra app registrations, roles, secrets/certificates and rotation defined.
- [ ] Regression tests aligned with Microsoft update cadence.

## Sources
- https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/recurring-integrations — F&O recurring integrations enqueue/dequeue/ack endpoints
- https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/data-management-api — F&O data management package REST API actions
- https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata — F&O OData, 10,000 page size, cross-company
- https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/service-protection-api-limits — F&O service protection limits and 429
- https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/business-events/managing-business-event-endpoints — F&O business event endpoint types
- https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/fin-ops/get-started/removed-deprecated-features-platform-updates — Export to Data Lake retirement dates
- https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/analytics/export-entities-to-your-own-database — BYOD current documentation
- https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/endpoints-apis-for-dynamics — Business Central API v2.0 endpoints
- https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/upgrade/deprecated-features-platform — Business Central SOAP, access keys, OData deprecations
- https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/dynamics-subscriptions — Business Central webhooks, 3-day expiry
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/api-limits — Dataverse service protection API limits
- https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/administration/operational-limits-online — Business Central online API operational limits
