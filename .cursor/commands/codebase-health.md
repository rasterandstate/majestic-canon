# Codebase Health Audit

## Overview

Analyze the entire Majestic codebase (Node.js server, Svelte client, and Rust stream engine) for structural code smells, maintainability risks, architectural drift, and dependency hygiene issues. Identify problems, propose improvements, and apply safe automated fixes where appropriate.

Preserve Majestic’s core architectural principles:

- Identity layer stability
- Direct play reliability
- Local-first architecture
- No unnecessary abstractions
- No silent behavior changes

Explain all detected issues and applied changes clearly.

---

## Scope

- Node.js server code
- Svelte client code
- Rust stream engine
- Build configuration
- Dependency configuration
- Project structure

---

## Steps

### 1. Structural Analysis

- Detect files exceeding recommended size thresholds:
  - JS/TS/Svelte > 600 lines
  - Rust > 800 lines
- Identify overly complex functions:
  - Deep nesting (> 4 levels)
  - Cyclomatic complexity > 10
- Detect circular dependencies
- Detect tightly coupled modules
- Flag monolithic components that should be decomposed
- Identify duplicated logic

---

### 2. Code Hygiene Review

- Unused imports
- Unused variables
- Dead functions
- Commented-out legacy code
- Console logging in production paths
- TODOs without tracking context

---

### 3. Dependency Audit

Node:

- Unused dependencies
- Missing dependencies
- Duplicate dependencies
- Vulnerable dependencies

Rust:

- Unused crates
- Outdated crates
- Security advisories
- Feature flags not being used

---

### 4. Performance & Stability Risks

Server:

- Blocking filesystem operations
- Large synchronous loops
- Unbounded memory growth patterns
- Improper stream handling

Svelte:

- Unnecessary reactive recalculations
- Large reactive blocks
- Inefficient stores
- Re-render risks

Rust:

- Unnecessary cloning
- Excess allocations
- Blocking I/O
- Missing error propagation

---

### 5. Formatting & Standards

- ESLint compliance
- TypeScript type safety
- Rust `clippy` compliance
- Rust `fmt` compliance
- Consistent naming conventions
- Consistent async patterns

---

### 6. Apply Safe Fixes

Automatically apply safe, non-architectural fixes:

- Remove unused imports
- Remove unused variables
- Apply formatting fixes
- Fix lint-level warnings
- Replace trivial anti-patterns
- Normalize indentation and style
- Remove obvious dead code

Do NOT:

- Redesign architecture
- Modify identity layer logic
- Change database schema
- Introduce new dependencies
- Modify public API behavior

---

## Codebase Health Checklist

### Structural Integrity

- [ ] No files exceeding size thresholds
- [ ] No circular dependencies
- [ ] No high-complexity functions
- [ ] No duplicated logic blocks

### Hygiene

- [ ] No unused imports
- [ ] No unused variables
- [ ] No dead functions
- [ ] No commented-out legacy code
- [ ] No stray console logs

### Dependencies

- [ ] No unused Node dependencies
- [ ] No unused Rust crates
- [ ] No known security vulnerabilities
- [ ] No unnecessary feature flags

### Performance Safety

- [ ] No blocking I/O in server hot paths
- [ ] No inefficient reactive Svelte patterns
- [ ] No unnecessary Rust allocations
- [ ] Proper stream lifecycle handling

### Standards

- [ ] ESLint passes cleanly
- [ ] TypeScript passes without errors
- [ ] Rust clippy passes without warnings
- [ ] Rust formatting passes
- [ ] Consistent naming and async patterns

### Changes

- [ ] Applied all safe automatic fixes
- [ ] Preserved Majestic architectural principles
- [ ] Explained all modifications clearly
- [ ] Provided recommendations for non-automatic improvements

---

## Output Requirements

1. Provide:
   - Summary of detected issues
   - List of automatic fixes applied
   - List of recommended manual refactors
   - Risk level assessment (Low / Moderate / High)

2. Do not:
   - Make speculative architecture changes
   - Modify identity hashing logic
   - Introduce streaming behavior changes
