# Tiger Team

**A squad of senior expert agents for technical and application integration projects — for [Claude Code](https://code.claude.com).**

A *tiger team* is a group of senior experts brought together to solve a critical problem. This plugin gives you nine of them. They scope, design, review and troubleshoot integration work together: batch chains, interfaces, databases, ERPs, networks, IBM i, pipelines and production releases. They are built for regulated sectors (banking, healthcare, defense), with French and EU regulations in mind.

> 🇫🇷 **Version française plus bas** → [Tiger Team en français](#-tiger-team-en-français)

---

## The team

| Agent | Expertise |
|---|---|
| `tiger-team:project-manager` | Team lead. Scoping, planning, RACI, RAID, governance, test strategy, cut-over, go/no-go, rollback, hypercare, arbitration |
| `tiger-team:enterprise-architect` | Design authority. TOGAF, ArchiMate, IS urbanisation, target architecture, ADRs, NFRs, cloud and sovereignty, coherence review |
| `tiger-team:devsecops-expert` | CI/CD (GitLab CI, Jenkins, Azure DevOps, GitHub Actions), IaC (Terraform, Ansible), containers, Kubernetes/OpenShift, secrets, SAST/DAST/SCA/SBOM, hardening |
| `tiger-team:dba-expert` | Oracle, PostgreSQL, SQL Server, DB2, MySQL: performance, HA/DR, backup, security, migrations, release scripts |
| `tiger-team:scheduling-expert` | VTOM, Dollar Universe, Control-M: batch chains, calendars, dependencies, restart, scheduler migrations |
| `tiger-team:integration-expert` | REST/SOAP APIs, ESB/iPaaS, MFT (Axway CFT, Sterling), IBM MQ, Kafka, formats (ISO 20022, SEPA, EDI, HL7/FHIR), interface contracts |
| `tiger-team:erp-expert` | SAP, Oracle EBS/Fusion, Sage X3, Cegid, Dynamics 365: O2C, P2P, R2R, ERP interfaces, data migration |
| `tiger-team:infra-expert` | Network, firewalls, flow matrices, DNS, TLS/PKI, Linux (RHEL, Debian, SUSE), Windows Server (AD, GPO, IIS) |
| `tiger-team:ibmi-expert` | IBM i / AS400: RPG, CL, COBOL, DB2 for i, jobs, journaling, security, integration with the rest of the IS |

## How they work together

```
/tiger-team:mission <topic> [scoping|review|incident|release]
        │
        ▼
 1. project-manager   restates, asks what is missing, picks only the experts the topic needs
 2. enterprise-architect   frames the target, principles and NFRs (when architecture is involved)
 3. experts in parallel    each answers in the same format, including HANDOFFS for the other experts
 4. handoff round          each "→ expert: point" is routed to its target, who confirms or adjusts
 5. coherence review       the architect checks that everything fits together
 6. consolidation          summary, risk matrix, decisions, action plan, deliverable
```

Every expert answers with the same structure — **Summary, Analysis, Recommendations, Risks, Handoffs, Open questions, Assumptions** — so the lead can merge, deduplicate and route their findings. The `Handoffs` section is what makes them work as a team: the DBA flags a long lock, the scheduling expert moves the batch window; the integration expert adds a CFT flow, the infra expert adds it to the flow matrix.

## Installation

Requires Claude Code (tested with 2.1.292). The confidentiality guard needs `bash`, which Claude Code already uses on Windows (Git Bash).

```bash
claude plugin marketplace add Crapule421/tiger-team
claude plugin install tiger-team@tiger-team
```

or from inside Claude Code: `/plugin marketplace add Crapule421/tiger-team`, then `/plugin install tiger-team@tiger-team`.

Update: `/plugin marketplace update tiger-team`.

To offer the team to everyone working on a project, add it to the project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "tiger-team": { "source": { "source": "github", "repo": "Crapule421/tiger-team" } }
  },
  "enabledPlugins": { "tiger-team@tiger-team": true }
}
```

## Usage

### The whole team

```
/tiger-team:mission Migrate a VTOM chain to Control-M. It extracts accounting entries from an IBM i (DB2 for i), transfers them with CFT to a Linux server and loads them into SAP through IDocs. New firewall flows are needed. Banking context (DORA). release
```

The lead may ask you a few questions first, then shows which experts it involves and why. Add "do not ask questions, proceed with explicit assumptions" to run it in one go.

A full mission runs many agent calls. On the example above, the lead involved the architect and 5 experts, ran handoff rounds and a coherence review, and took about 17 minutes and roughly USD 5 of API usage. For a question that concerns a single domain, use a direct command below instead: it costs a fraction of that.

### One expert, one task

| Command | Expert | Produces |
|---|---|---|
| `/tiger-team:scoping` | project-manager | scoping note, RACI, RAID, experts to involve |
| `/tiger-team:release-plan` | project-manager | release sheet, go/no-go criteria, rollback plan |
| `/tiger-team:adr` | enterprise-architect | architecture decision record or target-architecture note |
| `/tiger-team:security-review` | devsecops-expert | security review of a pipeline, IaC, Dockerfile, manifest or config |
| `/tiger-team:sql-release-review` | dba-expert | review of a SQL release script, with rollback |
| `/tiger-team:batch-review` | scheduling-expert | review of a batch chain |
| `/tiger-team:scheduler-convert` | scheduling-expert | conversion between VTOM, Dollar Universe and Control-M |
| `/tiger-team:interface-contract` | integration-expert | interface specification |
| `/tiger-team:erp-interface-review` | erp-expert | analysis of an ERP inbound or outbound interface |
| `/tiger-team:flow-matrix` | infra-expert | network flow matrix and firewall requests |
| `/tiger-team:ibmi-review` | ibmi-expert | analysis of an RPG/CL/COBOL program, job or IBM i interface |

Each command accepts a description or a file path, for example `/tiger-team:sql-release-review ./release/V42__add_index.sql`.

You can also call an agent in plain language ("ask the tiger-team dba-expert to…") or with `@`.

### A whole session led by the project manager

```bash
claude --agent tiger-team:project-manager
```

### Option: agent teams (experimental)

Claude Code's experimental [agent teams](https://code.claude.com/docs/en/agent-teams) let teammates message each other and share a task list. They can be based on Tiger Team agents. Enable them for one session only:

```bash
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude
```

Then ask: *"Create an agent team with tiger-team:integration-expert, tiger-team:scheduling-expert and tiger-team:infra-expert to …"*. Expect a much higher token cost, and note that skills are not preloaded into teammates. On Windows only the in-process display mode works. Keep the default orchestration (`/tiger-team:mission`) for everyday work.

## Confidentiality and security

Claude Code sends your prompts and the files it reads to a cloud API. **Tiger Team knows the regulations of sensitive sectors, but it must never receive sensitive data:**

- **Defense** — no classified information (Secret, Très Secret) and no Diffusion Restreinte information. These are processed only on approved, homologated systems (IGI 1300, II 901). The team can help with unclassified, generic work: methods, templates, generic scripts, anonymized architectures.
- **Healthcare** — no real patient data. Use pseudonymized or synthetic data. Health data falls under HDS hosting rules and GDPR article 9.
- **Banking** — no customer data, no secrets, no production credentials. Follow your organization's AI usage policy.

### Built-in guard

The plugin ships a hook (`plugins/tiger-team/hooks/confidentiality-guard.sh`, bash only, no dependency) that blocks:

- reading, editing or searching secret files: `.env` (but not `.env.example`), `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `*.keystore`, `*.kdbx`, `id_rsa*`, `id_ed25519*`, `credentials.*`, `.netrc`, `.pgpass`;
- reading a file that carries a French classification marking written in upper case, as on marked documents (Secret Défense, Très Secret, Diffusion Restreinte, Spécial France, Confidentiel Défense — accents optional; UTF-8 and Latin-1 files);
- Bash commands that target secret files;
- prompts that contain such a marking.

Limits: it cannot see inside binary formats (PDF, Office files); if the script itself fails, the call goes through (Claude Code 2.1.295+ supports `"onFailure": "block"`); and it is a safety net against mistakes, **not** a substitute for a security policy or a homologation.

### Recommended settings for sensitive projects

Add deny rules to the project's `.claude/settings.json` (a plugin cannot set permissions for you):

```json
{
  "permissions": {
    "deny": [
      "Read(**/.env)", "Read(**/.env.*)",
      "Read(**/*.pem)", "Read(**/*.key)", "Read(**/*.p12)", "Read(**/*.pfx)",
      "Read(**/*.jks)", "Read(**/*.kdbx)", "Read(**/id_rsa*)", "Read(**/id_ed25519*)",
      "WebFetch", "WebSearch"
    ]
  }
}
```

The Tiger Team agents already have no web access (`WebFetch` and `WebSearch` are disallowed), and only the DevSecOps, DBA and infra experts have Bash, for local read-only checks.

### Persistent memory (opt-in)

Claude Code subagents can keep a persistent memory (`memory: user` in the agent's frontmatter). It is **off** in Tiger Team, because it could retain client or project names between sessions. Turn it on in a fork only if your context allows it.

## Customizing

Fork the repository and edit:

- `plugins/tiger-team/agents/*.md` — the experts (system prompt, tools, preloaded skills);
- `plugins/tiger-team/skills/*-reference/` — their knowledge bases (`SKILL.md` + `references/`);
- `plugins/tiger-team/skills/deliverables/templates/` — your own deliverable templates (DAT, DEX, release sheet…);
- `plugins/tiger-team/skills/mission/SKILL.md` — the orchestration procedure.

Keep public forks generic: no employer conventions, server names, client names or real data.

## Repository layout

```
.claude-plugin/marketplace.json     marketplace catalog
plugins/tiger-team/
  .claude-plugin/plugin.json        plugin manifest
  agents/                           the 9 experts
  skills/                           mission (orchestrator), 11 commands, 9 knowledge bases,
                                    sector-compliance, deliverables
  hooks/                            confidentiality guard
```

## Disclaimer

Tiger Team is an assistant. Its output must be reviewed by qualified people before use in production. Regulatory content is informational, may be out of date and is not legal advice.

## License

[MIT](LICENSE)

---

## 🇫🇷 Tiger Team en français

**Une équipe d'agents experts seniors pour les projets d'intégration technique et applicative, dans Claude Code.**

Neuf experts travaillent ensemble : chef de projet, architecte d'entreprise, DevSecOps, DBA, ordonnancement (VTOM, Dollar Universe, Control-M), API et flux, ERP, réseau et systèmes, IBM i (AS400). Ils sont pensés pour les secteurs régulés : banque, santé, défense. Les agents te répondent en français si tu leur écris en français.

### Installation

```bash
claude plugin marketplace add Crapule421/tiger-team
claude plugin install tiger-team@tiger-team
```

### Utilisation

- **Toute l'équipe** : `/tiger-team:mission <sujet> [scoping|review|incident|release]`. Le chef de projet cadre le sujet et choisit les experts utiles. Les experts travaillent en parallèle et s'échangent leurs points d'attention, puis l'architecte vérifie la cohérence de l'ensemble. Tu obtiens une synthèse, une matrice des risques, un plan d'action et le livrable (note de cadrage, rapport de revue, plan de reprise, fiche MEP…).
- **Un seul expert** : les 11 commandes du tableau ci-dessus, par exemple `/tiger-team:scheduler-convert` pour convertir une chaîne VTOM en Control-M, ou `/tiger-team:flow-matrix` pour une matrice de flux.
- **Session pilotée par le chef de projet** : `claude --agent tiger-team:project-manager`.

### Confidentialité

Claude Code envoie les prompts et les fichiers lus à une API dans le cloud. L'équipe connaît les réglementations sensibles, mais ne doit jamais recevoir de données sensibles :

- **Défense** : aucune information classifiée (Secret, Très Secret) ni Diffusion Restreinte. Ces informations ne se traitent que sur des systèmes homologués (IGI 1300, II 901).
- **Santé** : aucune donnée patient réelle. Travaille sur des jeux pseudonymisés ou synthétiques (HDS, RGPD art. 9).
- **Banque** : ni données clients, ni secrets, ni identifiants de production. Respecte la politique IA de ton entreprise.

Le hook fourni bloque la lecture des fichiers de secrets et des documents qui portent un marquage de classification. Il bloque aussi les prompts qui contiennent un tel marquage. C'est un filet de sécurité contre les erreurs de manipulation : il ne remplace ni une politique de sécurité ni une homologation.

### Avertissement

Tiger Team est un assistant : ses productions doivent être relues par des personnes qualifiées. Les contenus réglementaires sont informatifs et ne constituent pas un avis juridique.
