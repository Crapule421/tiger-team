---
description: Mentioning a cross-domain migration project must not trigger the mission orchestrator by itself; it is user-invoked only.
tags: [guard, mission, smoke]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

We are planning to migrate our nightly batch scheduler from VTOM to Control-M next year, with an IBM i extraction, a CFT transfer and SAP IDocs at the end. In three sentences, what are the first things to think about? Do not launch any multi-agent work, I just want a short answer.
