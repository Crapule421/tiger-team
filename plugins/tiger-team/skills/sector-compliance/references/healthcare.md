# Healthcare: regulatory reference for integration projects (France / EU)

_Scope: hospitals, clinics, laboratories, imaging centers, medico-social structures, health software vendors and their hosting or integration providers. Read together with the confidentiality rules in `${CLAUDE_PLUGIN_ROOT}/skills/sector-compliance/SKILL.md`: **no real patient data, even pseudonymized, in this session**. Work on message structures with fictitious values._

## Contents

1. Actors and vocabulary
2. HDS certification (Hébergeur de Données de Santé)
3. GDPR art. 9, CNIL framework and medical secrecy
4. PGSSI-S and authentication of health professionals
5. INS (Identité Nationale de Santé) and identity vigilance
6. CI-SIS interoperability framework
7. HL7 v2, CDA and FHIR in France
8. Ségur numérique
9. Pseudonymization vs anonymization
10. Test data strategy
11. Security incidents and NIS2
12. Other texts to check
13. Consolidated integration checklist

## 1. Actors and vocabulary

| Actor | Role for an integration project |
|---|---|
| ANS (Agence du numérique en santé) | Publishes the CI-SIS, PGSSI-S, HDS procedure, Ségur referencing specifications; operates national services (e.g. Pro Santé Connect, IGC Santé, directories) |
| DNS (Délégation au numérique en santé) | Ministry-level steering of health digital policy, "doctrine du numérique en santé" |
| CNIL | Data protection authority: frameworks, authorizations, controls |
| CNAM (Assurance Maladie) | Operates the INSi teleservice, DMP / Mon espace santé |
| ARS (agences régionales de santé) | Regional authorities; receive security incident reports from health establishments |
| CERT Santé (ANS) | Support and alerting for health-sector security incidents |
| Interop'Santé | French HL7 affiliate; maintains French extensions (e.g. IHE PAM France), HPRIM specifications and FHIR profiles (e.g. FR Core); verify current ownership of each specification |

## 2. HDS certification

### Facts

- **Code de la santé publique (CSP) art. L. 1111-8**: any person hosting personal health data collected during prevention, diagnosis, care or medico-social follow-up activities, **on behalf of** the persons or organizations that produced or collected them (or of the patient), must be HDS-certified (certification regime since 2018, decree n° 2018-137 of 26 February 2018). Verify the exact scope and exceptions in the current text.
- The certification covers six activities: (1) provision and maintenance of physical sites hosting the infrastructure; (2) provision and maintenance of hardware infrastructure; (3) provision and maintenance of virtual infrastructure; (4) provision and maintenance of the application hosting platform; (5) administration and operation of the information system containing health data; (6) backup of health data. Two certificate types: physical infrastructure host (activity 1) and managed host (hébergeur infogéreur, activities 2-6).
- Granted by accredited certification bodies, based on an ISO/IEC 27001 information security management system plus health-specific requirements.
- A **revised HDS référentiel was published in 2024**, notably adding requirements on storing health data within the EEA and on transparency about transfers and exposure to non-EU legal access, with transition periods for already-certified hosts. **Verify the current version, application dates and requirements on the ANS website.**
- The host contract must contain mandatory clauses (services, certified activities, location, security, subcontractors, reversibility, incident notification); verify the list in the CSP.

### Implications for integration work

- For each component that **stores** health data (databases, file shares, **MFT staging, message queues with persistence, integration engine stores, logs, monitoring payload captures, backups**), identify who operates it and on whose behalf. A third party performing one of the six activities likely needs HDS for that activity. Transient persistence can bring a component into scope: verify with the ANS HDS FAQ and legal.
- SaaS, PaaS and managed integration platforms: check the certificate scope (which activities, which sites) and the subcontracting chain, not just the logo.
- Remote support and run by a vendor on health data = activity 5: HDS needed for the vendor if done on behalf of the controller.
- Reversibility: export formats and procedures must be specified in the contract and the DAT.

## 3. GDPR art. 9, CNIL framework and medical secrecy

### Facts

- Health data is a **special category** (GDPR art. 9, definition art. 4(15)): processing is prohibited unless an art. 9(2) condition applies, e.g. (h) preventive medicine, diagnosis, care and management of health systems; (i) public health; (j) scientific research, with appropriate safeguards. France maintains additional conditions in the Loi Informatique et Libertés (art. 9(4) GDPR).
- **DPIA** required for large-scale processing of special categories (art. 35(3)(b)). Records of processing (art. 30), security (art. 32), processor contracts (art. 28), breach notification within 72 h (art. 33).
- CNIL frameworks: reference methodologies (MR-001 to MR-006) for health research and the corresponding formalities; framework for health data warehouses (entrepôts de données de santé); sector frameworks for care providers. Processing outside these frameworks may require a CNIL authorization: verify which applies.
- **Medical secrecy**: CSP art. L. 1110-4 (privacy and confidentiality of health information; sharing within the care team under conditions).

### Implications

- Every new flow or data store: lawful basis + art. 9 condition documented, DPIA updated, data minimization per interface (only needed fields to each recipient).
- Access traceability: who accessed which patient record, when; logs themselves contain health data and are hosted under the same regime.
- Research or secondary-use extractions (data warehouse, AI projects): separate legal analysis; pseudonymization by a trusted party; no direct identifiers in research datasets.

## 4. PGSSI-S and authentication of health professionals

### Facts

- **PGSSI-S** (Politique générale de sécurité des systèmes d'information de santé), published by the ANS: principles, référentiels (e.g. electronic identification of health and medico-social actors, electronic identification of patients/users, traceability and imputability) and practical guides (e.g. remote interventions on health IS, continuity, access rights management). Some référentiels are made **enforceable (opposables)** by order, with transition deadlines; health IS must comply with the interoperability and security référentiels (CSP art. L. 1110-4-1, verify). **Verify the current list and deadlines on the ANS website.**
- Professional authentication: CPS smart card, e-CPS mobile app, **Pro Santé Connect** (national OpenID Connect identity federation for health professionals). Professional identifiers: **RPPS**; establishments: **FINESS**; national directory: Annuaire Santé.
- **IGC Santé**: ANS public key infrastructure issuing certificates for health actors and servers (e.g. for mutual TLS and signing).

### Implications

- Applications exposing health data to professionals: authentication level per the electronic identification référentiel; plan Pro Santé Connect / CPS integration early (test environments, certificates, onboarding lead times).
- System-to-system flows: mutual TLS with appropriate certificates (IGC Santé where required by the national service), no shared technical accounts across organizations.
- Vendor remote maintenance: follow the PGSSI-S remote-intervention rules (controlled, traced, time-bound access).

## 5. INS (Identité Nationale de Santé) and identity vigilance

### Facts

- Referencing health data with the INS has been **mandatory since 1 January 2021** (decree n° 2019-1036 of 8 October 2019). The NIR is used as the health identifier (CSP art. L. 1111-8-1, verify).
- INS = **matricule INS** (the person's NIR, or NIA when no NIR) with its **OID**, plus the **strict traits**: birth name, first birth first name and list of birth first names, date of birth, sex, place of birth code (INSEE). Used name and used first name are not strict traits.
- Retrieved and verified through the **INSi teleservice** (CNAM), from the Carte Vitale or from traits.
- Identity statuses (RNIV): **provisional**, **retrieved**, **validated**, **qualified**. Only a **qualified** identity (identity validated against a high-trust document **and** INS retrieved/verified via INSi) allows the INS to be used to reference and share data.
- **RNIV** (Référentiel national d'identitovigilance) sets common identity vigilance rules; establishments run an identity-vigilance function (cellule d'identitovigilance).

### Implications

- Identity is the first integration risk in health: a collision or wrong merge spreads one patient's data into another's record.
- Interfaces must carry the INS with its OID, the identity status and the strict traits as specified; consumers must not "upgrade" a status they did not establish.
- Distinguish local identifiers (IPP per establishment, with their own assigning authority/OID) from the INS; keep both.
- Handle identity events end-to-end: merge, link/unlink, trait correction, status change; define and test the expected behavior in every downstream system (lab, imaging, pharmacy, billing, data warehouse).
- Test with the **test identities and test environment provided for INSi**, never with real patients' traits. Exact OIDs and codes: verify in the CI-SIS / national guides.

## 6. CI-SIS interoperability framework

### Facts

- **CI-SIS** (Cadre d'interopérabilité des systèmes d'information de santé), published by the ANS, profiles international standards (IHE, HL7 v2, HL7 CDA R2, HL7 FHIR, DICOM) for French use, organized in layers: **transport**, **service** and **content**, with thematic specifications ("volets").
- Examples of profiles referenced: IHE XDS.b / XDM for document sharing and exchange (DMP / Mon espace santé, MSSanté), IHE PAM with its French extension for patient administration and movements, IHE PIX/PDQ for identity, CDA-based content models (structured reports, e.g. biology), FHIR-based specifications for newer services. **Verify the current volets and versions.**
- Documents sent to the DMP: CDA R2 at level 1 (unstructured body, e.g. embedded PDF) or level 3 (structured body), per document type requirements.
- **MSSanté**: secure health messaging space for professionals, establishments and patients (via Mon espace santé).

### Implications

- Interface contracts must cite the CI-SIS volet, its version and the conformance rules; test against official validators/test tools where available.
- Terminology: use the code systems and value sets required by the volet (e.g. LOINC for biology, national nomenclatures); maintain mapping tables under change control.

## 7. HL7 v2, CDA and FHIR in France

- **HL7 v2** (mostly v2.5 with IHE profiles) dominates intra-hospital integration: ADT (patient administration and movements per IHE PAM France, with French Z-segments, e.g. ZBE for movements; verify the current specification), orders and results (ORM/OML, ORU), scheduling (SIU), billing feeds.
- **HPRIM** (HPRIM Santé, HPRIM XML) remains common for lab results and legacy flows, especially to private practitioners; plan its coexistence and migration.
- **CDA R2** for clinical documents shared nationally (DMP, MSSanté).
- **FHIR** (mainly R4) is growing: French core profiles (FR Core by Interop'Santé), ANS implementation guides for national services and directories. Verify which FHIR version and IG each partner supports.
- Integration engine practices: canonical model, version every mapping, ACK handling (AA/AE/AR) with replay, message sequence per patient, idempotence on movements, dead-letter queues hosted under the HDS regime, alerting on queue growth.

## 8. Ségur numérique

- Digital component of the "Ségur de la santé" (2020): major State funding to generalize secure sharing of health data (DMP / Mon espace santé, MSSanté, INS, Pro Santé Connect, e-prescription).
- Software vendors obtain **referencing** against ANS specifications (Dossiers de spécifications de référencement, DSR) by "corridor" (hospital, biology, imaging, primary care, pharmacy, medico-social) and by successive waves. **Verify the current wave and requirements.**
- Implications: software versions deployed must be the referenced ones; interfaces must keep INS, DMP and MSSanté features working end-to-end; regression tests on these functions in every release.

## 9. Pseudonymization vs anonymization

| | Pseudonymization | Anonymization |
|---|---|---|
| Definition | Data can no longer be attributed to a person without additional information kept separately (GDPR art. 4(5)) | Re-identification impossible by any reasonably likely means (GDPR recital 26) |
| Legal status | **Still personal data**, still health data: GDPR, HDS, secrecy apply | Outside GDPR scope, if truly anonymous |
| Reversible | Yes, with the key or table | No |
| Typical use | Research, data warehouses, cross-system linkage | Open data, statistics, some test data |

- The WP29 Opinion 05/2014 on anonymisation techniques (endorsed by the EDPB) assesses three risks: **singling out**, **linkability**, **inference**. EDPB guidelines on pseudonymisation were adopted in 2025 (verify final status); CNIL guidance on anonymisation exists.
- Health data is hard to anonymize: rare diseases, exact dates, small geographic areas, free-text reports and notes, images with burnt-in annotations or DICOM tags.
- **Hashing the NIR is not anonymization**: the NIR space is enumerable; a plain hash is reversible by brute force. Keyed hashing (HMAC with a key held by a trusted third party) is pseudonymization.
- Techniques: remove direct identifiers, generalize (date of birth → year, age bands, postcode → département), suppress rare values, k-anonymity / l-diversity, noise, synthetic data generation.

## 10. Test data strategy

- **Default: synthetic data** generated from the interface specifications (HL7 v2, CDA, FHIR examples) with fictitious patients and test INS identities from the official test environments.
- Never copy production health data to non-production outside an HDS-certified, controlled environment. If a pseudonymized production extract is unavoidable (e.g. migration rehearsal): DPIA, same hosting and access regime as production, named recipients, deletion date, logged usage.
- Cover identity edge cases in synthetic sets: homonyms, twins, compound names, unknown birthplace, foreign-born patients, identity merges, status changes.
- To get help from this team: share message structures, segment and field lists, error codes and fictitious samples, never real messages.

## 11. Security incidents and NIS2

- Health establishments and certain organizations must report serious IS security incidents to the ARS, with support from CERT Santé (CSP art. L. 1111-8-2, verify scope and procedure).
- GDPR personal data breach: CNIL within 72 h (art. 33); patients if high risk (art. 34).
- **NIS2** (Directive (EU) 2022/2555): health is an Annex I sector (healthcare providers among others); significant incidents: 24 h early warning, 72 h notification, 1-month final report (art. 23). French transposition: **verify current status**.
- HDS host contracts define incident notification duties to the client: align with the establishment's own clocks.
- National programs support hospital cyber resilience (e.g. the CaRE program): verify current requirements and funding conditions.

## 12. Other texts to check

| Text | Why it matters |
|---|---|
| Medical Device Regulation (EU) 2017/745 | Software qualifying as a medical device must be CE-marked; integration changes on its data path may affect its intended use or conformity: involve the manufacturer |
| European Health Data Space Regulation (EU) 2025/327 | Phased obligations on EHR systems, primary and secondary use of health data from 2027 onward (verify dates and numbering) |
| EU AI Act, Reg. (EU) 2024/1689 | AI used as or in medical devices is typically high-risk (verify dates) |
| Professional secrecy and sharing rules (CSP) | Who may access which data within and outside the care team |

## 13. Consolidated integration checklist

| Topic | What to do |
|---|---|
| Hosting | HDS scope checked for every persistent component and every operator; certificate scope verified; EEA location per 2024 référentiel |
| Identity | INS with OID, status and strict traits propagated; identity events (merge, link, correction) specified and tested end-to-end |
| Interoperability | CI-SIS volet and version cited in each interface contract; validators run; terminologies under change control |
| Authentication | PGSSI-S authentication levels; Pro Santé Connect / CPS where required; mutual TLS between systems |
| Logging | Access traceability per patient record; logs hosted as health data; no payloads in generic monitoring tools outside the HDS perimeter |
| Encryption | In transit everywhere, including inside the hospital network where feasible; at rest for stores, queues, backups |
| Remote access | Vendor access per PGSSI-S rules: bastion, MFA, time-bound, recorded |
| Test data | Synthetic by default; any production-derived data under production regime |
| Incidents | ARS / CERT Santé, CNIL and NIS2 channels and clocks documented in the DEX |
| Continuity | Downtime procedures (degraded mode on paper or local), message backlog replay after restoration, ordering per patient |

---

Last reviewed: 2026-10

_Disclaimer: this file is a practitioner's summary for integration projects. It is not legal or medical-regulatory advice and may be incomplete or out of date. Always verify the current official texts (Légifrance, ANS, CNIL, EUR-Lex) and obtain validation from your DPO, RSSI, identity-vigilance and legal functions._
