# Network Flow Matrix (Matrice des flux)

## 0. Document control

| Item | Value |
|---|---|
| Project / system | `<...>` |
| Document ID | `FLM-<system>-<nnn>` |
| Sensitivity label | `<Confidential: describes production network exposure>` |
| Status | `<Draft / In review / Approved / Implemented>` |
| Firewall change request(s) | `<CHG-...>` |

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | `<YYYY-MM-DD>` | `<role>` | Initial flows |

| Role | Name / function | Decision | Date |
|---|---|---|---|
| Network / firewall team | `<...>` | | |
| Security (RSSI) | `<...>` | | |

## 1. Rules for filling the matrix

- _One row per flow and per environment; a flow = source, destination, port, protocol, initiated by the source._
- _Direction is the **session initiation** direction; return traffic of stateful sessions is not a separate flow._
- _Use host names and server groups/objects where the firewall supports them; IPs in CIDR. In shared drafts use placeholders or documentation ranges (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`)._
- _Source port is ephemeral unless the protocol requires otherwise; do not request port ranges without justification._
- _Encryption: protocol and version (e.g. TLS 1.3, SSH, IPsec), or "none" with justification and compensating measure._
- _Owner: the team accountable for the need, not the firewall team._
- _Optional columns if useful: interface ID (`INT-xxx`), status, change ticket, expiry date for temporary flows._

## 2. Zones

| Zone | Description | Security level / constraints |
|---|---|---|
| `<ZONE-USERS>` | _Office workstations_ | `<...>` |
| `<ZONE-DMZ>` | _Exposed services, reverse proxies_ | `<...>` |
| `<ZONE-APP>` | _Application servers_ | `<...>` |
| `<ZONE-DATA>` | _Databases_ | `<...>` |
| `<ZONE-ADMIN>` | _Bastions, admin workstations_ | `<...>` |
| `<ZONE-CDE / ZONE-HDS / ZONE-DR>` | _Regulated perimeter, if any_ | _PCI DSS / HDS / II 901 constraints_ |
| `<EXTERNAL-PARTNER>` | _Third party_ | `<...>` |

## 3. Flow matrix

| ID | Source host | Source zone | Source IP | Destination host | Destination zone | Destination IP | Port | Protocol | Direction | Flow purpose | Environment | Encryption | Owner | Justification |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLW-001 | `rp-dmz-01` | ZONE-DMZ | `192.0.2.10` | `app-01` | ZONE-APP | `198.51.100.20` | 8443 | TCP/HTTPS | DMZ → APP | Reverse proxy to application API (INT-001) | PROD | TLS 1.3 | `<app team>` | Single entry point for partner API |
| FLW-002 | `app-01` | ZONE-APP | `198.51.100.20` | `db-01` | ZONE-DATA | `198.51.100.40` | `<db port>` | TCP | APP → DATA | Application database access | PROD | TLS 1.2+ | `<app team>` | Application persistence |
| FLW-003 | `app-01` | ZONE-APP | `198.51.100.20` | `mft-01` | ZONE-DMZ | `192.0.2.30` | 22 | TCP/SFTP | APP → DMZ | Daily file deposit (INT-002) | PROD | SSH | `<integration team>` | Outbound file to partner via MFT gateway |
| FLW-004 | `bastion-01` | ZONE-ADMIN | `203.0.113.5` | `app-01` | ZONE-APP | `198.51.100.20` | 22 | TCP/SSH | ADMIN → APP | Administration | PROD | SSH | `<infra team>` | Admin only through bastion |
| FLW-005 | `app-01` | ZONE-APP | `198.51.100.20` | `<monitoring collector>` | ZONE-ADMIN | `203.0.113.15` | `<port>` | TCP | APP → ADMIN | Metrics and logs shipping | PROD | TLS 1.2+ | `<run team>` | Supervision |
| FLW-xxx | | | | | | | | | | | | | | |

## 4. Review checklist

### Need and least privilege
- [ ] Every flow has an owner, a purpose and a justification traceable to an interface, requirement or operating need.
- [ ] No `any` source, destination or port; no broad subnets where a host or group suffices.
- [ ] No unjustified port ranges; ephemeral source ports not requested as rules.
- [ ] Temporary flows (migration, project phase) have an expiry date and a removal ticket.

### Segmentation
- [ ] No direct flow between production and non-production environments (except explicitly approved, e.g. one-way anonymized data feed).
- [ ] No direct flow from user zones or Internet to data zones; exposure goes through DMZ / reverse proxy / API gateway.
- [ ] Administration flows only from bastions or admin zone, never from office workstations or the Internet.
- [ ] Flows entering a regulated perimeter (CDE, HDS, DR system) reviewed against its rules; perimeter boundaries unchanged or re-assessed.
- [ ] Outbound Internet access goes through the proxy or an approved egress, with destination allow-listing.

### Protocols and encryption
- [ ] No cleartext protocols for credentials or sensitive data (Telnet, FTP, HTTP, LDAP without TLS, unencrypted database protocols).
- [ ] TLS versions and cipher policy match the security standard; mutual TLS for system-to-system where required.
- [ ] Certificate validation possible: OCSP / CRL endpoints reachable if needed.

### Completeness (commonly forgotten flows)
- [ ] DNS, NTP, directory (LDAP/Kerberos), authentication / IdP.
- [ ] Monitoring, log shipping (syslog / SIEM), backup agents and backup network.
- [ ] Antivirus / EDR updates, patch repositories, package mirrors.
- [ ] Cluster heartbeats, replication, load balancer health checks and VIPs.
- [ ] Scheduler agents, MFT agents, licence servers.
- [ ] DR site equivalents of production flows.
- [ ] NAT documented (pre/post translation addresses) where it applies.

### Lifecycle
- [ ] Flows tested after opening (test result recorded per ID).
- [ ] Obsolete flows identified for removal at decommissioning.
- [ ] Matrix version referenced in the DAT and the firewall change request.
