# Windows Server reference

## Contents
1. Active Directory Domain Services
2. Group Policy
3. DNS and DHCP
4. IIS
5. Services and service accounts (gMSA)
6. Scheduled tasks
7. PowerShell remoting
8. Event logs
9. Failover clustering
10. Hardening
11. Patching
12. Quick triage runbook

## 1. Active Directory Domain Services
- Structure: forest (security boundary) > domains > OUs (delegation and GPO scope). Sites/subnets drive DC selection and replication topology - every client subnet must be mapped to a site (`Get-ADReplicationSubnet -Filter *`).
- FSMO roles (5): Schema Master and Domain Naming Master (per forest); RID Master, PDC Emulator, Infrastructure Master (per domain). `netdom query fsmo`, `Get-ADForest`, `Get-ADDomain`.
- Time: the PDC Emulator of the forest root is the time authority; Kerberos tolerates 5 minutes skew by default - time drift = authentication failures.
- Health:
```
dcdiag /v /c /e > dcdiag.txt        # all DCs, comprehensive (long)
repadmin /replsummary
repadmin /showrepl SRV-DC-01
Get-ADReplicationFailure -Target example.org -Scope Domain
nltest /dsgetdc:example.org         # which DC a client finds
```
- Kerberos: service principal names (`setspn -L <account>`, duplicates with `setspn -X`) - a duplicate or missing SPN makes Kerberos fail and fall back to NTLM (or fail). Delegation: avoid unconstrained delegation; use constrained or resource-based constrained delegation (RBCD).
- LDAP: require signing and channel binding; use LDAPS (636) for applications binding with credentials; application bind accounts are least-privileged, non-interactive, password managed.
- Security model: tiering (Tier 0 = AD/DCs/PKI/identity, Tier 1 = servers, Tier 2 = workstations) - no Tier 0 credential ever used on a lower tier; privileged access workstations; `Protected Users` group for admins; Windows LAPS for local admin passwords; minimal membership of Domain/Enterprise/Schema Admins (monitored); periodic KRBTGT password reset (twice, with replication between resets); review AdminSDHolder-protected accounts. ANSSI publishes AD security checkpoints - use them in French regulated contexts.
- Common ports (DC): 53, 88, 135 + RPC dynamic 49152-65535, 389, 445, 464, 636, 3268/3269, 9389 (AD Web Services, used by the PowerShell AD module), 123/udp (W32Time).

## 2. Group Policy
- Processing order LSDOU: Local, Site, Domain, OU (parent to child); last applied wins; "Enforced" links win over child links and ignore "Block inheritance".
- Filtering: security filtering (Read + Apply), WMI filters (cost at logon); loopback processing (Merge/Replace) for RDS/kiosk servers.
- Computer settings apply at boot/refresh, user settings at logon/refresh; some settings need reboot/logon (software installation, folder redirection).
- Central store for ADMX templates in SYSVOL; SYSVOL replication via DFSR (FRS is deprecated - migrate).
- Tools:
```
gpupdate /force
gpresult /r                         # summary, run in the user/computer context
gpresult /h C:\temp\gp.html /f      # full HTML report (elevated for computer part)
Get-GPO -All | Select DisplayName, ModificationTime
Backup-GPO -All -Path \\SRV-FS-01\gpo-backup
Get-GPResultantSetOfPolicy -ReportType Html -Path C:\temp\rsop.html
```
- Change control: GPOs are production changes - test OU, staged links, backup before edit, naming convention (`C-SRV-Hardening-Baseline`, `U-...`).

## 3. DNS and DHCP
- DNS: see dns.md (AD-integrated zones, scavenging, conditional forwarders, PowerShell).
- DHCP: server must be authorized in AD; scopes with options 003 (router), 006 (DNS servers), 015 (DNS domain name); reservations for servers that cannot be static (prefer static IPs for servers); remote subnets need a DHCP relay (IP helper) on the router/firewall.
- DHCP failover (2012+): load balance or hot standby between two servers; shared secret for message authentication; check state after maintenance.
```
Get-DhcpServerInDC
Get-DhcpServerv4Scope -ComputerName SRV-DHCP-01
Get-DhcpServerv4Lease -ComputerName SRV-DHCP-01 -ScopeId 10.0.10.0
Get-DhcpServerv4Failover -ComputerName SRV-DHCP-01
```
- DNS dynamic registration by DHCP: configure credentials (dedicated account) and name protection to avoid record hijacking.

## 4. IIS
- Objects: sites (bindings: protocol, IP, port, host header, SNI for multiple certificates on 443), applications, virtual directories, application pools (one pool per application; identity ApplicationPoolIdentity by default, or gMSA/domain account for back-end access; "No Managed Code" for ASP.NET Core with the hosting bundle).
- Recycle the application pool instead of `iisreset` in production (iisreset restarts all sites).
- Logs: `%SystemDrive%\inetpub\logs\LogFiles\W3SVC<siteId>\` (W3C); HTTP.sys errors in `%SystemRoot%\System32\LogFiles\HTTPERR\`; Failed Request Tracing for deep diagnosis; substatus codes (e.g. 401.1, 500.19 config error) matter.
- Tools: `Get-IISSite`, `Get-IISAppPool` (IISAdministration module), `Import-Module WebAdministration` (`IIS:\` drive), `%windir%\system32\inetsrv\appcmd.exe list sites`, `appcmd list apppools`.
- Hardening: remove default site and unused features/modules; request filtering (verbs, extensions, size); remove `Server` and `X-Powered-By` headers; HSTS; TLS 1.2+ only via SCHANNEL registry settings (applies to the whole OS - test other services); directory browsing off; detailed errors only locally; ARR/URL Rewrite as reverse proxy with care (header trust).

## 5. Services and service accounts (gMSA)
- Inspect: `Get-Service <name>`, `Get-CimInstance Win32_Service -Filter "Name='<name>'" | Select Name, StartName, PathName, StartMode`, `sc.exe qc <name>`, `sc.exe queryex <name>` (PID). Recovery actions: `sc.exe failure <name> reset= 86400 actions= restart/60000/restart/60000/restart/60000` (note the space after `=` in sc.exe syntax).
- Unquoted service paths with spaces (`C:\Program Files\App Folder\app.exe` without quotes) are a privilege escalation finding.
- Account choice (least privilege first):

| Account | Use | Notes |
|---|---|---|
| Virtual account (`NT SERVICE\<svc>`) | Local-only services | Automatic, no password; accesses network as the computer account |
| gMSA (`DOMAIN\gmsa-name$`) | Services, scheduled tasks, IIS pools, SQL Server needing domain resources | Password managed by AD (rotated automatically), usable on authorized hosts only |
| Domain user account | Legacy apps not supporting gMSA | Long random password in PAM, rotation procedure, "deny interactive logon" |
| LocalService / NetworkService | Low-privilege built-ins | Shared by many services |
| LocalSystem | Avoid for applications | Full local control |

gMSA setup:
```
# once per forest; even with -EffectiveImmediately the key is usable only after ~10 h (replication delay by design)
Add-KdsRootKey -EffectiveImmediately
New-ADServiceAccount -Name gmsa-app01 -DNSHostName gmsa-app01.example.org `
  -PrincipalsAllowedToRetrieveManagedPassword "GRP-SRV-APP-PROD"
# on each authorized host (member of the group; reboot or purge Kerberos tickets after group change)
Install-ADServiceAccount gmsa-app01
Test-ADServiceAccount gmsa-app01            # True = usable
```
Constraints: sAMAccountName limited to 15 characters (+ `$`); configure the service with `DOMAIN\gmsa-app01$` and an empty password; grant only required rights ("Log on as a service", file/DB permissions); SPNs registered on the gMSA if Kerberos is used.

## 6. Scheduled tasks
```
Get-ScheduledTask -TaskPath "\App\" | Get-ScheduledTaskInfo     # LastRunTime, LastTaskResult
schtasks /query /fo LIST /v /tn "\App\NightlyExport"
$p = New-ScheduledTaskPrincipal -UserId 'EXAMPLE\gmsa-app01$' -LogonType Password
Set-ScheduledTask -TaskPath "\App\" -TaskName NightlyExport -Principal $p
```
- Run as gMSA (as above) rather than as a user with a stored password; "Run whether user is logged on or not"; "Run with highest privileges" only if required.
- Result codes: `0` success; `0x41301` task is currently running; `0x41303` has not yet run; other values = the program's exit code or an error (`0x1` often = incorrect function / script error).
- History: Microsoft-Windows-TaskScheduler/Operational log (often disabled by default - enable it).
- Business batch chains belong to the enterprise scheduler (dependencies, audit, restart); local tasks only for housekeeping - coordinate with scheduling-expert.

## 7. PowerShell remoting
- WinRM: 5985/tcp (HTTP, messages encrypted with Kerberos/NTLM session keys inside a domain) and 5986/tcp (HTTPS, required for non-domain/workgroup scenarios). Enabled by default on Windows Server; `Enable-PSRemoting` to (re)configure.
```
Test-WSMan SRV-APP-01
Enter-PSSession -ComputerName SRV-APP-01
Invoke-Command -ComputerName SRV-APP-01, SRV-APP-02 -ScriptBlock { Get-Service app* }
```
- Double hop: credentials are not delegated to a third server from a remote session. Avoid CredSSP (exposes credentials); use resource-based constrained delegation, pass explicit credentials from a vault, or redesign.
- `TrustedHosts` only for non-domain machines and never `*`.
- JEA (Just Enough Administration): constrained endpoints exposing only approved cmdlets, running as a virtual/gMSA account - preferred for delegated operations and automation.
- Logging: Script Block Logging (event 4104 in Microsoft-Windows-PowerShell/Operational), Module Logging, Transcription to a protected share - enable by GPO and forward to SIEM. Execution policy is not a security boundary; use AppLocker/WDAC with Constrained Language Mode for enforcement. Remove Windows PowerShell 2.0 engine (downgrade attacks).
- PowerShell 7 also supports remoting over SSH.

## 8. Event logs

| ID | Log | Meaning |
|---|---|---|
| 4624 / 4625 | Security | Logon success / failure (check Logon Type and Status/SubStatus codes) |
| 4634 / 4647 | Security | Logoff / user-initiated logoff |
| 4648 | Security | Logon with explicit credentials (runas, lateral movement indicator) |
| 4672 | Security | Special privileges assigned (admin logon) |
| 4688 | Security | Process creation (enable command line auditing) |
| 4720 / 4726 | Security | User account created / deleted |
| 4728 / 4732 / 4756 | Security | Member added to global / local / universal security group |
| 4740 / 4767 | Security | Account locked out / unlocked (on PDC Emulator for domain accounts) |
| 4768 / 4769 / 4771 | Security | Kerberos TGT requested / service ticket requested / pre-authentication failed |
| 4776 | Security | NTLM credential validation |
| 1102 | Security | Audit log cleared (alert!) |
| 7045 | System | New service installed |
| 7036 | System | Service entered running/stopped state |
| 1074 / 6006 / 6008 | System | Shutdown initiated (by whom) / clean stop of event log / unexpected shutdown |
| 41 | System (Kernel-Power) | Reboot without clean shutdown |
| 4104 | PowerShell/Operational | Script block logged |

Logon types: 2 interactive, 3 network, 4 batch, 5 service, 7 unlock, 8 network cleartext, 9 new credentials, 10 remote interactive (RDP), 11 cached interactive.

```
Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625; StartTime=(Get-Date).AddHours(-2)} -MaxEvents 50
Get-WinEvent -FilterHashtable @{LogName='System'; Id=1074,6008,41} -MaxEvents 20 | Format-List TimeCreated, Id, Message
wevtutil qe System /c:20 /rd:true /f:text
auditpol /get /category:*          # effective advanced audit policy
```
Collection: Windows Event Forwarding (WEF) to collectors or SIEM agents; Sysmon for richer process/network telemetry; size Security logs appropriately (default sizes are too small for DCs).

## 9. Failover clustering (WSFC)
- Quorum: node majority plus a witness (disk, file share, or cloud witness); dynamic quorum/witness adjust votes. Witness on a third site for multi-site clusters.
- AD objects: cluster name object (CNO) creates virtual computer objects (VCOs) for roles - pre-stage or delegate "Create computer objects" on the OU.
- Networks: separate client and cluster (heartbeat/live migration/storage) networks; validate with `Test-Cluster` before production and after changes (storage tests can disrupt running disks - use `-Include` carefully).
```
Get-Cluster; Get-ClusterNode; Get-ClusterGroup; Get-ClusterResource
Move-ClusterGroup -Name "SQL Server (MSSQLSERVER)" -Node SRV-SQL-02
Suspend-ClusterNode -Name SRV-SQL-01 -Drain      # before maintenance
Resume-ClusterNode -Name SRV-SQL-01 -Failback Immediate
Get-ClusterLog -Destination C:\temp -TimeSpan 60
```
- Used by SQL Server FCI and Always On AGs, file servers, Hyper-V. Cluster-Aware Updating (CAU) for patching.

## 10. Hardening
- Baselines: Microsoft Security Baselines (Security Compliance Toolkit, Policy Analyzer), CIS Benchmarks, ANSSI AD/Windows recommendations; apply via GPO, measure drift.
- Disable: SMBv1, LLMNR and NetBIOS over TCP/IP (where not needed), NTLMv1 (and audit NTLM usage toward restriction), WDigest credential caching, Print Spooler on DCs and servers that do not print, PowerShell 2.0.
- Enable: Windows LAPS, Credential Guard (where supported), LSA protection (RunAsPPL), SMB signing (required on DCs; recommended everywhere), LDAP signing/channel binding, RDP with NLA (admin via bastion only), Windows Firewall on all profiles with default inbound deny, Defender (or EDR) with attack surface reduction rules, AppLocker/WDAC on sensitive servers.
- Restrict: local Administrators membership (GPO restricted groups / LAPS), "Deny log on locally/through RDP" for service accounts, Tier 0 accounts denied on Tier 1/2 hosts.
- Server Core where possible (smaller attack surface, fewer patches).

## 11. Patching
- Monthly cumulative updates (security release on Patch Tuesday, second Tuesday of the month); out-of-band releases for critical issues; servicing stack updates as required.
- Tooling: WSUS, Configuration Manager (MECM), Azure Update Manager / Azure Arc, Intune for some server scenarios; Hotpatch on Windows Server 2025 (Standard/Datacenter connected to Azure Arc - no extra cost per Microsoft - or Datacenter: Azure Edition VMs): quarterly cumulative baseline with reboot, then two months of reboot-less security hotpatches; non-security, .NET and driver updates still need reboots.
- Checks:
```
Get-HotFix | Sort-Object InstalledOn -Descending | Select -First 10
Get-ComputerInfo -Property OsName, OsVersion, OsBuildNumber
Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending'
Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired'
```
- Process: rings (test -> pilot -> prod), clusters via CAU or drain/patch/resume node by node, DCs one at a time per site, pre/post checks (services, application smoke tests, replication health for DCs), evidence of compliance for audits.

## 12. Quick triage runbook
```
Get-ComputerInfo -Property CsName, OsName, OsLastBootUpTime
Get-Service | Where-Object {$_.StartType -eq 'Automatic' -and $_.Status -ne 'Running'}
Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; StartTime=(Get-Date).AddHours(-24)} -MaxEvents 30
Get-Volume | Select DriveLetter, FileSystemLabel, SizeRemaining, Size
Get-Counter '\Processor(_Total)\% Processor Time','\Memory\Available MBytes','\LogicalDisk(_Total)\Avg. Disk sec/Transfer' -SampleInterval 2 -MaxSamples 5
Get-NetTCPConnection -State Listen | Sort-Object LocalPort
Test-NetConnection SRV-DB-01 -Port 1433
w32tm /query /status               # time source and offset
nltest /sc_query:example.org       # secure channel with the domain
```
Then layer by layer (network.md section 11): DNS -> routing -> port -> TLS -> authentication (Kerberos/SPN/time) -> application.

## Sources

- https://learn.microsoft.com/en-us/windows-server/get-started/hotpatch - Hotpatch for Windows Server prerequisites and cycle
- https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/best-practices-for-dns-client-settings - DNS client settings on domain controllers
