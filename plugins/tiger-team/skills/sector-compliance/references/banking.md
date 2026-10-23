# Banking and financial services: regulatory reference for integration projects

_Scope: banks, payment and e-money institutions, investment firms established in France / the EU, and their IT providers. Read together with the confidentiality rules in `${CLAUDE_PLUGIN_ROOT}/skills/sector-compliance/SKILL.md`: no real customer data, card data or production secrets in this session._

## Contents

1. How to use this file
2. DORA (digital operational resilience)
3. NIS2
4. EBA Guidelines on outsourcing (and on ICT and security risk)
5. ACPR expectations (France)
6. PCI DSS v4.x
7. AML/CFT (LCB-FT) data flows
8. Banking secrecy (secret bancaire)
9. GDPR in banking
10. Other texts often met in integration work
11. Incident notification matrix
12. Consolidated integration checklist
13. Test data strategy

## 1. How to use this file

- First qualify the context: entity type (credit institution, payment institution, investment firm, insurer...), card data in scope or not, role of the project (new ICT provider? supports a critical or important function?).
- Map every requirement to a deliverable: DAT (security, resilience), DEX (monitoring, backups, restart), interface contract (security, error handling), flow matrix, RAID log, release sheet, UAT sign-off.
- Article numbers were checked against the official sources listed at the end of this file. Anything still marked **verify** depends on the entity, on a text not yet adopted, or on a document that could not be read in full: check it against the official source (EUR-Lex, Légifrance, PCI SSC, EBA, ACPR websites).

## 2. DORA: Regulation (EU) 2022/2554

### Facts

- Regulation on digital operational resilience for the financial sector, **applicable since 17 January 2025**, directly applicable (no transposition). Companion Directive (EU) 2022/2556 amends sectoral directives.
- Scope (art. 2): credit institutions, payment and e-money institutions, investment firms, crypto-asset service providers, CSDs, CCPs, trading venues, insurers and reinsurers, among others. Proportionality principle (art. 4); simplified ICT risk framework for certain smaller entities (art. 16).
- French competent authorities: ACPR for banks and insurers, AMF for entities under its supervision; ECB involvement for significant institutions under the SSM. Verify the reporting channel for your entity.

| Pillar | Articles | Core obligations |
|---|---|---|
| ICT risk management | Ch. II, art. 5-16 | Management-body accountability (art. 5); ICT risk framework (art. 6); identification of ICT and information assets and their interconnections and dependencies (art. 8); protection and prevention, incl. ICT change management (art. 9); detection (art. 10); response and recovery, ICT business continuity (art. 11); backup, restoration and recovery (art. 12); learning (art. 13); communication (art. 14) |
| ICT incident management, classification, reporting | Ch. III, art. 17-23 | Incident management process, classification by criteria, reporting of major incidents to the competent authority (art. 19), voluntary notification of significant cyber threats, information of affected clients (art. 19(3)) |
| Digital operational resilience testing | Ch. IV, art. 24-27 | Risk-based testing programme; ICT systems supporting critical or important functions tested at least yearly; threat-led penetration testing (TLPT) at least every 3 years for designated entities (art. 26(1), frequency adjustable by the competent authority) |
| ICT third-party risk | Ch. V, art. 28-44 | Third-party risk strategy; **register of information** on all contractual arrangements for ICT services (art. 28(3)); pre-contract assessment and concentration risk (art. 29); mandatory contract clauses (art. 30); exit strategies; EU oversight of critical ICT third-party providers (art. 31-44) |
| Information sharing | Ch. VI, art. 45 | Voluntary cyber-threat intelligence sharing arrangements |

- **Level 2 texts** (RTS/ITS adopted by the Commission on ESA drafts): ICT risk management framework and simplified framework (Delegated Reg. (EU) 2024/1774); classification of major incidents and significant cyber threats (Delegated Reg. (EU) 2024/1772); content and time limits of major incident reports (Delegated Reg. (EU) 2025/301) and their templates (Implementing Reg. (EU) 2025/302); register-of-information templates (Implementing Reg. (EU) 2024/2956); subcontracting of ICT services supporting critical or important functions (Delegated Reg. (EU) 2025/532); TLPT (Delegated Reg. (EU) 2025/1190). Check EUR-Lex for later amendments.
- **Major incident reporting time limits** (Delegated Reg. (EU) 2025/301, art. 5): initial notification as early as possible and within **4 hours** of classification as major, and no later than **24 hours** after becoming aware of the incident (if classified later than 24 h after awareness: within 4 hours of classification); intermediate report within **72 hours** of the initial notification, updated when regular activities are recovered; final report within **1 month** of the (latest updated) intermediate report. A deadline falling on a weekend or bank holiday may be met by noon of the next working day, except initial notifications and intermediate reports from credit institutions, CCPs and certain trading venues.
- **Classification criteria** (Delegated Reg. (EU) 2024/1772): clients, financial counterparts and transactions affected, reputational impact, duration and service downtime, geographical spread, data losses, criticality of services affected, economic impact; the thresholds are in that Regulation.
- **Contract clauses (art. 30)**: description of services; locations where services are provided and data processed and stored; availability, authenticity, integrity and confidentiality provisions; access, recovery and return of data on termination or insolvency; service levels; assistance in ICT incidents; cooperation with authorities; termination rights. For **critical or important functions**, additionally: precise quantitative SLAs, notice and reporting duties, business contingency plans and their testing, participation in TLPT, unrestricted rights of access, inspection and audit, exit strategies with a mandatory transition period.

### Implications for integration work

- Classify each interface, batch chain and platform against the business functions it supports; flag those supporting **critical or important functions (CIF)**. Flow matrices and interface contracts are evidence of interconnection mapping (art. 8).
- Any new SaaS, API platform, MFT service, managed scheduler, cloud or outsourced run = **ICT third-party arrangement**: register entry, art. 30 clauses, exit plan, concentration-risk check, all **before signature**, not after go-live. Subcontracting chains for CIF services follow Delegated Reg. (EU) 2025/532.
- Change management (art. 9): documented, risk-assessed, tested, approved, traceable, with rollback. Release sheets and UAT sign-offs are evidence.
- Detection (art. 10): monitor failures, latency, volumes and anomalies on flows. Logs must allow incident classification: transactions failed or delayed, clients affected, duration, data lost.
- Response and recovery (art. 11-12): RTO/RPO per function; when restoring backups on the entity's own systems, use ICT systems **physically and logically segregated from the source system** (art. 12(3)); periodic restore tests (art. 12(2)); replay and reconciliation procedures for flows after an outage (idempotence keys, sequence control, control totals).
- Testing (art. 24-25): include interfaces in vulnerability scanning, end-to-end, performance and failover tests.
- Incident run books include the DORA clock and name who decides the "major" classification (the entity, not the integrator alone).

## 3. NIS2: Directive (EU) 2022/2555

### Facts

- Replaces NIS1 (Directive (EU) 2016/1148). Transposition deadline: 17 October 2024. **French transposition**: the bill "résilience des infrastructures critiques et renforcement de la cybersécurité" (transposing REC, NIS2 and the DORA directive, designating ANSSI as national authority) was adopted by the Senate on 12 March 2025 and voted in the Assemblée nationale special committee on 10 September 2025; it was **not promulgated at the time of this review (October 2026)**; decrees and ANSSI référentiels will follow promulgation: **verify current status**.
- Essential and important entities, by sector (Annexes I and II) and size. Banking and financial market infrastructures are Annex I sectors. **Managed ICT service providers (MSP, MSSP)** are also covered: an integrator or managed-service provider may itself be in scope.
- Management bodies approve and oversee the measures and can be held liable (art. 20).
- Minimum measures (art. 21(2)): risk analysis and IS security policies; incident handling; business continuity (backup, disaster recovery, crisis management); supply-chain security; security in acquisition, development and maintenance, incl. vulnerability handling and disclosure; effectiveness assessment; cyber hygiene and training; cryptography and encryption; HR security, access control, asset management; MFA or continuous authentication, secured communications.
- Significant incidents (art. 23): early warning within **24 h**, incident notification within **72 h**, final report within **1 month**; intermediate reports on request.
- For financial entities in DORA scope, DORA applies as a sector-specific act (NIS2 art. 4) for risk management and incident reporting; entities exempted from DORA under its art. 2(4) are also outside NIS2 (art. 2(10)). Verify how the French law treats your entity once adopted.

### Implications

- Entity in DORA scope: follow DORA; NIS2 remains relevant for group entities or providers outside DORA.
- As a provider: expect supply-chain clauses (security requirements, audit, incident notification, vulnerability disclosure) and check your own NIS2 status.

## 4. EBA Guidelines on outsourcing arrangements (EBA/GL/2019/02)

### Facts

- Published 25 February 2019, applicable since 30 September 2019, to credit institutions, investment firms subject to CRD, payment and e-money institutions. They replaced the CEBS 2006 guidelines and the EBA recommendations on cloud outsourcing.
- Key concepts: definition of outsourcing; assessment of **critical or important functions**; outsourcing policy; pre-outsourcing analysis (due diligence, risk assessment incl. concentration); written agreement with **access, information and audit rights** for the institution and the competent authority; conditions for sub-outsourcing; data and service location; termination rights; **exit strategies**; ongoing monitoring; **outsourcing register**; prior notification to the competent authority of planned outsourcing of critical or important functions.
- Interplay with DORA: ICT services fall under DORA ch. V since 17 January 2025. The EBA published on 18 September 2026 its final **Guidelines on the sound management of third-party risk (EBA/GL/2026/09)**: they cover non-ICT third-party arrangements (beyond outsourcing), widen the entity scope, allow a single register for ICT and non-ICT arrangements, give two years to review existing arrangements supporting critical or important functions, and will **repeal EBA/GL/2019/02 once applicable** (application date to be set after translation: **verify**). The EBA Guidelines on ICT and security risk management (EBA/GL/2019/04) were amended by EBA/GL/2025/02 (applicable 20 May 2025): they now cover only payment service user relationship management under PSD2 art. 95(3); ICT risk management itself is governed by DORA and its RTS.

### Implications

- Before contracting: is it outsourcing or another third-party arrangement? an ICT service (DORA)? a critical or important function? The answer drives contract clauses, register entries and regulator notification lead time (track it in the RAID log).
- Audit and access rights must extend down the subcontracting chain that touches the data or the service.
- The exit plan must be technically feasible: export formats, interface re-pointing, parallel run. Document it in the DAT.

## 5. ACPR expectations (France)

### Facts

- The ACPR (Autorité de contrôle prudentiel et de résolution, attached to the Banque de France) supervises banks, insurers, payment and e-money institutions; significant banks are supervised directly by the ECB within the SSM, with ACPR participation.
- Main French internal-control text: **arrêté du 3 novembre 2014** relatif au contrôle interne des entreprises du secteur de la banque, des services de paiement et des services d'investissement soumises au contrôle de l'ACPR (JORF of 5 November 2014; it replaced CRBF regulation n° 97-02), amended several times since, notably in 2021 to integrate EBA governance, outsourcing and ICT guidelines. Use the consolidated version on Légifrance.
- Concepts expected: permanent and periodic control organized in three levels (art. 12: operational staff, risk and compliance functions, internal audit), risk mapping including IT and operational risks, IS security policy, tested business continuity plans, framework for essential outsourced services, data quality, incident management and reporting, management-body oversight.
- Inspections request evidence: change records, access reviews, test evidence, incident files, continuity test reports, provider contracts and their monitoring.

### Implications

- Build audit-ready evidence as you go: approved DAT, flow matrix with justifications, change tickets linked to release sheets, UAT sign-offs, service-account access reviews, restore-test reports.
- Segregation of duties: developers do not deploy to production alone; integrator access to production is nominative, time-bound and logged.
- Raise any offshore support or cloud processing early with compliance and risk (outsourcing and secrecy impacts).

## 6. PCI DSS v4.x

### Facts

- Standard of the PCI Security Standards Council, enforced contractually through card brands and acquirers. v4.0 published March 2022; **v4.0.1** (June 2024, limited revision with no added or deleted requirements) is the only active version listed in the PCI SSC document library at the time of review; v3.2.1 retired 31 March 2024; v4.0 retired 31 December 2024; the v4 "future-dated" requirements (best practice until 31 March 2025) are mandatory since **31 March 2025**. Check the document library for newer revisions.
- **Account data** = cardholder data (PAN, cardholder name, expiration date, service code) + sensitive authentication data (SAD: full track data, card verification code, PIN / PIN block).
- **CDE** (cardholder data environment): people, processes and system components that store, process or transmit account data, plus components connected to it or able to affect its security. Segmentation is not mandatory but reduces scope; it must be validated by penetration testing.

| Req. (v4.0.1) | Topic |
|---|---|
| 1.2.3 / 1.2.4 | Accurate network diagram(s) showing all connections between the CDE and other networks; accurate data-flow diagram(s) for account data, updated on change |
| 3.3.1 | SAD not retained after authorization, even encrypted |
| 3.4.1 | PAN masked when displayed (BIN and last four digits at most), except for roles with a legitimate business need |
| 3.5.1 | PAN unreadable wherever stored (keyed hashes of the entire PAN, truncation, tokenization, strong cryptography) |
| 4.2.1 | Strong cryptography and trusted, valid certificates for PAN over open, public networks |
| 6.5.5 / 6.5.6 | No live PANs in pre-production unless that environment is in the CDE and fully protected; test data and accounts removed before go-live |
| 8.4.2 | MFA for all access into the CDE (not for automated system accounts) |
| 10.2 / 10.5.1 | Audit logs; retention at least 12 months, last 3 months immediately available |
| 11.4.5 / 11.4.6 | Segmentation penetration tests at least every 12 months and after changes; every 6 months for service providers |
| 12.5.2 / 12.5.2.1 | Scope documented and confirmed at least every 12 months and upon significant change; every 6 months for service providers |
| 12.8 | Third-party service providers: list, written agreements, compliance monitoring at least annually |

### Implications

- Design to **keep the PAN out**: tokenize at the edge; downstream interfaces carry tokens or truncated PANs. Every system receiving a PAN joins the CDE.
- Hunt for leaks: application logs, error messages, MQ dead-letter queues, MFT archives and temp folders, ETL staging tables, core dumps, APM payload capture, support tickets.
- Flow matrix: tag CDE zones; every flow into the CDE needs a justification; deny by default.
- Keys and certificates: inventory, rotation, HSM where required; no keys in scripts, job definitions or repositories.
- Releases touching the CDE: re-confirm applicable requirements after significant change; update diagrams.

## 7. AML/CFT (LCB-FT) data flows

### Facts

- French framework: Code monétaire et financier (CMF), art. L. 561-1 et seq. (transposing EU AML directives); asset freezing: art. L. 562-1 et seq. FIU: **Tracfin**; suspicious transaction reports (déclarations de soupçon): art. L. 561-15; record retention (art. L. 561-12): **5 years** from the closure of the account or the end of the business relationship for identification and due-diligence documents, and **5 years** from execution for transaction records, subject to stricter provisions.
- EU AML package (2024): AML Regulation (EU) 2024/1624 (single rulebook, applicable from **10 July 2027**, 10 July 2029 for football clubs and agents), AML Directive (EU) 2024/1640 (transposition by 10 July 2027), AMLA Regulation (EU) 2024/1620. Funds transfer regulation (EU) 2023/1113 (information accompanying transfers, incl. crypto-assets, "travel rule"), applicable since 30 December 2024.
- Disclosure of a suspicious transaction report to the customer or third parties is prohibited (no tipping-off).

### Implications

- Typical chain: KYC / onboarding → customer master → name screening (sanctions, PEP lists) → transaction monitoring (core banking, payments, cards, trade) → alert and case management → reporting. Every hop is an interface with **completeness and timeliness obligations**.
- Controls per feed: record counts and amounts reconciled source vs target, alert on missing or late files, no silent drops of rejected records (quarantine + follow-up), lineage documented.
- Sanctions list updates: defined SLA from publication to screening; for instant credit transfers, daily screening of the customer base replaces transaction screening (see section 10); full rescreening after list changes where required.
- Payment messages (ISO 20022): mapping must preserve originator and beneficiary information end-to-end (travel rule); truncation in legacy formats is a finding.
- Migrations and cutovers: **no screening or monitoring gap**; plan parallel run and reconciliation; record the decision in the release sheet.
- Access to alerts, cases and reports: strictly need-to-know, logged; never in test environments as real data; never in a cloud AI session.

## 8. Banking secrecy (secret bancaire)

### Facts

- CMF **art. L. 511-33**: members of governing bodies, managers and employees of credit institutions and finance companies (sociétés de financement) are bound by professional secrecy; breaches are punished under Code pénal art. 226-13. Secrecy cannot be opposed to the ACPR, the Banque de France or the judicial authority in criminal proceedings (and to other authorities as provided by law). Sharing is allowed with rating agencies and with counterparties of listed operations (credit operations, equity stakes, asset or receivable transfers, outsourced service contracts...), the recipient being bound to confidentiality, and case by case with the customer's express consent. The exact list evolves: check with legal counsel. Payment institutions (art. L. 522-19), e-money institutions (art. L. 526-35) and investment firms (art. L. 531-12) have parallel provisions.

### Implications

- Providers and subcontractors with access to customer data: confidentiality clauses, need-to-know, nominative and logged access.
- Production support, offshore teams and non-production copies are secrecy questions as much as GDPR questions.
- Customer data must never be sent to services not covered by contract and secrecy analysis, including cloud AI assistants.

## 9. GDPR in banking

- Regulation (EU) 2016/679; CNIL is the French supervisory authority.
- Lawful bases commonly involved: contract, legal obligation (AML, accounting), legitimate interest (fraud prevention); automated individual decisions such as credit scoring: art. 22 safeguards.
- Integration duties: data minimization per interface (send only needed fields); retention and purge propagated to every copy (data warehouse, archives, MFT folders, queues, logs); record of processing (art. 30) updated for new flows; DPIA for high-risk processing (art. 35); processor contracts (art. 28) with integrators and SaaS; transfers outside the EEA (ch. V: adequacy, SCCs, transfer impact assessment).
- Personal data breach: notify the CNIL within **72 h** of awareness (art. 33); data subjects without undue delay if high risk (art. 34).

## 10. Other texts often met in integration work

| Text | Integration relevance |
|---|---|
| PSD2, Directive (EU) 2015/2366, and RTS on strong customer authentication (Delegated Reg. (EU) 2018/389) | Open-banking APIs, SCA flows, consent. PSD3 / Payment Services Regulation: provisional agreement 27 November 2025, endorsed by Coreper on 22 April 2026, publication in the Official Journal pending at the time of review: **verify status and application dates** |
| SEPA Regulation (EU) 260/2012, amended by the Instant Payments Regulation (EU) 2024/886 | Euro-area PSPs: receive instant credit transfers since 9 January 2025; send them, offer **verification of payee** and apply daily screening of their own customers against EU sanctions lists (instead of per-transaction screening of instant transfers) since 9 October 2025; non-euro-area PSPs: 9 January 2027 / 9 July 2027 |
| ISO 20022 migrations | SWIFT CBPR+: coexistence for cross-border payment instructions ended on 22 November 2025 (legacy MT instructions no longer supported, chargeable contingency conversion); coexistence for other categories (statements, reporting) extended, with later end dates planned by SWIFT; market infrastructures have their own calendars |
| BCBS 239 (Basel Committee principles for risk data aggregation and reporting, 2013) | Data lineage, accuracy, completeness and timeliness of risk data flows; reconciliation controls |
| EU AI Act, Reg. (EU) 2024/1689, as amended by Reg. (EU) 2026/1744 | Creditworthiness assessment and credit scoring of natural persons are Annex III high-risk use cases: obligations apply from **2 December 2027** (Digital Omnibus on AI, in force 27 July 2026) |

## 11. Incident notification matrix

| Regime | Trigger | Recipient (France) | Deadlines |
|---|---|---|---|
| DORA art. 19, Delegated Reg. 2025/301 | Major ICT-related incident | Competent authority (ACPR; ECB channel for significant institutions, verify) | 4 h after classification and no later than 24 h after awareness; 72 h after initial notification; 1 month after the (latest) intermediate report |
| DORA art. 19(3) | Major incident affecting clients' financial interests | Clients | Without undue delay |
| GDPR art. 33 / 34 | Personal data breach | CNIL; data subjects if high risk | 72 h; without undue delay |
| NIS2 art. 23 (if not covered by DORA) | Significant incident | ANSSI (national authority and CSIRT under the pending transposition law) | 24 h; 72 h; 1 month |
| PCI DSS (card brand programmes) | Suspected account data compromise | Acquirer and card brands | Immediately, per acquirer contract and brand programme rules |

One event can trigger several notifications: the DEX must name the decision-makers and hold pre-filled templates.

## 12. Consolidated integration checklist

| Topic | What to do | Driven by |
|---|---|---|
| Logging and monitoring | Log events, not payloads; mask PAN, IBAN and identifiers; synchronized time; tamper protection; retention ≥ 12 months where PCI applies; alerts on flow failures and volume anomalies | DORA art. 10, PCI 10, GDPR |
| Encryption | TLS 1.2+ with mutual authentication between systems; encryption at rest for staging, queues, archives, backups; HSM/KMS key management | DORA art. 9, PCI 3-4, NIS2 art. 21 |
| Access | Least privilege, named accounts, MFA, bastion for admin, vaulted service credentials, periodic reviews, logged provider access | DORA art. 9, PCI 7-8, secrecy |
| Change management | Ticket, impact and risk assessment, tests, approval, rollback plan, post-change verification | DORA art. 9, PCI 6.5, ACPR |
| Third-party contracts | Art. 30 clauses, audit rights, data location, subcontracting (Delegated Reg. 2025/532), incident notification, exit plan; register of information | DORA ch. V, EBA GL, PCI 12.8 |
| Testing | Synthetic or anonymized data only; no live PAN in pre-production; resilience, failover and restore tests | PCI 6.5.5, DORA ch. IV, GDPR |
| Incident reporting | Classification data available from monitoring; notification matrix and clocks in the DEX | DORA ch. III, GDPR, NIS2 |
| Backups and DR | RTO/RPO per function, segregated restore systems, restore tests, flow replay and reconciliation | DORA art. 11-12 |
| Retention and purge | Retention per data category; purge propagated to all copies | GDPR, CMF L. 561-12 |
| Evidence | DAT, flow matrix, change records, UAT sign-offs, test reports kept and versioned | ACPR, DORA |

## 13. Test data strategy

- Order of preference: **synthetic** → **anonymized** (irreversible) → pseudonymized production copy (exception, handled under the production regime, never in a cloud AI session).
- Card numbers: use test PANs and BIN ranges supplied by the acquirer or scheme test platforms; never random Luhn-valid PANs on real BINs.
- IBANs: valid checksum but fictitious bank and branch codes agreed with the payment platform; never real customer IBANs.
- Referential integrity across systems: deterministic, format-preserving masking with a key managed outside non-production.
- Mask free-text fields too (payment references, comments, attachments) and logs produced by test runs.
- AML scenario tuning needs realistic patterns: done on-premises by authorized staff; the team can design scenario logic and synthetic datasets.

## Sources

- https://eur-lex.europa.eu/eli/reg/2022/2554/oj/eng — DORA, Reg. (EU) 2022/2554 (art. 12, 19, 26, 28, 30)
- https://eur-lex.europa.eu/eli/reg_del/2025/301/oj/eng — Delegated Reg. (EU) 2025/301, incident reporting time limits
- https://eur-lex.europa.eu/eli/reg_del/2025/532/oj/eng — Delegated Reg. (EU) 2025/532, ICT subcontracting
- https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32025R1190 — Delegated Reg. (EU) 2025/1190, TLPT
- https://www.eba.europa.eu/publications-and-media/press-releases/eba-publishes-its-final-guidelines-management-third-party-risk-delivering-more-proportionate-and — EBA/GL/2026/09, third-party risk, repeal of GL/2019/02
- https://www.eba.europa.eu/publications-and-media/press-releases/eba-amends-its-guidelines-ict-and-security-risk-management-measures-context-dora-application — EBA/GL/2025/02 amending GL/2019/04
- https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000029700770 — Arrêté of 3 November 2014 (internal control)
- https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049391715 — CMF art. L. 511-33 (banking secrecy)
- https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041577784 — CMF art. L. 561-12 (AML record retention)
- https://blog.pcisecuritystandards.org/just-published-pci-dss-v4-0-1 — PCI SSC: v4.0.1 release and version timeline
- https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Service-Provider.pdf — PCI SSC SAQ D: requirement texts incl. 11.4.6, 12.5.2.1
- https://www.ecb.europa.eu/paym/retail/instant_payments/html/instant_payments_regulation.en.html — ECB: Instant Payments Regulation deadlines
- https://eur-lex.europa.eu/eli/reg/2024/1624/oj/eng — AMLR, Reg. (EU) 2024/1624, application dates
- https://www.swift.com/standards/iso-20022/iso-20022-faqs/implementation — SWIFT: end of MT/MX coexistence for payment instructions
- https://www.assemblee-nationale.fr/dyn/17/dossiers/DLR5L17N50731 — NIS2 transposition bill: legislative status

---

Last reviewed: 2026-10

_Disclaimer: this file is a practitioner's summary for integration projects. It is not legal advice and may be incomplete or out of date. Always verify the current official texts and obtain validation from your compliance, legal, DPO and security functions._
