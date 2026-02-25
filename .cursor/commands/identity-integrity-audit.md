# Identity Integrity Audit

## Overview

Analyze the codebase for any changes that could impact deterministic edition identity generation.

Ensure:

- Hash inputs are stable
- Region normalization is deterministic
- Disc ordering is stable
- No null/undefined identity fields
- No identity logic moved into non-authoritative layers

## Steps

1. Locate all identity hash generation functions.
2. Verify input ordering is deterministic.
3. Ensure all fields are normalized before hashing.
4. Confirm no client-side identity derivation exists.
5. Detect recent changes that affect hash inputs.
6. Flag any schema changes touching identity fields.

## Checklist

- [ ] Deterministic ordering confirmed
- [ ] No unnormalized inputs
- [ ] No null region instability
- [ ] Identity logic server-authoritative
- [ ] No accidental identity regressions

## Output

Provide:

- Risk assessment
- Any instability vectors
- Recommended safeguards
