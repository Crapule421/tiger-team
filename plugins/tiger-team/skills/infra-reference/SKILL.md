---
name: infra-reference
description: Infrastructure knowledge base - layer-by-layer diagnosis, checklists (server build, firewall change, certificate renewal, DNS change, patching) and references on network/TLS, DNS, Linux and Windows Server.
user-invocable: false
---

# Infrastructure reference

Scope: on-premises and hybrid infrastructure supporting integration projects in regulated contexts (banking, healthcare, defense). Commands are standard forms; where behaviour depends on version/edition the references say "verify against your version".

## References (read on demand)

- `references/network.md` - read when the topic involves TCP/IP, subnetting, VLANs, routing, NAT, firewalls/flow matrices, load balancers (F5, HAProxy), reverse proxies, VPN, TLS/PKI/certificates, or network troubleshooting tools and common ports - full path `${CLAUDE_PLUGIN_ROOT}/skills/infra-reference/references/network.md`
- `references/dns.md` - read when the topic involves name resolution, zones and records, TTL/caching, split-horizon, BIND, Windows/AD-integrated DNS, Infoblox, DNSSEC, DNS troubleshooting or a DNS migration - full path `${CLAUDE_PLUGIN_ROOT}/skills/infra-reference/references/dns.md`
- `references/linux.md` - read when the topic involves RHEL/Debian/Ubuntu/SUSE administration: systemd, journald, users/sudo/SSH, SELinux/AppArmor, LVM/filesystems, performance, cron vs scheduler agents, hardening (ANSSI BP-028/CIS), patching - full path `${CLAUDE_PLUGIN_ROOT}/skills/infra-reference/references/linux.md`
- `references/windows.md` - read when the topic involves Windows Server: AD DS, GPO, DNS/DHCP, IIS, services and gMSA, scheduled tasks, PowerShell remoting, event logs, failover clustering, hardening, patching - full path `${CLAUDE_PLUGIN_ROOT}/skills/infra-reference/references/windows.md`

Related skills: `flow-matrix` (build flow matrices and firewall requests), `devsecops-reference` (hardening baselines, containers, secrets), `dba-reference` (database HA/ports/listeners).

## 1. Diagnosis method - layer by layer

Rule: never jump to the application before proving the lower layers, and never conclude from a test run from the wrong place. Test from the real source host, with the real name, at the time of the failure, and record timestamps (needed to match firewall/proxy logs).

### Triage questions (first 5 minutes)
1. What exactly fails (error text, code, screenshot), for whom (one user, one site, all), since when?
2. What changed (deployments, firewall rules, certificates, DNS, patches, password rotations, scheduler plan)? Check the change calendar.
3. Is it total, intermittent, or slow? Intermittent often = one bad member behind a LB, DNS round robin with one dead IP, idle timeout, port/NAT exhaustion, MTU.
4. Does it work from another source/zone? Comparing a working and a failing path localises the fault fast.
5. Business impact and urgency -> incident priority; who decides on rollback?

### Layers

| # | Layer | Question | Quick tests | Typical root causes |
|---|---|---|---|---|
| 1 | Name resolution | Does the name resolve to the expected IP from the source? | `dig`/`getent hosts`/`Resolve-DnsName` against the resolver the host uses | Stale record/TTL, split-horizon mismatch, hosts file, wrong search suffix, DNSSEC SERVFAIL |
| 2 | Addressing/routing | Is the destination network reachable via the expected path? | `ip route get`, `Find-NetRoute`, `traceroute -T -p <port>`, `tracert` | Missing route, asymmetric routing, overlapping subnets, wrong gateway on multi-NIC host |
| 3 | Transport/firewall | Does TCP connect succeed on the port? | `nc -vz`, `Test-NetConnection -Port`, capture (SYN / SYN-ACK / RST) | Firewall rule missing/expired, NAT, host firewall, service not listening, listening on 127.0.0.1 only |
| 4 | Load balancer/proxy | Is the VIP healthy and are members up? | LB status, `curl --resolve` to each member, proxy logs (502/503/504) | Health monitor failing, SNAT/return path, persistence, timeouts, body size limits |
| 5 | TLS | Does the handshake succeed and is the chain/name valid? | `openssl s_client -connect host:port -servername host -showcerts` | Expired cert, missing intermediate, SAN mismatch, truststore, client cert (mTLS), protocol/cipher mismatch, TLS inspection |
| 6 | Authentication | Is the identity accepted? | Event logs 4625/4771, LDAP bind test, Kerberos tickets (`klist`), time sync | Password rotated/expired, locked account, SPN, clock skew, gMSA not installed on host |
| 7 | Authorization | Is the identity allowed? | App/DB/OS logs, SELinux AVC, file ACLs, DB grants | Missing grant/role, SELinux/AppArmor denial, share/NTFS permissions |
| 8 | Application/protocol | Does the application answer correctly? | App logs, health endpoint, protocol test (SQL query, MQ put/get, API call) | Config/version mismatch, dependency down, resource exhaustion |
| 9 | Resources | Is the host saturated? | CPU/memory/disk/inodes/FD/ports (linux.md section 7, windows.md section 12) | Disk full, OOM, swap, I/O latency, file descriptor or ephemeral port exhaustion |

Interpretation shortcuts: refused = reached and rejected (RST); timeout = dropped; works by IP but not by name = DNS or TLS SAN/SNI; works from server but not from client = firewall/proxy/path; works for small payloads only = MTU or proxy body size; works after restart then degrades = leak/exhaustion; fails every N minutes of idle = idle timeout.

### Evidence pack for escalation (to network/security/vendor teams)
Source host + IP (and NAT IP if any), destination name + IP + port + protocol, exact timestamp (with timezone), error message, test commands and output, capture file if taken, what changed recently, flow matrix ID.

## 2. Checklists

### New server build (before handover to application team)
- [ ] OS from approved, supported image; hardening baseline applied (ANSSI BP-028 / CIS / Microsoft baseline) and compliance report archived
- [ ] Naming, IP, DNS A + PTR records, CMDB entry, owner and environment tags
- [ ] Time sync (chrony/W32Time) to internal NTP; timezone policy (UTC for servers recommended unless app constraint)
- [ ] Central identity (SSSD/AD join), admin access via bastion/PAM only, local admin/root secured (LAPS / vaulted)
- [ ] Monitoring agent, log forwarding (syslog/WEF/SIEM agent), EDR/antivirus, backup agent - each with its flows open
- [ ] Patch group/ring assigned; vulnerability scan clean (or exceptions accepted)
- [ ] Filesystems sized and separated; data on dedicated volumes; swap/pagefile per vendor guidance
- [ ] Service accounts created least-privilege (gMSA where possible), no interactive logon
- [ ] Certificates issued from enterprise PKI with expiry monitoring
- [ ] Flow matrix validated and firewall rules implemented and tested from the real sources
- [ ] Documentation: runbook (start/stop/health), recovery procedure, contacts

### Firewall change
- [ ] Request references a flow matrix line (ID, source, destination, port, protocol, purpose, owner, justification, expiry if temporary)
- [ ] Least privilege: hosts/groups not subnets when possible; no any/any; no broad port ranges without justification
- [ ] Encrypted protocol (or documented exception); admin flows via bastion only
- [ ] All firewalls on the path identified (including cloud security groups and host firewalls); NAT translations documented
- [ ] Test plan from the real source after implementation (`Test-NetConnection`/`nc`), logs checked for denies
- [ ] Rollback = disable rule; change recorded; temporary rules have an expiry and a removal ticket

### Certificate renewal
- [ ] Inventory where the certificate (and its key) is installed: LB, reverse proxy, servers, keystores, appliances, partners who pin it
- [ ] CSR with correct SAN list (check current SAN first: `openssl x509 -noout -ext subjectAltName`), key size/algorithm per policy, key generated on the target or HSM
- [ ] Full chain installed (leaf + intermediates); truststores updated if the issuing CA changes
- [ ] Partners/mTLS clients notified in advance if they trust the leaf or an intermediate explicitly
- [ ] Validation after install: `openssl s_client` from client zones, application smoke test; old certificate kept for rollback until validated
- [ ] Expiry monitoring updated; renewal automated where possible (ACME / PKI connector)

### DNS change
- [ ] Current record and TTL captured; TTL lowered in advance if the change is a migration
- [ ] Change applied on the authoritative source (AD DNS/Infoblox/BIND/provider) for each view (internal/external)
- [ ] Verified on each authoritative server (serial, answer) and from resolvers in each zone
- [ ] Dependent items: certificates SAN, firewall rules referencing IPs, LB pools, hosts files, application caches/connection pools
- [ ] Rollback value recorded

### Patching campaign
- [ ] Scope and rings defined; vendor advisories reviewed (known issues); emergency path for actively exploited CVEs
- [ ] Backups/snapshots verified; HA resources moved/drained before reboot; scheduler batch windows avoided
- [ ] Post-checks: services, cluster/replication health, application smoke tests, monitoring green
- [ ] Compliance evidence exported (patch level per host)

### Decommissioning
- [ ] Owner sign-off; dependencies checked (inbound connections over a representative period, DNS queries, scheduler jobs, monitoring)
- [ ] Data retention/archive per legal requirements (GDPR, sector retention); secure wipe of disks (or crypto-erase) with certificate
- [ ] Remove: DNS records, firewall rules, LB members, certificates (revoke), AD computer/service accounts, backup jobs, monitoring, CMDB, licenses

## 3. Design rules of thumb
- Redundancy at every layer the SLA needs (2 NICs/paths, 2 LB members minimum, DNS servers per site, NTP sources >= 3 for majority), and test failover regularly.
- Separate networks for administration, production traffic, backup and storage; admin interfaces (iLO/iDRAC/IPMI, hypervisor, LB, firewall management) only on the admin network.
- Prefer names over IPs in configuration (but stable names with suitable TTLs); avoid hosts files.
- Everything that expires must be monitored: certificates, passwords of service accounts, licenses, DNSSEC signatures, temporary firewall rules, support contracts.
- Time is a dependency: Kerberos, TLS validity, logs correlation, schedulers - NTP everywhere, monitored.
- Capacity: plan for peaks (month-end/batch), not averages; keep headroom (e.g. < 70% sustained CPU, < 80% filesystem) and trend it.
- Regulated hosting: health data requires HDS-certified hosting in France; defense DR systems follow II 901 (homologation, dedicated networks); cloud for sensitive workloads may require SecNumCloud - confirm with the security officer early (architecture impact).

## 4. Handoff hints
- Database listener/HA ports, replication flows -> dba-expert.
- Scheduler agents, batch windows, job flows -> scheduling-expert.
- Middleware/API/MQ endpoints, partner B2B flows -> integration-expert.
- IBM i host servers and flows -> ibmi-expert.
- Pipeline runners, secrets, image/hardening as code -> devsecops-expert.
- Zone model, target architecture, cloud landing zone -> enterprise-architect.
- Change windows, CAB, planning of firewall/DNS/PKI lead times -> project-manager.
