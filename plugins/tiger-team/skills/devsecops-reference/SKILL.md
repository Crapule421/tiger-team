---
name: devsecops-reference
description: DevSecOps knowledge base - secure CI/CD (GitLab CI, Jenkins, Azure DevOps, GitHub Actions), IaC (Terraform, Ansible), containers and Kubernetes/OpenShift, secrets management, SAST/DAST/SCA/SBOM, supply chain (SLSA), hardening (CIS, ANSSI), audit logging, release strategies and a review checklist. Load it when designing, reviewing or auditing a pipeline, IaC, image, cluster or delivery process.
user-invocable: false
---

# DevSecOps reference

Senior-level cheat sheet. Product details move fast: where a feature depends on edition or version it is flagged "verify against your version". Regulated contexts (banking/DORA, healthcare/HDS, defense/II 901) raise the bar on traceability, segregation of duties and evidence: every control below should produce an auditable trace.

## 1. Secure CI/CD - principles (all platforms)

| Principle | What it means in practice |
|---|---|
| Pipeline = production asset | Pipeline definitions, runners, shared templates and credentials get the same protection as prod servers. |
| Protected branches/tags | No direct push to main/release; merge via reviewed MR/PR; required status checks; no force push; tag protection for release tags. |
| Segregation of duties | Author cannot approve own change; deploy to prod requires approval by a distinct role; CODEOWNERS on pipeline files, IaC and security-sensitive paths. |
| Least-privilege runners | Ephemeral runners/agents, one job per VM/pod, no shared Docker socket, no privileged mode unless isolated, separate runner pools for prod deploys. |
| Short-lived credentials | OIDC federation to cloud/Vault instead of long-lived keys in CI variables; scope tokens to repo + branch + environment. |
| Untrusted input | MR/PR titles, branch names, commit messages, fork code are attacker-controlled: never interpolate them into shell; never run fork code with secrets. |
| Pin everything | Base images by digest, third-party actions/templates by commit SHA, tool versions explicit, dependency lock files committed. |
| Build once, promote | Same immutable artifact (by digest) promoted dev -> test -> prod; environment config injected at deploy time; never rebuild for prod. |
| Signed and traceable | Signed commits (GPG/SSH/X.509), signed artifacts/images, provenance attestation linking artifact -> commit -> pipeline run -> approver. |
| Fail closed | Security gates block on policy violations; exceptions are explicit, owned, time-boxed and recorded. |

### Platform specifics

**GitLab CI**
- Protected branches/tags; "protected" CI/CD variables are exposed only to pipelines on protected refs; "masked" variables hidden in job logs (masking has format constraints - verify against your version).
- Protected runners (run only on protected refs) for deploy jobs; tag runners per environment.
- OIDC: `id_tokens:` keyword with `aud:` to obtain a JWT for Vault/cloud federation (the legacy `CI_JOB_JWT` variables are removed in recent versions).
- Restrict the CI/CD job token scope (allowlist of projects allowed to use `CI_JOB_TOKEN` against this project).
- Merge request approval rules, CODEOWNERS, push rules (e.g. reject unsigned commits) and security/compliance policies are tier-dependent - verify against your edition.
- `include:` remote/project templates: pin with `ref:` to a tag or SHA; protect the template project.

**Jenkins**
- Zero executors on the built-in (controller) node; all builds on agents (ephemeral containers/VMs preferred).
- Authorization: Matrix Authorization or Role-based strategy; no anonymous read; no "logged-in users can do anything".
- Credentials plugin + `withCredentials([...])`; use single-quoted `sh '...$TOKEN...'` so Groovy does not interpolate the secret into the command line (Jenkins warns on this).
- Script Security sandbox for Pipeline Groovy; avoid approving broad signatures; global (trusted) shared libraries run outside the sandbox - protect their repo like prod code.
- Configuration as Code (JCasC) under version control; plugin inventory minimal and patched (plugins are the main attack surface - follow Jenkins security advisories).
- Jenkinsfile from SCM only; restrict who can create/replay jobs (Replay executes arbitrary Groovy).

**Azure DevOps**
- Service connections with workload identity federation (OIDC) instead of client secrets; restrict each connection to specific pipelines; add approvals/checks on the connection.
- Environments with approvals and checks (required template, branch control, business hours).
- Org/project settings: limit job authorization scope to the current project; protect access to repositories in YAML pipelines; do not make secrets available to fork builds.
- Branch policies: minimum reviewers, build validation, linked work items, comment resolution.
- Variable groups linked to Azure Key Vault; secret variables are not exposed to scripts unless mapped explicitly.
- Use `extends:` templates + "required template" check to enforce mandatory stages (scans, signing).

**GitHub Actions**
- Top-level `permissions: contents: read`; elevate per job only (`id-token: write` for OIDC, `packages: write` to push).
- Pin third-party actions to a full commit SHA (tags are mutable); maintain via Dependabot/Renovate.
- `pull_request_target` and `workflow_run` run with base-repo secrets: never check out and execute PR head code in them.
- Script injection: never `run: echo "${{ github.event.pull_request.title }}"`; pass via `env:` and quote `"$TITLE"`.
- Environments with required reviewers and deployment branch rules; environment-scoped secrets.
- Rulesets/branch protection: required reviews, status checks, signed commits, no force push.
- Self-hosted runners: never on public repositories; prefer ephemeral (just-in-time) runners.
- Provenance: artifact attestations (e.g. `actions/attest-build-provenance`) - verify availability for your plan.

### OIDC federation to cloud / Vault
- Pattern: CI issues a signed JWT -> cloud STS / Vault JWT auth validates issuer, audience and claims -> short-lived credentials.
- Constrain the trust on `sub` (repo + ref or environment), `aud`, and issuer. A wildcard subject (`repo:org/*`) lets any repo/branch assume the role - classic finding.
- Separate roles per environment; prod role trusted only from protected branch/environment with approval.
- Examples (claim formats vary - verify): GitHub `repo:<org>/<repo>:environment:prod`; GitLab `project_path:<group>/<project>:ref_type:branch:ref:main`.

## 2. Signed commits and artifacts
- Commits: GPG, SSH or X.509 (gitsign/Sigstore) signatures; enforce via branch rules; verify signer identity maps to a corporate identity.
- Artifacts/images: Sigstore `cosign` (key-based or keyless with OIDC identity + Rekor transparency log), or Notation (Notary Project). Sign the digest, never a tag.
  - `cosign sign --key <KMS_OR_KEY_REF> registry.example.org/app@sha256:<DIGEST>`
  - `cosign verify --key cosign.pub registry.example.org/app@sha256:<DIGEST>`; keyless verify requires `--certificate-identity` and `--certificate-oidc-issuer` (cosign v2).
- Enforce at deploy: admission controller verifies signature + attestation (Kyverno `verifyImages`, Sigstore policy-controller, Gatekeeper with external data, OpenShift image policies - verify against your version).
- Signing keys in KMS/HSM, never in the repo; rotation plan; separate keys per trust domain.

## 3. Infrastructure as Code

### Terraform / OpenTofu
| Topic | Rule |
|---|---|
| State | Remote backend with locking (S3 + DynamoDB lock table or, in recent versions, S3-native lock file `use_lockfile` - verify; azurerm uses blob lease; GCS native locking). Never local state for shared infra. |
| State secrecy | State contains secrets in clear (DB passwords, keys). Encrypt the backend, restrict read access, enable versioning. `sensitive = true` only masks CLI output, not state. OpenTofu offers client-side state encryption; Terraform recent versions offer ephemeral values / write-only arguments - verify. |
| Locking incidents | `terraform force-unlock <LOCK_ID>` only after confirming no run is active. |
| Versions | `required_version` and `required_providers` constraints; commit `.terraform.lock.hcl`. |
| Modules | Versioned (tag/registry version), pinned, small, documented inputs/outputs; no `ref=main`. |
| Plan/apply | `terraform plan -out=tfplan` reviewed, then `terraform apply tfplan` (same plan). Apply only from CI with a dedicated identity. |
| Drift | Scheduled `terraform plan -detailed-exitcode` (exit 0 no change, 1 error, 2 changes) or `plan -refresh-only`; alert on 2. Root cause the drift (manual change?) before re-applying. |
| Refactors | `moved` blocks / `import` blocks (recent versions) instead of manual `state mv`/`import` - reviewable in code. |
| Safety | `lifecycle { prevent_destroy = true }` on stateful resources; review every `-/+` (replace) in plan; avoid routine `-target`. |
| Policy as code | Checkov, Trivy (config; tfsec merged into it), KICS, tflint; OPA/Conftest or Sentinel (HCP Terraform/Enterprise) on the plan JSON (`terraform show -json tfplan`). |

### Ansible
- Idempotence: prefer modules over `shell`/`command`; if unavoidable use `creates:`/`removes:` or `changed_when:`/`failed_when:`. Test: second run must report `changed=0`.
- `--check --diff` in review pipelines (note: some modules do not support check mode).
- Secrets: `ansible-vault encrypt` / `encrypt_string`, vault IDs per environment (`--vault-id prod@<source>`), or lookups to Vault/CyberArk; `no_log: true` on tasks handling secrets.
- `become` only where needed; dedicated automation account; SSH keys from PAM/Vault.
- Quality: `ansible-lint`, Molecule tests, pinned collections/roles in `requirements.yml`, inventories per environment, no prod credentials reachable from non-prod controllers.

## 4. Containers

### Image hardening (Dockerfile)
- Minimal base: distroless, UBI micro/minimal, slim; Alpine is small but musl may change behaviour. Pin `FROM image@sha256:<digest>`.
- Multi-stage builds: compilers and package managers stay in the build stage.
- `USER 10001` (numeric, non-root); files owned by root and read-only for the runtime user where possible.
- No secrets in layers, `ARG` or `ENV` (they persist in history). Use BuildKit `RUN --mount=type=secret,id=<id>` with `--secret id=<id>,src=<file>`.
- `COPY` not `ADD` (ADD fetches URLs/extracts archives); `.dockerignore` excludes `.git`, `.env`, keys.
- No `latest`; labels for source/commit/version (OCI annotations); `HEALTHCHECK` or K8s probes.
- Lint/scan: Hadolint (Dockerfile), Trivy or Grype (image CVEs, secrets, misconfig), Dockle (best practices).
- Runtime: read-only root filesystem, drop all capabilities, no `--privileged`, never mount `/var/run/docker.sock` (= root on host).

### Kubernetes
| Area | Controls |
|---|---|
| Pod securityContext | `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `capabilities: {drop: ["ALL"]}`, `seccompProfile: {type: RuntimeDefault}`; no `hostNetwork`/`hostPID`/`hostIPC`/`hostPath`. |
| Pod Security Admission | PodSecurityPolicy was removed in 1.25. Label namespaces `pod-security.kubernetes.io/enforce: restricted` (also `warn`, `audit`); `baseline` minimum for exceptions. |
| Admission policy | Kyverno, OPA Gatekeeper or ValidatingAdmissionPolicy (CEL; GA in 1.30) for registry allowlist, signature verification, required labels, no `latest`. |
| RBAC | Namespaced Roles over ClusterRoles; no wildcard verbs/resources; avoid `cluster-admin` bindings. Dangerous: `escalate`, `bind`, `impersonate`, `create pods` (can run as any SA of the namespace), `get/list secrets`, `nodes/proxy`. Check with `kubectl auth can-i --list --as=system:serviceaccount:<ns>:<sa>`. |
| Service accounts | One SA per workload; `automountServiceAccountToken: false` unless the pod calls the API. |
| NetworkPolicies | Default deny ingress + egress per namespace, then explicit allows (including DNS egress to the cluster DNS). Requires a CNI that enforces them. |
| Secrets | Base64 is not encryption. Enable encryption at rest (EncryptionConfiguration, KMS provider). Prefer External Secrets Operator, Secrets Store CSI driver or Vault Agent injector; Sealed Secrets/SOPS for GitOps. Restrict `get secrets` RBAC. |
| Resources | Requests/limits, ResourceQuota/LimitRange per namespace (DoS containment). |
| Supply chain | Private registry, pull by digest, signature verification at admission, image pull secrets scoped. |
| Audit | API server audit policy: keep Secrets/ConfigMaps/TokenReviews at `Metadata` level (higher levels write secret values into the audit log); `RequestResponse` for RBAC changes if volume allows; ship to SIEM. |
| Benchmarks | CIS Kubernetes Benchmark (kube-bench), NSA/CISA Kubernetes Hardening Guide. |

### OpenShift specifics
- SCCs: default `restricted-v2` (4.11+, verify) assigns a random UID from the namespace range: images must run as arbitrary UID with GID 0 (`chgrp -R 0 /app && chmod -R g=u /app`). Granting `anyuid`/`privileged` is a finding requiring justification.
- Routes: TLS `edge`, `passthrough` or `reencrypt`; prefer reencrypt or passthrough for end-to-end encryption; redirect insecure traffic.
- Use `oc adm policy who-can <verb> <resource>` for RBAC review.

## 5. Secrets management

| Rule | Detail |
|---|---|
| Never in Git | Pre-commit + CI scanning (gitleaks, trufflehog, platform secret scanning). On leak: revoke/rotate first, then purge history; assume compromise. |
| Secret zero | Bootstrap via platform identity (K8s SA token, cloud IAM, CI OIDC), not a static token in a file. |
| Dynamic > static | Short TTL, per-consumer credentials, automatic revocation. |
| Rotation | Defined period, automated, tested; rotation must not need a release. |
| Audit | Every read of a secret logged and attributable. |

**HashiCorp Vault (concepts)**: auth methods (AppRole, Kubernetes, JWT/OIDC, LDAP, TLS certificates, cloud IAM); secrets engines (KV v2 with versioning - API paths include `data/`, database dynamic credentials, PKI, Transit encryption-as-a-service, SSH); policies are deny-by-default (`path "secret/data/app/*" { capabilities = ["read"] }`); tokens and leases with TTL, renewal, revocation; seal/unseal (Shamir shares or auto-unseal via KMS/HSM - HSM is an Enterprise feature, verify); audit devices (Vault refuses requests if no enabled audit device can be written - enable at least two); namespaces and performance/DR replication are Enterprise features; response wrapping for secret delivery. OpenBao is the open-source fork.

**CyberArk (concepts)**: Digital Vault with Safes (access-controlled containers); CPM (Central Policy Manager) rotates/verifies credentials on target systems; PVWA (web portal, request/approval workflows); PSM / PSM for SSH (isolated, recorded privileged sessions - the bastion for admin flows); application credentials via Credential Providers (agent-based or central CCP) and Conjur / Secrets Manager for DevOps workloads. Typical integration: pipeline or app retrieves credential at runtime by application identity; human admins connect only via PSM.

## 6. Security testing and SBOM

| Type | What | Where in pipeline | Example tools |
|---|---|---|---|
| Secrets scan | Hard-coded credentials | Pre-commit, every MR | gitleaks, trufflehog |
| SAST | Source code flaws | Every MR, incremental | Semgrep, SonarQube, CodeQL |
| SCA | Vulnerable/licensed dependencies | Every build + continuous re-scan of released SBOMs | OWASP Dependency-Check, Dependency-Track, Trivy, Grype, Snyk |
| IaC scan | Misconfiguration | Every MR | Checkov, Trivy config, KICS |
| Container scan | OS/package CVEs, misconfig | Build + registry re-scan | Trivy, Grype, Clair |
| DAST | Running app (auth, injection, headers, TLS) | Test env, nightly/pre-release | OWASP ZAP, Burp Suite |
| Pentest | Manual, business logic | Before go-live / major change | Qualified provider (PASSI in France) |

- SBOM formats: CycloneDX (OWASP; standardized as ECMA-424) and SPDX (ISO/IEC 5962:2021). Generate at build (Syft, cdxgen, CycloneDX build plugins), attach to the artifact (attestation), store centrally (Dependency-Track) for continuous vulnerability monitoring.
- VEX (Vulnerability Exploitability eXchange) to document "not affected" decisions.
- Gate policy example: block Critical/High with fix available in runtime dependencies; time-boxed waivers with owner; license policy (GPL/AGPL in distributed software).
- Triage SCA on reachability and exposure, not only CVSS; prioritise CISA KEV / EPSS signals.
- EU context: Cyber Resilience Act (Regulation (EU) 2024/2847) introduces SBOM and vulnerability-handling duties for products with digital elements (phased application 2026-2027 - verify dates); DORA (Regulation (EU) 2022/2554, applicable since 17 January 2025) for financial entities' ICT risk and third-party risk.

## 7. Supply chain security (SLSA)
- SLSA v1.0 Build track: L0 no guarantees; L1 provenance exists; L2 hosted build platform generates signed provenance; L3 hardened build platform (isolated runs, signing material inaccessible to user build steps, unforgeable provenance). Newer spec versions add other tracks - verify the current spec.
- Provenance (in-toto/SLSA attestation): what was built, from which source commit, by which builder, with which parameters. Verify provenance at deploy time, not only produce it.
- Controls: dependency pinning + lock files; internal proxy/mirror registries (no direct internet pulls from build agents); typosquatting/dependency-confusion protection (scoped namespaces, private registry precedence); OpenSSF Scorecard for upstream projects; reproducible builds where feasible.

## 8. Hardening baselines

| Baseline | Use |
|---|---|
| CIS Benchmarks | OS, Kubernetes, Docker, DBs, cloud. Level 1 (broadly applicable) / Level 2 (defense in depth). Assess with CIS-CAT, OpenSCAP, kube-bench. |
| ANSSI "Recommandations de configuration d'un systeme GNU/Linux" (BP-028) | French reference for Linux; v2.0 defines levels Minimal, Intermediate, Enhanced, High. OpenSCAP/ComplianceAsCode ships `anssi_bp28_*` profiles for some distros - verify availability for your distro/version. |
| ANSSI secure administration guide | Admin tiering, dedicated admin workstations, bastions - basis for "admin flows via bastion". |
| ANSSI container/Docker and TLS recommendations | Container deployment and TLS configuration guidance - check the current published versions. |
| Microsoft Security Baselines / CIS Windows | Windows Server, AD (see infra-reference windows.md). |
| Sector frameworks | Defense: II 901 (Diffusion Restreinte systems), IGI 1300 (classified); Healthcare: HDS certification; Cloud: SecNumCloud qualification. Confirm applicability with the security officer. |

Hardening rules: baseline as code (Ansible/OpenSCAP remediation), measured in CI and continuously (drift), deviations documented with risk acceptance, golden images rebuilt on a cadence rather than patched in place.

## 9. Observability and audit logging

| What to log | Detail |
|---|---|
| Identity | Logins, failures, MFA events, token issuance, privilege elevation (sudo, PSM sessions). |
| Change | Pipeline runs (who triggered, commit SHA, artifact digest, approver, target env), IaC applies, manual changes, config/feature-flag changes. |
| Secrets | Vault/CyberArk access logs, K8s secret reads, failed secret access. |
| Platform | K8s API audit, cloud control-plane logs, registry pushes/pulls, admission denials. |
| Security tools | Scan results and waivers (evidence for auditors). |

- Central, append-only/WORM storage separate from the systems producing logs; integrity protection; synchronized time (NTP) everywhere.
- Never log secrets, tokens, full card numbers or health data; mask at source; logs containing personal data are themselves GDPR-scoped (purpose, retention, access). CNIL guidance on logging recommends a retention generally between 6 months and 1 year for access traces - verify current guidance and sector rules.
- Correlation IDs across services; structured JSON logs; OpenTelemetry for traces/metrics.
- Alert on: disabled audit, cleared logs, new admin bindings, pipeline variable changes, unsigned image denied, secret access from unusual identity.
- DORA/NIS2: incident classification and reporting timelines rely on this telemetry - retention and searchability must match.

## 10. Release strategies

| Strategy | How | Pros | Watch-outs |
|---|---|---|---|
| Rolling | Replace instances progressively | Simple, no extra capacity | Mixed versions coexist; needs backward-compatible APIs/schema |
| Blue/green | Two full environments, switch traffic | Instant rollback (switch back) | Double capacity; DB is shared - schema must serve both; sessions/caches |
| Canary | Small % of traffic to new version, widen on healthy metrics | Limits blast radius | Needs good metrics/SLOs and automated analysis (Argo Rollouts, Flagger) |
| Feature flags | Code deployed dark, enabled per user/segment | Decouple deploy from release; kill switch | Flag debt; flag changes are prod changes (audit, approval); default-off; test both paths |
| Shadow/dark launch | Duplicate traffic to new version, discard responses | Real load without user impact | Side effects (writes, emails, payments) must be suppressed |

- Database changes: expand/contract (add nullable column -> dual write -> backfill -> switch reads -> drop old later); never couple an irreversible schema change with an app deploy (see dba-reference).
- Rollback criteria defined before deployment (error rate, latency, business KPIs) with an owner who can decide.
- Change records: link ticket, MR, pipeline run, artifact digest, approver (ITIL change / CAB evidence).

## 11. Review checklist

**Pipeline**
- [ ] Protected branches/tags, mandatory review, CODEOWNERS on pipeline/IaC files
- [ ] Least-privilege token permissions; no secrets printed; secrets only on protected refs
- [ ] Third-party actions/templates/images pinned by SHA/digest
- [ ] No untrusted input interpolated into shell; no fork code executed with secrets
- [ ] OIDC federation with constrained subject; no long-lived cloud keys
- [ ] Runners ephemeral, non-privileged, segregated for prod deploys
- [ ] Gates: secrets scan, SAST, SCA, IaC scan, container scan, SBOM, signing, provenance
- [ ] Build once, promote by digest; prod deploy behind environment approval

**IaC**
- [ ] Remote, encrypted, locked state with restricted access
- [ ] Versions and modules pinned; lock file committed
- [ ] Plan reviewed and applied as-is from CI; drift detection scheduled
- [ ] `prevent_destroy` on stateful resources; no hard-coded secrets
- [ ] Ansible idempotent (second run `changed=0`), vault/no_log for secrets

**Containers / Kubernetes**
- [ ] Minimal base pinned by digest, non-root numeric USER, no secrets in layers
- [ ] Restricted Pod Security / SCC, securityContext complete, no host namespaces
- [ ] Default-deny NetworkPolicies, RBAC least privilege, SA token automount off
- [ ] Secrets externalized/encrypted at rest; signature verification at admission
- [ ] Requests/limits, probes, PodDisruptionBudget for critical workloads

**Operations**
- [ ] Hardening baseline (CIS/ANSSI) measured, deviations accepted formally
- [ ] Audit logs centralized, immutable, time-synced, retention defined, no sensitive data
- [ ] Release strategy and rollback criteria documented and tested
- [ ] Secret rotation and leak response procedures tested
