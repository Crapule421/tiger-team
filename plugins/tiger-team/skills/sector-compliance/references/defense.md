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
| DRSD | Direction du renseignement et de la sécurité de la défense: protection of the defense sector, incl. security investigations for the defense industry (verify current remit) |
| Officier de sécurité (OS) | Person in charge of protecting classified information within an entity, incl. companies |
| Autorité d'homologation | Authority that formally accepts the residual risks of an information system before operation |
| Habilitation | Security clearance granted to a person for a classification level |
| Besoin d'en connaître | Need-to-know: required in addition to the clearance |
| OIV / SIIV | Operators of vital importance and their vital information systems (Code de la défense art. L. 1332-6-1 et seq.) |

## 2. Protection of national defense secrecy: IGI 1300 (2021 reform)

### Facts

- Criminal protection of national defense secrecy: Code pénal art. 413-9 et seq.
- **IGI 1300** (Instruction générale interministérielle n° 1300 sur la protection du secret de la défense nationale): the reformed version was approved by order of 13 November 2020 and **entered into force on 1 July 2021** (verify).
- Since that reform there are **two classification levels**: **Très Secret** and **Secret** (Code de la défense art. R. 2311-2, verify). The former "Confidentiel Défense" level **no longer exists**; legacy media marked with former levels follow transition rules: verify with your security officer.
- Access requires **both** a clearance (habilitation) at the appropriate level **and** a need-to-know.
- IGI 1300 covers marking, handling, storage, reproduction, transmission, destruction of classified media, protected zones, clearance of persons and legal entities, classified contracts, and classified information systems (which must be homologated and use products approved for the level).

### Implications

- Classified information is processed only on information systems **homologated for the level**, operated by cleared personnel, in protected premises. No exception for "a quick check" on another system.
- Integration work on classified systems happens **inside** the protected environment, with approved tooling. Cloud AI, SaaS, public repositories, internet package registries are out of the question there.

## 3. Diffusion Restreinte and II 901

### Facts

- **Diffusion Restreinte (DR)** is a **protection marking, not a classification level**: information whose disclosure could harm the interests protected, without warranting classification. It still requires controlled handling.
- **II 901** (Instruction interministérielle n° 901/SGDSN/ANSSI relative à la protection des systèmes d'information sensibles, 28 January 2015) sets the rules for **sensitive information systems**, including those processing DR information: homologation before use, security measures, use of products **qualified** or, for protecting DR information (e.g. encryption on public networks), **approved (agréés) by ANSSI**, controlled interconnections, administration and user rules.
- ANSSI publishes architecture recommendations for sensitive / DR information systems, including the conditions under which a DR system may be connected to the Internet (verify the current guide).
- **Do not assume** that a SecNumCloud-qualified cloud is, by itself, authorized to host DR information: verify with ANSSI guidance and the homologation authority.

### Implications

- DR documents, extracts and data stay on the homologated DR system. They are not e-mailed outside it, copied to unapproved media or sent to any cloud service, including AI assistants.
- Interconnecting a DR system (new interface, new flow, new admin path) is a homologation change: risk analysis update, security approval, possibly approved encryption devices.

## 4. Caveats, export control and scientific potential protection

- **"Spécial France"**: a dissemination caveat restricting access to French nationals and entities; it applies on top of the classification or protection marking. Verify the exact rules in IGI 1300.
- **Export control**: technical data can be controlled even when unclassified: EU dual-use items (Regulation (EU) 2021/821), war materials (French licensing regime), US ITAR/EAR for US-origin items. Giving access to a foreign national or storing data on servers abroad may constitute an export. A cloud AI service is such a server.
- **PPST** (protection du potentiel scientifique et technique de la nation): restricted-access zones (ZRR) in laboratories and companies; access subject to authorization. Verify the applicable decree.
- Contractual secrecy (NDA, program security instructions) may forbid any external processing even of unclassified data.

## 5. Security homologation and the RGS

### Facts

- **Homologation de sécurité**: formal decision by the autorité d'homologation, based on a dossier, that the residual risks of an information system are known and accepted, before it is put into operation; it is reviewed on major change and at the end of its validity period.
- **RGS** (Référentiel général de sécurité, v2.0, order of 13 June 2014), under ordonnance n° 2005-1516 and decree n° 2010-112, requires administrative authorities to homologate their information systems exchanging with users and other authorities (verify scope). II 901 and IGI 1300 require homologation for sensitive, DR and classified systems.
- ANSSI publishes a step-by-step homologation guide (verify the current edition). Typical process:

| Step | Content |
|---|---|
| 1. Scope | System boundaries, interconnections, data processed and their sensitivity |
| 2. Strategy | Depth of the approach proportionate to stakes; stakeholders (authority, homologation committee, RSSI, project owner) |
| 3. Risk analysis | Typically **EBIOS Risk Manager** (ANSSI method) |
| 4. Security measures | Security plan, PSSI applicability, hardening, operating procedures |
| 5. Verification | Security audits (e.g. by a PASSI-qualified provider), penetration tests, configuration reviews |
| 6. Residual risks | Documented, with action plan |
| 7. Decision | Homologation decision signed by the authority, with conditions and duration |
| 8. Maintenance | Maintien en condition de sécurité (MCS), vulnerability watch, re-homologation on major change |

### Implications

- Integration projects in this context must plan homologation in the critical path: dossier, audits and committee take weeks to months. Track it in the RAID log.
- Every new flow, interconnection, product or provider is a potential homologation change: check before design freeze, not at go-live.
- Deliverables (DAT, flow matrix, DEX) feed the homologation dossier; they inherit the protection marking of the system they describe and are written **inside** the approved environment.

## 6. ANSSI guides, qualifications and approvals

- **Certification** (CSPN first-level certification, Common Criteria): a product was evaluated against a security target.
- **Qualification** (historically élémentaire, standard and renforcé levels for products; verify current naming): certification plus ANSSI's recommendation for use by administrations and sensitive operators.
- **Agrément** (approval): required for products protecting classified or DR information.
- Service provider qualifications: **SecNumCloud** (cloud; includes requirements on immunity from non-EU laws), **PASSI** (security audit), **PDIS** (incident detection), **PRIS** (incident response), **PACS** (security support and consulting), **PAMS** (secure administration and maintenance, relevant for integrators and managed-service providers). Verify the current list and versions.
- Useful public ANSSI guides (titles indicative, verify current editions): IT hygiene guide; secure administration of information systems (dedicated admin workstations, tiering); interconnection of an IS to the Internet; architectures of sensitive / DR systems; logging; TLS recommendations; system partitioning. These public guides **can** be discussed with the team.

## 7. Isolated networks, interconnections and removable media

- **Isolated (air-gapped) networks**: no Internet, no cloud. Tools, packages, updates and AI-generated scripts enter only through the organization's approved import chain (scanning, decontamination station, validation, logging).
- **One-way transfers**: from low to high sensitivity, data diodes (ANSSI-qualified where required) are the usual pattern; from high to low, only through an approved, controlled process with human review (declassification or release authority). Never design an ad-hoc reverse path.
- **Removable media**: inventoried, marked, dedicated per level, decontaminated before entry, never moved from a higher to a lower level without the approved procedure, destroyed per the rules for the level. Autorun disabled; USB ports controlled.
- **Administration**: from dedicated, hardened admin workstations on a separate admin network; no administration from Internet-connected office workstations.
- **Emanations and physical security**: classified environments may impose TEMPEST, zoning and physical constraints on hardware choices; involve the security officer before procurement.

## 8. People: clearance, need-to-know, supply chain

- **Clearance (habilitation)**: decision by the competent authority after a security investigation, for a given level, linked to a position, time-limited. Integrators' staff working on classified systems need it **before** access; plan lead times (often months) in the RAID log.
- **Need-to-know**: grant access per task, not per team or per project; review on role change and on departure.
- **Legal entities**: companies handling classified information under contract need to be cleared themselves, appoint a security officer and have suitable protected premises; classified contracts carry security clauses; subcontracting classified work requires prior authorization (verify IGI 1300 terminology and procedure).
- **Supply chain**: nationality and clearance constraints on subcontractors, offshore support forbidden or restricted, provider qualification (e.g. PASSI, PAMS, SecNumCloud) where required, hardware and software provenance checks.
- **NIS2** excludes public administration entities acting in defense and national security and allows Member States to exempt certain entities; defense companies may remain in scope for their other activities (Directive (EU) 2022/2555 art. 2, verify French transposition).

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
| Homologation | Impact of every new flow, product, provider or interconnection on the homologation; planning of dossier, audits and committee |
| Products | Qualified or approved products where required (encryption, gateways, diodes, firewalls) |
| Network | Isolation or controlled interconnection per II 901 / IGI 1300; flows documented and approved; no implicit Internet access |
| Administration | Dedicated admin workstations and network; nominative, cleared administrators; session traceability |
| Media and transfers | Approved import/export chain; diodes for low-to-high; no ad-hoc high-to-low path |
| People | Clearances and need-to-know granted before access; supplier nationality and clearance constraints |
| Tooling | No cloud AI, SaaS or public registries inside; internal mirrors validated by security |
| Documentation | Project deliverables written inside the protected environment and marked like the system |
| Incidents | Reporting chain to the security officer, the homologation authority and the competent authorities, per internal instructions |

---

Last reviewed: 2026-10

_Disclaimer: this file is a practitioner's summary based on public texts. It is not legal advice, is not an official interpretation of IGI 1300, II 901 or any other instruction, and may be incomplete or out of date. Always verify the current official texts and follow the instructions of your security officer and homologation authority._
