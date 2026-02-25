# Identity Hashing Rules

The canonical identity algorithm is implemented in **majestic-identity-contract**. This document describes the schema and rules that the canon layer documents and that canon-tools will use when generating packs.

## Hash Inputs (identity_v1)

Edition hash is computed from:

1. **movieId** — Internal DB ID (per-instance; not portable)
2. **publisherKey** — Canonical publisher key (from publisher normalization)
3. **format** — Physical format (Blu-ray, 4K, DVD, etc.)
4. **packaging** — Packaging type (Steelbook, Keep Case, etc.)
5. **releaseDate** — Year extracted for hash (YYYY)
6. **region** — Region summary (A, B, A + B, none)

## Normalization

- **Region**: See `REGION_SYNONYMS` in majestic-identity-contract (frozen)
- **Packaging**: See `PACKAGING_SYNONYMS` in majestic-identity-contract (frozen)
- **Format**: 4K/UHD→`4k`, Blu-ray→`bluray`, DVD→`dvd`
- **Release date**: Year only (YYYY)

## Override Precedence

When resolving edition identity, apply overrides in order:

1. **explicit_override** — `.majestic.json` or curated override in canon
2. **publisher_normalization** — Publisher key from canon publisher map
3. **region_mapping** — Region code from canon region map
4. **default** — Pass-through from source

## Schema Changes

Schema changes are constitutional-level. Any change requires:

- Version bump in `schema.json`
- Migration script in `/migrations`
- Updated test vectors
- PR review
