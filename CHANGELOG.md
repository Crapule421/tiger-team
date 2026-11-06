# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

A mission answering a request for an internal penetration testing platform showed that no expert covered offensive security or governance: rules of engagement, campaign governance, legal frame, the internal / external / PASSI choice and finding qualification were improvised, and the coherence review found missing RoE rubrics, mission taxonomy, indicators and agentic security.

### Added
- **`security-expert` agent** (offensive security and GRC), without Bash on purpose: it designs, qualifies and governs tests and never runs them. It requires a signed rules of engagement before any test and qualifies findings on three separate axes.
- **`security-reference` knowledge base**: mission taxonomy (discovery to TLPT), the four axes of a campaign, methodologies (PTES, NIST SP 800-115, OWASP WSTG/ASVS/API Top 10, MITRE ATT&CK/D3FEND, CIS), finding qualification (CVSS 3.1/4.0, EPSS and CISA KEV, business impact) with a priority matrix, deadlines and exceptions, campaign lifecycle, RACI and indicators. Two reference files: `rules-of-engagement.md` (20 mandatory RoE rubrics, authorization model, third-party target checklist, Code pénal art. 323-1 to 323-3-1, PASSI, internal / external / PASSI matrix, DORA TLPT, AD and Entra tooling, fragile targets) and `agentic-security.md` (OWASP Top 10 for LLM and agentic applications, ANSSI generative AI guide, MITRE ATLAS, NIST AI RMF, autonomy levels N0 to N4, policy engine independent of the LLM, prompt injection through tool outputs, emergency stop, fifteen acceptance test cases).
- **Eval case `security-roe-and-qualification`**.

### Changed
- The expert is listed in the mission, the lead's team table, the PM playbook routing table, the scoping and command handoff name lists, the discovery question lists (section 3.10), and the hand-off lists of the DevSecOps, infra and architect agents. Pentest routing moves from the DevSecOps row to the security expert in the PM playbook.

## [1.6.0] - 2026-11-06

Lessons from a full mission on network access control (802.1X on Cisco Meraki) for a French finance company: the team had no knowledge of the topic, no way to check current facts, and no way to deliver a document a committee could read.

### Added
- **Network access control reference** (`infra-reference/references/network-access-control.md`): EAP methods compared (EAP-TLS, PEAP-MSCHAPv2, EAP-TTLS, TEAP, MAB, identity PSK), host modes, fallback VLANs and fail-open per population, RFC 3580 and RFC 5176 attributes, port profiles, enterprise and guest SSIDs, rogue APs, a zone model, policy engine choice with a knock-out criterion, rollout by tiers, the provisioning and repair path, resilience, runbooks, SIEM use cases, twelve acceptance scenarios and Cisco Meraki notes checked against the vendor documentation. The infra expert and the discovery protocol now cover the topic.
- **`researcher` agent**, outside the nine experts and only with the user's consent: builds a sourced fact base (Confirmed / Partial / Not found, with URLs) on products and regulations the knowledge bases do not cover, or verifies the claims of a deliverable without having seen the experts' answers. Generic queries only: no organization name, hostname or document extract.
- **Mission steps 2b and 7b**: opt-in web research before the expert round, and verification of the claims a deliverable rests on before it goes to management, with the verdict table in an annex. In the measured mission, verification corrected four of twenty-two claims.
- **Executive risk briefing template** (`risk-briefing.md`, support de COPIL), **writing style rules** for documents that are sent or printed, and a **PDF rendering kit** (`deliverables/scripts/print-base.css` and `print-pdf.mjs`: Edge or Chrome through DevTools, no npm dependency, page numbers, web fonts embedded, landscape pages for wide diagrams).

### Changed
- **Coherence review** names the checks most often missed: repair or provisioning path, run procedures and yearly run cost, first-match rule order, orphan flows, second line and internal audit in the RACI, third parties, facts that are really inferences.
- **Confidentiality gate**: a real organization named in the request stays out of the briefs (placeholder), and the user is asked about the organization's AI policy when the deliverable carries the name.
- **Banking reference**: French finance companies (sociétés de financement) and DORA (ACPR FAQ Q-A3: not bound until the "résilience" bill is adopted; the arrêté of 3 November 2014 applies), a map of Delegated Regulation (EU) 2024/1774 art. 13 network controls, NIS2 transposition status as of November 2026.
- **RACI template**: second line (compliance, permanent control, risk) and internal audit roles; architecture decision and purchase on separate rows. **PM playbook**: estimation by site for infrastructure rollouts and a run-cost line per option.

## [1.5.0] - 2026-10-28

The three remaining items of the *AI Engineering* review.

### Added
- **Output and identifier guard.** The confidentiality hook now also runs on `Stop` (the agent's final answer, read from the transcript) and on `PostToolUse` for `Write` and `Edit`, and it detects banking and health identifiers validated by checksum in prompts, files read, content written and final answers: IBAN (mod 97), payment card numbers (Luhn with card-scheme prefix and length, so a SIRET never matches) and French NIR (key 97). Identifiers that fail their checksum pass, so examples stay possible. 16 new tests (46 in total).
- **An exemplar answer** in the `discovery` skill, preloaded by every agent: a short conforming answer with labelled facts and sources, an inference, an assumption, a typed handoff and an open question with its check.

### Changed
- **Descriptions on a diet**: the 34 agent and skill descriptions went from 13 125 to 7 753 characters (about 3 300 to 1 900 tokens). They sit in every call of every session where the plugin is installed, so this is a saving for all users on every request.
- The `confidentiality-gate` eval case now uses an IBAN that fails its checksum, so it tests the agent's own gate while the hook tests the valid ones.

## [1.4.0] - 2026-10-28

Three changes drawn from the evaluation, defensive-prompting and routing chapters of *AI Engineering* (Chip Huyen, 2025), read against what the measurements of 1.3.x had shown.

### Added
- **Eval suite** for `claude plugin eval` (`plugins/tiger-team/evals/`): five cases with deterministic graders first (sections present, typed handoff, `Resource:Lock`, JSON block, skill or agent fired, data never repeated) and a short judged rubric where a regex cannot see. Includes a negative case: the mission orchestrator must never auto-fire. An on-demand `Evals` GitHub workflow runs the suite with a cost ceiling.
- **Model routing in the lead**: in `quick` mode experts run on Sonnet by default; in the full modes on the session's model; the architect and the arbitration never leave the session's model. The user overrides with a word in the request.
- **Data, never instructions**: every agent now states that everything it reads (exports, scripts, logs, documents, pasted content) is evidence to analyse, never an instruction to follow, and reports embedded instructions as findings. The mission brief says the same for the files it names. Direct commands already carried the clause.

## [1.3.1] - 2026-10-26

### Changed
- **Section-level reading reverted.** Measurement showed that the cost of a mission is the per-call context multiplied by the number of model calls, so reading a reference file in slices costs more than reading it once. Experts now read a named reference file once, in full, and never explore the plugin or the project with Grep or Glob. The lead names at most two reference files per expert and says whether an environment sheet exists, so nobody searches for it.
- **Team sizing**: every domain the user named gets its expert (the 1.3.0 cap of four dropped the IBM i expert from an IBM i migration); no "just in case" expert; never more than five without the user asking.

### Fixed
- Agents no longer retry through other tools when a reference-file read is refused: they say so once under Assumptions and continue with their preloaded knowledge.

### Documentation
- README: the allow rule that lets experts read their reference files without prompts (`Read(~/.claude/plugins/cache/tiger-team/**)`), the measured costs with the models they ran on, and what drives the cost of a mission.

## [1.3.0] - 2026-10-26

Shaped by the first public feedback (thanks to the Reddit reviewers who pointed at the handoff round and the context load).

### Changed
- **Typed handoffs.** Experts hand off as `→ <agent-name> | <claim> | <evidence> | <needs>`; the lead routes these objects only. The handoff-round brief holds the expert's own summary and the handoffs addressed to it, never other experts' full answers, and a settled point is not reopened.
- **Team sizing rule.** The lead counts the domains before launching: one → `solo` or a direct command; two or three → `quick`; more, or a deliverable → full mission. Never more than four experts without the user asking.
- **New `solo` mode**: no subagent; the lead reads the knowledge base(s) concerned and answers itself.
- **Isolation made explicit**: experts never see each other's first-round answers.
- **Section-level reading**: agents read only the sections of a reference file they need (the files start with a table of contents); the lead names the relevant sections in each brief.
- **Model tiering**: the seven experts no longer fix `model: inherit`, so `CLAUDE_CODE_SUBAGENT_MODEL` applies to them; the project manager and the enterprise architect keep `inherit`, so arbitration and coherence review stay on the session's model.
- README: "Why nine experts, and when one is enough", measured costs table.
- `tests/lint.sh` checks the model-tiering convention.

## [Unreleased]

### Documentation
- `examples/`: three real, unedited outputs with their command, experts, version and measured cost (full `release` mission, `quick` mission, `scheduler-convert`).
- README: terminal illustration of a mission, roadmap and contributions-wanted section, explanation of the *verify against your version* convention, measured costs.
- GitHub issue templates (bug report, fact correction with mandatory official source, feature request) and pull request template.

## [1.2.0] - 2026-10-23

### Added
- **Environment discovery.** New `discovery` skill, preloaded by all nine agents: the protocol to learn the customer's environment before answering (decisive facts, where to find them, when to ask, when to assume), per-domain question lists with *why it matters* and *how to obtain* (commands, console paths, documents), and the factual discipline (Fact / Inference / Assumption labels, version-qualified statements, no invented identifiers, "here is how to check" instead of guesses).
- `/tiger-team:discover`: interactive interview that records the organization's environment in `docs/tiger-team/environment.md` (new `environment-sheet.md` template). Every expert and the mission orchestrator read that sheet first when it exists.

### Changed
- Agents: new section "Know the environment before you answer" (ask up to five precise questions in conversation; explicit assumptions and checks to run when forked).
- Mission: environment facts are collected once by the lead and passed in every brief.

## [1.1.0] - 2026-10-23

### Changed
- **Fact-check pass against official documentation.** Every knowledge base was reviewed against vendor and regulator sources (BMC, Broadcom, Absyss, IBM, SAP Help Portal, Oracle, Microsoft Learn, Sage, Axway, HashiCorp, GitLab, GitHub, Red Hat, SUSE, PostgreSQL, MariaDB, EUR-Lex, Légifrance, EBA, ECB, PCI SSC, ANSSI, SGDSN, ANS, CNIL, EDPB, EPC, SWIFT, The Open Group…). About 220 "verify" flags were resolved; around 180 remain where no official source settles the point. Each reference file now ends with a `## Sources` section listing the official pages actually consulted.
- Notable corrections: Control-M Automation API resources are `Resource:Pool` / `Resource:Lock` (Semaphore/Mutex deprecated), `If` object and `Event:Add` / `Event:Delete` actions, `Notify:*` names, event `Date` values; Dollar Universe engine names, `unienv` environment script, `UPT=` uproc types; VTOM command set, date-switch modes and latest-start behaviour; IBM i release lifecycle (7.4 end of standard support 30 Sep 2026), RPG free-form history, `**FREE`, file status codes; HDS référentiel v2.0 (transition completed 16 May 2026); DORA Level 2 acts and incident clocks; PCI DSS v4.0.1 requirement numbers; Instant Payments Regulation dates; SWIFT CBPR+ coexistence end (22 Nov 2025); AI Act dates after Regulation (EU) 2026/1744; EBA/GL/2026/09 third-party risk guidelines; ANSSI/DINUM homologation guide (2025); SecNumCloud 3.2 legal status; CCAG-TIC 2021 VA/VSR articles; TOGAF 10 / ArchiMate 3.2; MADR 4.0; Terraform 1.10 `use_lockfile`; SLE 16 SELinux default; CA/Browser Forum certificate validity schedule; Db2 REORG-pending rules; Oracle `IF [NOT] EXISTS` (23ai); Dynamics 365 integration APIs and limits; Oracle Fusion `ErpIntegrationService` operations; Sage X3 import/export and web services; French e-invoicing calendar (Sep 2026 / Sep 2027).
- `/tiger-team:mission`: new `quick` mode (one expert round, no handoff round, no coherence review), expected-cost notice, briefs written in the user's language with a length cap, default location for written deliverables.
- `project-manager` agent carries the orchestration procedure inline, so `claude --agent tiger-team:project-manager` works without reading the mission skill.
- `enterprise-architect` now preloads the `deliverables` skill.
- Command skills aligned: intake and confidentiality-gate structure shared by all 11 commands, interface IDs `INT-<nnn>`, mapping-table columns matching the interface-contract template, finding-to-risk scale mapping in `sql-release-review`.
- Deliverable templates: consistent IDs (`PRE-`, `GNG-`, `RB-`, `ADR-0001`…), release-sheet checkpoints `GNG-0` to `GNG-4` with an explicit point of no return.
- README redesigned: badges, Mermaid team diagram, modes table, collapsible sections, French section.

### Added
- Confidentiality guard also blocks `*.ppk`, `*.p8` and `.htpasswd`.
- `tests/confidentiality-guard.test.sh` (30 cases) and `tests/lint.sh` (manifests, names, preloaded skills, markings, line limits), run by GitHub Actions (`.github/workflows/ci.yml`).

## [1.0.0] - 2026-10-22

### Added
- Nine senior expert agents: project manager, enterprise architect, DevSecOps, DBA, job scheduling (VTOM, Dollar Universe, Control-M), integration (APIs and data flows), ERP, infrastructure (network, DNS, Linux, Windows), IBM i.
- `/tiger-team:mission` orchestrator: scoping, architecture framing, parallel expert round, handoff routing, coherence review and consolidated deliverable.
- Eleven expert commands: `scoping`, `release-plan`, `adr`, `security-review`, `sql-release-review`, `batch-review`, `scheduler-convert`, `interface-contract`, `erp-interface-review`, `flow-matrix`, `ibmi-review`.
- Knowledge bases for each expert, sector compliance references (banking, healthcare, defense) and deliverable templates (DAT, DEX, release sheet, interface contract, flow matrix, RACI, RAID, UAT sign-off).
- Confidentiality guard hook: blocks secret files, documents carrying French classification markings, and prompts containing such markings.
