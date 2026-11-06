# Network access control (802.1X, MAB, RADIUS, Wi-Fi)

Scope: keeping unmanaged devices off wired and wireless enterprise networks: authentication methods, port and SSID design, policy engine choice, rollout by tiers, resilience, operations and tests. Vendor behaviour changes between firmware and licence levels: every vendor statement below is version-qualified or marked **verify**. Examples use fictitious VLAN IDs and names.

## 1. Building blocks

| Component | Role | Notes |
|---|---|---|
| Supplicant | Endpoint software that authenticates (Windows, macOS, iOS/Android, Linux wpa_supplicant) | Configured centrally (GPO, MDM), never by the user |
| Authenticator | Switch port or access point that relays EAP and enforces the result | Each switch and each AP that talks RADIUS is a RADIUS client (NAS) |
| Authentication server | RADIUS / NAC policy engine | Two nodes in two failure domains |
| Identity stores | Directory (AD, Entra ID), PKI, endpoint registry (CMDB/MDM) | The endpoint registry is the single source for MAC allow-lists |
| PKI | Issues machine and server certificates; publishes CRL/OCSP | CRL availability is authentication availability for EAP-TLS |
| SIEM | Collects RADIUS, switch/AP events, DHCP, directory and PKI logs | Logs contain MAC addresses and identities: personal data |

## 2. Authentication methods

| Method | Credential | Use for | Watch out |
|---|---|---|---|
| **EAP-TLS** | Certificate on both sides | Managed laptops, desktops, smartphones | Needs a PKI, certificate lifecycle and CRL/OCSP in high availability. Recommended default |
| PEAP-MSCHAPv2 | Password inside a TLS tunnel | Legacy only | MSCHAPv2 has known cryptographic weaknesses (ANSSI-PA-043). An evil twin can capture the exchange when the supplicant does not validate the server. On Windows 11 22H2+, Credential Guard is enabled by default on eligible Enterprise/Education domain-joined devices and removes single sign-on for MS-CHAPv2 (credentials are prompted again) |
| EAP-TTLS/PAP | Password inside a TLS tunnel | Directory-backed users when certificates are impossible | No MFA; same server-validation requirement |
| TEAP | Chained machine and user authentication | Machine + user policies | Supplicant and server support: verify |
| MAB (MAC Authentication Bypass) | MAC address only | Printers, phones, building and safety devices that cannot do 802.1X | MAC addresses are spoofable: confine each population to its own zone, alert on profile or port changes |
| Identity PSK (per-device key) | One pre-shared key per device | Wi-Fi-only headless devices | Exception to "no shared secret": record it as a dispensation |
| Shared PSK (WPA2/WPA3-Personal) | One key for everyone | Never on internal networks | No individual revocation; a departure means changing the key everywhere |

Supplicant rules: validate the server certificate, list the expected server names, trust only the internal issuing root, forbid the user from accepting an unknown server, and do not allow fallback to unauthenticated access unless a documented risk acceptance says so.

Certificate rules: client-authentication EKU, identity in the SAN (machine FQDN or UPN), non-exportable key (TPM where possible), validity around one year with automatic renewal well before expiry, revocation tied to the asset lifecycle (device retired, stolen, reimaged). Freeze CRL/AIA URLs and RADIUS server names before the first issuance: they are written into certificates and supplicant profiles.

## 3. Wired port design

### Host modes (generic semantics; exact names and limits are vendor-specific)

| Mode | Behaviour | Typical use |
|---|---|---|
| Single-host | One authenticated endpoint per port | Dedicated desk or device port |
| Multi-domain | One data endpoint + one voice endpoint | Desk port with an IP phone and a PC behind it |
| Multi-auth | Each endpoint authenticates separately | Shared ports; check vendor support for fallback VLANs in this mode |
| Multi-host | First success opens the port to everyone | Avoid: a hub behind the port inherits the access |

### Fallback VLANs

| Fallback | Trigger | Design rule |
|---|---|---|
| Guest / no-response | No EAPOL received | Internet-only zone or nothing, never the corporate VLAN after the monitor tier |
| Auth-fail | Access-Reject | Internet-only or quarantine zone in low-impact tier; nothing in closed tier |
| Critical | All RADIUS servers unreachable | Restricted corporate zone for managed PCs; zone of the device for headless populations (voice, safety); nothing for admin and quarantine |

Decide fail-open or fail-closed **per population** and record it in an ADR. Re-authentication of clients parked in a critical VLAN when RADIUS comes back is vendor-specific (often requires server monitoring to be enabled): verify and test it.

### Authorization attributes

| Need | Attribute | Reference |
|---|---|---|
| Dynamic VLAN | `Tunnel-Type` = VLAN (13), `Tunnel-Medium-Type` = IEEE-802 (6), `Tunnel-Private-Group-ID` = VLAN ID | RFC 2868, RFC 3580 |
| Named policy or ACL | `Filter-Id` (exact, case-sensitive name on many platforms) | RFC 2865 |
| Voice domain | Vendor attribute (for example `Cisco-AVPair` `device-traffic-class=voice`) | Vendor documentation |
| Change of Authorization / Disconnect | CoA-Request, Disconnect-Request | RFC 5176 (default UDP 3799; some vendors default to 1700: verify) |

Prefer attributes understood by every switch and AP in the estate: it keeps the policy engine replaceable. A name sent in `Filter-Id` that the device does not know can drop the client's traffic: generate names from one list and test each profile.

### Port profiles (example)

| Profile | Policy | Fallbacks (low-impact → closed) | Hardening |
|---|---|---|---|
| Desk port (PC + phone) | 802.1X with MAB fallback, multi-domain, voice VLAN | Guest-wired → none; critical: restricted corporate / voice | BPDU guard, DHCP snooping, ARP inspection |
| Printer / IoT / safety | MAB (802.1X if supported), single-host | Quarantine → none; critical: device zone | Port isolation; DHCP reservation when ARP inspection is on |
| Meeting room / open area | 802.1X with MAB fallback, single-host | Guest-wired → none; critical: guest-wired | Port schedule outside business hours |
| IT staging | 802.1X, MAB for devices declared "in preparation" | None | Few ports, closed room |
| AP uplink, inter-switch trunk | No access policy on trunks (most vendors) | n/a | Explicit VLAN list, dead native VLAN, root guard/loop guard, never BPDU guard on trunks |
| Unused | Disabled, dead VLAN | n/a | BPDU guard |

Complementary hygiene (no NAC product needed): disable unused ports, BPDU guard on access ports, block rogue DHCP servers, dynamic ARP inspection (it drops static IPs that are not allow-listed), storm control, alerts on new DHCP servers and on rogue APs.

## 4. Wireless design

| SSID | Security | Mode | Notes |
|---|---|---|---|
| Corporate | WPA2-Enterprise or WPA3-Enterprise with an on-premises RADIUS | Bridged to the corporate VLAN, dynamic VLAN by RADIUS | WPA3-Enterprise 192-bit mode requires EAP-TLS. Fast roaming with CoA has vendor prerequisites: verify |
| Guest | Open or OWE with a sponsored captive portal | Bridged to an Internet-only VLAN, client isolation | Deny RFC 1918 at the firewall as well; a captive portal hosted by a cloud controller disappears when the cloud is unreachable |
| IoT (only when wired is impossible) | EAP-TLS, else per-device PSK | Device zone | Recorded dispensation |

Rogue AP detection: alert, then contain manually and only after verifying the AP is on your own wired network. Containment uses deauthentication frames and can affect neighbours' networks: vendors themselves warn about legal implications; get legal approval for the procedure. Containment does not work against PMF-protected networks (6 GHz, WPA3). The real countermeasure is the closed switch port.

## 5. Zone model (fictitious VLAN IDs)

| VLAN | Zone | Population | Access | If RADIUS is unreachable |
|---|---|---|---|---|
| 10 | CORP | Managed PCs | Business applications, infrastructure | Wired: CORP-CRIT |
| 11 | CORP-CRIT | Managed PCs in degraded mode | Infrastructure + critical application allow-list | n/a |
| 12 | MOBILE | Managed smartphones | Mobile applications | New Wi-Fi clients refused |
| 20 / 30 / 40 / 50 | VOICE / PRINT / IOT / SAFETY | Headless devices | Their own servers only, no lateral route | Fail-open to the device zone |
| 60 / 61 | GUEST / GUEST-WIRED | Visitors, contractors' own PCs, BYOD | Internet only | Independent of RADIUS |
| 70 | QUARANTINE | Managed device out of compliance | DNS, DHCP, PKI, remediation | Closed |
| 75 | PROVISIONING | New, reimaged or expired-certificate devices | Deployment, directory, PKI, updates | Closed |
| 80 / 90 | ADMIN / MGMT | Admin workstations; network devices and NAC | Bastion, management plane | Closed |
| 100+ | SERVERS | Infrastructure and business servers | Per flow matrix | n/a |
| 999 | DEAD | Unused ports | Nothing | n/a |

Every inter-zone flow goes through a stateful filter, default deny with logging. If one firewall carries all inter-VLAN routing at the main site, it is a single point of failure: plan an HA pair or route on the core switches and filter only sensitive zones (ADR).

## 6. Choosing the policy engine

Knock-out criterion first: **losing the vendor's cloud controller must not stop authentication**. Then score the remaining options with the weighted matrix of `architecture-reference/references/adr.md`.

| Option | Strengths | Limits to check |
|---|---|---|
| Group-shared NAC | Reuse, one operating model | Availability from every site, contract and support scope |
| On-premises NAC (Cisco ISE, Aruba ClearPass, Fortinet FortiNAC, Forescout, others) | Profiling, posture, CoA, guest portals | Licences, skills, upgrade cadence, supported versions |
| Microsoft NPS + AD CS | Low cost, familiar | No posture (NAP was removed from Windows Server 2016 onwards), no profiling, NPS needs the Desktop Experience installation (not Server Core). MAB support and CoA: verify. Acceptable as a time-boxed transition |
| Switch vendor's cloud NAC | Integrated, little to run | Behaviour when the cloud is unreachable, CoA support, licence model, supported identity providers |

Posture matters in regulated contexts: DORA's RTS 2024/1774 art. 13(1)(d) targets unauthorised devices **and** devices that do not meet the entity's security requirements. Without posture, document the gap and the compensating controls (certificate issued only to managed devices, revoked at retirement).

## 7. Rollout by tiers

| Tier | Content | Exit criteria (examples) | Rollback |
|---|---|---|---|
| T0 Hygiene | Inventory (models, firmware, licences, ports, headless devices); unused ports disabled; BPDU guard; rogue DHCP blocking; guest SSID isolated; zones and filtering; PKI and certificates deployed; two RADIUS nodes; controller admin hardening; SIEM sources | ≥ 98 % of managed PCs with a valid certificate; ≥ 95 % of headless devices reconciled with the registry | Re-enable port; DHCP back to allow; disable rule |
| T1 Monitor (pilot) | Non-blocking authentication on a pilot floor and the smallest site: native open/monitor mode when available, otherwise fallback VLANs equal to the production VLAN or a final permit-and-log rule | Two weeks without unexplained failure; all authentications in the SIEM within minutes | Remove the policy from the pilot ports |
| T2 Low-impact | Site by site, main site last; corporate SSID strict; shared PSKs removed; failures to guest-wired or quarantine | Test scenarios passed; runbooks validated; helpdesk volume under threshold | Fallbacks back to production VLAN for a bounded time |
| T3 Closed | No access without authentication; headless ports locked; penetration test | All scenarios passed; no open critical pentest finding; operations manual accepted | Back to T2 configuration |

Editing an access policy usually re-applies it to every port that uses it: change in maintenance windows, and plan how many policies each network needs per tier (pilot and transition policies included) against the vendor's limit.

## 8. Provisioning and repair path

Closed ports block devices that cannot authenticate yet: new PCs, reimaged PCs, PCs that stayed offline until their certificate expired, PXE boot and Wake-on-LAN. Provide:
- staging ports in an IT room, where a MAC declared "in preparation" in the registry gets the PROVISIONING zone for a limited time (for example 72 h);
- for cloud-enrolled devices (Autopilot or equivalent), enrolment and certificate delivery over the guest Internet access, then corporate access;
- a runbook "repair a blocked device" with a target time, and a test scenario in acceptance.

## 9. Resilience

| Event | Wired | Wi-Fi | Design answer |
|---|---|---|---|
| Cloud controller unreachable | Authentication continues with an on-premises RADIUS (management is out-of-band on most cloud-managed platforms: verify and test for long outages) | Same for enterprise SSIDs; cloud-hosted portals stop | On-premises engine; test an outage longer than the vendor's reboot or cache timers |
| One RADIUS node down | Failover to the next server | Failover in configured order | Two nodes, two failure domains |
| All RADIUS unreachable or remote site WAN down | Critical VLAN per zone | New clients refused (most APs have no critical VLAN) | Accept as a degraded mode (risk owner), or second WAN / local node |
| CRL or PKI unavailable | EAP-TLS failures at CRL expiry | Same | CRL published on two sites; CRL validity well above the issuing CA's RTO; monitor next-update dates |
| Authorization cache on the switch | Some models cache results; cached results may not send EAP-Success, which pushes supplicants toward unauthenticated fallback | n/a | Prefer critical VLANs; enable caching only with a documented risk acceptance |

## 10. Operations

Runbooks to deliver: repair a blocked device; add, replace or retire a headless device (registry → MAB list); quarantine and release (trigger: EDR, MDM compliance, SOC decision; with CoA when available); RADIUS unreachable / critical VLAN active; guest and contractor access; MAB exceptions with owner and end date; renew RADIUS and CA certificates without changing the chain; publish the offline root CRL before it expires; synchronise and back up the engine configuration; break-glass controller account and secret rotation.

SIEM use cases: repeated failures on a port or AP; MAB device with an inconsistent profile; same MAC on two ports or sites; headless device moved without a ticket; client parked in a fallback VLAN while RADIUS is up; rogue AP correlated with a wired port; rogue DHCP server; ARP inspection drops; revoked or expired certificate presented; successful authentication with no registry record; controller change outside a change window or admin login from outside allowed ranges; loss of RADIUS telemetry or CRL close to expiry.

Logs: timestamp, identity, MAC, port or AP, result, assigned VLAN; no EAP payloads. Retention set with the DPO and the CISO (GDPR); guest portal logs have their own legal basis and retention (verify).

Controller administration: SSO with MFA, login IP allow-list from bastions (test before enabling; lock-outs often need vendor support), role-based access by site or port tags, separate read and write API keys in a vault, daily configuration export to version control.

## 11. Acceptance scenarios

1. Unknown PC or single-board computer on a wall port. 2. Cloned MAC of a printer. 3. Rogue AP plugged into the LAN. 4. Evil twin of the corporate SSID. 5. PC behind an IP phone. 6. Unmanaged switch or hub on a desk port. 7. Stolen device with a revoked certificate (measure the revocation delay). 8. One RADIUS node down, then both. 9. CRL unavailable. 10. Wi-Fi from the car park with valid domain credentials. 11. Controller login from outside the allowed ranges or without MFA. 12. Reimaged or expired-certificate device repaired through the provisioning path.

## 12. Vendor notes: Cisco Meraki (documentation read in November 2026; verify against your firmware and licence)

| Topic | Documented behaviour |
|---|---|
| Access policies (MS) | 802.1X, MAB or hybrid (MAB after 8 s without EAP); at most 8 access policies per network and 3 RADIUS servers per policy; access ports only, not trunks; editing a policy can briefly disrupt every port using it |
| Monitor mode | "Open" authentication mode documented for MS130 and MS150 from MS18 only; elsewhere emulate monitor with fallback VLANs |
| Fallbacks | Guest, failed-authentication and critical VLANs from MS 14+; on MS "Classic" multi-auth is documented without them, while the MS18 firmware directory announces support: test on your firmware. RADIUS monitoring must be enabled or clients stay in fallback VLANs |
| Authorization | Dynamic VLAN via `Tunnel-*` attributes; group policy ACL via `Filter-Id` matching the group policy name exactly; an unknown name drops the client's traffic; above about 200 ACEs per switch on many models the failure is silent |
| RADIUS caching | Documented for MS390 and C9300-M only; cached results do not send EAPOL-Success |
| CoA | MS: UDP 1700. MR: 1700 with Cisco ISE, 3799 for other servers |
| Wireless | WPA3-Enterprise not supported with Meraki Cloud Authentication (external RADIUS required); 192-bit mode is EAP-TLS only; a NAT-mode SSID with "Deny local LAN" cannot reach an internal RADIUS and stops broadcasting during a cloud outage; Air Marshal containment carries Cisco's own warning about legal implications |
| Access Manager (cloud NAC) | Rule evaluation needs the cloud; no CoA documented; separate per-session licence; Entra ID is the only supported identity provider; wireless fallback authenticates EAP-TLS locally without evaluating rules |
| MX | 802.1X on LAN ports documented for small models (MX64 to MX75), single-host, one RADIUS server for all ports |

## 13. Regulatory and normative anchors

ANSSI guide d'hygiène informatique (2017): measure 7 (only managed devices on the network, wired and wireless; 802.1X at the reinforced level) and measure 20 (Wi-Fi: machine certificates, no shared password, separate SSID and VLAN for visitors). ANSSI-PA-043 (2018), 802.1X deployment: R7 WPA2-Enterprise, R21 control of connecting devices, R22 802.1X on every wireless network, R24 802.1X on open-access sockets. DORA RTS 2024/1774 art. 13(1)(d). CIS Controls v8 safeguard 13.9. NIST SP 800-53 rev. 5 IA-3. ISO/IEC 27001:2022 A.8.20 and A.8.22. Applicability per sector: `sector-compliance`.

## Sources

- https://www.rfc-editor.org/rfc/rfc3580 — IEEE 802.1X RADIUS usage guidelines (VLAN attributes)
- https://www.rfc-editor.org/rfc/rfc5176 — Dynamic authorization (CoA, Disconnect)
- https://messervices.cyber.gouv.fr/documents-guides/guide_802.1x_anssi_pa_043_v1.pdf — ANSSI-PA-043, 802.1X deployment recommendations
- https://messervices.cyber.gouv.fr/documents-guides/guide_hygiene_informatique_anssi.pdf — ANSSI guide d'hygiène informatique v2.0
- https://learn.microsoft.com/en-us/windows/security/identity-protection/credential-guard/considerations-known-issues — Credential Guard and MS-CHAPv2
- https://learn.microsoft.com/en-us/windows-server/networking/technologies/nps/nps-top — NPS, NAP removal, Server Core
- https://controls-assessment-specification.readthedocs.io/en/latest/control-13/control-13.9.html — CIS Controls v8, 13.9
- https://documentation.meraki.com/Switching/MS_-_Switches/Design_and_Configure/Configuration_Guides/Access_Control/MS_Switch_Access_Policies_(802.1X) — Meraki MS access policies
- https://documentation.meraki.com/Switching/MS_-_Switches/Design_and_Configure/Configuration_Guides/Access_Control/Meraki_MS_Group_Policy_Access_Control_Lists — Meraki MS group policy ACL
- https://documentation.meraki.com/Wireless/Design_and_Configure/Configuration_Guides/Encryption_and_Authentication/Change_of_Authorization_with_RADIUS_(CoA)_on_MR_Access_Points — Meraki MR CoA
- https://documentation.meraki.com/Wireless/Design_and_Configure/Configuration_Guides/Encryption_and_Authentication/WPA3_Encryption_and_Configuration_Guide — Meraki WPA3
- https://documentation.meraki.com/Wireless/Operate_and_Maintain/User_Guides/Monitoring_and_Reporting/Air_Marshal — Meraki Air Marshal
- https://documentation.meraki.com/Platform_Management/Dashboard_Administration/Troubleshooting_and_Support/Troubleshooting/Behavior_during_Connection_Loss_to_Cisco_Meraki_Cloud — Meraki behaviour during cloud loss
- https://documentation.meraki.com/Platform_Management/Access_Manager/Design_and_Configure/Access_Manager_Deployment_Guide — Meraki Access Manager
- https://documentation.meraki.com/SASE_and_SD-WAN/MX/Design_and_Configure/Configuration_Guides/Access_Control/MX_Access_Policies_(802.1X) — Meraki MX access policies

---

Last reviewed: 2026-11
