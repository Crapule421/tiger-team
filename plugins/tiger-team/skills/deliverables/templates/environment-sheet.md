# Environment sheet (Fiche d'environnement)

_Facts about the organization's environment that Tiger Team experts need before they answer. Filled once with `/tiger-team:discover`, read by every expert, updated when something changes. Keep it in `docs/tiger-team/environment.md`. Write "unknown" rather than a guess; every line is a **Fact** with its source or a dated statement by a named role._

| | |
|---|---|
| Organization / perimeter | `<name or pseudonym>` |
| Sector and regulatory scope | `<banking / healthcare / defense / other>` — `<rules in scope>` |
| Document version / date | `<0.x>` / `<YYYY-MM-DD>` |
| Maintained by | `<role>` |
| Sensitivity | _Internal at least. Use pseudonymized zone and host names if the real ones are sensitive. Never secrets, real IP plans of sensitive networks, or classified information._ |

## 1. Common

| Topic | Fact | Source / date |
|---|---|---|
| Environments and promotion path | `<dev → test → preprod → prod; owners>` | |
| Change process, freeze periods | `<CAB cadence, lead time, closing/peak freezes>` | |
| Production operations | `<internal / outsourcer; hours; on-call>` | |
| Existing documentation | `<paths to DAT, DEX, CMDB, flow matrix, interface inventory>` | |
| Naming conventions | `<servers, jobs, interfaces, events>` | |
| Time zone, DST, business calendar | `<Europe/Paris; bank holidays source>` | |
| Monitoring, logging, ticketing | `<tools>` | |
| AI usage policy | `<what may be shared with the assistant>` | |

## 2. Project governance

| Topic | Fact | Source / date |
|---|---|---|
| Decision bodies and decision makers | | |
| Contractual frame | | |
| Deadlines and drivers | | |
| Test strategy owners, acceptance criteria | | |
| Release process (CAB lead time, approvals) | | |

## 3. Architecture

| Topic | Fact | Source / date |
|---|---|---|
| Landscape map (applications, integration and data platforms) | | |
| Principles and standards in force | | |
| Design authority process | | |
| Cloud posture, sovereignty constraints | | |
| NFR baselines (availability tiers, RPO/RTO classes) | | |
| Known technical debt | | |

## 4. Delivery chain and security tooling

| Topic | Fact | Source / date |
|---|---|---|
| SCM, CI/CD (tool, version, runner model) | | |
| Artifact and image registries | | |
| IaC tools, state backend | | |
| Container platform and version | | |
| Secrets manager, pipeline authentication | | |
| Scanners and gates (SAST, SCA, secrets, images, IaC) | | |
| Hardening baselines | | |
| Deployment approvals, separation of duties | | |

## 5. Databases

| Instance (pseudonym) | Engine, version, edition | Platform | HA/DR, RPO/RTO | Backup tool, retention, last restore test | Size, growth | Maintenance window | Source / date |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

Non-production data policy: `<masked / synthetic / copies>`. Who executes production scripts: `<role, account model>`.

## 6. Job scheduling

| Topic | Fact | Source / date |
|---|---|---|
| Product and exact version | | |
| Topology (servers, agents, hosts, HA/DR) | | |
| New Day / date-switch time, processing-date rule | | |
| Calendars and their owner | | |
| Naming conventions (chains, jobs, events, resources) | | |
| Alerting integration, ops hours | | |
| Definitions versioning and promotion | | |

## 7. Integration platforms

| Topic | Fact | Source / date |
|---|---|---|
| ESB / iPaaS / API gateway (product, version) | | |
| MFT (product, version, partner patterns) | | |
| Messaging (MQ, Kafka: product, version) | | |
| Formats and standards in use | | |
| Authentication standards, identity provider, PKI | | |
| Interface inventory and ID convention | | |
| Monitoring, replay, reconciliation tooling | | |

## 8. ERP

| Topic | Fact | Source / date |
|---|---|---|
| Product, version, edition, hosting | | |
| Modules, company codes / legal entities in scope | | |
| Customization level and owners | | |
| ERP middleware | | |
| Master data governance | | |
| Fiscal calendar, closing schedule | | |
| Transport / release process, test clients | | |

## 9. Network and systems

| Topic | Fact | Source / date |
|---|---|---|
| Zones and segmentation model | | |
| Firewall vendor, change process and lead time | | |
| DNS architecture, TTL conventions | | |
| PKI (CAs, lifecycle tooling, mTLS practice) | | |
| Load balancers, reverse proxies | | |
| OS distributions and versions, patching cadence | | |
| Directory and service accounts (AD, gMSA, vault) | | |
| Administration path (bastion, PAM) | | |
| Virtualization / cloud platform | | |
| NTP sources | | |

## 10. IBM i

| Topic | Fact | Source / date |
|---|---|---|
| Release, PTF/TR level | | |
| Partitions and roles | | |
| HA product and replication scope | | |
| Library and environment structure | | |
| Journaling and commitment-control policy | | |
| Security level and authority model | | |
| Scheduler, interfaces in place | | |
| CCSID conventions | | |
| Source control and deployment practice | | |

## 11. Open points

| # | Missing fact | Why it matters | How to obtain | Owner | Due |
|---|---|---|---|---|---|
| | | | | | |
