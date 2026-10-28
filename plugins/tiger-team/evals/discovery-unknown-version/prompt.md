---
description: An expert asked without the product version does not invent one; it qualifies its answer by version and names the check to run.
tags: [agent, discovery, dba]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

Ask the tiger-team dba-expert this question and relay its full answer: "We need to add an index on a 200-million-row table in production without blocking the application. The database is PostgreSQL but I do not know which version. What is the safest way?"
