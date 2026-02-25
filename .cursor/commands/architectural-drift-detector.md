# Architectural Drift Detector

## Overview

Audit the codebase for violations of Majestic’s core principles.

Majestic is:

- Ownership-first
- Identity-deterministic
- Direct play only
- Local-first
- Explicit over implicit

This audit detects drift toward convenience-driven architecture.

---

## Scope

Entire codebase.

---

## Steps

### 1. Detect Silent Guessing

- Identify heuristics that auto-assign identity.
- Detect ambiguous matching logic.
- Flag fallback behavior without user confirmation.

---

### 2. Detect Transcoding Drift

- Search for transcoding hooks.
- Identify hidden format coercion logic.
- Detect background conversion paths.

---

### 3. Detect Cloud Dependency Introduction

- Identify external API reliance.
- Detect remote-only features.
- Flag mandatory internet assumptions.

---

### 4. Identity Leakage

- Ensure identity logic remains server-authoritative.
- Ensure no client-derived identity hashes.
- Ensure no file-based identity fallback.

---

## Checklist

- [ ] No silent identity guessing
- [ ] No hidden transcoding logic
- [ ] No cloud dependence creep
- [ ] Identity logic remains centralized
- [ ] No convenience-over-trust shortcuts

---

## Output

Provide:

- Any philosophical violations
- Drift vectors
- Long-term risk assessment
