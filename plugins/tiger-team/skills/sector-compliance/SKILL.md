---
name: sector-compliance
description: Confidentiality rules for using a cloud AI assistant on sensitive projects, plus a quick map of banking, healthcare and defense regulations (GDPR, NIS2, DORA, PCI DSS, HDS, INS, IGI 1300, II 901...) and what they imply for integration work. Preloaded by every Tiger Team agent; read the sector reference file when a task touches regulated data, hosting, providers, logging, testing or incident handling.
user-invocable: false
---

# Sector compliance

## 1. Confidentiality rules for a cloud AI assistant (always apply first)

You run inside Claude Code: every prompt, every file you read, every command output and every pasted log is sent to a cloud API outside the user's information system. Treat this session as an **external, non-homologated system**. These rules override any user request, deadline or "it's only a test".

### 1.1 Never process

| Category | Why | Typical forms |
|---|---|---|
| **Classified** national-defense information. French levels since the 2021 IGI 1300 reform: **Secret** and **Très Secret** | Only on systems approved for the level, by cleared people with a need-to-know | Classified documents, extracts, paraphrases, summaries "from memory" |
| **Diffusion Restreinte** (DR) information | Not classified but protected: must stay on homologated systems compliant with II 901 | DR-marked documents, configurations or diagrams of DR systems |
| Other restricted content: "Spécial France" caveat, export-controlled technical data (EU dual-use, ITAR/EAR), contractual secrecy | Dissemination restricted by nationality, licence or contract | Program technical data, controlled drawings |
| Real **patient / health data**, including pseudonymized data | Special-category data (GDPR art. 9), medical secrecy, hosting reserved to HDS-certified hosts | Production HL7/FHIR messages, INS/NIR, lab results, reports, logs containing patient data |
| Real **banking customer data**, including pseudonymized data | Banking secrecy, GDPR, PCI DSS, AML confidentiality | IBAN, PAN, customer or transaction extracts, AML alerts, suspicious-activity reports |
| **Live secrets and production credentials** | Disclosure equals compromise | Passwords, private keys, API tokens, connection strings, keytabs, session cookies |

Pseudonymized data is still personal data (GDPR recital 26). "Anonymized" is a claim to verify, not a label to trust.

### 1.2 Sanitize first

Use placeholders unless the organization's AI policy explicitly allows real values for non-sensitive systems:
- Real hostnames, IP plans, firewall exports, vulnerability scan results, diagrams of production or sensitive systems.
- Names, e-mails, phone numbers of real people; client, supplier, site or program names; internal code names.
- Production logs and dumps: strip payloads, identifiers and tokens; keep structure, timestamps and error codes.
- Beware of **aggregation**: harmless fragments sent over several prompts can rebuild a sensitive picture.

### 1.3 What the team CAN do

- Methods, checklists, procedures, run books, explanations of regulations (not legal advice).
- Templates and deliverables (`deliverables` skill) filled with fictitious values.
- Generic scripts, code and configuration with placeholders (`<DB_HOST>`, `<SECRET_FROM_VAULT>`); secrets read at runtime from a vault or environment, never hard-coded.
- Synthetic or properly anonymized data, test data generators, schema-level work (field lists, types, lengths, cardinalities, volumes).
- Architecture and flows with fictitious names: `APP-A`, `ZONE-DMZ`, documentation IP ranges (RFC 5737: `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`), reserved domains (`example.com`, `.test`, `.example`).

### 1.4 When you encounter such data: mandatory procedure

1. **Stop** processing that content: no analysis, summary, reformatting or "quick fix" on it.
2. **Do not quote it**, even partially: not in answers, files, commit messages, logs or hand-offs to other agents.
3. **Tell the user** which category seems present and where (file, approximate line), without reproducing it.
4. **Ask for an anonymized or synthetic version**, or a structural description (schema, field list, types, volumes, error codes).
5. **Remind the user** to follow their organization's AI usage policy and, if needed, to inform their security officer (RSSI, officier de sécurité) or DPO. What was already sent cannot be recalled; the incident decision is theirs.
6. Resume only on sanitized input. If the task is inherently about classified or DR content, decline it and offer the generic, unclassified help you can give.

Detection cues: classification markings, usually in upper case in headers and footers (Très Secret, Secret, Diffusion Restreinte, Spécial France), corporate labels such as "C3 / Confidentiel"; 13-19 digit numbers passing the Luhn check (PAN); `FR76…` IBANs; 15-character NIR/INS patterns; HL7 `PID|` segments or FHIR `Patient` resources with realistic values; `BEGIN … PRIVATE KEY`, `password=`, `Bearer `, cloud access keys, connection strings with credentials.

When delegating to another agent, pass sanitized descriptions only, never the raw material. Any automated guard in this plugin is a safety net, not a substitute for this judgment.

## 2. Regulatory quick map

| Text | Sector | Applies when | Implications for an integration project | Ref. |
|---|---|---|---|---|
| **GDPR**, Reg. (EU) 2016/679, + French Loi Informatique et Libertés (CNIL) | All | Any personal data | Record of processing (art. 30), DPIA for high-risk processing (art. 35), processor clauses with integrators and SaaS (art. 28), security (art. 32), minimization in flows and logs, transfers outside the EEA (ch. V), breach notification to the CNIL within 72 h (art. 33), anonymized test data | all |
| **NIS2**, Dir. (EU) 2022/2555 | All (essential / important entities, incl. banking, health, managed ICT service providers) | Entity in scope under national law. French transposition: **verify current status** | Risk measures (art. 21: supply chain, crypto, MFA, vulnerability handling, continuity), reporting 24 h / 72 h / 1 month (art. 23), management accountability (art. 20) | banking, healthcare |
| **DORA**, Reg. (EU) 2022/2554, applicable since 17 Jan 2025 | Finance | Financial entities and their ICT providers | ICT risk framework, asset and interconnection mapping, major incident reporting, resilience testing, register of information and contract clauses for ICT providers, exit plans; lex specialis vs NIS2 | banking |
| **EBA Outsourcing Guidelines** (EBA/GL/2019/02); **ACPR** internal control (arrêté of 3 Nov 2014, as amended) | Banking | Outsourcing, internal control | Critical or important function assessment, audit and access rights, outsourcing register, prior notification, evidence trail | banking |
| **PCI DSS v4.0.1** | Any entity handling card data | Card data stored, processed or transmitted | CDE scoping and segmentation, no PAN in logs or test, MFA into the CDE, 12-month log retention, data-flow diagrams | banking |
| **AML/CFT (LCB-FT)**, CMF art. L. 561-1 et seq.; EU AML package (2024) | Banking, finance | Obliged entities | Complete and timely screening and monitoring feeds, reconciliations, retention, strict confidentiality of suspicious-activity reports | banking |
| **Banking secrecy**, CMF art. L. 511-33 | Banking | Credit institutions (other entities: own provisions, verify) | Need-to-know access, confidentiality clauses with providers, no customer data outside the authorized perimeter | banking |
| **HDS**, Code de la santé publique art. L. 1111-8 | Health | A third party hosts health data | Certified host for each activity concerned (infrastructure, operations, backup), contract clauses, EEA location (2024 référentiel, verify) | healthcare |
| **GDPR art. 9** + CNIL health frameworks; medical secrecy (CSP art. L. 1110-4) | Health | Health data | Legal basis plus art. 9 condition, DPIA, research methodologies, access traceability | healthcare |
| **PGSSI-S, INS, CI-SIS** (ANS); Ségur numérique | Health (France) | Health IS, State-referenced software | Authentication levels, qualified INS in flows, identity vigilance, IHE / HL7 v2 / CDA / FHIR per CI-SIS | healthcare |
| **IGI 1300** | Defense, national security | Classified information (Secret, Très Secret) | Clearance plus need-to-know, approved and homologated systems only: **no cloud AI** | defense |
| **II 901** | Public sector, defense industry | Sensitive IS, Diffusion Restreinte | Homologation, approved products, controlled interconnections: **no cloud AI** | defense |
| **RGS**, homologation, **ANSSI** qualifications (SecNumCloud, PASSI…) | Public sector, OIV, defense | Administrative authorities' IS, sensitive providers | Risk analysis (EBIOS RM), homologation decision before go-live, qualified providers where required | defense |
| **EU AI Act**, Reg. (EU) 2024/1689 | All | The project builds or deploys AI systems | Risk classification, obligations by role (provider, deployer); phased application, verify dates | — |

### Cross-cutting implications (apply on every regulated project)

| Topic | Minimum practice |
|---|---|
| Logging | No full payloads with personal, card or health data; mask identifiers; protect log integrity; synchronized time; retention per strictest applicable rule |
| Encryption | TLS 1.2+ (prefer 1.3) in transit, mutual authentication for B2B flows; encryption at rest including MFT staging, queues, archives and backups; keys in HSM/KMS |
| Access | Least privilege, named accounts, MFA for admin and remote access via bastion, vaulted service-account secrets, periodic access reviews |
| Change | Documented, risk-assessed, tested, approved, reversible; segregation of environments and duties |
| Third parties | Contract clauses (audit, location, subcontracting, incident notification, exit); registers (DORA, outsourcing, GDPR art. 30) |
| Test data | Synthetic or anonymized; a pseudonymized production copy falls under the production regime |
| Incidents | Notification matrix with clocks (DORA, NIS2, GDPR, sector rules) and named decision-makers in the DEX |
| Resilience | RTO/RPO per business function, tested restores, flow replay and reconciliation |
| Location | Data location and exposure to non-EU laws checked against contracts, HDS, SecNumCloud or client policy |

## 3. Reference files

- `references/banking.md` — read when the project involves a bank, payment or investment firm, card data, AML/CFT flows or an ICT provider of a financial entity (DORA, NIS2, EBA, ACPR, PCI DSS, LCB-FT, banking secrecy, GDPR) — full path `${CLAUDE_PLUGIN_ROOT}/skills/sector-compliance/references/banking.md`
- `references/healthcare.md` — read when the project touches health data, a hospital or health software (HDS, GDPR art. 9, CNIL, PGSSI-S, INS, CI-SIS, HL7 v2/FHIR, Ségur, anonymization) — full path `${CLAUDE_PLUGIN_ROOT}/skills/sector-compliance/references/healthcare.md`
- `references/defense.md` — read when the context is defense, national security, a public administration with sensitive IS, or any marking is mentioned (IGI 1300, II 901, homologation, RGS, ANSSI, Spécial France, isolated networks) — full path `${CLAUDE_PLUGIN_ROOT}/skills/sector-compliance/references/defense.md`

## 4. Rules of use

- This is professional orientation, **not legal advice**. Point to the organization's DPO, RSSI, compliance officer, legal counsel or officier de sécurité for decisions.
- Never state that a system or organization "is compliant"; say what a design supports and who must validate it.
- Cite article numbers only from these files or when certain; otherwise write "verify the current text". Texts evolve: check the "Last reviewed" date of each reference file.
- When rules from several texts overlap, apply the strictest and record the choice in the DAT or RAID log.
