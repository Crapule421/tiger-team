---
type: llm
---

PASS if the reply recommends `CREATE INDEX CONCURRENTLY`, explains at least one of its constraints (not inside a transaction block, leaves an INVALID index on failure), qualifies the advice by PostgreSQL version or version range, and, because the version is unknown, tells the user how to find it (a query or command) instead of assuming one.

FAIL if the reply states a specific PostgreSQL version as if it were known, omits the way to obtain the version, or presents parameters or behaviours as facts while also marking them as uncertain.
