# ERP business processes, master data, closing, reconciliation, migration and cut-over

## Contents
1. Order-to-Cash (O2C)
2. Procure-to-Pay (P2P)
3. Record-to-Report (R2R)
4. Master data
5. Period close
6. Reconciliation
7. Data migration method
8. Cut-over
9. French / EU specifics

Accounting entries below are simplified generic patterns (perpetual inventory, VAT on accrual basis); actual account determination depends on the chart of accounts, ERP configuration and local GAAP/IFRS — validate with finance.

## 1. Order-to-Cash (O2C)
| Step | Documents / objects | Typical integrations | Controls |
|---|---|---|---|
| Customer onboarding | Customer master, credit limit, payment terms, mandate (SDD) | CRM, MDM, credit insurer/rating, KYC | Duplicate check, SIREN/VAT validation, credit approval |
| Quotation / order | Quote, sales order, pricing | E-commerce, CRM, EDI ORDERS, CPQ | Price/discount approval, credit check, availability check |
| Fulfilment | Delivery, picking, goods issue | WMS, TMS/carriers, EDI DESADV | Stock availability, shipment confirmation |
| Billing | Invoice, credit memo | E-invoicing platform, EDI INVOIC, print/mail | Billing completeness (all deliveries billed), tax correctness |
| Receivables | Open items, dunning | Bank statement import, payment service providers, collection agencies | Ageing, dunning levels, disputes |
| Cash application | Incoming payment, matching (lettrage) | camt.053/054, CFONB 120, lockbox, PSP settlement files | Automatic match rate, unapplied cash |
Simplified entries: goods issue Dr COGS / Cr Inventory; invoice Dr Customer (AR) / Cr Revenue / Cr Output VAT; payment Dr Bank / Cr Customer (clearing); SDD collection similar with returns reversing it.
KPIs: DSO, order-to-invoice lead time, automatic cash match rate, dispute rate.
Pitfalls: orders accepted for blocked customers by interface bypassing credit checks; deliveries not invoiced at month-end (revenue cut-off); remittance information lost so cash cannot be matched; tax rounding differences between front-end and ERP.

## 2. Procure-to-Pay (P2P)
| Step | Documents / objects | Typical integrations | Controls |
|---|---|---|---|
| Supplier onboarding | Vendor master, bank details, tax data | Supplier portal, MDM, sanction screening | Bank detail change verification (call-back), SoD on vendor creation vs payment |
| Requisition / approval | Purchase requisition | e-Procurement, catalogs (punch-out) | Approval workflow, budget check |
| Purchase order | PO, contract | EDI ORDERS, supplier portal | Approved vendor, price vs contract |
| Receipt | Goods receipt / service entry | WMS, EDI DESADV, service sheets | Quantity/quality check |
| Invoice | Vendor invoice (2-/3-way match) | OCR/e-invoicing platform, EDI INVOIC | PO/GR/invoice match with tolerances, duplicate invoice check, VAT validity |
| Payment | Payment proposal/run, payment file | Bank (pain.001 via EBICS/SWIFT/host-to-host), treasury | Four-eyes approval, payment file integrity (signing), sanction screening |
| Bank reconciliation | Statement, clearing | camt.053/CFONB 120/MT940 | Unreconciled items ageing |
Simplified entries: goods receipt Dr Inventory or Expense / Cr GR/IR; invoice Dr GR/IR / Dr Input VAT / Cr Vendor (AP); payment Dr Vendor / Cr Bank (or bank clearing account until statement).
KPIs: DPO, first-time match rate, invoices on hold, late payment penalties (France: contractual terms capped at 60 days from invoice date or 45 days end of month, 30 days when nothing is agreed, with sector exceptions; late-payment penalties and a fixed recovery indemnity are due automatically — amounts per current Code de commerce art. L441-10).
Pitfalls: vendor IBAN changed through an interface without verification (fraud vector); duplicate invoices from OCR + EDI channels; GR/IR balances never cleared; payment files editable between ERP and bank (integrity gap).

## 3. Record-to-Report (R2R)
- Journal entries (manual, recurring, interfaces from sub-systems: payroll, treasury, billing, assets), accruals/deferrals, allocations, intercompany, FX revaluation, depreciation, tax provisions, consolidation, statutory and management reporting.
- Ledger design: chart of accounts (France: PCG-based for statutory; group chart for IFRS), parallel ledgers or accounts approach for IFRS vs local GAAP, analytic dimensions.
- Interface journals: summarised per period/account/dimension with drill-back reference to the source system; balanced per document (and per company for intercompany); posting date rules defined.
- Intercompany: matching rules, elimination, reconciliation by counterpart before consolidation.
- Audit trail: every posting traceable to source document and interface run (piste d'audit fiable for invoices in France — verify requirements).

## 4. Master data
| Object | Typical master | Key attributes | Controls |
|---|---|---|---|
| Customer | CRM/MDM or ERP | Legal name, SIREN/SIRET, VAT number, addresses, payment terms, credit limit, bank mandate | Dedup, legal identifier validation, credit approval |
| Vendor/supplier | ERP or supplier portal/MDM | Legal identifiers, bank details (IBAN/BIC), payment terms, tax data | Bank detail verification, sanction screening, SoD |
| Material/item/product | PLM/PIM/MDM or ERP | Code, description, units of measure and conversions, valuation, plant/site views, tax classification | Mandatory views complete before use |
| GL account / chart of accounts | Finance (ERP) | Account, type, reconciliation account flag, tax relevance, dimensions | Change control by finance only |
| Cost centre / profit centre / dimensions | Controlling (ERP) | Hierarchy, validity dates, responsible | Validity periods respected by interfaces |
| Bank accounts | Treasury | House bank, IBAN, BIC, account use | Strict change control |
Governance: one master per object (golden record), data owners and stewards, creation/change workflow, quality rules (mandatory fields, formats, check digits), cross-reference (XREF) of IDs between systems, lifecycle (block, archive, merge), quality KPIs. Personal data (sole traders, contacts) falls under GDPR: minimisation, retention, rights handling.
Identifier checks: SIREN (9 digits, Luhn), SIRET (14 digits), French VAT `FR` + key + SIREN, IBAN mod 97, BIC 8/11.

## 5. Period close
Typical sequence (adapt to calendar, e.g. D-2 to D+5):
1. Interface cut-off: all sub-system flows for the period received and processed; error queues empty or explained (IDoc 51, interface errors, DMF staging errors).
2. Logistics close: goods receipts/issues cut-off, inventory counts, GR/IR analysis, MM/inventory period close.
3. Sub-ledgers: AR/AP open items review, accruals (goods received not invoiced, services), provisions, asset additions and depreciation run, FX revaluation of open items.
4. Bank reconciliation completed; suspense/clearing accounts analysed.
5. Intercompany reconciliation and settlement.
6. Allocations/settlements (controlling), cost of sales, WIP.
7. Close sub-ledger periods, then GL period (open next period early enough for operations).
8. Reporting, consolidation, tax declarations (VAT return), management review.
Interface implications: interfaces must know whether to post into the closing period or the next one (posting date rule + "late" flag); freeze windows communicated to source systems; reruns after close need finance approval; year-end adds balance carry-forward, audit extracts (FEC in France), archiving.

## 6. Reconciliation
Types: technical (counts/hash/control totals between hops), functional (amounts by company/account/currency/period), sub-ledger vs GL, source system vs ERP, bank vs books, intercompany, inventory (physical vs book).
Method:
1. Define reconciliation keys (business keys, document references, batch IDs) and dimensions (company, currency, period, account).
2. Define tolerance (zero for counts; amount tolerance only for documented rounding).
3. Automate extraction from both sides at the same cut-off time; store evidence.
4. Exceptions workflow: classification (timing difference, rejected, missing, duplicate, mapping error), owner, due date, ageing.
5. Sign-off by the business owner; retain evidence for audit (period of retention per legal requirements).
Reconciliation report columns: `control | period | source count/amount | target count/amount | difference | explained | unexplained | owner | status`.

## 7. Data migration method
| Phase | Activities | Deliverables / exit criteria |
|---|---|---|
| Scoping | Objects, history depth (open items only vs history), data volumes, legal retention of non-migrated data (archive) | Migration scope matrix signed by business |
| Analysis & profiling | Source extraction samples, data quality profiling (duplicates, missing mandatory fields, invalid formats) | Data quality report, cleansing plan |
| Cleansing | Fix in source preferably; dedup; enrich; archive obsolete records | Quality KPIs reaching thresholds |
| Mapping | Field mapping and value mapping (code lists) per object, owned by business, versioned | Validated mapping specifications |
| Build | Extraction programs, transformations, load with standard tools (SAP Migration Cockpit, FBDI/HDL, DMF, import templates) | Repeatable, automated, logged pipeline |
| Mock loads | Mock 1 (technical), Mock 2 (full volume, functional validation), Mock 3 / dress rehearsal (timed, cut-over conditions) | Defects closed, timings within window, reconciliation passed |
| Reconciliation | Counts per object, amounts per account/company, sample checks by business, balances | Signed reconciliation per mock and at go-live |
| Cut-over | Final extraction, loads, delta, validation (see §8) | Go/no-go decision |
| Post go-live | Hypercare, data fixes, decommission/archive legacy | Legacy read-only archive, closure |

Load order (typical): configuration and organisational structure → chart of accounts / GL accounts → cost/profit centres and dimensions → banks → business partners (customers, vendors) → materials/items (+ plant/site views, prices) → bills of materials/routings if in scope → open AR/AP items (document-level, with original dates and references) → GL opening balances (excluding sub-ledger reconciliation accounts, loaded via open items) → fixed assets (acquisition value + accumulated depreciation) → inventory quantities and values → open POs/SOs/contracts → other open transactions.
Rules: migration clearing (suspense) accounts must net to zero after all loads; trial balance before/after comparison by account mapping; open items total = sub-ledger reconciliation account balances; keep legacy IDs in target (reference fields) for traceability; no personal data from production in non-production mocks unless anonymised or covered by an approved legal basis and controls.

## 8. Cut-over
- **Plan**: hour-by-hour runbook (T-x days to T+y), tasks with owner, duration, dependency, verification step, rollback step; communication plan; go/no-go checkpoints with criteria.
- **Freeze**: master data freeze (T-x), transactional freeze window, legacy read-only.
- **Interfaces**: drain in-flight messages/files; record last processed sequence numbers/IDs; stop old schedules; reconfigure endpoints, partners, certificates; enable new flows in a controlled order (master data first); prevent double processing during parallel run.
- **Data**: final extraction, loads, delta catch-up for transactions during freeze, reconciliation sign-off.
- **Validation**: smoke tests per process and interface with controlled data; first payment run/bank file and first invoice run under supervision.
- **Rollback**: point of no return identified; rollback procedure tested; data created in the new system after go-live and before rollback has a re-entry plan.
- **Hypercare**: reinforced support, daily error backlog and reconciliation review, KPI watch (order intake, invoicing, cash, payments).
Cut-over pitfalls: closing period not aligned with go-live date (go-live preferably at period start after legacy close); bank/EBICS contracts and certificates not migrated in time; partners not informed of new identifiers or endpoints; schedulers in both systems running the same job.

## 9. French / EU specifics
- **FEC** export obligation for computerised accounting (LPF art. L47 A I; format per art. A47 A-1: flat file or XML, 18 mandatory fields in a fixed order, one file per fiscal year named `SirenFECAAAAMMJJ`, dates `AAAAMMJJ`); keep entry-level traceability.
- **Archiving**: accounting books and supporting documents retained 10 years (Code de commerce art. L123-22); tax retention rules also apply — verify per document type.
- **E-invoicing and e-reporting reform**: reception for all companies and issuance for large/mid-size companies since 1 September 2026, issuance for SMEs and micro-enterprises from 1 September 2027, via approved platforms ("plateformes agréées") that each company must designate; invoice lifecycle statuses and e-reporting of B2C/international transactions (same calendar) impact O2C and P2P interfaces — follow the DGFiP external specifications for the detailed rules.
- **SEPA**: SCT, SCT Inst (Instant Payments Regulation: euro-area PSPs receive since 9 January 2025, send with Verification of Payee since 9 October 2025), SDD Core/B2B with mandates and creditor identifier (ICS); bank formats per bank implementation guides.
- **VAT**: intra-EU VAT number validation (VIES), reverse charge, VAT on receipts vs debits for services ("TVA sur les encaissements") affecting posting logic — verify with tax.
- **Banking sector** (financial entities): DORA requirements on ICT third parties and incident reporting extend to ERP SaaS and integration platforms supporting critical functions — coordinate with enterprise-architect.
- **Healthcare entities**: ERP processes for public hospitals follow public accounting rules (M21 instruction, Chorus Pro for public-sector invoicing) — verify.

## Sources
- https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006219327/ — Code de commerce L123-22, 10-year retention
- https://www.impots.gouv.fr/fichiers-standards-des-ecritures-comptables-art-l-47-1-du-lpf — FEC obligation under LPF L47 A
- https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000027804775 — LPF A47 A-1 FEC format
- https://bofip.impots.gouv.fr/bofip/9028-PGP.html/identifiant=BOI-CF-IOR-60-40-20-20170607 — BOFiP FEC format details
- https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/delais-de-paiement-les-regles-connaitre — DGCCRF payment term caps
- https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises — e-invoicing reform calendar 2026/2027
- https://www.europeanpaymentscouncil.eu/news-insights/news/key-impacts-instant-payments-regulation-2023-sct-inst-scheme-rulebook-and — IPR dates 9 January / 9 October 2025
- https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2025-10/EPC266-25%20Press%20Release%20VOP%20rulebook%20now%20into%20force.pdf — VoP rulebook in force 5 October 2025
