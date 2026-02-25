# SQLite Safety & Index Audit Report

**Date:** Post Phase 4 refactor  
**Scope:** `src/lib/server/db/` modules

---

## Executive Summary

| Area | Status | Risk Level |
|------|--------|------------|
| WAL mode | ✅ Enabled | — |
| Foreign keys | ⚠️ Not enforced | Medium |
| Index coverage | ✅ Good for hot paths | Low |
| N+1 patterns | ⚠️ 1 identified | Medium |
| Transaction boundaries | ⚠️ Partial | Medium |
| Migration safety | ✅ Idempotent patterns | Low |

---

## 1. Query Efficiency

### Index Coverage

**Hot tables have appropriate indexes:**

| Table | Indexes | Query patterns covered |
|-------|---------|------------------------|
| `movies` | tmdb_id, binder, slot, title_year | ✅ By-id, by-binder-slot, search |
| `physical_copies` | movie_id, binder, slot, disc_edition_id | ✅ By-movie, by-edition |
| `disc_edition` | movie_id, upc, (movie_id, upc, edition_variant), (movie_id, variant_identity_hash), edition_identity_hash | ✅ Lookups, uniqueness |
| `binders` | name (unique) | ✅ By-name |
| `publishers` | key, tier | ✅ By-key, display |
| `media_file` | path, library_root_id, movie_id, fingerprint | ✅ By-path, by-movie |

**Potential gaps:**

- `movie.title LIKE ?` (search) — `idx_movies_title_year` helps for `ORDER BY title` but `LIKE` may not use it efficiently for prefix searches. `LIKE 'foo%'` can use index; `LIKE '%foo'` cannot.
- `movie_artwork.fetch_fail_count` — used in `ORDER BY COALESCE(a.fetch_fail_count, 0) ASC`; no index on `fetch_fail_count`. Low impact for typical artwork fetch queue size.

### N+1 Query Risk

**Identified:** `getPhysicalCopiesWithEditions` (discEdition.ts)

```ts
const copies = getPhysicalCopiesByMovieId(movieId);
return copies.map((c) => ({
  ...c,
  edition: c.disc_edition_id
    ? (getDiscEditionById(c.disc_edition_id) ?? null)
    : null,
}));
```

**Impact:** One `SELECT disc_edition WHERE id = ?` per physical copy. For a movie with 5 physical copies, that's 5 extra queries.

**Mitigation:** Batch fetch editions by IDs, or join in a single query. `getPhysicalCopiesByMovieId` already returns `disc_edition_id`; a single `SELECT * FROM disc_edition WHERE id IN (...)` would reduce to 1 query.

**Mitigated:** `getMovieEntries` uses `binderIdCache` to avoid repeated `getBinderIdByName` calls — good.

---

## 2. Constraint Safety

### Foreign Keys

**Status:** SQLite foreign keys are **not** enforced by default.

- `connection.ts` sets `journal_mode = WAL` but does **not** set `PRAGMA foreign_keys = ON`
- Schema defines `FOREIGN KEY ... REFERENCES` in many places (disc_edition, physical_copies, person_movie, etc.)
- Without enforcement: orphaned rows (e.g. physical_copy pointing to deleted disc_edition) are possible

**Recommendation:** Add `db.pragma('foreign_keys = ON')` in `connection.ts` after opening the database. **Caveat:** Enabling FK requires that no schema violates FK constraints (e.g. existing orphaned rows). Run an integrity check first.

### Cascading Deletes

- `disc_edition` → `ON DELETE CASCADE` from movies
- `physical_copies` → references disc_edition (no CASCADE on physical_copies; disc_edition deletion would orphan copies if FKs enforced)
- `person_movie` → CASCADE from person and movies

Intentional cascades are documented in schema. No accidental cascades identified.

---

## 3. Migration Safety

### Idempotency

- Migrations use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN` with column-existence checks
- `migrateFromLegacySchema` checks `tableInfo` before altering
- `migrateDiscEdition` and `migrateEditionIdentityHash` use `pragma('table_info')` to gate changes

**Verdict:** Migrations are idempotent.

### Identity Data Preservation

- `migrateDiscEdition` backfill uses `computeVariantLabelFromCanonical` and `computeVariantIdentityHashWithNormalized` from editionIdentity (canonical)
- `migrateEditionIdentityHash` uses `computeEditionIdentityHash` (canonical)
- No silent drops of identity data in migrations

### Publisher Key Backfill

- Safe: `UPDATE disc_edition SET publisher_key = ? WHERE id = ?` with `normalizePublisherToKey`
- No destructive overwrites

---

## 4. Transaction Boundaries

### Current Usage

| Module | Transaction | Multi-step ops |
|--------|-------------|----------------|
| `binder.ts` | `updateBinder`, `deleteBinder` | ✅ Wrapped |
| `scannerService.ts` | Scan commit | ✅ Wrapped |
| `stagingScan.ts` | Staging swap | ✅ Wrapped |
| `orchestration.ts` | ❌ None | createMovie, updateMovieLocation, addPhysicalCopy, updatePhysicalCopy |

### Orchestration Gaps

**createMovie (physical):**
1. INSERT movies
2. getOrCreateDiscEditionByUpc (may INSERT disc_edition)
3. addPhysicalCopy (INSERT physical_copies)

**Partial failure:** If step 3 fails, movie and possibly disc_edition exist without physical copy. Movie row has empty binder/slot.

**updateMovieLocation (physical, add):**
1. getOrCreateDiscEditionByUpc / createDiscEditionWithNextVariant
2. addPhysicalCopy

**Partial failure:** Same as above.

**addPhysicalCopy:**
1. createDiscEdition (if no edition_id)
2. INSERT physical_copies

**Partial failure:** Edition created but copy insert fails → orphaned edition.

**updatePhysicalCopy:**
1. UPDATE physical_copies

Single statement — atomic. No transaction needed.

**Recommendation:** Wrap multi-step orchestration mutations in `database.transaction()`. Start with `createMovie` and `addPhysicalCopy` as highest-risk.

---

## 5. Concurrency

### getDb() Singleton

- Single `db` instance in `connection.ts`
- better-sqlite3 is synchronous; multiple concurrent requests share the same connection
- SQLite handles concurrent reads; writes serialize. WAL mode allows concurrent read during write.

**Verdict:** Safe for typical SvelteKit request handling. No connection pooling needed for this use case.

---

## Checklist

| Item | Status |
|------|--------|
| No unindexed hot queries | ✅ Hot paths indexed |
| Foreign keys enforced | ✅ Enabled + preflight check |
| No N+1 patterns | ✅ getPhysicalCopiesWithEditions batch fetch |
| Safe migrations | ✅ Idempotent |
| Identity data preserved | ✅ Yes |
| Transaction boundaries | ✅ Orchestration wrapped |
| Invariant tests | ✅ db/invariant.test.ts |

---

## Completed Actions

1. **PRAGMA foreign_keys = ON** — Enabled in `connection.ts` after initSchema. `checkForeignKeyIntegrity()` runs `PRAGMA foreign_key_check` and throws if violations exist.
2. **Orchestration transactions** — `createMovie`, `addPhysicalCopy`, `updateMovieLocation` (physical add path) wrapped in `database.transaction()`.
3. **N+1 fix** — `getPhysicalCopiesWithEditions` uses `getDiscEditionsByIds()` batch fetch instead of per-copy `getDiscEditionById`.
4. **Invariant tests** — `src/lib/server/db/invariant.test.ts` asserts: no orphan physical copies, no orphan disc editions, identity hashes present.

---

## Risk Level Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Orphaned rows (no FK) | Medium | Low (app logic is careful) | Enable FK after integrity check |
| Partial writes (no tx) | Medium | Low (failures rare) | Add transactions |
| N+1 in getPhysicalCopiesWithEditions | Low | Medium (called per movie) | Batch fetch |
| Full table scan on LIKE | Low | Low (search is bounded) | Monitor if search scales |

**Overall:** Structure is sound. Hardening is incremental and low-risk.
