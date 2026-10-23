# Defense and sensitive public sector: reference for integration projects (France)

_Scope: Ministry of the Armed Forces and other administrations, defense industry, operators of vital importance, any organization handling classified or Diffusion Restreinte information. Read together with the confidentiality rules in `${CLAUDE_PLUGIN_ROOT}/skills/sector-compliance/SKILL.md`._

## Golden rule

**Sensitive content from these projects must NEVER go into a cloud AI assistant**, this one included: no classified information (Secret, Très Secret), no Diffusion Restreinte information, no "Spécial France" or export-controlled data, no architecture, configuration, network plan, vulnerability, site, program or personnel detail of a sensitive system, even partial, paraphrased or "from memory". The team can only help on **unclassified, generic** aspects: methods, public regulations, generic templates, generic scripts reviewed and imported through the organization's approved transfer process. When in doubt, stop and ask the user to check with their security officer (officier de sécurité). Also mind **aggregation**: unclassified pieces combined may become sensitive.

## Contents

1. Actors and vocabulary
2. Protection of national defense secrecy: IGI 1300 (2021 reform)
3. Diffusion Restreinte and II 901 (sensitive information systems)
4. Caveats, export control and scientific potential protection
5. Security homologation and the RGS
6. ANSSI guides, qualifications and approvals
7. Isolated networks, interconnections and removable media
8. People: clearance, need-to-know, supply chain
9. What the team can and cannot do
10. Integration checklist for sensitive environments

## 1. Actors and vocabulary

| Term | Meaning |
|---|---|
| SGDSN | Secrétariat général de la défense et de la sécurité nationale: issues the interministerial rules on defense secrecy (IGI 1300) |
| ANSSI | Agence nationale de la sécurité des systèmes d'information, attached to the SGDSN: national cybersecurity authority, guides, qualifications, approvals |
| HFDS | Haut fonctionnaire de défense et de sécurité in each ministry |
| DRSD | Direction du renseignement et de la sécurité de la défense: counter-intelligence for the defense sphere; conducts the security investigations and issues the security opinions behind clearances of persons and companies in the defense industry (the clearance authority decides) |
| Officier de sécurité (OS) | Person in charge of protecting classified information within an entity, incl. companies |
| Autorité d'homologation | Authority that formally accepts the residual risks of an information system before operation |
| Habilitation | Security clearance granted to a person for a classification level |
| Besoin d'en connaître | Need-to-know: required in addition to the clearance |
| OIV / SIIV | Operators of vital importance and their vital information systems (Code de la défense art. L. 1332-6-1 et seq., sector arrêtés under art. R. 1332-41-1 et seq.); regime to be recast by the NIS2 / REC transposition law once promulgated |

## 2. Protection of national defense secrecy: IGI 1300 (2021 reform)

### Facts

- Criminal protection of national defense secrecy: Code pénal art. 413-9 et seq. (art. 413-9 defines what is covered; art. 413-10 et seq. punish compromise, incl. by negligence).
- **IGI 1300** (Instruction générale interministérielle n° 1300 sur la protection du secret de la défense nationale): the reformed version was approved by the arrêté of 13 November 2020 and **entered into force on 1 July 2021**; the SGDSN publishes the consolidated text (version of 9 August 2021).
- Since that reform there are **two classification levels**: **Très Secret** and **Secret** (Code de la défense art. R. 2311-2, as amended by decree n° 2019-1271 of 2 December 2019). The former levels **no longer exist**: former "Confidentiel Défense" corresponds to Secret and former "Secret Défense" to Très Secret (equivalence rules for clearances and markings); handling of legacy media: ask your security officer.
- Access requires **both** a clearance (habilitation) at the appropriate level **and** a need-to-know.
- IGI 1300 covers marking, handling, storage, reproduction, transmission, destruction of classified media, protected zones, clearance of persons and legal entities, classified contracts, and classified information systems (which must be homologated and use products approved for the level).

### Implications

- Classified information is processed only on information systems **homologated for the level**, operated by cleared personnel, in protected premises. No exception for "a quick check" on another system.
- Integration work on classified systems happens **inside** the protected environment, with approved tooling. Cloud AI, SaaS, public repositories, internet package registries are out of the question there.

## 3. Diffusion Restreinte and II 901

### Facts

- **Diffusion Restreinte (DR)** is a **protection marking, not a classification level**: information whose disclosure could harm the interests protected, without warranting classification. It still requires controlled handling.
- **II 901** (Instruction interministérielle n° 901/SGDSN/ANSSI relative à la protection des systèmes d'information sensibles, 28 January 2015) sets the rules for **sensitive information systems**, including those processing DR information: homologation before use, security measures, use of products **qualified** or, for protecting DR information (e.g. encryption when it leaves a physically protected zone or crosses public networks), **approved (agréés) by ANSSI**, controlled interconnections, administration and user rules. It applies to State administrations and to any legal entity operating a DR system (and entities under the PPST); for other entities it is a recommendation.
- ANSSI guide **ANSSI-PG-075** "Recommandations pour les architectures des systèmes d'information sensibles ou Diffusion Restreinte" (v1.2, 24 September 2021) defines three classes of sensitive systems according to their exposure to the Internet (secured gateway or physical isolation).
- **Cloud**: under the ANSSI "Recommandations pour l'hébergement dans le cloud des systèmes d'information sensibles" (v1.0, July 2024) and the State "cloud au centre" doctrine, a DR-level system may only be hosted on a **SecNumCloud-qualified** offer (internal, private, community or public). Qualification is necessary but not sufficient: homologation, II 901 requirements (approved encryption) and, for "Spécial France" data, the location and the nationality of administrators remain to be checked.

### Implications

- DR documents, extracts and data stay on the homologated DR system. They are not e-mailed outside it, copied to unapproved media or sent to any cloud service, including AI assistants.
- Interconnecting a DR system (new interface, new flow, new admin path) is a homologation change: risk analysis update, security approval, possibly approved encryption devices.

## 4. Caveats, export control and scientific potential protection

- **"Spécial France"**: a dissemination caveat restricting access to French nationals and entities; it applies on top of the classification or protection marking. Verify the exact handling rules in IGI 1300 with the security officer.
- **Export control**: technical data can be controlled even when unclassified: EU dual-use items (Regulation (EU) 2021/821), war materials (French licensing regime), US ITAR/EAR for US-origin items. Giving access to a foreign national or storing data on servers abroad may constitute an export. A cloud AI service is such a server.
- **PPST** (protection du potentiel scientifique et technique de la nation): decree n° 2011-1425 of 2 November 2011 (application of Code pénal art. 413-7) and arrêté of 3 July 2012; restricted-access zones (ZRR, Code pénal art. R. 413-5-1) in laboratories and companies; access subject to prior authorization after a ministerial opinion.
- Contractual secrecy (NDA, program security instructions) may forbid any external processing even of unclassified data.

## 5. Security homologation and the RGS

### Facts

- **Homologation de sécurité**: formal decision by the autorité d'homologation, based on a dossier, that the residual risks of an information system are known and accepted, before it is put into operation; it is reviewed on major change and at the end of its validity period.
- **RGS** (Référentiel général de sécurité, v2.0, arrêté of 13 June 2014, applicable since 1 July 2014), under ordonnance n° 2005-1516 (art. 9) and decree n° 2010-112, requires administrative authorities to homologate the information systems used for their electronic exchanges with users and between authorities (téléservices). II 901 and IGI 1300 require homologation for sensitive, DR and classified systems; the LPM / OIV regime requires it for SIIV.
- The ANSSI and the DINUM publish a **homologation guide** (collection "Gestion des risques cyber", first edition April 2025, version 2.2 of March 2026) with method sheets, replacing the 2014 nine-step guide. It distinguishes a **simplified** and a **reinforced** approach according to the stakes, requires an annual follow-up review, and caps the validity of a decision at **three years** for most regulated systems and at **two years** for IGI 1300 systems processing Très Secret information; ANSSI strongly recommends never exceeding three years. Typical content of a dossier:

| Step | Content |
|---|---|
| 1. Scope | System boundaries, interconnections, data processed and their sensitivity |
| 2. Strategy | Depth of the approach proportionate to stakes; stakeholders (authority, homologation committee, RSSI, project owner) |
| 3. Risk analysis | Typically **EBIOS Risk Manager** (ANSSI method) |
| 4. Security measures | Security plan, PSSI applicability, hardening, operating procedures |
| 5. Verification | Security audits (e.g. by a PASSI-qualified provider), penetration tests, configuration reviews |
| 6. Residual risks | Documented, with action plan |
| 7. Decision | Homologation decision signed by the authority, with conditions and duration |
| 8. Maintenance | Maintien en condition de sécurité (MCS), vulnerability watch, annual review, re-homologation on major change |

### Implications

- Integration projects in this context must plan homologation in the critical path: dossier, audits and committee take weeks to months. Track it in the RAID log.
- Every new flow, interconnection, product or provider is a potential homologation change: check before design freeze, not at go-live.
- Deliverables (DAT, flow matrix, DEX) feed the homologation dossier; they inherit the protection marking of the system they describe and are written **inside** the approved environment.

## 6. ANSSI guides, qualifications and approvals

- **Certification** (CSPN first-level certification, Common Criteria): a product was evaluated against a security target.
- **Qualification** of products (three levels: **élémentaire**, **standard**, **renforcé**): certification plus ANSSI's recommendation for use by administrations and regulated operators (LPM, RGS, eIDAS); all qualified products and services carry the ANSSI "Visa de sécurité". ANSSI architecture guides tie the required level to the zone (e.g. external firewall of a sensitive IS qualified at standard level or higher).
- **Agrément** (approval): required for products protecting classified or DR information.
- Service provider qualifications (référentiel versions at the time of review): **SecNumCloud** (cloud, v3.2 of 8 March 2022, with criteria on immunity from non-EU laws; qualification valid 3 years with annual surveillance audits), **PASSI** (security audit, v2.2, two levels: substantiel and élevé), **PDIS** (incident detection), **PRIS** (incident response, v3.0), **PACS** (security support and consulting, v2.0), **PAMS** (secure administration and maintenance, v1.1, relevant for integrators and managed-service providers).
- Useful public ANSSI guides (check current editions): IT hygiene guide; secure administration of information systems (ANSSI-PA-022: dedicated admin workstations, tiering); interconnection of an IS to the Internet; architectures of sensitive / DR systems (ANSSI-PG-075); logging; TLS recommendations; system partitioning. These public guides **can** be discussed with the team.

## 7. Isolated networks, interconnections and removable media

- **Isolated (air-gapped) networks**: no Internet, no cloud. Tools, packages, updates and AI-generated scripts enter only through the organization's approved import chain (scanning, decontamination station, validation, logging).
- **One-way transfers**: from low to high sensitivity, data diodes (ANSSI-qualified where required) are the usual pattern; from high to low, only through an approved, controlled process with human review (declassification or release authority). Never design an ad-hoc reverse path.
- **Removable media**: inventoried, marked, dedicated per level, decontaminated before entry, never moved from a higher to a lower level without the approved procedure, destroyed per the rules for the level. Autorun disabled; USB ports controlled.
- **Administration**: from dedicated, hardened admin workstations on a separate admin network; no administration from Internet-connected office workstations.
- **Emanations and physical security**: classified environments may impose TEMPEST, zoning and physical constraints on hardware choices; involve the security officer before procurement.

## 8. People: clearance, need-to-know, supply chain

- **Clearance (habilitation)**: decision by the competent authority after a security investigation (DRSD for the defense sphere), for a given level, linked to a position, time-limited. Integrators' staff working on classified systems need it **before** access; plan lead times (often months) in the RAID log.
- **Need-to-know**: grant access per task, not per team or per project; review on role change and on departure.
- **Legal entities**: companies handling classified information under contract need to be cleared themselves, appoint a security officer and have suitable protected premises; classified contracts carry security clauses; subcontracting classified work requires prior authorization (verify IGI 1300 terminology and procedure).
- **Supply chain**: nationality and clearance constraints on subcontractors, offshore support forbidden or restricted, provider qualification (e.g. PASSI, PAMS, SecNumCloud) where required, hardware and software provenance checks.
- **NIS2** (Directive (EU) 2022/2555, art. 2(7) and 2(8)) excludes public administration entities whose activities are predominantly in national security, public security, defense or law enforcement, and lets Member States exempt specific entities from art. 21 and 23 obligations for such activities; defense companies may remain in scope for their other activities. French transposition: bill adopted by the Senate (12 March 2025), voted in the Assemblée nationale special committee (10 September 2025), **not promulgated at the time of this review (October 2026): verify**.

## 9. What the team can and cannot do

| The team CAN (unclassified, generic) | The team CANNOT |
|---|---|
| Explain public regulations, ANSSI public guides, EBIOS RM method | Read, summarize, translate or reformat classified, DR, "Spécial France" or export-controlled content |
| Provide generic templates (DAT, DEX, homologation dossier outline, RAID) to be filled **inside** the protected environment | Fill those templates with the real system's details |
| Propose generic architecture patterns (segmentation, diodes, admin tiering, bastions) with fictitious names | Design or review the real architecture, network plan or firewall rules of a sensitive system |
| Write generic scripts or code, to be reviewed and imported through the approved chain | Debug real logs, configurations or dumps from a sensitive system |
| Plan generic project steps, clearance and homologation lead times | Handle names of programs, sites, cleared persons or classified contracts |

If the user starts sharing protected content: apply the stop procedure of the parent skill, do not quote it, and recommend contacting the security officer.

## 10. Integration checklist for sensitive environments

| Topic | Check |
|---|---|
| Qualification of data | Highest marking of data processed and produced (incl. aggregation effects) agreed with the security officer |
| Homologation | Impact of every new flow, product, provider or interconnection on the homologation; planning of dossier, audits and committee; validity period (max 3 years, 2 for Très Secret) |
| Products | Qualified or approved products where required (encryption, gateways, diodes, firewalls) |
| Network | Isolation or controlled interconnection per II 901 / IGI 1300; flows documented and approved; no implicit Internet access |
| Administration | Dedicated admin workstations and network; nominative, cleared administrators; session traceability |
| Media and transfers | Approved import/export chain; diodes for low-to-high; no ad-hoc high-to-low path |
| People | Clearances and need-to-know granted before access; supplier nationality and clearance constraints |
| Tooling | No cloud AI, SaaS or public registries inside; internal mirrors validated by security |
| Documentation | Project deliverables written inside the protected environment and marked like the system |
| Incidents | Reporting chain to the security officer, the homologation authority and the competent authorities, per internal instructions |

## Sources

- https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000042520705 — Arrêté of 13 November 2020 approving IGI 1300 (in force 1 July 2021)
- https://www.sgdsn.gouv.fr/nos-missions/proteger/proteger-le-secret-de-la-defense-nationale/protection-secret-defense-nationale-documentation — SGDSN: IGI 1300 consolidated text and documentation
- https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006071307/LEGISCTA000020411218/ — Code de la défense art. R. 2311-1 et seq., two classification levels
- https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000039440051 — Decree n° 2019-1271 (classification reform, equivalences)
- https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070719/LEGISCTA000006165357/ — Code pénal art. 413-9 to 413-12
- https://cyber.gouv.fr/reglementation/cybersecurite-systemes-dinformation/protection-information-sensible-diffusion-restreinte/instruction-interministerielle-n901/ — ANSSI: II 901 scope and requirements
- https://messervices.cyber.gouv.fr/documents-guides/anssi-guide-recommandations_architectures_systemes_information_sensibles_ou_diffusion_restreinte-v1.2.pdf — ANSSI-PG-075 v1.2, architectures of sensitive / DR systems
- https://cyber.gouv.fr/enjeux-technologiques/cloud/faq-recommandations-hebergement-cloud/ — ANSSI FAQ: cloud hosting of sensitive and DR systems, SecNumCloud
- https://cyber.gouv.fr/sites/default/files/document/secnumcloud-referentiel-exigences-v3.2.pdf — SecNumCloud référentiel v3.2 (8 March 2022)
- https://messervices.cyber.gouv.fr/documents-guides/guide-homologation-securite-web-04-2025.pdf — ANSSI / DINUM homologation guide (v2.2, March 2026)
- https://cyber.gouv.fr/offre-de-service/solutions-certifiees-et-qualifiees/comprendre-levaluation-de-securite/qualification-de-produit-et-services/referentiels-qualification/ — ANSSI: qualification référentiels and versions (PASSI, PACS, PAMS, PRIS...)
- https://cyber.gouv.fr/comprendre-la-qualification — ANSSI: qualification levels and Visa de sécurité
- https://www.legifrance.gouv.fr/loda/id/JORFTEXT000029122964/ — Arrêté of 13 June 2014 approving RGS v2.0
- https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000024749915/ — Decree n° 2011-1425 (PPST, ZRR)
- https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000030949364 — Code de la défense art. L. 1332-6-1 (OIV / SIIV)

---

Last reviewed: 2026-10

_Disclaimer: this file is a practitioner's summary based on public texts. It is not legal advice, is not an official interpretation of IGI 1300, II 901 or any other instruction, and may be incomplete or out of date. Always verify the current official texts and follow the instructions of your security officer and homologation authority._
