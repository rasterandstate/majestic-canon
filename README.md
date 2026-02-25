# majestic-canon

Majestic Canonical Dataset — source of truth for edition identity, region mappings, publisher normalization, and schema definitions.

## Purpose

The authoritative source layer for Majestic's identity distribution. This repo contains the raw structured data that becomes signed patch packs. **It is not what installs download.** That's the critical distinction.

## Responsibilities

- **Edition data**: Raw structured edition definitions
- **Identity definitions**: Canonical identity hashing inputs
- **Region mappings**: Region code normalization rules
- **Publisher normalization**: Publisher name standardization
- **Schema definitions**: Schema rules, identity hashing rules, override precedence
- **Migration scripts**: Schema migration logic
- **Validation tooling**: Integrity checks before build
- **Tests**: Validation and regression tests

## Non-Responsibilities

- **Build/packaging**: Handled by majestic-canon-tools
- **Distribution**: Handled by CDN (not GitHub)
- **Client-side updates**: Handled by majestic-canon-updater

## Architecture

This is Layer 1 of three: curation layer. Build and distribution are separate. See [Authoritative Data Distribution Strategy](../majestic-server/docs/strategy/authoritative-data-distribution-dissection.md) Section 15.

## Repository Structure

```
/schema          # Schema rules, identity hashing, override precedence
/editions        # Edition data (structure TBD)
/migrations     # Migration scripts
/tests          # Validation tests
```

## License

Custom Majestic Canon License — source-available, non-commercial. See [LICENSE](./LICENSE).

## Governance

- This is where curation happens
- Version-controlled history
- PR review required
- Schema changes are constitutional-level — change slowly
