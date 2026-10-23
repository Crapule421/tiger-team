# SAP ECC and S/4HANA - integration reference

## Contents
1. ECC vs S/4HANA
2. Organisational structure and key tables
3. IDoc / ALE
4. BAPI and RFC
5. OData, SAP Gateway, SOAP services
6. SAP PI/PO and SAP Integration Suite (Cloud Integration)
7. Modules FI, CO, SD, MM, PS - integration view
8. Transports and environment management
9. Common transactions cheat sheet
10. Interface pitfalls and review points

Transaction codes and object names below are standard ones; availability can differ by release and by S/4HANA edition (on-premise / private cloud vs public cloud, where SAP GUI transactions are largely not available) — verify against your version.

## 1. ECC vs S/4HANA
| Topic | ECC 6.0 | S/4HANA |
|---|---|---|
| Database | Any supported DB | SAP HANA only |
| Accounting data model | FI (BKPF/BSEG) and CO tables separate; new GL optional | Universal Journal `ACDOCA` unifies FI, CO, asset and material ledger line items; BKPF/BSEG still exist for documents |
| Customer/vendor master | Separate customer (KNA1…) and vendor (LFA1…) masters | Business Partner (BP) mandatory; customer/vendor integration (CVI) keeps KNA1/LFA1 synchronised; XD01/XK01-type transactions redirect to BP |
| Inventory documents | MKPF/MSEG | `MATDOC` (MKPF/MSEG as compatibility views) |
| Material number | MATNR 18 chars | MATNR up to 40 chars since S/4HANA 1511; not active by default, the field length extension must be activated (BAPIs/IDocs keep working with 18 chars until then) |
| Credit management | SD credit management | SAP Credit Management (FIN-FSCM) |
| UX | SAP GUI | SAP Fiori (+ SAP GUI on-premise/private cloud) |
| Extensibility | User exits, BAdIs, modifications | "Clean core": key-user, on-stack developer extensibility (ABAP Cloud), side-by-side on SAP BTP |
| Migration tooling | LSMW, custom loads | Migration Cockpit ("Migrate Your Data" Fiori app; LTMC in earlier releases), LTMOM for object modelling; LSMW not recommended in S/4HANA |

Maintenance: SAP Business Suite 7 (incl. ECC 6.0 EhP) mainstream maintenance ends 31 December 2027; optional extended maintenance (paid add-on, +2 percentage points) runs 2028 to end of 2030; S/4HANA maintenance is committed until end of 2040 (SAP announcement, February 2020). Deployment options: on-premise, RISE with SAP (private cloud), S/4HANA Cloud public edition (released APIs only, no classic modifications).

## 2. Organisational structure and key tables
Organisational units: client (MANDT), company code (BUKRS), controlling area, plant (WERKS), storage location, sales organisation + distribution channel + division (= sales area), purchasing organisation, profit centre, cost centre, business area, segment.

| Table | Content |
|---|---|
| T001 | Company codes |
| BKPF / BSEG | Accounting document header / line items |
| ACDOCA | Universal Journal line items (S/4HANA) |
| SKA1 / SKB1 | G/L account: chart of accounts level / company code level |
| BUT000 | Business partner general data (S/4; also ECC with BP) |
| KNA1 / KNB1 / KNVV | Customer general / company code / sales area data |
| LFA1 / LFB1 / LFM1 | Vendor general / company code / purchasing organisation data |
| MARA / MARC / MARD / MBEW | Material general / plant / storage location stock / valuation |
| VBAK / VBAP | Sales order header / item |
| LIKP / LIPS | Delivery header / item |
| VBRK / VBRP | Billing document header / item |
| EKKO / EKPO | Purchasing document header / item |
| MATDOC | Material documents (S/4HANA) |
| EDIDC / EDID4 / EDIDS | IDoc control / data / status records |

Read access for extraction should go through released CDS views/APIs (mandatory in S/4HANA Cloud), not raw table reads by external tools — licensing and support implications; verify.

## 3. IDoc / ALE
**Structure**: control record (EDIDC: IDoc number, direction, message type, basic type, extension, sender/receiver port and partner), data records (segments, EDID4), status records (EDIDS).
**Key concepts**
- **Message type** = business meaning (e.g. ORDERS, INVOIC, MATMAS); **basic type** = structure version (e.g. ORDERS05); **extension** = customer segments added to a basic type.
- **Logical system** (BD54) identifies systems; ALE customizing via SALE; **distribution model** (BD64) defines which message types flow between logical systems (ALE).
- **Partner profile** (WE20): per partner number and type (LS logical system, KU customer, LI vendor…); outbound parameters (message type, receiver port, basic type, output mode immediate/collect, packet size) and inbound parameters (message type, **process code**, immediate vs background processing).
- **Port** (WE21): transactional RFC (tRFC), file, XML file, XML HTTP, etc.
- **Process codes**: inbound (WE42) map to function modules (e.g. process code ORDE → `IDOC_INPUT_ORDERS`); outbound (WE41).
- **Change pointers** for master data distribution: activate generally (BD61) and per message type (BD50); generate IDocs with BD21. Direct sends: BD10 (material), BD12 (customer), BD14 (vendor).
- Development: WE30 (IDoc types), WE31 (segments), WE81 (message types), WE82 (message type ↔ basic type), WE57 (function module assignment), WE60 (documentation), WE19 (test tool).

**Common message types / basic types** (examples — verify versions used in your system)
| Message type | Use | Example basic type |
|---|---|---|
| ORDERS / ORDRSP | Purchase order / order response | ORDERS05 |
| DESADV | Despatch advice / inbound delivery | DELVRY03, DELVRY07 |
| INVOIC | Invoice (outbound billing, inbound vendor invoice) | INVOIC02 |
| MATMAS | Material master | MATMAS05 |
| DEBMAS / CREMAS | Customer / vendor master | DEBMAS06/07, CREMAS05/06 |
| ACC_DOCUMENT | Accounting document posting (the ACC_DOCUMENT interface replaces INVOIC-based FI postings) | ACC_DOCUMENT03 / ACC_DOCUMENT04 — release-dependent, check WE30 |
| WMMBXY | Goods movements | WMMBID02 |
| PAYEXT / REMADV | Payment order / remittance advice | PEXR2002 |
| FINSTA | Bank statement | FINSTA01 |
| SYSTAT | Status confirmation back to sender (ALE audit uses ALEAUD) | SYSTAT01 |

**Status codes** (most used)
| Outbound | Meaning | Inbound | Meaning |
|---|---|---|---|
| 01 | IDoc created | 50 | IDoc added |
| 30 | Ready for dispatch (ALE service) | 64 | Ready to be transferred to application |
| 02 | Error passing data to port | 62 | IDoc passed to application |
| 03 | Data passed to port OK | 51 | Application document not posted (error) |
| 12 | Dispatch OK | 53 | Application document posted |
| 26 / 29 | Syntax error / error in ALE service | 56 / 60 | IDoc with errors added / syntax error |
| 31 | Error - no further processing | 68 | Error - no further processing |
| 32 / 33 | IDoc edited / original of edited IDoc | 69 / 70 | IDoc edited / original of edited IDoc |

**Monitoring and reprocessing**: WE02 / WE05 (IDoc lists), WE09 (search by segment content), BD87 (status monitor with reprocessing), WE19 (test/copy), SM58 (tRFC errors), WE14 / report `RSEOUT00` (send collected outbound IDocs), report `RBDAPP01` (process inbound IDocs in status 64), report `RBDMANI2` (reprocess IDocs in error status 51), WE47 (status maintenance). Schedule RBDAPP01/RSEOUT00 as background jobs when partner profiles use background/collect mode.

**Design rules**: one IDoc = one business document (keep packet size reasonable); serialization where order matters (serialization groups, qRFC queues — verify mechanism); store the external reference (e.g. partner order number) in the target document for duplicate detection; archive and purge IDocs regularly (large EDIDS/EDID4 tables); never edit IDoc data in production without an audit trail (edited IDocs keep the original as status 70/33); consider SAP Application Interface Framework (AIF, `/AIF/ERR` monitor) for business-user error handling.

## 4. BAPI and RFC
- BAPIs are RFC-enabled function modules exposed as methods of Business Object Repository objects (browse with transaction `BAPI`; function modules in SE37).
- BAPIs do not commit: the caller must call `BAPI_TRANSACTION_COMMIT` (optionally WAIT) or `BAPI_TRANSACTION_ROLLBACK`; check the `RETURN` table (structure BAPIRET2; TYPE E/A = error/abort, W warning, S success, I info) before committing.
- Frequently used (verify parameters in your release): `BAPI_SALESORDER_CREATEFROMDAT2`, `BAPI_PO_CREATE1`, `BAPI_GOODSMVT_CREATE`, `BAPI_ACC_DOCUMENT_CHECK` / `BAPI_ACC_DOCUMENT_POST`, `BAPI_MATERIAL_SAVEDATA`, `BAPI_INCOMINGINVOICE_CREATE`.
- RFC types: synchronous (sRFC), asynchronous (aRFC), transactional (tRFC — executed once, unordered), queued (qRFC — once and in order; monitors SMQ1 outbound, SMQ2 inbound), background RFC (bgRFC, successor of tRFC/qRFC; monitor SBGRFCMON).
- RFC destinations: SM59. Connectors: SAP Java Connector (JCo), SAP .NET Connector (NCo), NW RFC SDK; most middleware has an RFC/BAPI adapter.
- Technical users: user type System (B) for RFC/background (no dialog login) or Communication (C); dialog (A) users must not be used for interfaces; roles via PFCG with least privilege (authorisation object S_RFC for function groups); SU53 to analyse authorisation failures.
- Pitfalls: missing commit (nothing posted, no error); committing despite TYPE E messages; locks when calling BAPIs in parallel for the same object; field conversion (ALPHA, units) expected in internal format in BAPI parameters.

## 5. OData, SAP Gateway, SOAP services
- **SAP Gateway** (OData V2): services built in SEGW or generated from CDS views; activate/maintain with `/IWFND/MAINT_SERVICE`; error logs `/IWFND/ERROR_LOG` (hub) and `/IWBEP/ERROR_LOG` (backend); test with `/IWFND/GW_CLIENT`.
- **ABAP RESTful Application Programming Model (RAP)**: OData V2/V4 services via service definition + service binding; released APIs are the S/4HANA Cloud integration surface.
- **Released APIs** are catalogued on the SAP Business Accelerator Hub (formerly SAP API Business Hub), e.g. `API_BUSINESS_PARTNER`, `API_SALES_ORDER_SRV` — check the communication scenario (S/4HANA Cloud: communication arrangement, communication system, communication user).
- OData specifics: CSRF protection (GET with `x-csrf-token: Fetch`, then send the token and session cookies on modifying requests), `$batch` with change sets (atomic units), `$filter`/`$top`/`$skip`/`$expand`, ETag-based optimistic locking on many services, server-side paging.
- **SOAP services**: enterprise services and service consumers configured in `SOAMANAGER` (which also has its own Logs and Traces viewer); `SRT_UTIL` (Web Service Utilities) holds the runtime error log and performance/functional/payload traces (payload trace needs authorisation object `S_SRT_PTRC`).
- **Events**: S/4HANA publishes business events (e.g. business partner changed) through Enterprise Event Enablement: a channel (SM59 destination + OAuth 2.0 credentials from the Event Mesh service key) with outbound topic bindings sends events to SAP Event Mesh; S/4HANA Cloud Private Edition connects via SAP Integration Suite, advanced event mesh or the Integration Suite event mesh capability (the Event Mesh "lite" plan is being retired).

## 6. SAP PI/PO and SAP Integration Suite (Cloud Integration)
**PI/PO (on-premise)**
- Design time in the Enterprise Services Repository (ESR): data types, message types, service interfaces, message mappings, operation mappings, imported objects (IDoc/RFC structures).
- Configuration in the Integration Directory: business systems/components, communication channels (adapters: IDoc_AAE, RFC, SOAP, File/FTP, JDBC, JMS, REST, HTTP), integrated configurations (ICO).
- Monitoring: message monitoring in PIMON (Advanced Adapter Engine), `SXMB_MONI` for the ABAP stack in dual-stack PI; communication channel monitor; resend/cancel of messages.
- PO 7.5 is the last release: SAP NetWeaver 7.5 (incl. PI/PO 7.5) mainstream maintenance ends 31 December 2027, optional extended maintenance to end of 2030, aligned with Business Suite 7 (SAP Note 1648480); SAP's direction is migration to SAP Integration Suite.
**SAP Integration Suite (BTP)**
- Cloud Integration (CPI): integration flows (iFlows) with adapters (SOAP, IDoc, RFC via Cloud Connector, OData, SFTP, AS2, JMS, AMQP, Kafka sender/receiver), mapping (graphical, XSLT, Groovy/JavaScript scripts), message processing logs, JMS queues for asynchronous retry, security material (keystore, credentials, PGP keys), prepackaged integration content.
- Other capabilities: API Management, Event Mesh, Integration Advisor (B2B mapping), Trading Partner Management, Edge Integration Cell (customer-managed runtime) — verify licence scope.
- SAP Cloud Connector: reverse-invoke tunnel from BTP to on-premise systems (no inbound firewall opening).

## 7. Modules FI, CO, SD, MM, PS - integration view
| Module | Key objects | Typical interfaces | Watch points |
|---|---|---|---|
| FI (GL, AP, AR, AA, bank) | Accounting documents, GL accounts, customer/vendor items, assets, house banks | Journal entries from sub-systems, vendor invoices, payment files (Payment Medium Workbench / DMEE(X) formats, e.g. ISO 20022), bank statements (FF_5, FEBAN; MT940/camt.053), lettrage/clearing | Posting periods (OB52), document types, tax codes, reconciliation accounts, payment run F110, BCM/MBC for bank connectivity (verify) |
| CO (CCA, internal orders, PCA, product costing, CO-PA) | Cost centres, internal orders, activity types, profit centres | Cost allocations, statistical postings, actuals from external systems | Controlling area, account assignment mandatory per cost element/GL account, period close of CO |
| SD | Sales orders, deliveries, billing documents, pricing conditions | Web shop/CRM orders, EDI ORDERS/INVOIC, pricing master, shipping (TMS), e-invoicing | Incompletion log, credit block, output determination, pricing procedure, billing → FI posting |
| MM | Purchase requisitions/orders, goods movements, logistics invoice verification, material master | Supplier EDI (ORDERS/ORDRSP/DESADV/INVOIC), WMS goods movements, procurement platforms | Movement types, GR/IR account, tolerance keys, MM period (MMPV), valuation |
| PS | Projects, WBS elements, networks | Project time and costs, budgets, settlements | Status management (released/closed), budget availability control, settlement rules |

## 8. Transports and environment management
- Transport Management System (STMS): landscape DEV → QAS → PRD (± pre-prod); import queue order matters; transports of copies for testing; client-dependent customizing vs cross-client objects (SCC4 controls change options per client).
- Requests: workbench (repository objects) vs customizing; organiser SE09/SE10. Change orchestration via Solution Manager ChaRM or SAP Cloud ALM — verify tooling.
- **Interface configuration usually maintained per system, not transported**: RFC destinations (SM59), logical system names, partner profiles (WE20 has a transport function, but system-specific values differ — verify), ports, SOAMANAGER endpoint configurations, certificates (STRUST). Include them in the environment build and cut-over runbooks.
- After a system copy/refresh: convert logical system names (BDLS), neutralise outbound RFC destinations, ports, partner profiles and job schedules to prevent test systems from sending to production partners.
- Integration Suite content: transport via CTS+/Cloud Transport Management or manual export/import — verify.

## 9. Common transactions cheat sheet (SAP GUI; verify availability per release)
| Area | Transactions |
|---|---|
| Basis / technical | SE11 (ABAP Dictionary), SE16 / SE16N (data browser; SE16H in S/4), SE37 (function builder), SE38 / SE80 (ABAP), SM30 (table maintenance), SM36 / SM37 (jobs), SM12 (locks), SM21 (system log), SM50 / SM66 (work processes), ST22 (dumps), ST05 (SQL trace), SLG1 (application log), SPRO (IMG), SU01 (users), PFCG (roles), SU53 (authorisation check), STRUST (certificates), STMS, SE09/SE10, SCC4, BDLS |
| Interfaces | SM59, SM58, SMQ1, SMQ2, SBGRFCMON, SALE, BD54, BD64, WE20, WE21, WE02, WE05, WE09, WE19, BD87, BD10, BD12, BD14, BD21, BD50, BD61, SOAMANAGER, /IWFND/MAINT_SERVICE, /IWFND/ERROR_LOG, /IWFND/GW_CLIENT, SXMB_MONI (PI ABAP), /AIF/ERR (if AIF used) |
| FI | FB01 (post document), FB50 (G/L posting), FB60 (vendor invoice), FB70 (customer invoice), FB03 (display), F-02 (general posting), F-28 (incoming payment), F-53 (outgoing payment), F110 (payment run), FBL1N / FBL3N / FBL5N (vendor / G/L / customer line items), FS00 (G/L account), OB52 (posting periods), FBRA (reset cleared items), FF_5 (import bank statement), FEBAN (post-process bank statement), FF67 (manual bank statement), AS01 / AS03 (asset create / display), OBPM1 (payment medium formats), DMEE / DMEEX (payment format trees) |
| CO | KS01 (cost centre), KO01 (internal order), KB11N (manual reposting of costs) |
| SD | VA01 / VA02 / VA03 (sales order), VL01N / VL02N (outbound delivery), VF01 (billing document), VF04 (billing due list), VK11 (pricing condition) |
| MM | ME51N (purchase requisition), ME21N / ME22N / ME23N (purchase order), MIGO (goods movement), MIRO (logistics invoice verification), MM01 / MM02 / MM03 (material master), MMBE (stock overview), MB52 (warehouse stocks), MR11 (GR/IR clearing account maintenance), MMPV (close MM period) |
| PS | CJ20N (Project Builder), CJI3 (project actual cost line items) |
| Master data | BP (Business Partner, S/4HANA), XD01 / XK01 (central customer / vendor, ECC) |

In S/4HANA many functions are primarily delivered as Fiori apps (e.g. journal entry, bank statement monitor); prefer the app names given in the SAP Fiori apps reference library for user-facing procedures.

## 10. Interface pitfalls and review points
- Leading zeros: conversion exit ALPHA on customer/vendor/material/document numbers; external systems must send internal format or the interface must convert.
- Units of measure (internal vs ISO/commercial code, CUNIT), language keys (1-char internal vs 2-char ISO), currency decimals (amounts stored with currency-specific decimals, e.g. JPY — TCURX), dates as YYYYMMDD in IDocs.
- Time zones: system time vs user time zone; posting date derived at midnight boundaries.
- Locks: parallel IDocs on the same material/customer → status 51 lock errors; use serialization or retry jobs.
- Number ranges: buffering causes gaps (acceptable for most documents; verify legal requirements for invoices).
- Output determination re-triggering outbound IDocs on document changes (duplicates downstream).
- Incompletion log/credit block leaves sales orders created but not processed — interface "success" is not business success.
- IDoc status 51 backlog after month-end because posting periods closed (OB52/MMPV) before inbound flows were processed.
- Partner profile and RFC destination differences between QAS and PRD discovered at go-live.
- System refresh without BDLS/neutralisation sending test IDocs to real partners.
- S/4HANA: BP/CVI mapping (customer/vendor number ranges, roles) breaks legacy DEBMAS/CREMAS assumptions — verify the master data integration approach (BP services, DRF, MDG) per release.

## Sources
- https://news.sap.com/2020/02/sap-s4hana-maintenance-2040-clarity-choice-sap-business-suite-7/ — Business Suite 7 maintenance 2027/2030, S/4HANA to 2040
- https://blogs.sap.com/t5/technology-blogs-by-sap/maintenance-strategy-for-sap-netweaver-7-5-fully-aligned-with-sap-business/ba-p/13456253 — NetWeaver 7.5 and PI/PO 7.5 maintenance alignment
- https://learning.sap.com/learning-journeys/exploring-functions-and-innovation-in-sap-s-4hana-sourcing-and-procurement/listing-simplifications-for-the-material-master-in-sap-s-4hana_acda4aa1-4ce7-4bb4-a41b-745dd33621f9 — 40-character material number, activation required
- https://help.sap.com/saphelp_nw73/helpdata/en/c1/54dae3daa84deda5ba3de46425832f/content.htm — SRT_UTIL error log and traces
- https://help.sap.com/docs/cloud-integration/sap-cloud-integration/kafka-adapter — Cloud Integration Kafka adapter
- https://help.sap.com/docs/integration-suite/sap-integration-suite/configure-as2-sender-adapter — Cloud Integration AS2 adapter
- https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/8308e6d301d54584a33cd04a9861bc52/c128459eb1164a4bb3eb95ef523b8496.html — S/4HANA Enterprise Event Enablement
- https://help.sap.com/doc/95a95a083ca04acebc11c36c21679602/617.47/en-US/a3173b1216f04b1290e616bf3891a5ad.pdf — SAP configuration guide citing ACC_DOCUMENT04 basic type
