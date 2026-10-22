# DNS reference

## Contents
1. Concepts
2. Record types
3. TTL and caching
4. Split-horizon DNS
5. BIND
6. Windows DNS and AD-integrated zones
7. Infoblox (concepts)
8. DNSSEC
9. Troubleshooting
10. Migration pitfalls and checklist

## 1. Concepts
- **Authoritative** servers answer for zones they host (primary/secondary, or AD-integrated multi-master). **Recursive resolvers** answer clients by querying authoritative servers and caching. Keep the roles separate where possible; never expose an open recursive resolver to the internet.
- **Zone** = administrative unit; **delegation** = NS records in the parent (plus glue A/AAAA when the name servers live inside the delegated zone). Parent and child NS sets must match.
- **SOA**: primary name server, contact, serial (must increase on each change for secondaries to transfer - convention `YYYYMMDDnn`), refresh, retry, expire, and the last field used as negative-caching TTL (RFC 2308).
- **Zone transfer** (AXFR/IXFR) over TCP 53 to secondaries only (restrict by IP + TSIG); NOTIFY tells secondaries to refresh.
- **Forwarders / conditional forwarders**: send queries for given domains to specific servers (partner zones, AD forests, cloud private zones).
- **Response codes**: NOERROR with answer; NOERROR with empty answer = NODATA (name exists, not that type); NXDOMAIN (name does not exist); SERVFAIL (server could not answer: broken delegation, DNSSEC validation failure, unreachable authoritative); REFUSED (policy: recursion not allowed, ACL).

## 2. Record types

| Type | Purpose | Rules / pitfalls |
|---|---|---|
| A / AAAA | Name -> IPv4 / IPv6 | Publishing AAAA without working IPv6 path makes dual-stack clients slow/fail |
| CNAME | Alias to another name | Cannot coexist with any other record at the same name; not allowed at zone apex; avoid CNAME chains; MX/NS must not point to a CNAME |
| ALIAS/ANAME | Apex alias | Provider-specific (not a standard record type) |
| MX | Mail exchangers with preference | Lower value = preferred; target must have A/AAAA |
| TXT | Free text: SPF (`v=spf1 ...`), DKIM (`<selector>._domainkey`), DMARC (`_dmarc`), domain verification | SPF: max 10 DNS lookups; only one SPF record per name |
| SRV | `_service._proto.name` -> priority, weight, port, target | Used by AD (`_ldap._tcp.dc._msdcs.<domain>`, `_kerberos._tcp`), SIP, some apps |
| PTR | Reverse: IP -> name in `in-addr.arpa` / `ip6.arpa` | Needed by mail servers, some logging, Kerberos/SSH checks in some setups; keep forward and reverse consistent |
| NS | Delegation / zone servers | Parent and child must agree |
| SOA | Zone metadata | One per zone |
| CAA | Which CAs may issue certificates for the domain | Check before ordering public certificates |
| DS / DNSKEY / RRSIG / NSEC / NSEC3 | DNSSEC | See section 8 |
| HTTPS / SVCB | Service binding (RFC 9460): ALPN, alternative endpoints | Client support varies |

## 3. TTL and caching
- TTL = how long resolvers may cache. Typical: 300-3600 s for service names; long (86400) for stable records; short (60-300) for records that move at failover.
- Before a migration/cutover: lower the TTL at least one old-TTL period before the change (if TTL was 86400, lower it more than 24 h before), change, verify, then raise it again.
- Negative answers are cached too (SOA minimum / negative TTL): creating a record that was just queried as NXDOMAIN may take that long to be visible.
- Caches beyond the resolver:
  - Windows client cache: `ipconfig /displaydns`, `ipconfig /flushdns`, `Clear-DnsClientCache`.
  - Linux: systemd-resolved `resolvectl flush-caches` / `resolvectl statistics`; nscd/sssd caches if used.
  - Java: the JVM caches lookups (`networkaddress.cache.ttl`; default about 30 s without a security manager, can be infinite in some configurations - verify for your JDK); connection pools keep old IPs until reconnect.
  - Applications/LBs/proxies resolving once at startup (e.g. nginx `proxy_pass` with a hostname resolves at load unless a `resolver` is configured).
- DNS-based failover is only as fast as the longest cache in the chain; for fast failover use a VIP/LB/listener instead.

## 4. Split-horizon DNS
- Same name, different answers for internal vs external clients (internal IP vs public IP).
- Implementations: BIND `view` clauses matched on client source; Windows Server 2016+ DNS policies with zone scopes; separate internal/external servers with the same zone name (most common, most error-prone).
- Pitfalls: records added on one side only; VPN/remote clients using the wrong resolver; cloud workloads resolving via public resolvers; certificates must cover the names on both sides; troubleshooting must state from which resolver the query was made.

## 5. BIND
- Files: `named.conf` (options, ACLs, views, zones), zone files (`$TTL`, SOA, records).
- Hardening: `allow-recursion { trusted_nets; };` on resolvers, `recursion no;` on authoritative-only servers, `allow-transfer { secondaries; };` with TSIG keys, hide version (`version "none";`), run chrooted/unprivileged, rate limiting (RRL) on authoritative internet-facing servers.
- Operations:
```
named-checkconf /etc/named.conf                      # syntax check (path varies by distro)
named-checkzone example.org /var/named/db.example.org # zone file check
rndc reload example.org                              # reload one zone
rndc reconfig                                        # reload config, new zones only
rndc flush                                           # flush resolver cache
rndc status
```
- Always increment the SOA serial when editing zone files manually (or use dynamic updates / `nsupdate` with TSIG, then `rndc freeze`/`thaw` before manual edits of dynamic zones).

## 6. Windows DNS and AD-integrated zones
- AD-integrated zones are stored in AD application partitions (`DomainDnsZones`, `ForestDnsZones`) and replicate with AD - every DC/DNS server is writable (multi-master); replication latency = AD replication latency between sites.
- Secure dynamic updates: only authenticated domain members can register/update their records; DHCP servers can register on behalf of clients (credentials for DHCP DNS updates - use a dedicated account).
- `_msdcs.<forest root>` zone and SRV records drive the DC locator: broken DNS = broken logons, GPO, Kerberos.
- Aging and scavenging removes stale dynamic records: enable deliberately (both on zone and server), with intervals longer than DHCP lease/registration refresh; static records have no timestamp and are not scavenged.
- DCs should point to another DC as primary DNS and to themselves (loopback) as secondary (commonly recommended - verify against your AD design guidelines); clients point only to internal DNS (never to public resolvers as secondary).
- PowerShell (DnsServer module):
```
Get-DnsServerZone -ComputerName SRV-DC-01
Get-DnsServerResourceRecord -ZoneName example.org -Name app -RRType A
Add-DnsServerResourceRecordA -ZoneName example.org -Name app -IPv4Address 10.0.0.10 -CreatePtr
Add-DnsServerResourceRecordCName -ZoneName example.org -Name www -HostNameAlias app.example.org
Remove-DnsServerResourceRecord -ZoneName example.org -Name app -RRType A -RecordData 10.0.0.10
Add-DnsServerConditionalForwarderZone -Name partner.example.net -MasterServers 10.10.0.53 -ReplicationScope Forest
Clear-DnsServerCache
```
- Diagnostics: `dcdiag /test:dns /v`, `nltest /dsgetdc:example.org`, `ipconfig /registerdns` (re-register client records), DNS server debug logging / analytical event log (Microsoft-Windows-DNSServer).

## 7. Infoblox (concepts)
- DDI appliance family: DNS, DHCP and IPAM in one Grid. The Grid Master holds the database and pushes configuration to Grid members; a Grid Master Candidate can be promoted for resilience. Operating system: NIOS.
- DNS views implement split-horizon; zones are assigned to members (primary/secondary roles), external secondaries possible.
- Host records combine A/AAAA, PTR and optionally DHCP reservation in one object - deleting the host deletes all.
- Extensible attributes tag objects (owner, application, environment) - use them to drive governance and reporting.
- Automation via WAPI (REST API); integrate with ITSM/IaC rather than manual GUI changes; use the API in a least-privilege service account.
- Security features: DNS firewall (RPZ), threat feeds, query logging to SIEM (check licensing - verify).
- Migration from BIND/Windows: import tools exist; check record ownership, AD-integrated zone dependencies (keep AD `_msdcs` and DC SRV records on AD DNS or delegate them), dynamic updates (GSS-TSIG for Windows clients).

## 8. DNSSEC
- Zone signed with keys: KSK (signs the DNSKEY set; its hash is published as DS in the parent) and ZSK (signs records), or a single CSK. Common algorithms: 8 (RSASHA256), 13 (ECDSAP256SHA256).
- RRSIG signatures have an expiry: automatic re-signing must run (BIND `dnssec-policy`, Windows DNSSEC, Infoblox, provider). Expired signatures = SERVFAIL for every validating resolver = outage.
- Key rollovers: ZSK automatic; KSK rollover requires updating the DS at the parent (registrar/parent zone) at the right time.
- NSEC vs NSEC3 (hashed, prevents trivial zone walking).
- Validation failure looks like SERVFAIL; test with checking disabled: `dig +cd app.example.org` (answer with `+cd` but SERVFAIL without = DNSSEC problem). `dig +dnssec app.example.org` shows RRSIG; `delv app.example.org` explains validation.
- Internal zones: validating resolvers need negative trust anchors or no DNSSEC for internal-only names that shadow public signed zones (split-horizon + DNSSEC conflicts).

## 9. Troubleshooting

Method: (1) which resolver does the client actually use? (2) does that resolver answer correctly? (3) does the authoritative server answer correctly? (4) is something local overriding (hosts file, search suffix, cache)?

| Need | Linux / dig | Windows |
|---|---|---|
| Simple query | `dig app.example.org A +short` | `Resolve-DnsName app.example.org -Type A` |
| Query a given server | `dig @10.0.0.53 app.example.org` | `Resolve-DnsName app.example.org -Server 10.0.0.53`; `nslookup app.example.org 10.0.0.53` |
| Authoritative answer, no recursion | `dig @ns1.example.org app.example.org +norecurse` (look for `aa` flag) | `nslookup -norecurse app.example.org ns1.example.org` |
| Full delegation path | `dig +trace app.example.org` | (use dig from WSL/Linux) |
| Reverse | `dig -x 10.0.0.10` | `Resolve-DnsName 10.0.0.10` |
| SOA / serial | `dig example.org SOA +short` on each server (compare serials) | `Resolve-DnsName example.org -Type SOA -Server <srv>` |
| SRV (AD) | `dig _ldap._tcp.dc._msdcs.example.org SRV` | `nslookup -type=SRV _ldap._tcp.dc._msdcs.example.org` |
| Through OS resolver stack (hosts, nsswitch) | `getent hosts app.example.org`; `resolvectl query app.example.org` | `Resolve-DnsName app.example.org` (uses hosts file and cache unless `-DnsOnly`/`-NoHostsFile`) |
| TCP only | `dig +tcp app.example.org` | |
| Transfer allowed? (should be refused) | `dig @ns1.example.org example.org AXFR` | |

Local overrides to check: `/etc/hosts`, `C:\Windows\System32\drivers\etc\hosts`, `/etc/nsswitch.conf` order, `/etc/resolv.conf` (`search`, `ndots` - Kubernetes pods default `ndots:5` generates many extra queries for external names), NRPT rules / DirectAccess on Windows, VPN-pushed DNS settings, browser DNS-over-HTTPS bypassing corporate resolvers.

Note: `nslookup` uses its own resolver logic (not the OS stack): a name can resolve in nslookup and fail in the application, or the reverse.

## 10. Migration pitfalls and checklist
- [ ] Inventory all zones, records, delegations, conditional forwarders, dynamic update sources, DHCP registration, scavenging settings
- [ ] Lower TTLs ahead of cutover (> old TTL in advance); plan rollback (old servers kept read-only)
- [ ] Secondaries and zone transfer ACL/TSIG updated; SOA serial strategy kept increasing
- [ ] Registrar / parent delegation and glue updated; NS consistent at parent and child
- [ ] DNSSEC: plan DS change or unsign/re-sign sequence (never leave a DS pointing to keys no longer used)
- [ ] Mail records preserved: MX, SPF, DKIM selectors, DMARC; verification TXT records
- [ ] AD: DC locator SRV records and `_msdcs` remain reachable; DCs and clients' resolver settings updated (DHCP option 006, static configs)
- [ ] Firewall: UDP and TCP 53 from clients to resolvers, resolvers to forwarders/internet, transfers between servers
- [ ] Hard-coded IPs and hosts files in applications/servers identified
- [ ] Monitoring: query success rate, SERVFAIL rate, DNSSEC signature expiry, zone serial drift between servers
- [ ] Post-cutover: test from every network zone (user LAN, DMZ, server VLANs, VPN, cloud, partner links)
