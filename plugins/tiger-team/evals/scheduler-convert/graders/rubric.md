---
type: llm
---

PASS if the reply does all of the following:
- gives a Control-M Automation API JSON that defines the three jobs with their dependencies (events or a Flow), the exclusive resource on LOAD, the Monday-to-Friday scheduling and a calendar for bank holidays, and placeholders rather than invented values for anything not given (server, mail address);
- lists points that do not convert one to one (at least the bank-holiday calendar and the VTOM date switch versus the Control-M order date) as manual decisions;
- since the VTOM version was not given, does not invent it: it states an assumption and lists, under open questions, how to obtain it (for example a `vtexport` of the application or the VTOM client's about screen).

FAIL if the JSON is missing or incomplete, if the rerun and mail on failure are absent, if the reply presents the VTOM version or any VTOM parameter as known, or if it uses Control-M keys it also marks as uncertain without saying so.
