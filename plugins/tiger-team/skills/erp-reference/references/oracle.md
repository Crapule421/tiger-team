# Oracle E-Business Suite and Oracle Fusion Cloud - integration reference

## Contents
1. Oracle EBS architecture essentials
2. EBS open interface tables and import programs
3. EBS public APIs, ISG and events
4. EBS operations: concurrent manager, patching, migration of setups
5. Oracle Fusion Cloud essentials
6. Fusion inbound: REST, SOAP, FBDI, HDL, ADFdi
7. Fusion outbound: BI Publisher, BICC, HCM Extracts, events
8. Oracle Integration (OIC)
9. Pitfalls and review points

Table, program and service names below are standard; columns and mandatory fields vary by release (EBS 12.1 vs 12.2; Fusion quarterly updates) — verify against your version and the Oracle documentation (eTRM for EBS tables, Oracle Help Center for Fusion).

## 1. Oracle EBS architecture essentials
- Release 12.x (12.2 current line; 12.2 uses online patching with editioning — `adop`).
- Product schemas (AP, AR, GL, PO, INV, ONT, HZ…) with code and synonyms under the APPS schema; integrations connect as APPS-level users only through approved APIs/interfaces.
- Organisation model: ledgers (R12 replaced "set of books"; primary/secondary ledgers), legal entities, operating units (`ORG_ID`, Multi-Org Access Control in R12), inventory organisations.
- Accounting: sub-ledger transactions are accounted by Subledger Accounting (XLA, "Create Accounting" program) and transferred to GL; GL journals are posted in GL.
- Accounting Flexfield: chart of accounts segments; code combinations (`CODE_COMBINATION_ID`); cross-validation rules.
- Do not insert/update base tables directly: unsupported and bypasses validation, accounting and audit.

## 2. EBS open interface tables and import programs
Pattern: insert rows into interface tables (with a batch/group identifier and status), submit the import concurrent program (UI, request set, or `FND_REQUEST.SUBMIT_REQUEST` after `FND_GLOBAL.APPS_INITIALIZE`), then read error tables/columns, correct and resubmit.

| Domain | Interface table(s) | Import program | Errors |
|---|---|---|---|
| GL journals | `GL_INTERFACE` (STATUS 'NEW', LEDGER_ID, ACCOUNTING_DATE, CURRENCY_CODE, ACTUAL_FLAG, USER_JE_SOURCE_NAME, USER_JE_CATEGORY_NAME, ENTERED_DR/CR, segments or CODE_COMBINATION_ID, GROUP_ID) | Journal Import | Status codes on interface rows, Journal Import execution report |
| AP invoices | `AP_INVOICES_INTERFACE`, `AP_INVOICE_LINES_INTERFACE` | Payables Open Interface Import | `AP_INTERFACE_REJECTIONS` |
| AR invoices / credit memos | `RA_INTERFACE_LINES_ALL`, `RA_INTERFACE_DISTRIBUTIONS_ALL`, `RA_INTERFACE_SALESCREDITS_ALL` | AutoInvoice (Master/Import program) | `RA_INTERFACE_ERRORS_ALL` |
| AR receipts | `AR_PAYMENTS_INTERFACE_ALL` | Lockbox | Lockbox execution report |
| Suppliers | `AP_SUPPLIERS_INT`, `AP_SUPPLIER_SITES_INT`, `AP_SUP_SITE_CONTACT_INT` | Supplier Open Interface Import (and site/contact imports) | Reject columns/tables per object |
| Purchase orders | `PO_HEADERS_INTERFACE`, `PO_LINES_INTERFACE`, `PO_DISTRIBUTIONS_INTERFACE` | Import Standard Purchase Orders | `PO_INTERFACE_ERRORS` |
| Requisitions | `PO_REQUISITIONS_INTERFACE_ALL` | Requisition Import | `PO_INTERFACE_ERRORS` |
| Receipts | `RCV_HEADERS_INTERFACE`, `RCV_TRANSACTIONS_INTERFACE` | Receiving Transaction Processor | `PO_INTERFACE_ERRORS` |
| Inventory transactions | `MTL_TRANSACTIONS_INTERFACE` | Inventory transaction manager (process transaction interface) | Error columns on interface rows |
| Items | `MTL_SYSTEM_ITEMS_INTERFACE` | Import Items | `MTL_INTERFACE_ERRORS` |
| Sales orders | `OE_HEADERS_IFACE_ALL`, `OE_LINES_IFACE_ALL` | Order Import | Order Import messages (Order Import corrections form) |
| Fixed assets | `FA_MASS_ADDITIONS` | Post Mass Additions | Mass additions queue status |

Design rules: use `GROUP_ID`/batch identifiers per run for traceability and selective resubmission; keep a source reference (e.g. invoice number + supplier, `INTERFACE_LINE_ATTRIBUTE*` context in AutoInvoice, journal reference columns) for duplicate detection and drill-back; purge processed interface rows on a schedule; set org context correctly (`ORG_ID`, `MO_GLOBAL`).

## 3. EBS public APIs, ISG and events
- PL/SQL public APIs documented in the Integration Repository (irep), e.g. TCA APIs `HZ_PARTY_V2PUB`, `HZ_CUST_ACCOUNT_V2PUB` (customers/parties), `AP_VENDOR_PUB_PKG` (suppliers in R12), `OE_ORDER_PUB.PROCESS_ORDER` (sales orders). Call with application context (`FND_GLOBAL.APPS_INITIALIZE`, `MO_GLOBAL.SET_POLICY_CONTEXT` for Multi-Org) and check `x_return_status` / message stack (`FND_MSG_PUB`).
- Oracle E-Business Suite Integrated SOA Gateway (ISG) exposes irep interfaces (PL/SQL APIs, concurrent programs, interface tables) as SOAP and REST services — verify release and patch level.
- Business Event System (`WF_EVENT`) and Oracle Workflow for outbound notifications; XML Gateway for OAGIS-style XML B2B messages; EDI Gateway in older estates.
- Outbound extraction: custom views or concurrent reports (BI Publisher templates) generating files; avoid heavy queries on OLTP during business hours.

## 4. EBS operations
- Concurrent manager: requests with phase (Pending, Running, Completed, Inactive) and status (Normal, Error, Warning…); request sets; logs and output files per request; `FND_CONCURRENT_REQUESTS` for monitoring.
- Scheduling of import programs is often done by the concurrent manager; enterprise schedulers can submit via `CONCSUB` or APIs — coordinate with scheduling-expert.
- Setups migrated with `FNDLOAD` (AOL objects: concurrent programs, value sets, menus, responsibilities) and product-specific tools; patches with AD utilities (`adop` in 12.2).
- Support: Oracle commits Premier Support for EBS 12.2 "through at least 2035" (Applications Unlimited, reviewed annually; 12.2 is the long-term support release); earlier releases (12.1 and below) are outside Premier Support — check the Lifetime Support Policy for your release.

## 5. Oracle Fusion Cloud essentials
- SaaS (ERP, SCM, HCM, CX): no database access; integration only through REST, SOAP, file-based imports and extract tools.
- Quarterly updates (release names like 25A … 26D): APIs, FBDI templates and import jobs can change — regression-test interfaces each quarter; monitor deprecation notices.
- Jobs run in Enterprise Scheduler Service (ESS); files exchanged through Universal Content Management (UCM, Oracle WebCenter Content) accounts, one per import object as listed in the FBDI documentation (e.g. `fin/payables/import` for Payables invoices, written `fin$/payables$/import$` in RIDC/command-line form); the account decides which import process picks the file up.
- Security: integration user with least-privilege job/data roles (data access sets, business unit access); authentication via OAuth (OCI IAM identity domains / IDCS) or basic auth where still allowed — verify policy.

## 6. Fusion inbound: REST, SOAP, FBDI, HDL, ADFdi
**REST APIs**: resource-based, versioned paths such as `/fscmRestApi/resources/<version>/...` (ERP/SCM) and `/hcmRestApi/resources/<version>/...` (HCM) — verify resource names and the version string in the REST API guide of your release. Suited to low/medium volume, near real-time document creation and lookups; respect pagination (`limit`, `offset`, `hasMore`) and query (`q=`) syntax.
**SOAP services**: e.g. `ErpIntegrationService` for FBDI orchestration: `uploadFileToUcm` (base64 content, returns the UCM document ID), `submitESSJobRequest` (job package + definition + parameters, returns a request ID), `getESSJobStatus` polling and output download; the one-shot `loadAndImportData` is deprecated in favour of `importBulkData` on the REST resource `erpintegrations` (`POST /fscmRestApi/resources/<version>/erpintegrations`).
**FBDI (File-Based Data Import)**, the standard bulk inbound path for ERP/SCM:
1. Download the object's FBDI template (XLSM) for your release; fill or generate the CSV files in exactly the template's column order.
2. Zip the CSV(s); upload to UCM (UI, `ErpIntegrationService`, or REST).
3. Run "Load Interface File for Import" (ESS) to load the interface tables.
4. Run the object-specific import job (e.g. Import Payables Invoices; Import Journals and Import AutoInvoice for GL/AR — confirm job names in your release's FBDI guide).
5. Review the import execution report; correct errors (ADFdi correction spreadsheets where provided, or purge and reload); purge interface/error tables.
6. Optional callback notification on job completion to the middleware.
**HDL (HCM Data Loader)**: pipe-delimited `.dat` files per business object (e.g. `Worker.dat`) with `METADATA` lines followed by `MERGE`/`DELETE` lines; keys via source keys (`SourceSystemOwner` + `SourceSystemId`), user keys, or GUIDs/surrogate IDs; zipped and uploaded, then imported and loaded; HSDL for spreadsheet-based loads. Define the source-key strategy at the start: it drives all later updates.
**ADFdi spreadsheets**: desktop-integrated Excel workbooks for manual bulk entry/correction (e.g. journals) — business-user tool, not a system interface.

## 7. Fusion outbound: BI Publisher, BICC, HCM Extracts, events
- **BI Publisher** reports scheduled via ESS to produce files (CSV/XML/fixed) delivered to UCM/SFTP — common for outbound interfaces; tune for volume and incremental extraction (last run date parameter).
- **BICC (BI Cloud Connector)**: bulk extraction of public view objects (PVOs) with incremental extracts, to UCM or OCI Object Storage — preferred feed for data warehouses.
- **OTBI** is for reporting, not bulk extraction.
- **HCM Extracts**: HCM-specific extraction definitions with changes-only options.
- **Business events**: subscribable events (e.g. via the OIC ERP Cloud adapter) for near real-time outbound notifications — verify available events per object.

## 8. Oracle Integration (OIC)
- Integrations (app-driven orchestration, scheduled orchestration, basic routing in older generations), connections based on adapters (ERP Cloud, HCM Cloud, REST, SOAP, FTP/SFTP, database, ATP, file), lookups (value mapping), mapper (XSLT-based), tracking fields (business identifiers used to search instances), fault handlers, resubmission of failed instances, connectivity agent for on-premise endpoints, B2B for EDI, process automation. Oracle Integration 3 is the current generation; Generation 2 instances differ (e.g. agent JDK, dropped features) — check which one you run.
- The ERP Cloud adapter wraps FBDI uploads, ESS job submission, callbacks and business event subscriptions.
- Design rules: tracking fields = business keys; idempotent target operations; parameterised connections per environment; integrations exported/imported as packages through CI/CD where possible.

## 9. Pitfalls and review points
- Direct table writes in EBS (unsupported) or "back-door" SQL to fix interface data without trace.
- Org context missing in EBS API calls (Multi-Org): records invisible or created in the wrong operating unit.
- FBDI CSV generated from a template of another release (column shift → wrong data silently loaded or job failure).
- Interface tables never purged → performance degradation and confusing resubmissions.
- Duplicate invoices when a failed FBDI load is re-run after partial success; use unique invoice number per supplier and check before reload.
- Journal import with unbalanced or invalid code combinations because cross-validation rules differ between environments.
- Quarterly update changing behaviour without regression tests; deprecated REST versions.
- Integration user with broad roles (e.g. full functional administrator) instead of least privilege.
- Period status: GL periods (and sub-ledger periods in EBS: AP, AR, PO, INV) must be open for the accounting date; month-end closing order affects inbound flows.

## Sources
- https://oracle.com/a/ocom/docs/applications/ebusiness/ebs-122-premier-support-extended-through-at-least-2035.pdf — EBS 12.2 Premier Support through at least 2035
- https://blogs.oracle.com/proactivesupportepm/applications-unlimited-and-oracle-premier-support-extension-to-2035 — Applications Unlimited support commitment
- https://docs.oracle.com/en/cloud/saas/financials/25c/oeswf/erpintegrationservice-d16510e420.html — ErpIntegrationService SOAP operations, loadAndImportData deprecated
- https://docs.oracle.com/en/cloud/saas/financials/24c/farfa/op-erpintegrations-post.html — erpintegrations REST resource
- https://docs.oracle.com/en/cloud/saas/financials/25d/oefbf/payablesstandardinvoiceimport-3179.html — FBDI Payables invoice import, UCM account
- https://docs.oracle.com/en/cloud/saas/financials/25d/fappp/how-payables-standard-invoice-import-data-is-processed.html — FBDI load and import job steps
- https://docs.oracle.com/en/cloud/paas/application-integration/index.html — Oracle Integration 3 documentation home
- https://docs.oracle.com/en/cloud/paas/application-integration/whats-new/differences-prior-versions-oracle-integration.html — Oracle Integration 3 vs Generation 2 differences
