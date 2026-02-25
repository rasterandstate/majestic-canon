# SQLite Safety Audit

## Overview

Audit database usage for performance risks, missing constraints, and scalability weaknesses.

Majestic must scale to large libraries without degrading performance.

---

## Scope

- Query patterns
- Index coverage
- Foreign key constraints
- Migration scripts
- N+1 query risks

---

## Steps

### 1. Query Efficiency

- Detect full table scans.
- Identify missing indexes.
- Detect repeated query patterns.
- Flag N+1 query risks.

---

### 2. Constraint Safety

- Verify foreign keys enabled.
- Ensure cascading deletes intentional.
- Confirm uniqueness constraints exist where required.

---

### 3. Migration Safety

- Ensure migrations:
  - Preserve identity data.
  - Are idempotent.
  - Do not silently drop data.
- Verify publisher_key backfill safety.

---

## Checklist

- [ ] No unindexed hot queries
- [ ] Foreign keys enforced
- [ ] No N+1 patterns
- [ ] Safe migrations
- [ ] Identity data preserved

---

## Output

Provide:

- Any scalability risks
- Missing index recommendations
- Data integrity concerns
- Risk level assessment
