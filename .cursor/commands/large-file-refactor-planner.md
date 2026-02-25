# Large File Refactor Planner

## Overview

When run against any file exceeding 800 lines, this command maps logical clusters, proposes module boundaries, and provides an incremental extraction plan.

Use this before refactoring large files. Make structure intentional, not reactive.

Created at: `.cursor/commands/large-file-refactor-planner.md`

---

## Scope

- JS/TS/Svelte files > 800 lines
- Rust files > 800 lines

---

## Steps

### 1. Identify Target

- Accept a file path as input, or scan for files exceeding the threshold.
- Report line count and file type.

---

### 2. Map Logical Clusters

- Parse the file and identify:
  - Export boundaries (functions, classes, interfaces, components)
  - Import dependencies (what this file pulls in)
  - Call graph within the file (who calls whom)
- Group related exports into logical clusters.
- Name each cluster (e.g. "movie CRUD", "binder slot logic", "physical copy queries").

---

### 3. Propose Module Boundaries

- For each cluster, propose a candidate module path.
- Respect existing project structure (e.g. `$lib/server/db/` for database logic).
- Ensure proposed modules have clear, single-responsibility names.
- Flag clusters that share tight coupling. They may need to stay together or be split with explicit interfaces.

---

### 4. Identify Shared State Dependencies

- Map variables, stores, or singletons used across clusters.
- Identify:
  - Database handle / connection
  - Caches
  - Mutable module-level state
- Propose how shared state will be passed (arguments, dependency injection, or a thin facade).

---

### 5. Suggest Extraction Plan

- Order extractions by dependency (extract leaf modules first).
- For each extraction step:
  - Source file and line range
  - Target module path
  - Exports to move
  - Imports to add in consumers
  - Any re-exports to preserve in the original file
- Ensure each step leaves the codebase in a working state (tests pass).

---

### 6. Provide Incremental Refactor Steps

- Output a numbered sequence of steps.
- Each step should be:
  - Small enough to review in one pass
  - Verifiable (run tests after each)
  - Non-breaking (no behavior changes)
- Recommend keeping a thin facade in the original file that re-exports from new modules until all consumers are updated.

---

## Checklist

- [ ] Logical clusters identified and named
- [ ] Module boundaries proposed
- [ ] Shared state dependencies mapped
- [ ] Extraction order determined (leaves first)
- [ ] Incremental steps documented
- [ ] No behavior changes (pure structural refactor)
- [ ] Identity layer and streaming logic untouched (if applicable)

---

## Output

Provide:

1. **Cluster map** — Named clusters with export lists and line ranges
2. **Proposed module layout** — File paths and responsibilities
3. **Shared state analysis** — What crosses boundaries and how to handle it
4. **Step-by-step extraction plan** — Numbered, verifiable, incremental
5. **Risk notes** — Any clusters that are high-coupling or identity-adjacent

---

## Constraints

- Do NOT change behavior.
- Do NOT modify identity hashing or streaming logic.
- Do NOT introduce new dependencies.
- Preserve all existing exports during transition (re-export from facade).
