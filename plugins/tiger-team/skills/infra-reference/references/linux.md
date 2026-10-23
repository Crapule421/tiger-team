# Linux reference (RHEL, Debian/Ubuntu, SUSE)

## Contents
1. Distribution differences
2. systemd
3. journald and logging
4. Users, sudo, SSH
5. SELinux and AppArmor
6. Storage: LVM and filesystems
7. Performance diagnosis
8. cron, systemd timers and scheduler agents
9. Hardening
10. Patching
11. Quick triage runbook

## 1. Distribution differences

| Topic | RHEL family (RHEL, Rocky, Alma) | Debian / Ubuntu | SUSE (SLES) |
|---|---|---|---|
| Packages | `dnf` (`yum` on older), `rpm` | `apt`, `dpkg` | `zypper`, `rpm` |
| MAC | SELinux (enforcing by default) | AppArmor (Ubuntu default; Debian enabled by default in recent releases) | AppArmor on SLES 15; SELinux enforcing by default on SUSE Linux Enterprise 16 (AppArmor removed) |
| Firewall | firewalld (`firewall-cmd`) | nftables / ufw (Ubuntu) | firewalld |
| Network config | NetworkManager (`nmcli`) | netplan (Ubuntu), ifupdown or NetworkManager (Debian) | wicked on SLES 15; NetworkManager only on SLE 16 (wicked removed) |
| Subscription / repos | `subscription-manager`, Satellite | apt sources, mirrors | SUSEConnect, SUSE Manager / RMT |
| Compliance content | SCAP Security Guide (`scap-security-guide`) | SSG content (packaging varies) | SSG content |
| Snapshots/rollback | LVM snapshots, `dnf history` | LVM snapshots | Btrfs + snapper (root fs default) |

Lifecycle: track end-of-support dates (RHEL major versions ~10 years, Ubuntu LTS 5 years standard, SLES ~10+ years); unsupported OS in regulated environments is an audit finding.

## 2. systemd
```
systemctl status app.service
systemctl start|stop|restart|reload app.service
systemctl enable --now app.service        # start at boot and now
systemctl disable app.service; systemctl mask app.service   # mask = cannot be started at all
systemctl list-units --failed
systemctl cat app.service                 # effective unit with drop-ins
systemctl edit app.service                # create override drop-in (/etc/systemd/system/app.service.d/override.conf)
systemctl daemon-reload                   # after editing unit files manually
systemd-analyze blame                     # boot time per unit
systemd-analyze security app.service      # exposure score of sandboxing options
```
Service unit good practice:
```
[Service]
User=svc-app
Group=svc-app
ExecStart=/opt/app/bin/app --config /etc/app/app.conf
Restart=on-failure
RestartSec=5
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/app /var/log/app
LimitNOFILE=65536
EnvironmentFile=-/etc/app/app.env        # secrets: restrict file mode 0600 or use a secret manager
```
Never edit vendor units in `/usr/lib/systemd/system`; use drop-ins under `/etc/systemd/system`.

## 3. journald and logging
```
journalctl -u app.service --since "1 hour ago"
journalctl -u app.service -f              # follow
journalctl -p err -b                      # errors since current boot
journalctl -b -1                          # previous boot (requires persistent journal)
journalctl -k                             # kernel messages (OOM, disk, NIC)
journalctl --disk-usage; journalctl --vacuum-time=30d
```
- Persistent journal: `Storage=persistent` in `/etc/systemd/journald.conf` (or create `/var/log/journal`). Size limits via `SystemMaxUse=`.
- Forward to rsyslog/syslog-ng and then to SIEM (TLS, 6514/tcp); local logs can be altered by root - central copy is the audit evidence.
- auditd for security events (`/etc/audit/rules.d/*.rules`, `ausearch`, `aureport`); time sync (chrony) mandatory for correlation.
- logrotate for application logs in `/etc/logrotate.d/`.

## 4. Users, sudo, SSH
- Identity: central (SSSD with AD or IdM/FreeIPA) for humans; local accounts only for services. `getent passwd <user>`, `id <user>`, `chage -l <user>`.
- Service accounts: no interactive shell (`/sbin/nologin` or `/usr/sbin/nologin`), no password, owned directories only.
- sudo: edit with `visudo` / files in `/etc/sudoers.d/` (validate with `visudo -cf <file>`); grant specific commands to groups; avoid `NOPASSWD: ALL` and shell escapes (editors, `less`, `find -exec`, scripts writable by the user); log sudo (journal/`Defaults logfile=`; `Defaults log_output` for session I/O logging - plan the storage). Check: `sudo -l -U <user>`.
- SSH server: `PermitRootLogin no`, `PasswordAuthentication no` (keys or certificates), `AllowGroups <admins>`, `X11Forwarding no`, modern ciphers/KEX per ANSSI/CIS; admin access only from bastion. Validate with `sshd -t` before restart and keep an open session while testing.
- SSH keys: managed (rotation, owner), no shared keys, `authorized_keys` audited; consider SSH certificates from a CA or PAM-injected credentials.

## 5. SELinux and AppArmor

SELinux (RHEL):
```
getenforce; sestatus
ls -Z /srv/www; ps -eZ | grep httpd           # contexts
ausearch -m AVC -ts recent                     # denials
sealert -a /var/log/audit/audit.log            # human explanation (setroubleshoot-server)
audit2why < /var/log/audit/audit.log
semanage fcontext -a -t httpd_sys_content_t "/srv/www(/.*)?" && restorecon -Rv /srv/www
semanage port -a -t http_port_t -p tcp 8081    # allow a service on a non-standard port
getsebool -a | grep httpd; setsebool -P httpd_can_network_connect on
```
Rules: never disable SELinux as a fix (`setenforce 0` only for a short diagnosis, and say so); fix labels first (`restorecon`), then booleans, then port types, and only then a reviewed custom module (`audit2allow -M`) - never blindly load what audit2allow generates. Files moved with `mv` keep their old label (copy or restorecon).

AppArmor (Ubuntu/SLES):
```
aa-status
aa-complain /etc/apparmor.d/usr.sbin.nginx    # log only
aa-enforce /etc/apparmor.d/usr.sbin.nginx
journalctl -k | grep -i apparmor              # look for apparmor="DENIED"
```

## 6. Storage: LVM and filesystems
```
lsblk -f; df -hT; df -i                        # space and inodes
pvs; vgs; lvs
lvextend -r -L +10G /dev/vg_data/lv_app        # -r grows the filesystem too
xfs_growfs /mount/point ; resize2fs /dev/vg_data/lv_app   # if grown without -r
du -xh --max-depth=1 /var | sort -h
lsof +L1                                       # deleted files still held open (space not freed)
findmnt --verify                               # check /etc/fstab before reboot
```
- XFS cannot be shrunk; ext4 can be shrunk offline only. Plan sizes; separate filesystems for `/var`, `/var/log`, `/var/log/audit`, `/tmp`, `/home`, application data (a full `/var/log` must not stop the OS).
- `/etc/fstab`: use UUID or LV paths; `nofail` for non-critical mounts (avoid emergency mode at boot); mount options `nodev,nosuid,noexec` where applicable (`/tmp`, `/var/tmp`, `/dev/shm`, data mounts).
- LVM snapshots before risky changes: need free space in the VG; snapshot performance cost; remove after validation.
- NFS: `hard` mounts for data integrity, timeouts and `_netdev`; check `showmount -e`/`rpcinfo` and firewall (NFSv4 = 2049/tcp only).

## 7. Performance diagnosis
USE method: for each resource (CPU, memory, disk, network) check Utilization, Saturation, Errors.

| Tool | Read it |
|---|---|
| `uptime` / `top` / `htop` | Load average counts runnable AND uninterruptible (D state, often I/O) tasks - compare with CPU count; `%wa` I/O wait, `%st` steal (hypervisor contention) |
| `vmstat 1 5` | `r` run queue > CPUs = CPU saturation; `b` blocked on I/O; `si/so` swap activity (bad); `wa`, `st` |
| `mpstat -P ALL 1` | One CPU at 100% = single-threaded bottleneck |
| `iostat -xz 1` | `%util` near 100 (for single-queue devices), `r_await`/`w_await` latency (ms), `aqu-sz` queue size; column names vary by sysstat version |
| `free -m` | Use `available`, not `free`; page cache is normal |
| `sar` | History (sysstat): `sar -u`, `sar -r`, `sar -d`, `sar -n DEV`, `sar -f /var/log/sa/saDD` (Debian: `/var/log/sysstat/`) |
| `pidstat 1`, `pidstat -d 1` | Per-process CPU / I/O |
| `ss -s`, `ss -tan` | Socket counts and states |
| `dmesg -T`, `journalctl -k` | OOM killer, disk/NIC errors, hung tasks |
| `ulimit -n`, `cat /proc/<pid>/limits` | "Too many open files" diagnosis |
| `perf top`, `strace -p <pid> -f -tt` | CPU hotspots / syscalls (strace slows the process - short use only in prod) |

Common findings: swap storm (memory sizing or leak), I/O latency on shared storage (check `await` vs SAN metrics), CPU steal on oversubscribed hypervisors, file descriptor limits for app servers, THP (transparent huge pages) recommendations for some databases (follow the DB vendor guidance), NUMA effects on large DB hosts.

## 8. cron, systemd timers and scheduler agents

| Option | Strengths | Weaknesses |
|---|---|---|
| cron (`crontab -e`, `/etc/cron.d/`) | Simple, universal | No dependencies, no central view, minimal environment (PATH), silent failures unless mail/log, overlapping runs |
| systemd timers (`OnCalendar=`, `Persistent=true`) | Logs in journal, sandboxing, catch-up after downtime, `systemctl list-timers` | Per-host, no cross-host dependencies |
| Enterprise scheduler agents (Control-M, IBM Workload Scheduler, Dollar Universe, Autosys, etc.) | Central plan, dependencies across hosts/apps, SLA, restart, audit trail, segregation of duties | Agent lifecycle, service account, network flows agent <-> server, licensing |

Rules: business batch chains belong to the enterprise scheduler (audit, dependencies, restart procedures); cron only for local housekeeping. Prevent overlap (`flock -n /run/lock/job.lock <cmd>`); explicit exit codes (0 = success) so the scheduler can react; log with job ID and timestamps; never put credentials in crontabs or command lines (visible in `ps`). Agent flows (agent port <-> scheduler server) go in the flow matrix. Coordinate with scheduling-expert.

## 9. Hardening
- Baselines: ANSSI BP-028 "Recommandations de configuration d'un systeme GNU/Linux" (v2.0, October 2022; cumulative levels minimal, intermediary, enhanced, high) and CIS Benchmarks (Level 1/2). Measure with OpenSCAP:
```
oscap info /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml          # list profiles (path varies)
oscap xccdf eval --profile <profile_id> --results results.xml --report report.html \
  /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml
```
  ANSSI profiles: `xccdf_org.ssgproject.content_profile_anssi_bp28_minimal|intermediary|enhanced|high` (aligned to BP-028 v2.0; shipped for RHEL 8/9 among others), CIS: `..._profile_cis_server_l1` etc. - take the exact ID from `oscap info` on your distro's datastream.
- Minimal install; remove/disable unused services and packages; no compilers on prod hosts.
- Partitioning and mount options (section 6); `umask 027` for service accounts.
- Kernel/sysctl (examples, validate per role): `net.ipv4.ip_forward = 0` (unless router), `net.ipv4.conf.all.accept_redirects = 0`, `net.ipv4.conf.all.send_redirects = 0`, `kernel.kptr_restrict`, `kernel.dmesg_restrict = 1`, `fs.suid_dumpable = 0`.
- Authentication: PAM password quality (`pam_pwquality`) and lockout (`pam_faillock`), central identity, MFA for admin via bastion.
- Integrity: AIDE (file integrity), auditd rules (privileged commands, identity files, sudoers, time changes, module loading), immutable audit config in high levels.
- Network: host firewall default deny inbound; only required ports; IPv6 disabled only if not used and policy requires it.
- Crypto policies (RHEL): `update-crypto-policies --show` / `--set DEFAULT|FUTURE` (FIPS mode where the applicable regulation requires it).
- Automate with Ansible roles mapped to baseline IDs; drift measured continuously; exceptions documented.

## 10. Patching

| Distro | List / apply security updates | Reboot needed? |
|---|---|---|
| RHEL | `dnf updateinfo list --security`; `dnf upgrade --security`; `dnf history` / `dnf history undo <id>` | `needs-restarting -r` (dnf-utils/yum-utils); live kernel patching with kpatch (`kpatch-patch` RPMs, `kpatch-dnf` plugin; included in the subscription, but without EUS the live patches for a minor release stop when the next minor release ships) |
| Debian/Ubuntu | `apt update && apt list --upgradable`; `apt upgrade`; `unattended-upgrades` for security pocket | `/var/run/reboot-required` exists; `needrestart` |
| SUSE | `zypper lp` (list patches), `zypper patch --category security` | `zypper ps -s` (processes using deleted files); `zypper needs-rebooting` (exit code 102 = reboot suggested, 0 otherwise) |

Process: patch rings (non-prod -> pilot prod -> prod), maintenance windows aligned with scheduler and HA (fail over cluster services before rebooting a node), pre-checks (backups/snapshots, free space in `/boot`, service health), post-checks (services up, application smoke test, kernel version, `systemctl --failed`), evidence for audit (patch level reports). Critical vulnerabilities (CISA KEV / CERT-FR alerts) follow an expedited path.

## 11. Quick triage runbook
```
hostnamectl; uptime; who -b                    # what box, since when
systemctl --failed; journalctl -p err -b --no-pager | tail -50
df -hT; df -i; free -m; vmstat 1 5
ss -tlnp; ip -br addr; ip route
getenforce 2>/dev/null; aa-status 2>/dev/null | head
chronyc tracking                               # time sync
last -n 20; journalctl _COMM=sudo --since today   # who did what recently
```
Then layer by layer (network.md section 11): DNS -> routing -> port -> TLS -> application.

## Sources

- https://messervices.cyber.gouv.fr/documents-guides/linux_configuration-en-v2.pdf - ANSSI-BP-028-EN v2.0, hardening levels
- https://static.open-scap.org/ssg-guides/ssg-cs9-guide-anssi_bp28_high.html - SSG `anssi_bp28_high` profile ID, BP-028 v2.0
- https://documentation.suse.com/sles/16.0/html/SLE-comparison/index.html - SLE 16: SELinux default, wicked removed
- https://documentation.suse.com/sles/15-SP7/html/SLES-all/cha-sw-cl.html - SLES zypper patch and `zypper ps` usage
- https://raw.githubusercontent.com/openSUSE/zypper/master/doc/zypper.8.txt - zypper `needs-rebooting`, exit code 102
- https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/applying-patches-with-kernel-live-patching_assembly_managing-kernel-command-line-parameters-with-uki - RHEL 9 kernel live patching access
