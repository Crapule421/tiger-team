---
name: security-reference
description: Offensive security and GRC knowledge base - mission taxonomy, campaign axes, methodologies (PTES, NIST SP 800-115, OWASP, ATT&CK), finding qualification (CVSS, EPSS/KEV, business impact), SLAs and exceptions, rules of engagement, French legal frame and PASSI, agentic AI security.
user-invocable: false
---

# Security reference - offensive security and GRC

Senior-level cheat sheet for running a security testing activity in a regulated organization: what to test, how, under which authorization, how to qualify and follow the findings, and how to govern the activity. Two reference files hold the details; read the one the question needs, once, in full:

| File | Read it for |
|---|---|
| `references/rules-of-engagement.md` | RoE mandatory rubrics, authorization model, third-party target checklist (cloud, SaaS, providers' testing policies), French legal frame (Code pénal art. 323-1 to 323-3-1), PASSI, DORA TLPT, internal / external / PASSI matrix, AD and Entra tooling, protection of fragile targets |
| `references/agentic-security.md` | Security of LLM and agentic systems (OWASP Top 10 LLM and Agentic, ANSSI generative AI guide, MITRE ATLAS, NIST AI RMF), autonomy levels N0 to N4, policy engine independent of the LLM, prompt injection through tool outputs, emergency stop, agentic acceptance test cases |

Products, scores and catalogues move fast: where a fact depends on a version or a date it says so. EPSS scores change daily and KEV entries are added continuously: always record the value **with its date**.

## 1. Mission taxonomy

| Mission | Question it answers | Typical depth | Intrusiveness | Who usually runs it |
|---|---|---|---|---|
| Discovery (asset / attack surface) | What do we expose, and do we know all of it? | Inventory: DNS, certificates (CT logs), IP ranges, cloud accounts, shadow IT | Passive to low | Internal, continuous |
| Vulnerability scan | Which known weaknesses are present? | Unauthenticated (exposure view) or authenticated (patch level, configuration) | Low to medium (some checks crash fragile services) | Internal, scheduled |
| Configuration audit | Does each component follow its hardening baseline? | Read-only review against CIS / ANSSI / vendor baselines | None to low | Internal or external |
| Architecture audit | Does the design hold (segmentation, flows, trust, admin paths)? | Documents, interviews, flow matrices, sampling | None | External or design authority |
| Code audit: SAST / SCA | Flaws in our code and in its dependencies | Pipeline tools plus manual review of critical paths | None (offline) | DevSecOps (pipeline), external for manual review |
| Penetration test (internal / external) | Can an attacker in position X reach asset Y? | Exploitation within the RoE, chained findings | Medium to high | External for assurance; internal for routine |
| Web / API test | Business logic, authentication, authorization, injection | OWASP WSTG, ASVS level, API Top 10 | Medium | Internal or external |
| AD / Entra ID test | Paths to domain or tenant control | Collection, attack paths, misconfigurations, then validation | Low (collection) to high (exploitation) | Internal (collection), external (exploitation) |
| Cloud / container test | Identity, exposure, tenant and cluster misconfiguration | CSPM-style review, IAM paths, workload escape | Low to medium; provider policy applies | Internal or external |
| BAS / purple team | Do our controls detect and block the techniques that matter? | ATT&CK techniques replayed with the SOC | Controlled, repeatable | Internal (BAS tool), joint red and blue |
| Red team | Can a realistic adversary reach a business objective undetected? | Objective-based, stealth, long duration, white team control | High | External (independence), sometimes internal mature team |
| TLPT (DORA) | Threat-led test of critical or important functions on live production, under supervisor oversight | Threat intelligence, red team, purple team replay, remediation plan | High | External testers and threat intelligence provider (DORA art. 26-27; details in the RoE reference) |

Rules: start with discovery (you cannot test what you do not know); scans and configuration audits are hygiene, not assurance; a pentest is a point-in-time sample, not a certificate of security; a red team or TLPT is only worth it once basic hygiene is in place, otherwise it rediscovers the scan results at a much higher price.

## 2. The four axes of a campaign

Every campaign request states these four axes; the RoE repeats them per target.

| Axis | Values | What it changes |
|---|---|---|
| **Type** | One mission of section 1 | Methodology, team, duration, deliverable |
| **Knowledge** | Black box (no information), grey box (accounts, documentation, partial inventory), white box (code, architecture, configuration) | Coverage per day spent: grey or white box finds more for the same budget; black box measures what an outsider sees |
| **Intrusiveness** | Passive (no packet to the target), non-intrusive (scans, reads), intrusive (exploitation, account use, changes reverted), destructive (forbidden by default: DoS, data alteration) | Authorization level, test window, backup and rollback, contacts on standby |
| **Environment** | Production, pre-production, dedicated lab or clone, cloud tenant, third-party hosted | Who must authorize, provider policies, representativeness, impact on users and data |

Defaults to propose: grey box, non-intrusive first, intrusive only on named targets with a window, pre-production when it is iso-production, production when the question is about production exposure (with fragile-target protections). Write down any deviation from these defaults and who accepted it.

## 3. Methodologies and frameworks

| Framework | Use it for | Notes |
|---|---|---|
| PTES (Penetration Testing Execution Standard) | Engagement structure | Seven phases: pre-engagement interactions, intelligence gathering, threat modeling, vulnerability analysis, exploitation, post exploitation, reporting. Community standard, not updated for years: use for structure, not for tooling |
| NIST SP 800-115 (September 2008) | Assessment planning and techniques | Review, target identification and analysis, target vulnerability validation; example four-stage pentest methodology: planning, discovery, attack, reporting. Old but still the reference vocabulary for auditors |
| OWASP WSTG | Web test cases | Stable v4.2 (v5 in development). Test IDs by category (`WSTG-INFO`, `WSTG-CONF`, `WSTG-ATHN`, `WSTG-ATHZ`, `WSTG-SESS`, `WSTG-INPV`, `WSTG-BUSL`...); cite the version used in the report |
| OWASP ASVS | Verification requirements and target level | 5.0.0 released May 2025; levels 1 to 3; choose the level per application criticality and use it as the acceptance reference; requirement IDs differ between 4.0.3 and 5.0, so cite them with the version |
| OWASP API Security Top 10 (2023) | API test coverage | API1 broken object level authorization, API2 broken authentication, API3 broken object property level authorization, API4 unrestricted resource consumption, API5 broken function level authorization, API6 unrestricted access to sensitive business flows, API7 SSRF, API8 security misconfiguration, API9 improper inventory management, API10 unsafe consumption of APIs |
| MITRE ATT&CK | Adversary techniques | Scenario design for red team, BAS and purple team; map each finding and each detection to a technique ID; state the ATT&CK version |
| MITRE D3FEND | Defensive countermeasures | Map remediation to countermeasure techniques; useful to show a committee what a fix does |
| CIS Controls and CIS Benchmarks | Programme and hardening baselines | Controls v8.1 (June 2024): control 7 continuous vulnerability management, control 18 penetration testing; implementation groups IG1 to IG3. Benchmarks for configuration audits |
| ANSSI guides | French baselines | IT hygiene guide, AD control points, secure administration (PA-022), generative AI security (see the agentic reference) |
| TIBER-EU / DORA RTS on TLPT | Threat-led testing in finance | Tester criteria and process in the RoE reference; DORA itself in the `sector-compliance` banking reference |

Report a methodology as "followed" only when its phases and test IDs appear in the report; otherwise write "inspired by".

## 4. Qualifying a finding - three separate axes

A finding carries three independent qualifications. Keep them in three separate fields: merging them into one number hides why a fix is urgent, and double-counts threat when it is folded into the CVSS score.

| Axis | Question | Source | Record |
|---|---|---|---|
| **1. Technical severity** | How bad is the flaw in itself? | CVSS v3.1 or v4.0 base metrics (FIRST); NVD or vendor score for known CVEs, own vector for custom findings | Version, full vector string, score, rating. Never mix 3.1 and 4.0 scores in one table without saying which is which |
| **2. Threat** | Is it exploited or likely to be? | CISA KEV (CVE with evidence of active exploitation and clear remediation guidance; date added and the known ransomware use field); EPSS (FIRST: probability of exploitation activity in the next 30 days, with percentile; the model is versioned and retrained); public exploit, vendor or CERT-FR advisory | KEV yes/no and date added; EPSS score, percentile, model version and date; source of exploit evidence |
| **3. Business impact** | What happens to the business if exploited here? | Asset criticality (DICT/DICP rating), exposure (internet, partner, internal, isolated), data sensitivity, critical or important function (DORA), compensating controls | Asset owner's rating, exposure, function supported, compensating control with evidence |

Severity scale (CVSS v3.1 and v4.0): None 0.0, Low 0.1-3.9, Medium 4.0-6.9, High 7.0-8.9, Critical 9.0-10.0. CVSS v4.0 (FIRST, November 2023) names what was scored: CVSS-B (base), CVSS-BT (base and threat), CVSS-BE, CVSS-BTE. If you use the v4.0 Threat or Environmental metrics, say so and do not apply axis 2 or 3 a second time on top.

Dated facts to re-check when you qualify: EPSS moved to its v5 model in June 2026 (scores from different model versions are not comparable); CISA's BOD 26-04 (June 2026) replaced BOD 22-01, under which KEV was created, and kept the catalog and its inclusion criteria.

Custom findings (logic flaws, misconfigurations without CVE) have no EPSS or KEV: rate axis 2 from exploitability evidence (exploited during the test, public technique, required position and privileges) and say so.

### Priority matrix (starting point, calibrate with the security policy)

| Priority | Rule (first match wins) | Remediation deadline (example) |
|---|---|---|
| **P1** | KEV-listed or exploited during the test, **and** exposed (internet or partner) **or** on a critical asset or critical function | Mitigate within 72 hours (workaround, isolation, WAF rule, disable), fix within 7 days |
| **P2** | Any other KEV-listed finding; or technical severity Critical or High **and** at least one of: threat signal (EPSS high percentile, public exploit), critical asset | 30 days |
| **P3** | Any other finding of technical severity Medium or above | 90 days |
| **P4** | Low severity, hygiene, defense in depth | Next maintenance cycle, at most 180 days |

Compensating controls proven by evidence (isolation, WAF rule verified by test, feature disabled) may lower a finding by one level; record the control and who verified it.

- The thresholds for "EPSS high" (for example a percentile threshold) and the deadlines are decisions of the security policy owner, not of the tester: present them as proposals until they are approved.
- The deadline runs from the notification of the finding, not from the report date. Any P1 found during a test is notified immediately (flash notification in the RoE), not at the end of the campaign.
- A retest closes a finding. "Fixed" declared by the asset owner without retest is "fix claimed".

### Exceptions (risk acceptance)

| Rule | Detail |
|---|---|
| Who accepts | The business risk owner (or homologation authority), at the level the policy sets per priority; never the tester, never the team that missed the deadline |
| Content | Finding ID, the three axes, why it cannot be fixed in time, compensating controls with evidence, residual risk, owner, **end date**, review date |
| Duration | Time-boxed (for example P1 at most 30 days, P2 at most 90 days, renewable once with re-approval at a higher level) |
| Register | Exceptions are listed with their age and expiry; expired exception = overdue finding in the indicators |
| Change of facts | A finding that enters KEV or whose exposure changes re-opens its exception |

## 5. Governance of a testing activity

### Campaign lifecycle

1. **Request**: requester, objective, target scope, the four axes, wished dates.
2. **Qualification**: the security team checks feasibility, mission type, internal or external (section 6), regulatory frame (TLPT, PASSI, homologation).
3. **RoE and authorization**: drafted from the mandatory rubrics, signed by every asset owner with authority over the targets and by the RSSI; third-party authorizations attached. No signature, no test.
4. **Technical lock**: scope, windows and test sources configured in the platform (allowlist enforced by a component the testers cannot override), accounts provisioned, SOC informed or white team set up.
5. **Execution**: daily status, flash notification of P1 and of any real compromise found, stop on any incident.
6. **Cleanup**: accounts, implants, files and configuration changes removed or handed over; cleanup log signed.
7. **Report and restitution**: technical and executive reports; findings imported in the vulnerability management tool with their three axes.
8. **Remediation follow-up and retest**, then **closure** (lessons learned, indicators updated).

### Roles (RACI starting point)

| Activity | A | R | C | I |
|---|---|---|---|---|
| Testing programme and policy | RSSI | Security testing lead | Risk, compliance, internal audit | Management |
| Campaign authorization | Asset owner (business) | Security testing lead | RSSI, legal, IT operations, third parties | SOC (unless red team) |
| Execution | Security testing lead | Testers (internal or provider) | Operations contact | Asset owner |
| Priority and deadline | RSSI (per policy) | Security testing lead | Asset owner | Risk |
| Remediation | Asset owner | IT teams | Experts | RSSI |
| Exception | Business risk owner | Asset owner | RSSI, second line | Internal audit |

### Indicators

| Indicator | Definition | Why |
|---|---|---|
| Coverage | % of critical assets (or critical functions) tested in the last 12 months, by mission type | Shows blind spots |
| SLA compliance | % of findings fixed within deadline, per priority | The core management indicator |
| MTTR | Median time to remediate per priority (notification to verified fix) | Trend of the remediation capacity |
| KEV exposure | Open KEV-listed findings and their age | Most direct measure of exposure to active threats |
| Overdue and exceptions | Overdue findings and active exceptions, by age, with expired exceptions counted as overdue | Shows debt hidden in acceptances |
| Reopen rate | % of findings failing retest or reappearing | Quality of fixes |
| Detection rate | ATT&CK techniques prevented / detected / missed in BAS and purple team | Measures the blue side, not only the flaws |
| Lead time | Request to start of campaign | Capacity of the testing team |
| RoE incidents | Out-of-scope actions, unplanned outages, emergency stops (target: zero, every one analysed) | Safety of the activity itself |

## 6. Internal, external or PASSI - summary

Full matrix and legal frame in `references/rules-of-engagement.md`. In short:

- **Internal team**: continuous discovery, scans, configuration audits, BAS, routine web and API tests, AD collection, retests. Fast and cheap; limited independence.
- **External provider**: independent assurance (go-live of a critical application, yearly external exposure test, red team), skills the team lacks, and whenever a contract or regulator asks for independence.
- **PASSI-qualified provider** (ANSSI qualification): where a French text or contract requires a qualified auditor (for example SIIV audits of operators of vital importance, which need a PASSI qualified for national-security needs, or a homologation that asks for one) or where the organization's policy chooses it for its assurance level. **PASSI is not a DORA requirement**: DORA sets its own criteria for TLPT testers (art. 27). A PASSI qualification can support the evidence for those criteria; neither replaces the other.

## 7. Review checklist

**Before the campaign**
- [ ] Mission type and the four axes stated; deviation from defaults accepted by name
- [ ] RoE signed with every mandatory rubric; authorization from every asset owner; third-party authorizations or provider policies checked
- [ ] Targets verified as owned (IP ownership, DNS, cloud account IDs) and listed explicitly; exclusions listed
- [ ] Fragile targets identified with their protections; test windows outside batch and closing periods
- [ ] Emergency stop tested; contacts on both sides reachable during the window
- [ ] Agentic or AI-assisted testing: autonomy level per target in the RoE, policy engine and kill switch in place (agentic reference)

**Findings**
- [ ] Three axes recorded separately, with CVSS version and vector, EPSS and KEV dates
- [ ] Priority derived from the matrix, deadline from notification, P1 notified at once
- [ ] Evidence reproducible, no real sensitive data copied into the report
- [ ] Exceptions owned, time-boxed, with compensating controls and review date

**Programme**
- [ ] Coverage of critical assets known; indicators reported to the risk committee
- [ ] Internal / external / PASSI choice justified per campaign
- [ ] Retest planned and budgeted for every P1 and P2

## Sources

- http://www.pentest-standard.org/ - PTES phases (site unreachable at the date of review; phases as widely documented)
- https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-115.pdf - NIST SP 800-115, four-stage methodology (figure 5-1)
- https://owasp.org/www-project-web-security-testing-guide/ - OWASP WSTG (stable v4.2)
- https://asvs.owasp.org/ - OWASP ASVS 5.0.0
- https://api-security.owasp.org/editions/2023/en/0x11-t10 - OWASP API Security Top 10 2023
- https://attack.mitre.org/ and https://d3fend.mitre.org/ - MITRE ATT&CK and D3FEND (tactics Model, Harden, Detect, Isolate, Deceive, Evict, Restore)
- https://www.cisecurity.org/about-us/media/press-release/center-for-internet-security-releases-cis-controls-v8-1-with-new-governance-recommendations - CIS Controls v8.1
- https://www.first.org/cvss/v4.0/specification-document - CVSS v4.0 (severity scale, nomenclature)
- https://www.first.org/epss/data - EPSS model versions (v5 since 15 June 2026)
- https://www.cisa.gov/known-exploited-vulnerabilities-catalog - CISA KEV catalog
- https://www.cisa.gov/news-events/directives/bod-26-04-prioritizing-security-updates-based-risk - BOD 26-04, superseding BOD 22-01
