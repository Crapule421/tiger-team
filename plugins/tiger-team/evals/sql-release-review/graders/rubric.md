---
type: llm
---

PASS if the reply does all of the following:
- identifies that `CREATE INDEX` without `CONCURRENTLY` inside a transaction blocks writes on a 180-million-row table that is written 24/7, and recommends building the index concurrently outside the transaction;
- treats the `UPDATE` of a large table in one statement as a lock and WAL risk and proposes batching or an alternative;
- provides a rollback for the changes (drop index, drop column) or states explicitly why one step cannot be rolled back;
- states which PostgreSQL version its advice applies to, and does not present as fact a parameter or behaviour it marks as uncertain.

FAIL if the reply approves the script as is, omits the concurrent index recommendation, gives no rollback at all, or invents PostgreSQL parameters, views or syntax presented as fact.
