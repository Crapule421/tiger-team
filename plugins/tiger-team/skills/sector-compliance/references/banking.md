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
- Article numbers are given where reliable. Anything marked **verify** must be checked against the official source (EUR-Lex, Légifrance, PCI SSC, EBA, ACPR websites).

## 2. DORA: Regulation (EU) 2022/2554

### Facts

- Regulation on digital operational resilience for the financial sector, **applicable since 17 January 2025**, directly applicable (no transposition). Companion Directive (EU) 2022/2556 amends sectoral directives.
- Scope (art. 2): credit institutions, payment and e-money institutions, investment firms, crypto-asset service providers, CSDs, CCPs, trading venues, insurers and reinsurers, among others. Proportionality principle (art. 4); simplified ICT risk framework for certain smaller entities (art. 16).
- French competent authorities: ACPR for banks and insurers, AMF for entities under its supervision; ECB involvement for significant institutions under the SSM. Verify the reporting channel for your entity.

| Pillar | Articles | Core obligations |
|---|---|---|
| ICT risk management | Ch. II, art. 5-16 | Management-body accountability (art. 5); ICT risk framework (art. 6); identification of ICT and information assets and their interconnections and dependencies (art. 8); protection and prevention, incl. ICT change management (art. 9); detection (art. 10); response and recovery, ICT business continuity (art. 11); backup, restoration and recovery (art. 12); learning (art. 13); communication (art. 14) |
| ICT incident management, classification, reporting | Ch. III, art. 17-23 | Incident management process, classification by criteria, reporting of major incidents to the competent authority (art. 19), voluntary notification of significant cyber threats, information of affected clients |
| Digital operational resilience testing | Ch. IV, art. 24-27 | Risk-based testing programme; ICT systems supporting critical or important functions tested at least yearly; threat-led penetration testing (TLPT) at least every 3 years for designated entities (art. 26) |
| ICT third-party risk | Ch. V, art. 28-44 | Third-party risk strategy; **register of information** on all contractual arrangements for ICT services (art. 28(3)); pre-contract assessment and concentration risk (art. 29); mandatory contract clauses (art. 30); exit strategies; EU oversight of critical ICT third-party providers (art. 31-44) |
| Information sharing | Ch. VI, art. 45 | Voluntary cyber-threat intelligence sharing arrangements |

- **Level 2 texts** (RTS/ITS) carry the details, e.g. ICT risk management framework (Delegated Reg. (EU) 2024/1774), incident classification criteria (Delegated Reg. (EU) 2024/1772), register-of-information templates (Implementing Reg. (EU) 2024/2956), incident reporting content, templates and time limits, TLPT, subcontracting. **Verify the current list and numbering on EUR-Lex.**
- **Major incident reporting time limits** (reporting RTS, verify): initial notification within **4 hours** of classification as major and no later than **24 hours** after becoming aware of the incident; intermediate report within **72 hours** of the initial notification; final report within **1 month** of the latest intermediate report.
- **Classification criteria** include clients, counterparts and transactions affected, reputational impact, duration and service downtime, geographical spread, data losses, criticality of services affected, economic impact. Thresholds are in the classification RTS (verify).
- **Contract clauses (art. 30)**: description of services; locations where services are provided and data processed and stored; availability, authenticity, integrity and confidentiality provisions; access, recovery and return of data on termination or insolvency; service levels; assistance in ICT incidents; cooperation with authorities; termination rights. For **critical or important functions**, additionally: precise quantitative SLAs, notice and reporting duties, business contingency plans and their testing, participation in TLPT, unrestricted rights of access, inspection and audit, exit strategies with a mandatory transition period.

### Implications for integration work

- Classify each interface, batch chain and platform against the business functions it supports; flag those supporting **critical or important functions (CIF)**. Flow matrices and interface contracts are evidence of interconnection mapping (art. 8).
- Any new SaaS, API platform, MFT service, managed scheduler, cloud or outsourced run = **ICT third-party arrangement**: register entry, art. 30 clauses, exit plan, concentration-risk check, all **before signature**, not after go-live.
- Change management (art. 9): documented, risk-assessed, tested, approved, traceable, with rollback. Release sheets and UAT sign-offs are evidence.
- Detection (art. 10): monitor failures, latency, volumes and anomalies on flows. Logs must allow incident classification: transactions failed or delayed, clients affected, duration, data lost.
- Response and recovery (art. 11-12): RTO/RPO per function; restoration on systems segregated from the source (art. 12, verify wording); restore tests; replay and reconciliation procedures for flows after an outage (idempotence keys, sequence control, control totals).
- Testing (art. 24-25): include interfaces in vulnerability scanning, end-to-end, performance and failover tests.
- Incident run books include the DORA clock and name who decides the "major" classification (the entity, not the integrator alone).

## 3. NIS2: Directive (EU) 2022/2555

### Facts

- Replaces NIS1 (Directive (EU) 2016/1148). Transposition deadline: 17 October 2024. **French transposition: verify current status** (bill on the resilience of critical infrastructure and cybersecurity, implementing decrees, ANSSI guidance).
- Essential and important entities, by sector (Annexes I and II) and size. Banking and financial market infrastructures are Annex I sectors. **Managed ICT service providers (MSP, MSSP)** are also covered: an integrator or managed-service provider may itself be in scope.
- Management bodies approve and oversee the measures and can be held liable (art. 20).
- Minimum measures (art. 21(2)): risk analysis and IS security policies; incident handling; business continuity (backup, disaster recovery, crisis management); supply-chain security; security in acquisition, development and maintenance, incl. vulnerability handling and disclosure; effectiveness assessment; cyber hygiene and training; cryptography and encryption; HR security, access control, asset management; MFA or continuous authentication, secured communications.
- Significant incidents (art. 23): early warning within **24 h**, incident notification within **72 h**, final report within **1 month**; intermediate reports on request.
- For financial entities in DORA scope, DORA applies as a sector-specific act (NIS2 art. 4) for risk management and incident reporting. Verify how national law treats your entity.

### Implications

- Entity in DORA scope: follow DORA; NIS2 remains relevant for group entities or providers outside DORA.
- As a provider: expect supply-chain clauses (security requirements, audit, incident notification, vulnerability disclosure) and check your own NIS2 status.

## 4. EBA Guidelines on outsourcing arrangements (EBA/GL/2019/02)

### Facts

- Published February 2019, applicable since 30 September 2019, to credit institutions, investment firms subject to CRD, payment and e-money institutions. They replaced the CEBS 2006 guidelines and the EBA recommendations on cloud outsourcing.
- Key concepts: definition of outsourcing; assessment of **critical or important functions**; outsourcing policy; pre-outsourcing analysis (due diligence, risk assessment incl. concentration); written agreement with **access, information and audit rights** for the institution and the competent authority; conditions for sub-outsourcing; data and service location; termination rights; **exit strategies**; ongoing monitoring; **outsourcing register**; prior notification to the competent authority of planned outsourcing of critical or important functions.
- Interplay with DORA: ICT services now fall under DORA ch. V; the guidelines remain relevant for non-ICT outsourcing and governance. EBA alignment work with DORA: **verify current status**. The EBA Guidelines on ICT and security risk management (EBA/GL/2019/04) are largely superseded by DORA for entities in its scope: verify which parts still apply.

### Implications

- Before contracting: is it outsourcing? an ICT service? a critical or important function? The answer drives contract clauses, register entries and regulator notification lead time (track it in the RAID log).
- Audit and access rights must extend down the subcontracting chain that touches the data or the service.
- The exit plan must be technically feasible: export formats, interface re-pointing, parallel run. Document it in the DAT.

## 5. ACPR expectations (France)

### Facts

- The ACPR (Autorité de contrôle prudentiel et de résolution, attached to the Banque de France) supervises banks, insurers, payment and e-money institutions; significant banks are supervised directly by the ECB within the SSM, with ACPR participation.
- Main French internal-control text: **arrêté du 3 novembre 2014** relatif au contrôle interne des entreprises du secteur de la banque, des services de paiement et des services d'investissement, amended since (notably to integrate EBA outsourcing and ICT guidelines). **Verify the consolidated version on Légifrance.**
- Concepts expected: permanent and periodic control (three lines of defence), risk mapping including IT and operational risks, IS security policy, tested business continuity plans, framework for essential outsourced services, data quality, incident management and reporting, management-body oversight.
- Inspections request evidence: change records, access reviews, test evidence, incident files, continuity test reports, provider contracts and their monitoring.

### Implications

- Build audit-ready evidence as you go: approved DAT, flow matrix with justifications, change tickets linked to release sheets, UAT sign-offs, service-account access reviews, restore-test reports.
- Segregation of duties: developers do not deploy to production alone; integrator access to production is nominative, time-bound and logged.
- Raise any offshore support or cloud processing early with compliance and risk (outsourcing and secrecy impacts).

## 6. PCI DSS v4.x

### Facts

- Standard of the PCI Security Standards Council, enforced contractually through card brands and acquirers. v4.0 published March 2022; **v4.0.1** (June 2024) current at the time of review; v3.2.1 retired 31 March 2024; the v4 "future-dated" requirements mandatory since 31 March 2025. Verify whether a newer revision exists.
- **Account data** = cardholder data (PAN, cardholder name, expiration date, service code) + sensitive authentication data (SAD: full track data, card verification code, PIN / PIN block).
- **CDE** (cardholder data environment): people, processes and system components that store, process or transmit account data, plus components connected to it or able to affect its security. Segmentation is not mandatory but reduces scope; it must be validated by penetration testing.

| Req. (v4.0.1, verify) | Topic |
|---|---|
| 1.2.3 / 1.2.4 | Accurate network diagram(s) and data-flow diagram(s) for account data |
| 3.3.1 | SAD not retained after authorization, even encrypted |
| 3.4.1 | PAN masked when displayed, except for roles with a business need |
| 3.5.1 | PAN unreadable wherever stored (truncation, tokenization, strong cryptography, keyed hashes) |
| 4.2.1 | Strong cryptography for PAN over open, public networks |
| 6.5.5 / 6.5.6 | No live PANs in pre-production; test data and accounts removed before go-live |
| 8.4.2 | MFA for all access into the CDE |
| 10.2 / 10.5.1 | Audit logs; retention at least 12 months, last 3 months immediately available |
| 11.4.5 / 11.4.6 | Segmentation tests at least every 12 months (every 6 months for service providers) and after changes |
| 12.5.2 | Scope confirmed at least every 12 months and upon significant change |
| 12.8 | Third-party service providers: list, written agreements, compliance monitoring |

### Implications

- Design to **keep the PAN out**: tokenize at the edge; downstream interfaces carry tokens or truncated PANs. Every system receiving a PAN joins the CDE.
- Hunt for leaks: application logs, error messages, MQ dead-letter queues, MFT archives and temp folders, ETL staging tables, core dumps, APM payload capture, support tickets.
- Flow matrix: tag CDE zones; every flow into the CDE needs a justification; deny by default.
- Keys and certificates: inventory, rotation, HSM where required; no keys in scripts, job definitions or repositories.
- Releases touching the CDE: re-confirm applicable requirements after significant change; update diagrams.

## 7. AML/CFT (LCB-FT) data flows

### Facts

- French framework: Code monétaire et financier (CMF), art. L. 561-1 et seq. (transposing EU AML directives); asset freezing: art. L. 562-1 et seq. FIU: **Tracfin**; suspicious transaction reports (déclarations de soupçon): art. L. 561-15; record retention of **5 years** after the end of the relationship or the transaction: art. L. 561-12 (verify exact scope).
- EU AML package (2024): AML Regulation (EU) 2024/1624 (single rulebook, mostly applicable from **10 July 2027**, verify), AML Directive (EU) 2024/1640, AMLA Regulation (EU) 2024/1620. Funds transfer regulation (EU) 2023/1113 (information accompanying transfers, incl. crypto-assets, "travel rule"), applicable since 30 December 2024.
- Disclosure of a suspicious transaction report to the customer or third parties is prohibited (no tipping-off).

### Implications

- Typical chain: KYC / onboarding → customer master → name screening (sanctions, PEP lists) → transaction monitoring (core banking, payments, cards, trade) → alert and case management → reporting. Every hop is an interface with **completeness and timeliness obligations**.
- Controls per feed: record counts and amounts reconciled source vs target, alert on missing or late files, no silent drops of rejected records (quarantine + follow-up), lineage documented.
- Sanctions list updates: defined SLA from publication to screening; full rescreening of the customer base after list changes where required.
- Payment messages (ISO 20022): mapping must preserve originator and beneficiary information end-to-end (travel rule); truncation in legacy formats is a finding.
- Migrations and cutovers: **no screening or monitoring gap**; plan parallel run and reconciliation; record the decision in the release sheet.
- Access to alerts, cases and reports: strictly need-to-know, logged; never in test environments as real data; never in a cloud AI session.

## 8. Banking secrecy (secret bancaire)

### Facts

- CMF **art. L. 511-33**: members of governing bodies and employees of credit institutions are bound by professional secrecy; breaches are punished under Code pénal art. 226-13. Exceptions exist (supervisory authorities, judicial authorities in criminal proceedings, tax and other authorities as provided by law) and sharing is allowed in specific cases such as certain outsourcing or intra-group operations, under conditions: **verify the exact list with legal counsel**. Payment, e-money and investment firms have their own secrecy provisions (verify).

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
| PSD2, Directive (EU) 2015/2366, and RTS on strong customer authentication (Delegated Reg. (EU) 2018/389) | Open-banking APIs, SCA flows, consent. PSD3 / Payment Services Regulation: verify status |
| SEPA Regulation (EU) 260/2012, amended by the Instant Payments Regulation (EU) 2024/886 | 24/7 instant credit transfers within seconds, verification of payee, sanctions checks on the customer base at least daily instead of per-transaction screening for instant payments (verify deadlines and details) |
| ISO 20022 migrations (SWIFT cross-border, market infrastructures) | MT to MX mapping, data truncation risks, coexistence period (verify end dates per infrastructure) |
| BCBS 239 (Basel Committee principles for risk data aggregation and reporting, 2013) | Data lineage, accuracy, completeness and timeliness of risk data flows; reconciliation controls |
| EU AI Act, Reg. (EU) 2024/1689 | Credit scoring of natural persons is a high-risk use case; relevant if the project integrates such models (verify dates) |

## 11. Incident notification matrix

| Regime | Trigger | Recipient (France) | Deadlines |
|---|---|---|---|
| DORA art. 19 | Major ICT-related incident | Competent authority (ACPR; ECB channel for significant institutions, verify) | 4 h after classification / 24 h after awareness; 72 h; 1 month |
| DORA art. 19(3) | Major incident affecting clients' financial interests | Clients | Without undue delay |
| GDPR art. 33 / 34 | Personal data breach | CNIL; data subjects if high risk | 72 h; without undue delay |
| NIS2 art. 23 (if not covered by DORA) | Significant incident | National authority / CSIRT (ANSSI, verify) | 24 h; 72 h; 1 month |
| PCI DSS (card brand programmes) | Suspected account data compromise | Acquirer and card brands | Immediately, per contract and brand rules (verify) |

One event can trigger several notifications: the DEX must name the decision-makers and hold pre-filled templates.

## 12. Consolidated integration checklist

| Topic | What to do | Driven by |
|---|---|---|
| Logging and monitoring | Log events, not payloads; mask PAN, IBAN and identifiers; synchronized time; tamper protection; retention ≥ 12 months where PCI applies; alerts on flow failures and volume anomalies | DORA art. 10, PCI 10, GDPR |
| Encryption | TLS 1.2+ with mutual authentication between systems; encryption at rest for staging, queues, archives, backups; HSM/KMS key management | DORA art. 9, PCI 3-4, NIS2 art. 21 |
| Access | Least privilege, named accounts, MFA, bastion for admin, vaulted service credentials, periodic reviews, logged provider access | DORA art. 9, PCI 7-8, secrecy |
| Change management | Ticket, impact and risk assessment, tests, approval, rollback plan, post-change verification | DORA art. 9, PCI 6.5, ACPR |
| Third-party contracts | Art. 30 clauses, audit rights, data location, subcontracting, incident notification, exit plan; register of information | DORA ch. V, EBA GL, PCI 12.8 |
| Testing | Synthetic or anonymized data only; no live PAN in pre-production; resilience, failover and restore tests | PCI 6.5.5, DORA ch. IV, GDPR |
| Incident reporting | Classification data available from monitoring; notification matrix and clocks in the DEX | DORA ch. III, GDPR, NIS2 |
| Backups and DR | RTO/RPO per function, segregated backups, restore tests, flow replay and reconciliation | DORA art. 11-12 |
| Retention and purge | Retention per data category; purge propagated to all copies | GDPR, CMF L. 561-12 |
| Evidence | DAT, flow matrix, change records, UAT sign-offs, test reports kept and versioned | ACPR, DORA |

## 13. Test data strategy

- Order of preference: **synthetic** → **anonymized** (irreversible) → pseudonymized production copy (exception, handled under the production regime, never in a cloud AI session).
- Card numbers: use test PANs and BIN ranges supplied by the acquirer or scheme test platforms; never random Luhn-valid PANs on real BINs.
- IBANs: valid checksum but fictitious bank and branch codes agreed with the payment platform; never real customer IBANs.
- Referential integrity across systems: deterministic, format-preserving masking with a key managed outside non-production.
- Mask free-text fields too (payment references, comments, attachments) and logs produced by test runs.
- AML scenario tuning needs realistic patterns: done on-premises by authorized staff; the team can design scenario logic and synthetic datasets.

---

Last reviewed: 2026-10

_Disclaimer: this file is a practitioner's summary for integration projects. It is not legal advice and may be incomplete or out of date. Always verify the current official texts and obtain validation from your compliance, legal, DPO and security functions._
