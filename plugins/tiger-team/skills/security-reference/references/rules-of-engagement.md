# Rules of engagement, authorization and legal frame

What must exist before a single packet reaches a target, who may authorize it, what French law says, when a qualified provider is needed, and how to test Active Directory and fragile systems without breaking production. Legal content is informational, checked against the sources at the end at the date of review: have the legal department validate the authorization model of the organization.

## 1. Authorization model

| Principle | Practice |
|---|---|
| Authority over the target | Only the owner of an asset (the legal entity, through its business owner or a delegate with written authority) can authorize a test of it. Access to a system, a job title or a request from management does not grant that authority. |
| Requester is not authorizer | The person who asks for a campaign does not sign its authorization alone; the asset owner and the RSSI sign; the security testing lead checks that the signatures cover every target. |
| Written and prior | Signed and dated before the first action; it references the RoE version. Any scope change is a signed amendment, not an email in a thread. |
| One entity, one authorization | In a group, each subsidiary authorizes its own systems; shared services run by a provider need the provider's authorization too (section 3). |
| People as targets | Phishing, social engineering and physical intrusion need an explicit RoE line, legal and HR validation (labour law, possible staff-representative consultation, GDPR), and a rule that no individual is sanctioned on test results. |
| Authorization is not a contract waiver | A cloud or SaaS provider's acceptable use policy still applies to an authorized test of your tenant. |

For an internal testing platform, enforce the authorization technically: a campaign cannot start until its RoE is recorded as signed, and the platform restricts each campaign to the targets, windows and techniques of its RoE through a component the testers and any AI agent cannot override (see the agentic reference for the policy engine).

## 2. Rules of engagement - mandatory rubrics

A RoE missing one of these rubrics is not ready for signature. Write "not applicable" with a reason rather than leaving a rubric out.

| # | Rubric | Content |
|---|---|---|
| 1 | Identification | Campaign ID, RoE version and date, parties (client entity, testing team or provider, subcontractors) |
| 2 | Signatories and authority | Asset owner for each target, RSSI, provider; for each signatory, the basis of their authority; third-party authorizations attached |
| 3 | Objective and mission | Question to answer, mission type, the four axes (type, knowledge, intrusiveness, environment) per target |
| 4 | Scope in | Explicit list: IP addresses and ranges, FQDNs, URLs and API base paths, applications and versions, AD domains or forests, Entra tenant ID, cloud account / subscription / project IDs, code repositories; owner of each item |
| 5 | Scope out | Explicit exclusions (shared infrastructure, third-party SaaS, safety systems, named production databases) and the rule "not listed means out of scope" |
| 6 | Windows | Dates, hours, time zone; blackout periods (closings, batch windows, change freezes) |
| 7 | Test sources | Egress IP addresses, workstations, VPN access and accounts used by the testers, so the SOC and operations can recognise them; whether WAF / EDR / IPS are left active or allowlisted, and why |
| 8 | Accounts and data provided | Test accounts per role, delivery through a vault, revocation date; synthetic test data where data must be created |
| 9 | Allowed techniques | Per target, up to the intrusiveness level agreed; credentialed checks; exploitation allowed or proof-of-concept only |
| 10 | Forbidden techniques | Default list unless a line says otherwise: denial of service and load tests; destructive actions and data alteration in production; exfiltration of real data (prove access by metadata, counts or hashes); persistence beyond the window; social engineering, phishing, physical intrusion; offline cracking of real user password hashes; lateral movement or credential reuse outside the scope; any action against a third party |
| 11 | AI and autonomy | Whether AI tools or agents are used, their autonomy level (N0 to N4) per target and environment, where prompts and results are processed (cloud API or not), and the safeguards required at that level |
| 12 | Data handling | Minimal evidence, encrypted storage and its location, who can access it, retention and destruction date with a destruction certificate; real personal or sensitive data met during the test: stop, do not copy, report to the contacts (GDPR, DPO) |
| 13 | Communication | Contacts on both sides with phone numbers reachable during every window, escalation chain, daily status, secure channel for findings |
| 14 | Flash notification | Immediate notification of P1 findings and of any sign of a real prior compromise; testing stops on that asset and the incident process takes over |
| 15 | Emergency stop | Who may call a stop (any listed contact), how (phone plus agreed code word), maximum time to stop all activity, how testing resumes (written go) |
| 16 | Deconfliction | SOC informed or not; for red team and TLPT, the white (control) team and the procedure that tells a test action from a real attack within minutes |
| 17 | Incidents and liability | Snapshots or backups before intrusive steps, behaviour on outage (stop, notify, help restore), liability cap, professional indemnity insurance |
| 18 | Legal and contract | Contract or purchase order reference, confidentiality, subcontracting allowed or not, named testers, required qualification (PASSI, DORA art. 27 criteria), applicable law |
| 19 | Cleanup | Removal of accounts, files, tools and configuration changes; cleanup log; items that could not be removed, handed over by name |
| 20 | Deliverables and retest | Report content and classification, recipients, deadlines, findings format (three axes), retest terms |

## 3. Third-party targets checklist

- [ ] **Ownership verified** for every IP and name: RIR whois and ASN, DNS (a CNAME to a SaaS or CDN means someone else's infrastructure), cloud resource IDs, certificate SANs. Cloud IP addresses are reassigned: re-check on the day of the test.
- [ ] **Cloud IaaS / PaaS**: test only your own tenant resources, never the provider's control plane or other tenants. Read the provider's current testing policy and record its URL and date in the RoE. At the date of review (November 2026): AWS lists services that may be tested without prior approval, requires approval for command-and-control testing, and prohibits among others DNS zone walking, DNS hijacking or pharming through Route 53, subdomain and bucket takeover, and port, protocol or request flooding, with DoS simulation under a separate DDoS simulation testing policy; Microsoft's Security Testing Rules of Engagement require no prior notification, restrict testing to your own tenant or explicitly authorized assets and prohibit denial of service; Google Cloud requires no notification but testing must respect its Acceptable Use Policy and terms of service.
- [ ] **SaaS**: no test of the vendor's application or infrastructure without its written permission or a published vulnerability disclosure or bug bounty policy whose scope covers it. Review your own tenant configuration (SSO, roles, sharing, API tokens) through the admin console and APIs as a customer.
- [ ] **Hosting providers, outsourcers, managed services**: contractual testing and audit rights (for financial entities, DORA art. 30 requires audit, access and inspection rights and participation in TLPT for ICT services supporting critical or important functions); written authorization for shared infrastructure; their SOC informed.
- [ ] **CDN, WAF, DDoS protection services**: a test through them also tests them: check their policy, and whether the origin may be tested directly.
- [ ] **Partner interconnections and APIs**: test your side only; the partner's side needs the partner's authorization.
- [ ] **Each third party** is listed in the RoE with its authorization reference or the policy URL and the date it was read.

## 4. French legal frame

**Code pénal, offences against automated data processing systems (STAD)** - penalties as in force at the date of review (November 2026); check the consolidated version on Légifrance before quoting them in a deliverable:

| Article | Offence and penalty | Relevance to testing |
|---|---|---|
| 323-1 | Fraudulently accessing or remaining in all or part of a STAD: 3 years and EUR 100,000; 5 years and EUR 150,000 when data are deleted or modified or the system's functioning is altered; 7 years and EUR 300,000 against a State personal-data system | A test without authorization, or beyond the authorized scope or window, is an access without right. Remaining in a system after realising it is out of scope is itself an offence |
| 323-2 | Hindering or distorting the functioning of a STAD: 5 years and EUR 150,000; 7 years and EUR 300,000 against a State personal-data system | Denial of service and destructive tests, even unintended: hence the forbidden-techniques rubric and the emergency stop |
| 323-3 | Fraudulently introducing data into a STAD, or extracting, holding, reproducing, transmitting, deleting or modifying its data: 5 years and EUR 150,000; 7 years and EUR 300,000 against a State personal-data system | Copying real data as "evidence" or leaving test data behind; hence minimal evidence and cleanup |
| 323-3-1 | Importing, holding, offering, transferring or making available tools, programs or data designed or adapted to commit the above offences, **without legitimate motive, notably research or computer security** (wording from loi n° 2013-1168): penalty of the underlying offence | Holding and using offensive tools is lawful for a legitimate security purpose. The legitimate motive covers the tools; it does **not** authorize any access: a test still needs the owner's authorization (323-1) |

- Aggravations added by loi n° 2023-22 (LOPMI): organised gang (323-4-1) and offences that expose others to a risk of death or injury or obstruct rescue (323-4-2), up to 10 years. Relevant for tests on healthcare, safety or emergency systems.
- "Fraudulently" is the key element: the owner's prior written authorization within a defined scope is what makes a test lawful. The Cour de cassation upheld a conviction for remaining in a system after noticing an access control and for downloading data known to be protected (Cass. crim., 20 May 2015, n° 14-81.336).
- **Reporting a vulnerability found by chance on a third-party system**: Code de la défense art. L. 2321-4 releases ANSSI from the duty to report to the prosecutor (art. 40 CPP) a person who, in good faith, reports a vulnerability to ANSSI alone. It is not an immunity from art. 323-1 and does not authorize testing to find vulnerabilities.
- **GDPR**: personal data processed during a test (logs, screenshots, dumps) need a purpose, minimization, security and a retention limit; an external provider is a processor under a GDPR art. 28 contract; inform the DPO.
- **Labour law**: tests targeting employees (phishing, monitoring tools) - verify information and consultation duties with HR and legal.

## 5. PASSI - ANSSI qualification of audit providers

- PASSI (*prestataires d'audit de la sécurité des systèmes d'information*) is ANSSI's qualification of security audit providers against a published référentiel (version 2.2 of 2024 at the date of review; check the current one). It covers five audit activities (portées): organisational and physical audit, architecture audit, configuration audit, source-code audit, penetration testing. A provider is qualified for named activities and a level (substantiel or élevé): check the scope of its qualification in ANSSI's catalogue, not only the label.
- A PASSI qualified "for the needs of national security" (formerly called PASSI LPM) is the one that may audit the information systems of vital importance (SIIV) of operators of vital importance under the Code de la défense (art. L. 1332-6-1).
- What it brings: an audited methodology, assessed auditors, confidentiality and conduct obligations, a contractual agreement with the client and report requirements set by the référentiel.
- When it is required: where a French text or a contract requires a qualified provider (SIIV audits of operators of vital importance, a homologation file that asks for a qualified audit), and in many public procurements. Otherwise it is a choice of assurance level.
- **PASSI is not a DORA requirement.** DORA art. 27 sets its own criteria for TLPT testers. A PASSI qualification can help document some of them; it does not replace them, and they do not replace PASSI where a French text requires it.

## 6. Internal / external / PASSI matrix

| Mission | Internal team | External provider | PASSI-qualified provider |
|---|---|---|---|
| Discovery, scans, configuration audit | Default | Optional (benchmark) | When a text or contract requires a qualified configuration audit |
| SAST / SCA in pipelines | Default (DevSecOps) | Manual code review of critical code | Qualified source-code audit when required |
| Architecture audit | Design authority review | Independent view before a major decision | When required (homologation, sector rules) |
| Web / API test, routine | Default | Peaks, rare skills | - |
| Pentest before go-live of a critical application | Preparation and retest | Default (independence) | When required, or chosen for assurance |
| Yearly external exposure test | Continuous scanning | Default | When required |
| AD / Entra assessment | Collection and hygiene (PingCastle, BloodHound) | Exploitation and attack-path validation | When required |
| BAS / purple team | Default, with the SOC | Scenario design, maturity benchmark | - |
| Red team | Only a mature, separate internal team | Default | Often chosen in France for assurance; check requirements |
| TLPT (DORA) | Internal testers only with the authority's approval and the other art. 27(2) conditions; every third test external; never for significant credit institutions | External testers meeting DORA art. 27; threat intelligence provider always external | Not a DORA criterion |

Independence rule: a team does not provide the only assurance on systems it designed, runs or secured itself.

## 7. DORA threat-led penetration testing (TLPT)

DORA itself (scope, pillars, level 2 texts, whether a French finance company is bound) is in the `sector-compliance` banking reference: read it there. This section only covers what a test lead needs.

- DORA art. 26: entities identified by the competent authority run a TLPT at least every three years, on live production systems supporting critical or important functions, with the ICT third-party providers concerned; pooled tests are possible; the authority issues an attestation at the end.
- DORA art. 27(1): testers must be of the highest suitability and reputability, have technical and organisational capabilities, be certified by an accreditation body or adhere to formal codes of conduct or ethical frameworks, provide independent assurance or an audit report on their risk management, and be covered by professional indemnity insurance.
- Internal testers (art. 26(8) and 27(2)): only with the competent authority's approval, sufficient dedicated resources and no conflict of interest, and the threat intelligence provider must be external; external testers every three tests; credit institutions classified as significant use external testers only.
- The RTS on TLPT (Delegated Regulation (EU) 2025/1190, published June 2025), aligned with TIBER-EU, sets the process: preparation (scope, control team), testing (threat intelligence then red team test, active red team phase of at least 12 weeks), closure (reports, mandatory replay and purple teaming, remediation plan). Read the RTS for the other durations and deliverables.
- Neither DORA nor the RTS mentions PASSI or any national qualification.
- In France, check with the ACPR / Banque de France who the TLPT authority is for the entity, and whether DORA applies at all (finance companies: see the banking reference).

## 8. Active Directory and Entra ID tooling

| Tool | What it does | Cautions |
|---|---|---|
| PingCastle (now part of Netwrix) | AD health check: risk score per domain (stale objects, privileged accounts, trusts, anomalies; the lower the better) and a maturity level, with remediation advice | Runs with a standard domain account over LDAP; the free edition covers an organization's own environment, a provider auditing clients needs the service-provider licence (check the current terms); the report maps your weaknesses: classify and store it as sensitive |
| BloodHound (SpecterOps; Community Edition and Enterprise) | Graph of attack paths to privileged groups; collectors SharpHound (AD) and AzureHound (Entra ID) | Session and local-group collection contacts every computer (noisy, EDR alerts, load): use the DC-only collection first; the dataset is a complete map of privilege paths: encrypt, restrict, destroy at campaign end |
| ANSSI AD checklist and ORADAD | ANSSI's AD control points, which place a forest at a level from 1 (critical weaknesses) to 5 (full checklist passed), and ORADAD, ANSSI's open-source LDAP collection tool | Check the current list on the CERT-FR site; ORADAD output is as sensitive as a BloodHound dataset |
| Entra ID and Microsoft 365 configuration tests | Open-source assessment suites exist (for example CISA ScubaGear, Maester, ROADtools for reconnaissance) | Read-only consent scopes; app registrations created for the test are removed at cleanup |

Rules for AD and Entra tests:
- A dedicated, named, time-limited collection account; read-only; the AD team informed.
- No change to AD objects, ACLs or GPOs unless a RoE line allows it with rollback.
- Password spraying only if allowed, below the lockout threshold of the default and fine-grained password policies, with the observation window respected; lockout of a service account can stop production.
- Kerberoasting or AS-REP roasting produce crackable material: crack only in the controlled lab if the RoE allows it, report "weak service account password" without the password, and destroy the hashes.
- DCSync or NTDS extraction only on an explicit RoE line; the material never leaves the controlled environment.

## 9. Protecting fragile targets

| Target | What can go wrong | Protection |
|---|---|---|
| OT, building management, medical devices | Active scans crash controllers or alter physical processes | Passive observation, test on a replica, owner and vendor present, never in production without the safety owner's written approval |
| Legacy platforms (IBM i, mainframe, old Unix or Windows) | Services crash on malformed traffic; profile lockout after failed sign-ons revokes production accounts | Authenticated configuration review rather than active exploitation; slow scans; no brute force; contact of the platform team on standby |
| Printers, VoIP, IoT | Raw printing ports print garbage on scans; devices reboot | Exclude raw printing ports from scans; low rate; dedicated window |
| Production databases | Heavy queries, locks, modified rows | Read-only accounts; automated injection tools at their lowest risk setting (higher sqlmap `--risk` levels add OR-based payloads that can update every row of a table); no stacked queries |
| Firewalls, load balancers, proxies | Session tables exhausted by fast scans | Rate limiting of the scanner; monitoring of the device during the test |
| Batch servers and closing periods | Interference with nightly chains or month-end | Windows agreed with scheduling and operations |

Generic protections: least intrusive check first; technique tried on a lab replica first; scanner rate and parallelism limited; snapshots or backups before intrusive steps; target health monitored during the test; stop criteria written in the RoE.

## Sources

- https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070719/LEGISCTA000006149839/ - Code pénal, chapter on STAD offences (art. 323-1 to 323-4-2), penalties as in force in November 2026
- https://www.legifrance.gouv.fr/juri/id/JURITEXT000030635061 - Cass. crim., 20 May 2015, n° 14-81.336
- https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033206854 - Code de la défense art. L. 2321-4 (loi n° 2016-1321, art. 47)
- https://messervices.cyber.gouv.fr/visas/2025_430_np.pdf - an ANSSI qualification decision citing the PASSI référentiel v2.2; catalogue of qualified providers on cyber.gouv.fr
- https://eur-lex.europa.eu/eli/reg/2022/2554/oj - DORA, art. 26, 27 and 30
- https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32025R1190 - Delegated Regulation (EU) 2025/1190, RTS on TLPT (art. 11 active red team phase, art. 12 replay and purple teaming)
- https://www.ecb.europa.eu/paym/cyber-resilience/tiber-eu/html/index.en.html - TIBER-EU framework
- https://aws.amazon.com/security/penetration-testing/ - AWS penetration testing policy
- https://www.microsoft.com/en-us/msrc/pentest-rules-of-engagement - Microsoft Security Testing Rules of Engagement
- https://support.google.com/cloud/answer/6262505 - Google Cloud: penetration testing without notification, AUP and terms apply
- https://www.pingcastle.com/ - PingCastle
- https://bloodhound.specterops.io/home - BloodHound documentation
- https://cert.cyber.gouv.fr/uploads/ad_checklist.html and https://github.com/ANSSI-FR/ORADAD - ANSSI AD checklist (levels 1 to 5) and ORADAD
