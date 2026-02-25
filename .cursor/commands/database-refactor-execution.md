# Database Refactor Execution Plan

## Overview

This document is the **written intent** for refactoring `src/lib/server/database.ts` (4,155 lines) into a domain-bounded module structure. It exists because context loss during multi-step refactors is real. Six steps in, you will forget why something was ordered a certain way.

**This is the highest-risk structural surgery Majestic has had so far.**

It touches:
- Identity hashing
- Migrations
- Connection lifecycle
- Every import path in the backend

Subtle breakage happens here. Discipline is required.

---

## Golden Rule

> **You are not improving code. You are relocating it.**

- No opportunistic cleanup during extraction
- No renaming for aesthetics
- No moving logic "while we're here"
- Extract as-is. Preserve behavior exactly.
- **No import path changes for consumers until Phase 4.** All imports stay `$lib/server/database`.

---

## Target Structure

```
src/lib/server/
  db/
    types.ts
    connection.ts
    migrations.ts
    editionIdentity.ts   ← pure, no DB
    physicalCopy.ts
    binder.ts
    movie.ts
    discEdition.ts
    movieEntries.ts
    index.ts             ← facade (primary export surface)
  database.ts            ← thin re-export from db/index.ts (legacy compatibility)
```

`database.ts` remains for backward compatibility. All new logic lives under `db/`. Future freedom: kill `database.ts` entirely when consumers are updated.

---

## Preconditions Before Phase 1

**Do not proceed to Phase 1 until all are satisfied.**

- [ ] All tests green
- [ ] Identity regression tests added (snapshot hash test)
- [ ] Snapshot hash test committed
- [ ] Working branch created for refactor
- [ ] No uncommitted changes in `database.ts`

### Identity Regression Test Requirement

Before any extraction of identity logic:

1. Add a test that:
   - Takes known edition inputs (upc, region, packaging, publisher, release_date)
   - Asserts expected hash output
   - Documents the canonical hash for audit

2. Add a test that:
   - Uses existing DB rows (or fixtures)
   - Asserts `old hash === new hash` after refactor

3. Commit these tests. They are the safety net.

---

## Rollback Strategy

- **One phase per commit.** No cross-phase commits.
- Each phase is a single, revertible unit.
- If a phase fails validation, revert that commit. Fix. Re-apply.
- Easy revert boundaries = low stress.

---

## Post-Phase Validation Checklist

**Run after every phase, before committing.**

1. **Tests** — `npm test` (or project test command)
2. **Identity audit** — Run `.cursor/commands/identity-integrity-audit.md`
3. **File movement resilience** — Run `.cursor/commands/file-movement-resilience-audit.md`
4. **Stream reliability** — Run `.cursor/commands/direct-play-reliability-audit.md`

**Verify no change in:**
- Edition hash outputs (identity regression tests pass)
- MovieEntry shape
- Stream endpoint behavior

---

## Phase 1 — Low Risk

**Goal:** Shrink `database.ts` by ~1,500 lines. Migrations quarantined.

### Step 1.1: Extract types

- **Source:** Lines 1–219
- **Target:** `$lib/server/db/types.ts`
- **Move:** `PHYSICAL_FORMATS`, `CONTENT_TYPES`, `PhysicalFormat`, `ContentType`, `PublisherTier`, `Publisher`, `DiscEdition`, `DiscEditionInsert`, `PhysicalCopy`, `PhysicalCopyInsert`, `Movie`, `EditionMetadata`, `MovieInsert`, `MovieUpdate`
- **database.ts:** Re-export from `db/types.ts` (via `db/index.ts`)

**Gate:** All consumers still import from `$lib/server/database`. No import path changes yet.

### Step 1.2: Extract migrations

- **Source:** Lines 243–1561
- **Target:** `$lib/server/db/migrations.ts`
- **Move:** All `migrate*` functions
- **Dependencies:** `types.ts` (STREAMING_BINDER, VIRTUAL_BINDERS), `$lib/formatColors` (normalizePublisherToKey — for now)
- **database.ts:** `initSchema` imports from `db/migrations.ts` and runs them in same order

**Dependency break:** `migrateDiscEdition` and `migrateEditionIdentityHash` call `getRegionSummaryForEdition(editionId)`, which currently calls `getDb()` internally. That would create migration → connection → migration cycle.

**Safe pattern (avoid changing behavior for non-migration callers):**
- Add `getRegionSummaryForEdition(db, editionId)` — new internal helper, accepts database
- Keep `getRegionSummaryForEditionById(editionId)` — old public API, calls `getDb()` internally, delegates to helper
- Migrations call the new `(db, editionId)` form directly
- All other callers (disc edition, computeVariantLabelServer) keep using `getRegionSummaryForEditionById(editionId)` until Phase 2/3 when they move
- Delete the old `*ById` wrapper only when everything is extracted and clean

**Gate:** Migrations run in same order. Schema unchanged. No migration logic altered. Largest single extraction (~1,300 lines).

### Step 1.3: Extract connection

- **Source:** Lines 212–241
- **Target:** `$lib/server/db/connection.ts`
- **Move:** `getDbPath`, `db`, `closeDb`, `getDb`, `initSchema`
- **Note:** `initSchema` imports from `db/migrations.ts` and runs them. Migrations extracted first so connection has no dependency on database.ts.
- **database.ts:** Re-export `closeDb`, `getDb`

**Gate:** Tests pass. `closeDb` used in tests must still work.

**Do not proceed to Phase 2 until:**
- [ ] Phase 1 validation checklist complete
- [ ] **`initSchema` call graph unchanged** (same order, same migrate* calls — migrations are historical; reordering is how you get haunted)
- [ ] Phase 1 committed as single unit

**Note:** `migrateDiscEdition` and `migrateEditionIdentityHash` intentionally remain in database.ts until Phase 2 (identity isolation) to avoid premature DB/helper decoupling. Future-you will forget why they're still there — this documents the intent.

---

## Phase 2 — Identity Isolation

**Goal:** Identity helpers are pure and DB-free. No hidden dependencies.

### Pre-Phase 2 Requirement

- [ ] Identity regression tests added and committed (see Preconditions)
- [ ] Snapshot hash test documents expected outputs

### Step 2.1: Extract editionIdentity (pure)

- **Source:** Lines 2354–2710 (identity helpers)
- **Target:** `$lib/server/db/editionIdentity.ts`
- **Move:** `normalize*ForHash`, `computeVariantIdentityHash`, `computeEditionIdentityHash`, `computeVariantLabelServer`, `assertIdentityHashVersion`
- **Critical:** Identity helpers receive **all inputs as arguments**. No `getRegionSummaryForEdition` calls. No DB imports.
- **API shape:**
  ```ts
  computeVariantIdentityHash(params: { upc, region, packaging, publisher, release_date }): string | null
  computeEditionIdentityHash(params: { movieId, publisherKey, format, packaging, releaseDate, region }): string
  ```
- **Callers** (disc edition, migrations) fetch region via `getRegionSummaryForEdition` and pass it in.

**Gate:** Identity regression tests pass. No DB queries in `editionIdentity.ts`.

### Step 2.2: Extract physicalCopy

- **Source:** Lines 2278–2353, 2326–2333
- **Target:** `$lib/server/db/physicalCopy.ts`
- **Move:** Physical copy queries, `getEditionRegionSummary`, `getRegionSummaryForEdition`
- **Dependencies:** `connection.ts`, `types.ts`
- **Note:** `getRegionSummaryForEdition` lives here. Callers (disc edition, migrations) import from physicalCopy and pass region into identity helpers.

**Gate:** `editionIdentity.ts` does NOT import `physicalCopy.ts`. Dependency flows one way: physicalCopy → connection, types.

**Phase 4 note:** When `database.ts` becomes a thin re-export shim, all DB-backed modules (`physicalCopy.ts`, `binder.ts`, and any other db modules) must import `getDb` from `connection.ts`, not from the legacy facade. DB modules should depend on connection, not the facade.

**Do not proceed to Phase 3 until:**
- [ ] Phase 2 validation checklist complete
- [ ] Identity audit confirms no DB coupling in identity layer
- [ ] Phase 2 committed as single unit

---

## Phase 3 — Domain Layers

**Goal:** Extract remaining clusters. Order reduces cross-pressure.

### Step 3.1: Extract binder

- **Source:** Lines 3726–4155
- **Target:** `$lib/server/db/binder.ts`
- **Dependencies:** `connection.ts`, `types.ts` (STREAMING_BINDER, VIRTUAL_BINDERS)

### Step 3.2: Extract movie

- **Source:** Lines 1558–2278
- **Target:** `$lib/server/db/movie.ts`
- **Dependencies:** `connection.ts`, `types.ts`, `binder.ts` (for `getMovieByBinderIdAndSlot`)

### Step 3.3: Extract discEdition

- **Source:** Lines 2710–3373
- **Target:** `$lib/server/db/discEdition.ts`
- **Dependencies:** `connection.ts`, `types.ts`, `editionIdentity.ts`, `physicalCopy.ts`
- **Note:** Fetches region via `getRegionSummaryForEdition`, passes to identity helpers.

### Step 3.4: Extract movieEntries

- **Source:** Lines 3373–3726
- **Target:** `$lib/server/db/movieEntries.ts`
- **Dependencies:** `connection.ts`, `types.ts`, `movie.ts`, `binder.ts`, `discEdition.ts`

**Gate per step:** Validation checklist. MovieEntry shape unchanged. Stream behavior unchanged.

**Do not proceed to Phase 4 until:**
- [ ] All Phase 3 steps complete
- [ ] Phase 3 validation checklist complete
- [ ] Phase 3 committed as single unit

---

## Phase 4 — Facade

**Goal:** `db/index.ts` is the primary export. `database.ts` is legacy compatibility.

### Step 4.1: Create db/index.ts

- Re-export all public APIs from: types, connection, migrations, editionIdentity, physicalCopy, binder, movie, discEdition, movieEntries
- Single import surface for `db/` module

### Step 4.2: Thin database.ts

- Replace contents with: `export * from './db/index.js'` (or equivalent)
- `database.ts` becomes a re-export shim
- All existing imports from `$lib/server/database` continue to work

**Gate:** Zero consumer changes. All tests pass. All audits pass.

---

## Migration Isolation Requirement

Migrations are historical. Do not alter migration logic during extraction.

- Extract migrations as-is
- Preserve execution order
- Preserve all `migrate*` function bodies
- If a migration calls identity helpers, ensure it receives region (or equivalent) as before — refactor the *call site* to pass args, not the helper to fetch them

---

## Post-Refactor: normalizePublisherToKey

**Not during this refactor.** Document for later:

Publisher normalization is edition-domain logic. It currently lives in `$lib/formatColors` (UI). After refactor, consider moving to:
- `db/editionIdentity.ts`, or
- `lib/domain/publisher.ts`

Do not let UI color logic define edition identity rules long term.

---

## Summary

| Phase | Steps | Commit |
|-------|-------|--------|
| 1 | types → migrations → connection | One commit |
| 2 | editionIdentity (pure), physicalCopy | One commit |
| 3 | binder, movie, discEdition, movieEntries | One commit |
| 4 | db/index.ts, thin database.ts | One commit |

**Total: 4 commits. 4 revert boundaries.**

Phase 1 order is intentional: connection imports migrations in `initSchema`; migrations receive `db` as parameter and don't need connection.

---

## When Things Go Wrong

1. **Validation fails:** Do not commit. Fix in place. Re-run validation.
2. **Identity regression:** Revert. Identity tests are the canary. Do not proceed with broken identity.
3. **Circular dependency:** You introduced a hidden dep. Identity must not import physicalCopy. PhysicalCopy must not import editionIdentity. Fix the dependency direction.
4. **"While we're here" urge:** Resist. Relocate only. Improve later.

---

*This document is the contract. Follow it.*
