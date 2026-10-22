# Sage X3 and Cegid - integration reference (and mid-market ERP guidance)

## Contents
1. Sage X3 architecture essentials
2. Sage X3 import/export templates
3. Sage X3 web services and APIs
4. Sage X3 operations and pitfalls
5. Cegid ERPs - integration approach
6. Generic method for mid-market ERPs
7. French specifics frequently met
8. Review checklist

Sage X3 and Cegid behaviour depends strongly on version, legislation set-up, hosting (on-premise vs editor cloud) and partner customisations. Facts below stay deliberately generic; anything marked "verify" must be confirmed in the editor documentation or the target system.

## 1. Sage X3 architecture essentials
- Web layer **Syracuse** (web server, administration, web services endpoints) in front of the application/process server running the X3 4GL, and a SQL Server or Oracle database.
- **Folders** (dossiers): a reference folder (X3), demo folder (SEED) and customer folders (production, test, training) — each folder has its own data and parameters; interfaces must target the right folder per environment.
- Organisation: companies, sites (financial and/or logistic), legislation (e.g. FRA) driving accounting and tax rules.
- Entities and tables (names to confirm in the data dictionary of your version): business partners (`BPARTNER`), customers (`BPCUSTOMER`), suppliers (`BPSUPPLIER`), products (`ITMMASTER`), sales orders (`SORDER`), journal entries (`GACCENTRY` header) — verify.
- Accounting from logistic documents is generated through automatic journal rules (accounting interface parameters) — check posting logic per document type with the finance key user.
- Major versions: V11, V12 and later release naming — verify the exact release and patch level; APIs differ significantly between versions.

## 2. Sage X3 import/export templates
- Import/export templates (function `GESAOE` — verify) define for an object: file format (delimited or fixed), field separator, record types (e.g. header vs line identifiers), field list and order, character set, date format, and whether the template is used for import, export or both.
- Standard templates exist for common objects (e.g. customers, suppliers, products, sales/purchase orders, journal entries) with codes such as BPC, BPS, ITM, SOH, POH — verify codes and content in your folder; copy and adapt rather than modify standard templates.
- Execution: interactively (Usage > Imports/exports) or in batch via the batch server (scheduled tasks/recurring requests), with import logs listing accepted and rejected records — verify menu paths.
- Behaviour to confirm per template: creation vs update vs creation-or-update; transaction granularity (one record per transaction vs whole file); behaviour on error (skip record and continue vs stop); trigger of business rules and automatic journals.
- Pitfalls: template sequence/record type mismatch after upgrade; header/lines structure misunderstood (lines attached to the wrong header); character set of the file vs template setting; decimal separator; leading zeros on codes; dates in the user's format vs template format.

## 3. Sage X3 web services and APIs
- **Classic SOAP web services**: objects, sub-programs and import templates published as web services and called through Syracuse with a connection pool configured in administration; generic operations on the `CAdxWebServiceXmlCC` endpoint such as `run` (sub-program), `save`, `read`, `modify`, `delete`, `query`, `getDescription` — verify operation names, authentication and pool configuration for your version.
- **REST / SData**: Syracuse exposes REST-style endpoints (SData heritage) for representations/classes — verify support level.
- **GraphQL API**: recent Sage X3 releases introduced a GraphQL-based API for selected nodes — verify availability, licensing and coverage in your release before designing on it.
- Design rules: dedicated web service user with minimal rights; pool sizing aligned to concurrency; idempotence via external reference fields; timeouts aligned to X3 processing time; avoid chatty per-line calls for documents with many lines.

## 4. Sage X3 operations and pitfalls
- Batch server: schedule imports/exports and accounting tasks; monitor task status and logs; avoid overlapping imports on the same objects (locks).
- Locks: records/documents locked by users block web service updates — define retry and operating windows.
- Upgrades: custom developments (specific code, activity codes) and templates must be retested; patches can change standard templates.
- Environments: folder copies for test — neutralise interface parameters (paths, endpoints, emails) after copying production folders.
- Performance: large imports better in batch with commit granularity tested; web services for unitary real-time operations.

## 5. Cegid ERPs - integration approach
- Cegid offers several ERP and vertical lines (mid-market ERP, retail, accounting firms, HR, expense management, treasury/bank connectivity) with different technologies and hosting; first identify the exact product, version and whether it is hosted by the editor (SaaS) — verify.
- Integration options typically include proprietary flat-file import/export formats (historically ASCII exchange formats for accounting entries and third parties — e.g. the "TRA" format family in older Cegid accounting products — verify layout and support for your product), standard import tools, and REST/SOAP APIs published by the editor for recent cloud products — obtain the editor's API catalogue and interface documentation.
- SaaS/editor-hosted: no direct database access; flows via APIs, SFTP drop zones or editor connectors; respect editor quotas and maintenance windows.
- Treat every assumption about field names, mandatory fields and import behaviour as "verify against your version" and request sample files and specifications from the integrator/editor early.

## 6. Generic method for mid-market ERPs (Sage, Cegid and similar)
1. **Inventory mechanisms**: standard import/export tools, APIs (protocol, auth, rate limits), connectors, files; documentation per version.
2. **Choose by object and volume**: master data and journals in batch templates; real-time documents through APIs; never direct SQL inserts.
3. **Confirm behaviour by test**, not by documentation only: create vs update, error granularity, duplicate handling, triggers of accounting/workflows, locks.
4. **Define identifiers**: external reference storage for idempotence and drill-back; numbering (ERP-assigned vs source-assigned).
5. **Posting validation** with the finance key user: accounts, analytic dimensions (sections analytiques), VAT codes, journals, periods.
6. **Error handling**: where rejects are visible, who corrects, how to reprocess without duplicates.
7. **Reconciliation**: counts and amounts per run; accounting balance checks.
8. **Licensing**: API/web-service users and connectors may require specific licences — verify with the editor.
9. **Upgrade resilience**: version templates/specs; regression tests per upgrade.

## 7. French specifics frequently met
- **FEC** (Fichier des Écritures Comptables): legal export of accounting entries for tax audits (Livre des procédures fiscales, art. L47 A and A47 A-1 for the format) — the ERP must produce it; interfaces posting summarised journals must keep enough detail and references for FEC and audit trail — verify requirements with the statutory auditors.
- **Lettrage** (matching/clearing of customer/supplier items) and **rapprochement bancaire** (bank reconciliation) driven by imported bank statements (CFONB 120, camt.053).
- **Analytic accounting** with multiple axes/sections; mapping of source cost centres to ERP analytic codes.
- **E-invoicing reform** (phased from September 2026): ERP must exchange invoices in structured formats (Factur-X, UBL, CII) via an approved platform and handle lifecycle statuses — verify the editor's roadmap and the platform connection for your version.
- **Payment and direct debit files**: SEPA pain.001/pain.008 generation, bank-specific variants, EBICS transmission (often through a bank connectivity tool).

## 8. Review checklist
- [ ] Exact product, version, patch level, hosting and folder/company/site scope identified.
- [ ] Mechanism is a supported standard (template, web service, API); no direct DB writes.
- [ ] Import behaviour (create/update, error granularity, locks, triggers) verified by test.
- [ ] Mapping includes codes (third parties, products, accounts, analytic sections, VAT codes) with transcoding tables and owners.
- [ ] External references stored for idempotence and drill-back.
- [ ] Batch scheduling, logs monitoring and reject handling defined.
- [ ] Accounting results validated by finance; FEC/audit trail implications checked.
- [ ] Licences for technical users/APIs confirmed; credentials stored in a vault.
- [ ] Upgrade regression tests and environment neutralisation after copies planned.
