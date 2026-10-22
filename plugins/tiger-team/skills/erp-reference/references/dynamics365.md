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
- Environment tiers: development/build, sandbox (UAT), production; lifecycle tooling historically in Lifecycle Services (LCS) with progressive move to Power Platform admin center — verify for your tenant.
- One Version: Microsoft service updates several times per year; regression testing of interfaces is mandatory (use the update cadence in the project plan).
- Batch framework: batch jobs and batch groups; DMF imports/exports run as batch jobs.

## 3. F&O data entities and Data Management Framework (DMF)
- **Data entities**: abstraction over one or more tables; public entities have `PublicEntityName`/`PublicCollectionName` and are exposed via OData; composite entities group header/lines (e.g. for documents); many entities support set-based processing (faster, but skips some row-level logic — verify per entity).
- **DMF** (Data management workspace):
  - Data projects for import/export with entity, source format (CSV, Excel, XML, package), mapping (source ↔ staging), and execution history.
  - Two-step processing: source → **staging** tables (validation, transformation) → **target**; errors visible per staging record; fix and re-run from staging.
  - **Data packages** (zip with manifest, package header and data files) to move configuration and data; entity sequencing (execution units, levels, sequence) to respect dependencies.
  - **Templates** of entities and sequence for configuration/migration.
- **Recurring integrations**: scheduled data projects with REST endpoints to enqueue files (import) and dequeue/acknowledge files (export) for a given activity ID (paths under `/api/connector/...` — verify).
- **Data management package REST API**: actions on the `DataManagementDefinitionGroups` entity such as `GetAzureWriteUrl`, `ImportFromPackage`, `ExportToPackage`, `GetExecutionSummaryStatus`, `GetExportedPackageUrl` — orchestrate bulk imports/exports from middleware — verify action names and parameters.
- Change tracking on entities enables incremental exports.
- Choose DMF/package API for volume (thousands of records), OData for low-volume near real-time.

## 4. F&O OData, custom services, business events
- **OData**: `https://<environment>/data/<PublicCollectionName>`; query options `$filter`, `$select`, `$expand`, `$top`; `cross-company=true` to read across legal entities; server-driven paging (page size limit — verify, commonly 10,000 records); `$batch` supported. Not designed for bulk loads.
- **Throttling**: priority-based throttling / service protection returning HTTP 429 with `Retry-After` — clients must back off; verify limits and priority configuration.
- **Custom services**: X++ service classes grouped in service groups, exposed as JSON (`/api/services/<group>/<service>/<operation>`) and SOAP endpoints — for business operations not covered by entities.
- **Business events**: catalogue of events (e.g. document posted, workflow events) delivered to endpoints such as Azure Service Bus, Event Grid, Event Hubs, HTTPS, Power Automate — verify supported endpoint types; design consumers to be idempotent and to fetch full data via OData if the payload is thin.
- **Electronic reporting (ER)**: configurable format engine used for regulatory and banking formats (e.g. ISO 20022 payment files, statements import, French FEC — verify configurations available for your localisation).
- Recurring/batch exports: DMF export projects to files/packages, consumed via package API or recurring dequeue.

## 5. F&O ↔ Dataverse: dual-write, virtual entities, data export
- **Dual-write**: near real-time, bidirectional synchronisation between F&O entities and Dataverse tables (e.g. customers, products, sales orders with CE apps); initial sync, error handling and pause/resume per table map; requires careful company/legal entity mapping — verify maps supported.
- **Virtual entities**: F&O data exposed in Dataverse without copy (read/write through to F&O).
- **Analytics export**: "Export to Data Lake" is deprecated in favour of Azure Synapse Link for Dataverse / Microsoft Fabric link with F&O tables — verify current status; BYOD (entity export to Azure SQL) — verify support status before new designs.

## 6. Business Central integration
- **Standard API v2.0**: `https://api.businesscentral.dynamics.com/v2.0/<tenant>/<environment>/api/v2.0/companies(<id>)/<entity>` (customers, vendors, items, salesOrders, purchaseInvoices, journals…) — verify entity names in the API reference.
- **Custom APIs**: AL API pages/queries (`APIPublisher`, `APIGroup`, `APIVersion`) published by extensions; preferred over exposing UI pages.
- **OData web services**: pages/queries published via the Web Services page; SOAP endpoints for codeunits are legacy — verify deprecation timeline.
- **Webhooks**: subscriptions on API entities with a notification URL; handshake requires echoing the `validationToken`; subscriptions expire (3 days) and must be renewed; notifications carry change type and resource URL — fetch data afterwards.
- **Data migration**: configuration packages (RapidStart) and migration tools; journals for opening balances.
- Authentication: OAuth (Microsoft Entra ID) for SaaS; web service access keys (basic auth) are no longer supported for BC online — verify for on-premise.
- Limits: API rate and concurrency limits per environment (429 responses) — verify current figures.
- Accounting concepts to map: posting groups (general business/product, customer/vendor posting groups, VAT business/product posting groups), dimensions (global/shortcut), journal templates and batches, number series.

## 7. Dataverse integration
- **Web API** (OData v4): `https://<org>.crm<region>.dynamics.com/api/data/v9.2/<entitysetname>` — verify host pattern; `$batch` with change sets; **upsert** via PATCH on alternate key (`/accounts(accountnumber='A-0001')`) for idempotent loads.
- **SDK / Organization service** (.NET) with `ExecuteMultiple` for batching.
- **Alternate keys** on tables for external IDs — essential for idempotent upserts and integration keys.
- **Service protection API limits** (per user, per time window: number of requests, execution time, concurrent requests) → 429 with `Retry-After`; use application users and spread load — verify limits.
- **Plug-ins** (synchronous/asynchronous, pre/post operation) and **Power Automate** flows for event-driven logic; webhooks and Azure Service Bus integration for outbound events; change tracking for delta reads; Synapse Link / Fabric for analytics.
- Application users (server-to-server) mapped to an Entra app registration with security roles — least privilege.

## 8. Authentication and security
- Microsoft Entra ID app registration with client credentials (certificate preferred over client secret); token audience = environment URL.
- F&O: register the application ID in the "Microsoft Entra applications" setup page and map it to an F&O user with minimal security roles — verify page name in your version.
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
