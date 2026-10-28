---
description: A direct command runs in the DBA expert, flags the blocking index build and gives a rollback.
tags: [command, dba, smoke]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

/tiger-team:sql-release-review Review this PostgreSQL 16 release script before it goes to production tonight. The orders table has about 180 million rows and is written to 24/7 by the order-entry application.

```sql
BEGIN;
CREATE INDEX idx_orders_customer_created ON orders (customer_id, created_at);
ALTER TABLE orders ADD COLUMN channel varchar(20) NOT NULL DEFAULT 'WEB';
UPDATE orders SET channel = 'SHOP' WHERE shop_id IS NOT NULL;
COMMIT;
```
