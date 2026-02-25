# Majestic Canon Identity Spec

**Status:** Draft (target freeze before any curated edition data)  
**Scope:** Defines edition identity semantics, canonicalization, and deterministic hash derivation for Majestic Canon.

## 1. Goals

Majestic Canon provides an authoritative, deterministic representation of:
- Disc editions (physical releases) and their identity
- Region mappings
- Publisher normalization

Identity must be:
- Deterministic across machines and time
- Independent of file paths and media file naming
- Stable under reordering and non-meaningful formatting changes

## 2. Canon Entities (v1.1)

### 2.1 MovieRef
A non-authoritative reference to the conceptual film.

Fields:
- `tmdb_movie_id` (integer, required)
- `title` (string, optional, informational only)
- `year` (integer, optional, informational only)

Rules:
- `tmdb_movie_id` is the canonical movie pointer.
- `title` and `year` must never participate in identity hashing.

### 2.2 Edition
A specific released product variant (e.g., UHD Steelbook, Criterion Blu-ray, Region B keepcase).

Core fields (identity-significant unless noted):
- `movie` (MovieRef, required)  
  - `tmdb_movie_id` participates in identity.
- `release_year` (integer, required)  
  - The year of this edition's release, not the movie's release.
- `publisher` (string, required)  
  - Must be normalized via publisher registry (see 2.4).
- `packaging` (object, required)  
  - `type` (enum: keepcase, steelbook, digipak, slipcover, boxset, other)
  - `notes` (string, optional, not identity-significant by default)
- `upc` (string, optional)  
  - Canon stores UPC when known but does not require it.
- `discs` (array, required; min 1)  
  - Multi-disc is first-class.
- `edition_tags` (array of enum/string, optional)  
  - Example: director_cut, theatrical, extended, remaster_4k, criterion, anniversary.
  - Tags participate in identity only if explicitly defined as identity-significant tags in schema.
- `notes` (string, optional, NOT identity-significant)
- `external_refs` (array, optional, NOT identity-significant)  
  - Cross-reference pointers to external catalog entries (e.g., blu-ray.com).
  - Format: `[{ "source": "blu-ray.com", "id": "390212", "url": "https://..." }]`
  - Do not participate in identity hash derivation. Do not use for uniqueness.
  - If the external catalog changes URLs or disappears, canon identity is unaffected.
  - **Payload serialization:** Must be sorted by `source` then `id` for deterministic canon.json. Keeps diffs clean when curators add refs in different orders.

#### 2.2.1 Disc
Fields (identity-significant unless noted):
- `format` (enum: UHD, BLURAY, DVD, CD, OTHER)
- `disc_count` (integer, required; usually 1 per entry, but may allow >1 for "identical discs" sets)
- `region` (optional) — playback region (Blu-ray A/B/C, DVD 1–8, UHD often ABC). Omit for region-free.
- `features` (array, optional; identity-significant only for defined feature flags)
- `languages` (object, optional; identity-significant only if included in schema as identity-significant)

Rule of thumb:
- Disc-level details should only be identity-significant if they are reliably known and stable for the edition.

### 2.3 Region Mapping
Canon contains a mapping table for interpreting region labels and equivalences used in packaging.

- Must normalize region strings into canonical enum values.
- Region mapping data is identity-significant for any Edition referencing a region value.

### 2.4 Publisher Normalization
Canon must define a publisher registry to prevent spelling drift.

Model:
- `publisher_id` (string, stable slug)
- `display_name` (string)
- `aliases` (array of string)
- `country` (optional)
- `notes` (optional, NOT identity-significant)

Edition.publisher is stored as `publisher_id` in canonical form.

## 3. TMDB and UPC Semantics

### TMDB
- `tmdb_movie_id` is required for every Edition.
- TMDB is a reference system; changes in TMDB metadata must not change edition identity.

### UPC
- UPC is optional and may be absent for:
  - Region variants without known UPC
  - Boutique releases without consistent UPC data
  - Historical/obscure editions

Rules:
- If UPC is present, it participates in identity only if schema designates it identity-significant.
- Default recommendation: UPC does NOT participate in identity by default, because UPCs can be reused across packaging variants, or be missing in many cases.
- If later governance decides UPC must be identity-significant for certain product types, that must be an explicit schema change and migration.

## 4. Identity Hash Derivation

### 4.1 Canonicalization
Identity is derived from a canonical JSON representation of the Edition:
- Only identity-significant fields included. Explicitly exclude: `notes`, `external_refs`, and any field marked NOT identity-significant.
- All objects have keys sorted lexicographically.
- Arrays:
  - Arrays representing sets (e.g., tags) must be sorted.
  - Arrays representing ordered structures (e.g., discs) are ordered as provided and must be stable.
- Strings trimmed; normalization rules applied:
  - Publisher stored as `publisher_id`
  - Region stored as canonical enum
  - Enums serialized in stable uppercase form

### 4.2 Hash Algorithm
- Hash input: UTF-8 bytes of canonical JSON
- Hash: SHA-256
- Output: lowercase hex
- Identity string: `edition:v1:<sha256hex>`

Versioning:
- The `v1` in the identity prefix is the identity schema version, not the JSON schema version.
- Changing identity-significant rules requires a new identity version (e.g., v2) and migration story.

## 5. Stability Rules

Identity must NOT change due to:
- Field reordering
- Whitespace or formatting
- Adding non-identity-significant notes
- Updating display names or aliases
- Adding, removing, or changing `external_refs`

Identity MAY change only if:
- An identity-significant field changes (e.g., disc.region, publisher_id, release_year, packaging.type, identity-significant tags, disc structure)

## 6. Governance Scope (Explicit Decision Point)

Canon may eventually include:
- Pure metadata (editions, publishers, regions) only
OR
- Governance data such as approved match corrections

This decision affects:
- Pack contents (data types, delta strategy)
- Migration policies
- Client update expectations

Canon must not include governance data until this decision is made and versioning/migration rules are defined.

## 7. Non-Goals (for v1.x)
- Media-file matching heuristics
- Server-side file fingerprinting logic
- Any behavior that silently mutates user libraries
