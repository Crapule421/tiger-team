---
name: erp-reference
description: ERP integration knowledge base - integration mechanisms per ERP (SAP ECC/S/4HANA, Oracle EBS/Fusion, Sage X3, Cegid, Dynamics 365 F&O/Business Central/Dataverse), inbound/outbound design rules, posting logic, master data dependencies, error handling and reprocessing, reconciliation, cut-over, and an ERP interface review checklist; references cover each product plus business processes (O2C, P2P, R2R, closing) and data migration method. Load when designing, reviewing or troubleshooting an interface or migration touching an ERP.
user-invocable: false
---

# ERP Reference (ERP Expert)

Always state the ERP product, version and deployment (on-premise, private cloud, SaaS) the advice applies to; customisations change behaviour. Anything marked "verify against your version" must be checked in the product documentation or system before being written into a deliverable.

## References index
- `references/sap.md` — read when SAP ECC or S/4HANA is involved: IDoc (message/basic types, partner profiles, ports, statuses, monitoring), BAPI/RFC, OData/Gateway, SOAP, PI/PO and Cloud Integration, modules FI/CO/SD/MM/PS, key tables, transports, common transactions. Full path `${CLAUDE_PLUGIN_ROOT}/skills/erp-reference/references/sap.md`
- `references/oracle.md` — read when Oracle E-Business Suite (open interface tables, concurrent programs, PL/SQL APIs, ISG) or Oracle Fusion Cloud (REST/SOAP, FBDI, HDL, BICC, ESS jobs, OIC) is involved. Full path `${CLAUDE_PLUGIN_ROOT}/skills/erp-reference/references/oracle.md`
- `references/sage-x3-cegid.md` — read when Sage X3 (import/export templates, web services, batch server) or a Cegid ERP is involved, or for generic guidance on mid-market ERPs. Full path `${CLAUDE_PLUGIN_ROOT}/skills/erp-reference/references/sage-x3-cegid.md`
- `references/dynamics365.md` — read when Dynamics 365 Finance & Operations (data entities, DMF, OData, custom services, business events, dual-write), Business Central (APIs, webhooks) or Dataverse is involved. Full path `${CLAUDE_PLUGIN_ROOT}/skills/erp-reference/references/dynamics365.md`
- `references/processes.md` — read when analysing business impact: O2C, P2P, R2R, master data governance, period close, reconciliation, data migration method and cut-over, French specifics (FEC, e-invoicing). Full path `${CLAUDE_PLUGIN_ROOT}/skills/erp-reference/references/processes.md`

Related: integration patterns and formats `${CLAUDE_PLUGIN_ROOT}/skills/integration-reference/SKILL.md`.

## 1. Golden rules of ERP integration
1. **Never write directly into ERP database tables.** Use the vendor's supported inbound mechanisms (IDoc/BAPI, open interface + import program, data entities, APIs, import templates). Direct writes bypass validation, posting logic, number ranges, change documents and audit — and void vendor support.
2. **The ERP is the system of record for what it posts** (accounting documents, stock, invoices). Other systems hold references, not competing truths.
3. **Master data before transactions**: every transaction interface depends on master data being present and valid in the target (customer, vendor, material/item, GL account, cost centre, tax code, payment terms). Define the dependency and what happens when it is missing.
4. **Posting logic is the contract**: for every inbound financial or logistic flow, document the resulting documents and accounting entries (debit/credit, accounts, tax, currency, period).
5. **Periods and calendars rule**: posting date determines period; closed periods reject postings; interfaces must be part of the closing calendar (cut-off, last run, freeze).
6. **Prefer asynchronous, monitored, reprocessable mechanisms** with a business-readable error queue (IDoc status monitor, interface tables with error columns, DMF execution history, AIF, OIC tracking).
7. **Reconcile by design**: counts and amounts between source, middleware and ERP; sub-ledger vs general ledger; interface suspense accounts monitored to zero.
8. **Standard before custom**: every custom object (Z-program, custom entity, extension) is a run and upgrade cost; record it.

## 2. Mechanism cheat sheet
| ERP | Inbound (into ERP) | Outbound (from ERP) | Monitoring / reprocessing |
|---|---|---|---|
| SAP ECC / S/4HANA | IDoc (ALE/EDI), BAPI/RFC, OData (Gateway/RAP), SOAP services, file + standard programs, Migration Cockpit for migration | IDoc (output/change pointers), OData, SOAP, RFC, business events (S/4HANA Enterprise Event Enablement to SAP Event Mesh / advanced event mesh), extracts (CDS views) | BD87/WE02/WE05, SM58, SMQ1/SMQ2, SLG1, /IWFND/ERROR_LOG, AIF (if used) |
| Oracle EBS | Open interface tables + concurrent import programs, PL/SQL public APIs, Integrated SOA Gateway, XML Gateway | Concurrent programs/reports, Business Event System, views, XML Gateway | Interface error tables/columns, concurrent request logs, resubmission |
| Oracle Fusion Cloud | REST APIs, SOAP services, FBDI (file-based data import), HDL (HCM), ADFdi spreadsheets | BI Publisher scheduled reports, BICC extracts, HCM Extracts, business events, REST | ESS job status/logs, import error reports, OIC tracking |
| Sage X3 | Import templates (batch/manual), SOAP web services, REST/GraphQL APIs (version-dependent) | Export templates, web services, views | Import logs, batch server tasks |
| Cegid | Product-specific import formats and APIs | Exports/APIs | Product-specific — verify |
| D365 Finance & Operations | Data entities via DMF (packages, recurring integrations), OData, custom services, dual-write | DMF exports, business events, OData, Synapse/Fabric link | DMF execution history, staging errors, batch jobs |
| D365 Business Central | API v2.0 and custom API pages, OData/SOAP web services, configuration packages | APIs, webhooks | Job queue entries, API errors |
| Dataverse | Web API (OData v4), SDK, upsert with alternate keys | Webhooks, plug-ins, Power Automate, Synapse Link | System jobs, plug-in trace logs |

## 3. Choosing the inbound mechanism
| Need | Prefer | Avoid |
|---|---|---|
| Real-time single document with immediate answer (e.g. create sales order from web shop) | Synchronous API (OData, BAPI via middleware, REST) with idempotency key | Batch files if the user waits |
| High-volume asynchronous documents (invoices, journal lines) | Asynchronous standard mechanism (IDoc, open interface + import, DMF package, FBDI) | Thousands of synchronous calls hitting throttling and locks |
| Accounting journal from sub-system (payroll, treasury, billing engine) | Standard journal interface (IDoc ACC_DOCUMENT / BAPI_ACC_DOCUMENT_POST, GL_INTERFACE, FBDI journals, general journal entity) summarised per period/account/dimension | Line-level replication of every source transaction unless audit requires it |
| Master data replication | Standard master data messages/entities (e.g. SAP DEBMAS/CREMAS/MATMAS or BP services; supplier/customer APIs) with MDM governance | Bidirectional free-for-all updates |
| Migration (one-off, large) | Vendor migration tools (SAP Migration Cockpit, FBDI/HDL, DMF, import templates) | Reusing run interfaces without performance tests |

## 4. Posting logic checklist (inbound financial/logistic flows)
- [ ] Target document type(s) and number range (internal vs external numbering).
- [ ] Accounting entries: accounts or account determination rules, debit/credit, tax codes and tax determination, currency and exchange rate source/type/date, rounding.
- [ ] Organisational assignment: company code/legal entity/ledger/operating unit, plant/site, profit/cost centre, financial dimensions.
- [ ] Posting date vs document date vs value date; period determination; behaviour when the period is closed.
- [ ] Summarisation level (per document, per day, per account/dimension) and drill-back reference to the source.
- [ ] Reversal and correction method (reverse + repost; no direct update of posted documents).
- [ ] Clearing/matching keys (invoice reference, EndToEndId, PO number) for downstream reconciliation.
- [ ] Interface suspense/clearing accounts and who monitors them.
- [ ] Segregation of duties: technical user cannot approve/post what it creates if controls require approval.

## 5. Error handling in ERP interfaces
| Error type | Example | Expected handling |
|---|---|---|
| Technical (transport, format) | Unreadable file, IDoc syntax error, schema violation | Middleware/ERP technical error queue, IT support, no partial posting |
| Master data missing | Unknown vendor, material not extended to plant | Business error queue; reprocess after master data creation; ageing alert |
| Business rule | Closed period, blocked customer, credit limit, tolerance exceeded, duplicate invoice check | Business owner corrects source or ERP data, then reprocess from the ERP monitor |
| Locking / concurrency | Document or master data locked by a user or another job | Automatic retry with delay (bounded); schedule around heavy batch jobs |
| Partial success | Some lines posted, others rejected | Defined policy: all-or-nothing per document; never split a balanced accounting document |

Requirements: errors visible to business users in their language; reprocessing in the ERP tool (not by resending from source, unless designed); no deletion of failed records without trace; daily error backlog review; ageing KPI.

## 6. Reconciliation (minimum controls)
| Control | Compares | Frequency |
|---|---|---|
| Technical completeness | Records/files sent by source = received by middleware = created in ERP (incl. rejected) | Each run |
| Financial completeness | Sum of amounts per company/currency/period: source vs ERP postings | Daily and at close |
| Sub-ledger vs GL | AR/AP/asset/inventory sub-ledgers vs GL reconciliation accounts | Monthly (daily for critical) |
| Suspense accounts | Interface clearing accounts balance = 0 (or explained) | Daily/at close |
| Bank | Bank statement (camt.053/CFONB 120/MT940) vs book entries | Daily |
| Master data | Key counts and attribute checksums between MDM/source and ERP | Weekly/after loads |
Each control: owner, tolerance, evidence retained, escalation.

## 7. Cut-over essentials for interfaces
- Inventory every interface touching the ERP: direction, owner, mechanism, schedule, dependency, switch method.
- Freeze rules: last run in old system, drain queues/in-flight messages, stop schedulers, record last processed IDs/sequence numbers.
- Initial loads (migration) before delta interfaces; delta catch-up for transactions created during the freeze.
- Re-point endpoints/partners (DNS, MFT partners, IDF, logical systems, certificates) and disable old flows to avoid double postings.
- Smoke tests per interface in production with controlled data; reconciliation sign-off before releasing to users.
- Rollback criteria and point of no return; duplicate-prevention plan if rollback after partial switch.
See `references/processes.md` §7-8 for the full migration and cut-over method.

## 8. ERP interface review checklist
**Business**
- [ ] Process step and business owner identified; impact on downstream steps (billing, payment, closing, reporting).
- [ ] Master data dependencies listed with source of truth and synchronisation timing.
- [ ] Posting logic documented and validated by finance (accounts, tax, dimensions, periods).
- [ ] Controls: approvals, tolerances, duplicate checks, SoD for technical users.
**Technical**
- [ ] Standard mechanism used; customisations listed with justification.
- [ ] Mapping includes ERP internal formats (leading zeros, units of measure, language keys, decimals per currency, date formats).
- [ ] Idempotency: external reference stored in ERP document; duplicate detection on resend.
- [ ] Volumes and timing vs ERP batch window, locks and API throttling.
- [ ] Error handling with business-readable error queue and reprocessing tool; ageing alert.
- [ ] Technical user: dedicated, non-dialog type where available, least-privilege role, credential rotation.
- [ ] Monitoring and reconciliation controls with owners.
**Lifecycle**
- [ ] Behaviour at period close and year-end; interface in closing calendar.
- [ ] Upgrade/patch impact (SaaS quarterly updates, S/4 releases, One Version for D365) and regression tests.
- [ ] Cut-over and initial load plan; decommissioning of old flow.
- [ ] Transport/deployment of interface configuration across environments (what is transported, what is maintained per system).

## 9. Pitfalls
- Direct inserts into ERP tables "for performance".
- Inbound flow posting into closed periods at month-end; nobody owns the error queue during closing.
- Master data created in the ERP by the interface with incomplete views (e.g. material without plant data), blocking later documents.
- Leading zeros and conversion exits (SAP ALPHA) ignored → "not found" errors.
- Amount sign conventions (credit notes negative vs positive with document type) misunderstood.
- Tax recalculated by the ERP differs from tax in the source invoice by rounding.
- Exchange rate type/date differences between source and ERP.
- Same technical user for all interfaces with broad (admin-like) authorisations.
- Interface configuration (partner profiles, RFC destinations, endpoints) not part of the environment refresh/cut-over runbook.
- SaaS quarterly update changes an API or import template without regression tests.
