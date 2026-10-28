---
name: discover
description: Interview the user about their organization's environment (schedulers, databases, middleware, ERP, network, IBM i, delivery chain, governance) and record the facts once in docs/tiger-team/environment.md for every expert to read.
argument-hint: "[domains: common|project|architecture|devsecops|dba|scheduling|integration|erp|infra|ibmi|all] [path]"
disable-model-invocation: true
---

# Environment discovery interview

You run in the user's session and may ask questions. Goal: an **environment sheet** that records facts about the organization's environment, so that every Tiger Team expert reads them instead of guessing or re-asking. Request: `$ARGUMENTS`.

## 1. Setup

- Target file: the path given in the request, else `docs/tiger-team/environment.md` under the current project. If it exists, read it and run the interview in **update mode**: show what is recorded, ask only what is missing or outdated.
- Template: `${CLAUDE_PLUGIN_ROOT}/skills/deliverables/templates/environment-sheet.md`. Question lists with *why it matters* and *how to obtain*: `${CLAUDE_PLUGIN_ROOT}/skills/discovery/SKILL.md`, section 3.
- Domains: those named in the request; if none, start with `common` and ask the user which domains to cover (list them with one line each). Do not interview on domains the user does not use.
- Language: the user's.

## 2. Confidentiality first

Say it once, briefly: this assistant runs on a cloud API. Ask for **pseudonyms** for sensitive zone and host names, ranges from RFC 5737 or placeholders instead of real IP plans of sensitive networks, and never secrets, credentials or classified material. If the user's organization has an AI usage policy, record what it allows in the sheet's "AI usage policy" line and respect it for the rest of the interview.

## 3. Interview rules

- **One block at a time**: at most five questions per message, grouped by domain, each with a one-line *why it matters* and, when useful, *how to obtain it* (command, console path, document). Start with the questions whose answers change the most decisions.
- **Accept "unknown"**: record it as an open point with the check to run (section 11 of the sheet), never as a guess.
- **Record facts as given**: no reformulation that adds precision the user did not state. Version "16" stays "16", not "16.4". Add the source: "stated by `<role>`, `<date>`", or a document path.
- **Reuse documents**: if the user points to a DAT, DEX, CMDB export or interface inventory, read it and prefill; ask only to confirm.
- **Stop when the user says so**; a partial sheet is better than none.

## 4. Writing the sheet

- Fill the template sections for the domains covered; leave other sections as they are, with their empty tables, so they can be filled later.
- Keep every line a **Fact with a source** or an **open point**. No Inference, no Assumption in this document.
- Set the version (`0.1` first draft, then increments), the date and "Maintained by".
- Write the file, then show a short summary: facts recorded per domain, open points, and the three gaps that would most help the experts.
- Suggest adding `docs/tiger-team/environment.md` to the project's documentation and keeping it current; if the sheet contains pseudonyms, suggest keeping the pseudonym-to-real mapping outside the assistant.

## 5. After the interview

Remind the user that `/tiger-team:mission` and the direct commands read the sheet when it exists at the default path, or when the path is given in the request.
