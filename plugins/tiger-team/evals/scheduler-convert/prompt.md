---
description: The VTOM to Control-M conversion yields a valid Automation API definition with current resource keys and typed handoffs.
tags: [command, scheduling]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

/tiger-team:scheduler-convert vtom to control-m. Environment PROD, application APP_COMPTA on server SRV-BATCH-01, run-as account batchcpt. Jobs: EXTRACT (script /opt/batch/extract.sh, 22:00 Monday to Friday except French bank holidays), TRANSFER (after EXTRACT OK, CFT send to SRV-SAP-01), LOAD (after TRANSFER OK, exclusive resource LOCK_GL; on failure, one automatic rerun after 10 minutes, then a mail to the on-call team). The VTOM version is not known.
