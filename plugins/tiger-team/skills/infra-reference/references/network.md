# Network reference

## Contents
1. TCP/IP essentials
2. Addressing and subnetting
3. VLANs and overlays
4. Routing
5. NAT
6. Firewalls and flow matrices
7. Load balancers (F5, HAProxy)
8. Reverse proxies
9. VPN
10. TLS and PKI
11. Troubleshooting method and tools
12. Common ports (defaults - verify actual configuration)

## 1. TCP/IP essentials

| Concept | What to remember |
|---|---|
| TCP handshake | SYN -> SYN/ACK -> ACK. No SYN/ACK = packet dropped (firewall, routing, host down). RST = host reached, port closed or a device actively rejected. |
| Refused vs timeout | "Connection refused" = RST received (nothing listening, or firewall reject). "Timed out" = silent drop (firewall deny/drop, routing, asymmetric path). The difference tells you where to look. |
| TCP states | `TIME_WAIT` normal on the side that closes first (many = short-lived connections, consider pooling/keepalive); `CLOSE_WAIT` piling up = the local application does not close sockets (application bug). `SYN_SENT` stuck = no answer from remote. |
| Ephemeral ports | Linux default `net.ipv4.ip_local_port_range` 32768-60999; Windows 49152-65535. Exhaustion through a NAT/proxy = intermittent connection failures under load. |
| MTU/MSS | Ethernet 1500; tunnels (IPsec, GRE, VXLAN) reduce effective MTU. Blocking ICMP "fragmentation needed" breaks Path MTU Discovery -> small requests work, large transfers hang (TLS handshake with big certificate chains, file uploads). Fix: allow ICMP type 3 code 4, MSS clamping on tunnel edges. |
| Idle timeouts | Stateful firewalls/LBs/NAT drop idle sessions (often minutes to an hour - check the device). Long-lived idle connections (DB pools, MQ channels, LDAP) then fail on next use. Fix: TCP keepalive or application heartbeat below the device timeout, pool validation. |
| UDP | Connectionless: firewalls keep a pseudo-state with short timeouts; no "refused" unless ICMP port unreachable is returned. |
| ICMP | Do not block all ICMP: echo can be restricted, but type 3 (unreachable, incl. frag-needed) and time-exceeded are needed for PMTUD and traceroute. |

## 2. Addressing and subnetting

| CIDR | Mask | Addresses | Usable hosts (IPv4, on-prem) |
|---|---|---|---|
| /32 | 255.255.255.255 | 1 | host route |
| /31 | 255.255.255.254 | 2 | 2 (point-to-point links, RFC 3021) |
| /30 | 255.255.255.252 | 4 | 2 |
| /29 | 255.255.255.248 | 8 | 6 |
| /28 | 255.255.255.240 | 16 | 14 |
| /27 | 255.255.255.224 | 32 | 30 |
| /26 | 255.255.255.192 | 64 | 62 |
| /25 | 255.255.255.128 | 128 | 126 |
| /24 | 255.255.255.0 | 256 | 254 |
| /23 | 255.255.254.0 | 512 | 510 |
| /22 | 255.255.252.0 | 1024 | 1022 |
| /20 | 255.255.240.0 | 4096 | 4094 |
| /16 | 255.255.0.0 | 65536 | 65534 |

- Private (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. Shared/CGNAT (RFC 6598): 100.64.0.0/10. Link-local: 169.254.0.0/16 (APIPA - a host with 169.254.x.x did not get DHCP). Loopback 127.0.0.0/8. Documentation (RFC 5737): 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24.
- Cloud providers reserve some addresses per subnet (e.g. 5 in AWS and Azure) - size accordingly.
- IPv6: /64 per LAN segment; link-local fe80::/10; ULA fc00::/7; documentation 2001:db8::/32. Dual-stack hosts may prefer IPv6 - firewall rules and DNS AAAA records must be consistent.
- Integration projects: check for overlapping ranges between partners/subsidiaries/cloud VPCs early (forces NAT, complicates troubleshooting). Docker default bridge 172.17.0.0/16 and Kubernetes pod/service CIDRs can collide with corporate ranges.

## 3. VLANs and overlays
- 802.1Q tags (VLAN ID 1-4094). Access port = one untagged VLAN; trunk = tagged VLANs. Native VLAN mismatch and VLAN 1 usage are classic issues; prune unused VLANs on trunks.
- A VLAN is a broadcast domain, not a security control by itself; inter-VLAN traffic must cross a firewall when zones differ in trust.
- Private VLANs / micro-segmentation for host isolation within a segment.
- VXLAN: L2 over UDP (port 4789), 24-bit VNI; adds 50 bytes overhead -> MTU on underlay (jumbo or 1550+).
- Data center: management, production, backup, storage (iSCSI/NFS), cluster heartbeat, and administration networks separated.

## 4. Routing
- Longest prefix match wins; then administrative distance/metric. Default route 0.0.0.0/0 catches the rest.
- Static routes for simple edges; OSPF inside, BGP between sites/providers/cloud (Direct Connect/ExpressRoute style links).
- Asymmetric routing breaks stateful firewalls (return traffic through another firewall that has no session -> drop). Typical with multi-homed servers (several NICs, several gateways) - Linux `rp_filter` may also drop. Fix with policy routing or a single gateway per destination.
- Check the path: Linux `ip route get 10.0.20.15`, `ip route show`; Windows `Get-NetRoute`, `route print`, `Find-NetRoute -RemoteIPAddress 10.0.20.15`.
- Policy-based routing and VRFs: document them in the flow matrix - they change which firewall a flow crosses.

## 5. NAT
| Type | Use | Pitfall |
|---|---|---|
| SNAT / masquerade / PAT | Many internal hosts behind one address (internet egress, partner links) | Partner sees only the NAT IP: whitelist that IP, not server IPs; port exhaustion under load |
| DNAT / port forward | Publish internal service | Server sees the client IP only if no SNAT; logs and ACLs depend on it |
| Static 1:1 NAT | Overlapping address spaces between organisations | Double NAT complicates troubleshooting; document both real and translated addresses in the flow matrix |
| Hairpin / NAT loopback | Internal clients using the public name | Often unsupported -> prefer split-horizon DNS |

Lost client IP behind NAT/LB/proxy: use `X-Forwarded-For` / `Forwarded` (HTTP) or PROXY protocol (TCP) and trust them only from known proxies.

## 6. Firewalls and flow matrices

Principles:
- Default deny; explicit allow; stateful (return traffic implicit - never open the reverse direction "just in case").
- Zones by trust level (internet, DMZ, application, data, administration, backup, partner, non-prod); flows between zones are documented and justified.
- Rules are precise: source object (host/group/subnet), destination object, service (protocol/port), action, logging, owner, expiry for temporary rules. No `any` in source, destination or service without formal risk acceptance; never any/any.
- Administration flows (SSH, RDP, WinRM, DB admin ports, web consoles) only from the administration zone / bastion (PAM, e.g. session-recording proxy), never from user LANs or the internet.
- Prod and non-prod segregated; non-prod never reaches prod data stores.
- Outbound internet only via proxy (HTTP/S) with allowlist; no direct egress from servers.
- Logging on deny and on sensitive allows; logs to SIEM; periodic rule recertification (unused rules, expired temporary rules, shadowed rules).
- Prefer object groups and naming conventions (`H_SRV-APP-01`, `N_APP-PROD_10.0.10.0-24`, `G_DB-PROD`); one rule per business flow with a reference to the flow matrix ID.

Protocol-specific gotchas:
- FTP active/passive needs data port ranges or ALG -> prefer SFTP (22) or FTPS with fixed passive range.
- Microsoft RPC/DCOM, AD replication: TCP 135 + dynamic range 49152-65535 unless restricted on the servers.
- Oracle: client connects to listener (1521) and may be redirected - with RAC, clients connect to SCAN listener then to node VIP/local listener: open flows to SCAN IPs and node VIPs. Oracle on Windows/shared server configurations may redirect to other ports - verify.
- SQL Server named instances use dynamic ports + SQL Browser (UDP 1434): set a static port for firewalling.
- Load-balanced services: client -> VIP, plus LB self-IP/SNAT -> pool members, plus LB health monitors -> members.
- Clusters: heartbeat/interconnect networks and quorum witness flows.
- DNS over TCP 53 must be allowed as well as UDP 53 (large responses, DNSSEC, zone transfers).

Flow matrix minimum columns: ID, source (host/zone/IP), destination (host/zone/IP), port, protocol, direction, application/flow purpose, environment, encryption, owner, justification (see the `flow-matrix` skill).

## 7. Load balancers (F5, HAProxy)

| Concept | Notes |
|---|---|
| L4 vs L7 | L4 forwards TCP/UDP (fast, protocol-agnostic); L7 parses HTTP (routing by host/path, header insertion, WAF, cookie persistence). |
| Algorithms | Round robin, least connections, weighted, source/URI hash. Least connections suits uneven request cost. |
| Health checks | Shallow (TCP connect) detects dead processes only; deep (HTTP GET on a health URL checking dependencies) can cascade failures - prefer a "ready" endpoint checking local readiness only. |
| Persistence | Cookie (L7) or source IP (L4; broken by NAT/proxies). Prefer stateless apps / shared session store. |
| SNAT | Backend sees LB address unless transparent mode; backend firewall/ACLs/logs must account for it; return traffic must go through the LB. |
| TLS | Offload (TLS ends at LB), re-encrypt (LB -> backend TLS again), passthrough (LB does not decrypt; L4 only, no L7 features). Regulated data in transit: re-encrypt or passthrough. |
| HA pair | Active/standby with config sync; failover tested; floating IPs. |

F5 BIG-IP vocabulary: virtual server (VIP:port) -> pool -> pool members (node:port); monitors; profiles (TCP, HTTP, client SSL = client side TLS, server SSL = backend TLS); persistence profiles; SNAT (automap or SNAT pool); iRules (TCL) / Local Traffic Policies; partitions/route domains for multi-tenancy.

HAProxy vocabulary: `frontend` (bind address/port, ACLs), `backend` (servers, `balance`), `listen` (both), `server <name> <ip>:<port> check`, `option httpchk` for HTTP health checks, `stick-table` for persistence/rate limiting, runtime API/stats socket for draining (`set server <backend>/<server> state drain|maint|ready`, `disable server` / `enable server <backend>/<server>`, `show servers state`).

## 8. Reverse proxies
- Roles: TLS termination, routing, header normalization, auth offload, caching, WAF.
- Forwarding headers: `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host` or standard `Forwarded` (RFC 7239); application must use them only when the request comes from the trusted proxy.
- Timeouts: proxy read/connect timeouts shorter than client expectations cause 502/504; long operations (exports, reports) need async patterns rather than ever-longer timeouts.
- Body size limits (nginx `client_max_body_size` default 1m) -> HTTP 413 on uploads.
- WebSocket needs `Upgrade`/`Connection` headers forwarded and long timeouts.
- Security headers: HSTS, `X-Content-Type-Options: nosniff`, CSP, remove `Server`/version banners.
- HTTP status cheat sheet at a proxy: 502 bad gateway (backend refused/reset/invalid response), 503 (no healthy backend / maintenance), 504 (backend timeout), 499 (nginx: client closed before response).

## 9. VPN
| Type | Notes |
|---|---|
| IPsec site-to-site | IKEv2 preferred; IKE UDP 500, NAT-T UDP 4500, ESP IP protocol 50. Phase 1 (IKE SA) and phase 2 (child SA / traffic selectors) parameters must match exactly on both sides (encryption, integrity, DH group, lifetimes, PFS, local/remote subnets). Most "tunnel up but no traffic" issues = traffic selector or routing mismatch. |
| SSL/TLS VPN (remote access) | Client-based; integrate MFA; split vs full tunnel is a security decision. |
| WireGuard | UDP, simple key-based peers; key distribution and rotation are your problem. |

Partner VPN checklist: exchange a technical form (peer IPs, IKE version, proposals, encryption domains, NAT), overlapping subnet check, MTU/MSS, monitoring of tunnel state, contact matrix, key/PSK exchanged out-of-band (never e-mail in clear), certificate-based authentication preferred over PSK.

## 10. TLS and PKI

Rules:
- TLS 1.2 minimum, TLS 1.3 preferred; disable SSLv3/TLS 1.0/1.1; AEAD cipher suites with forward secrecy; follow ANSSI TLS recommendations for French public-sector/regulated contexts.
- The server must send the leaf + intermediate certificates (not the root). Missing intermediate = works in some browsers (AIA fetching), fails in Java/curl/appliances.
- Names must be in subjectAltName (CN alone is ignored by modern clients). Wildcard `*.example.org` matches one label only (`a.example.org`, not `a.b.example.org`, not `example.org`).
- Key usage / extended key usage must fit: serverAuth for servers, clientAuth for mTLS clients.
- mTLS: server requests a client cert, validates chain against a configured CA bundle, then authorizes the identity (subject/SAN) - chain validation alone is not authorization.
- Public TLS certificate maximum validity is stepping down under the CA/Browser Forum Baseline Requirements (ballot SC-081): 398 days today, 200 days for certificates issued from 15 March 2026, 100 days from 15 March 2027, 47 days from 15 March 2029: automate renewal (ACME, enterprise PKI connectors) and monitor expiry (alerts at 30/14/7 days).
- Inventory all certificates (LB, proxies, app keystores, MQ channels, LDAPS, SAML signing, partners' mTLS) with owner and renewal procedure; expired internal certs are a top cause of integration outages.
- Private keys: generated where used or in HSM; never sent by e-mail; protected keystores; separate keys per environment.
- Revocation: CRL distribution points / OCSP must be reachable from clients (flow matrix!).

Formats: PEM (Base64, `-----BEGIN CERTIFICATE-----`), DER (binary), PKCS#12 `.p12/.pfx` (cert + key + chain, password protected), JKS/PKCS12 Java keystores (`keytool`).

OpenSSL cheat sheet (OpenSSL 1.1.1+/3.x):
```
openssl s_client -connect app.example.org:443 -servername app.example.org -showcerts </dev/null
openssl s_client -connect app.example.org:443 -tls1_2          # test a protocol version
openssl x509 -in cert.pem -noout -subject -issuer -dates -ext subjectAltName
openssl verify -CAfile root-and-intermediates.pem cert.pem
openssl req -new -newkey rsa:3072 -nodes -keyout app.key -out app.csr \
  -subj "/CN=app.example.org" -addext "subjectAltName=DNS:app.example.org,DNS:app-int.example.org"
openssl req -in app.csr -noout -text                            # check CSR content
openssl x509 -in cert.pem -noout -pubkey | openssl sha256       # compare with:
openssl pkey -in app.key -pubout | openssl sha256               # same hash = key matches cert
openssl pkcs12 -export -in cert.pem -inkey app.key -certfile chain.pem -out app.p12
openssl pkcs12 -in app.p12 -info -noout                         # OpenSSL 3 may need -legacy for old files
```
Java: `keytool -list -v -keystore truststore.jks`, `keytool -importcert -alias partner-ca -file ca.pem -keystore truststore.jks`.
Windows: `certlm.msc` (machine store), `Get-ChildItem Cert:\LocalMachine\My`, `certutil -verify -urlfetch cert.cer` (checks chain and CRL/OCSP reachability).

Typical TLS errors: unknown CA / unable to get local issuer (missing intermediate or truststore), hostname mismatch (SAN), expired, handshake failure (no common protocol/cipher, SNI missing, client cert required), `bad certificate` alert (client cert rejected).

## 11. Troubleshooting method and tools

Method (bottom-up, stop at the first failing layer):
1. Name resolution: does the name resolve to the expected IP from the client (see dns.md)?
2. Routing/reachability: is the path correct (traceroute, route table)? ICMP may be filtered - do not conclude from ping alone.
3. Port reachability: TCP connect to destination port from the real source host (not from your laptop).
4. Firewall/NAT: check logs on each firewall on the path for the exact 5-tuple; compare source IP seen vs expected (NAT).
5. TLS: handshake, chain, SAN, client cert.
6. Application protocol: HTTP status, auth, payload; then application logs.
7. Capture on both sides when in doubt: SYN leaves client but never arrives = in-between device.

| Need | Linux | Windows |
|---|---|---|
| Reachability | `ping -c 4 <ip>`; `mtr -n <ip>`; `traceroute -n -T -p 443 <ip>` (TCP traceroute) ; `tracepath <ip>` (also shows PMTU) | `ping <ip>`; `tracert -d <ip>`; `pathping <ip>`; `Test-NetConnection <ip> -TraceRoute` |
| TCP port test | `nc -vz <host> <port>`; `timeout 5 bash -c '</dev/tcp/<host>/<port>'`; `curl -v telnet://<host>:<port>` | `Test-NetConnection -ComputerName <host> -Port <port>` (alias `tnc`) |
| Listening sockets | `ss -tlnp` (TCP listen + process), `ss -ulnp`, `ss -tan state established`, `ss -s` | `Get-NetTCPConnection -State Listen`, `netstat -ano` (+ `Get-Process -Id <pid>`) |
| HTTP | `curl -v https://app.example.org/health`; `curl -vk --resolve app.example.org:443:10.0.0.10 https://app.example.org/` (bypass DNS, test one backend); `curl -x http://proxy:3128 ...` | `Invoke-WebRequest -Uri ... -UseBasicParsing` (Windows PowerShell 5.1), or `curl.exe -v` (shipped with recent Windows) |
| TLS | `openssl s_client` (above) | `Test-NetConnection` + `certutil`; `openssl` if installed |
| Capture | `tcpdump -i any -nn host 10.0.0.10 and port 443`; `tcpdump -i eth0 -nn -w /tmp/cap.pcap 'tcp port 1521'` (analyse in Wireshark) | `pktmon` (built-in on recent versions; `pktmon etl2pcap <log.etl> --out cap.pcapng` converts its ETL for Wireshark); `netsh trace start capture=yes tracefile=C:\temp\cap.etl` ... `netsh trace stop`, then convert with Microsoft's `etl2pcapng cap.etl cap.pcapng` |
| Interfaces/routes | `ip -br addr`, `ip route`, `ip neigh` | `Get-NetIPConfiguration`, `Get-NetRoute`, `arp -a` |

Reading a capture: SYN repeated with no SYN/ACK = drop before/at destination; SYN/ACK seen on server but not on client = return path/asymmetric routing; RST right after SYN = closed port or firewall reject; TLS ClientHello then reset = TLS inspection/IPS or protocol mismatch; many retransmissions = loss/MTU.

Rule: test from the real source, at the real time, with the real name; reproduce with timestamps so network teams can match firewall logs.

## 12. Common ports (defaults - verify actual configuration)

| Service | Port/proto | Secure alternative / notes |
|---|---|---|
| SSH / SFTP | 22/tcp | Admin via bastion only |
| HTTP / HTTPS | 80/tcp / 443/tcp | 80 only for redirect to 443 |
| DNS | 53/udp + 53/tcp | Both needed |
| NTP | 123/udp | NTS (4460/tcp) where supported |
| LDAP / LDAPS / GC | 389/tcp / 636/tcp / 3268, 3269/tcp | LDAPS or StartTLS; LDAP signing |
| Kerberos / kpasswd | 88/tcp+udp / 464/tcp+udp | |
| SMB | 445/tcp | SMB signing/encryption; never to internet |
| RPC endpoint mapper | 135/tcp + 49152-65535/tcp | Restrict dynamic range where possible |
| RDP | 3389/tcp | Via bastion/PAM, NLA |
| WinRM | 5985/tcp (HTTP) / 5986/tcp (HTTPS) | 5986 or Kerberos-encrypted within domain |
| SMTP / submission / SMTPS | 25 / 587 / 465 tcp | STARTTLS on 587, implicit TLS on 465 |
| Syslog / syslog TLS | 514/udp+tcp / 6514/tcp | TLS for audit logs |
| SNMP / traps | 161/udp / 162/udp | SNMPv3 (authPriv) only |
| Oracle listener | 1521/tcp | TCPS often 2484 (convention) |
| PostgreSQL | 5432/tcp | `hostssl` |
| SQL Server / Browser | 1433/tcp / 1434/udp | Static port for named instances |
| MySQL / MariaDB | 3306/tcp | `require_secure_transport` |
| Db2 LUW | instance `SVCENAME` (often 50000/tcp) | `SSL_SVCENAME` |
| IBM MQ | 1414/tcp (listener default) | TLS on channels |
| Kafka | 9092/tcp common (configurable) | TLS/SASL listener, port per config |
| AMQP / AMQPS | 5672 / 5671 tcp | |
| IBM i host servers | 446 (DDM/DRDA; 448 over TLS), 449 (server mapper), 8470-8476 (`as-central` to `as-signon`), TLS 9470-9476, Telnet 23 / TLS 992 | Prefer TLS ports; actual values in `WRKSRVTBLE` |
| Vault | 8200/tcp | TLS |

## Sources

- https://raw.githubusercontent.com/cabforum/servercert/main/docs/BR.md - Baseline Requirements 6.3.2 validity schedule
- https://cabforum.org/2025/04/11/ballot-sc081v3-introduce-schedule-of-reducing-validity-and-data-reuse-periods/ - ballot SC-081v3 summary
- https://docs.haproxy.org/3.0/management.html - HAProxy runtime API server commands
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/pktmon-etl2pcap - pktmon ETL to pcapng conversion
- https://github.com/microsoft/etl2pcapng - Microsoft etl2pcapng for netsh ETL files
- https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml - IANA ports (ntske 4460, syslog-tls 6514, vxlan, amqp, ddm-rdb, ibm-mqseries)
- https://www.ibm.com/support/pages/tcpip-ports-required-ibm-i-access-and-related-functions - IBM i host server port table
