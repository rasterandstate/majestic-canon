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

## 2. Ontology Decisions (Frozen)

Majestic is **collector-centric** and **packaging-accurate**. These decisions are frozen before data entry.

### 2.1 UPC
**UPC participates in identity when present.**

- Different UPCs = different SKUs = different editions to collectors.
- Retailer-exclusive barcodes, packaging variants with distinct UPCs must be distinguishable.
- If UPC is absent, identity derives without it. No migration pain for editions without UPC.
- **Normalization:** trim; remove spaces and hyphens; digits-only; preserve leading zeros. Omit when empty after normalization.

### 2.2 Disc Languages
**Disc languages are NOT identity-significant.**

- Collector-level model: packaging, publisher, disc region, UPC define release.
- Language data is unstable and increases curator burden.
- Disc-content-level (languages, audio codecs, HDR) is a future fork; not v1.

### 2.3 Packaging
- `packaging.type` — identity-significant.
- `packaging.notes` — NOT identity-significant by default.
- **Future:** Structured packaging features (slipcover, embossed, numbered) preferred over freeform notes. See §2.2.2.

### 2.4 Disc Order
**Disc order is preserved as curated.**

- Arrays are ordered as provided. No auto-sort by format.
- Curator is responsible for canonical ordering. Swapping disc order changes identity.

### 2.5 Multi-Movie Editions (v4)
**Implemented v4:** Editions may reference one or more movies.
- `movies` array (min 1 entry). Sorted by `tmdb_movie_id` for canonical identity.
- Each disc may optionally include `movie_tmdb_id` to map to a specific movie.
- Legacy `movie` is migrated to `movies: [{ tmdb_movie_id }]` on load.

---

## 3. Canon Entities (v1.1)

### 3.1 MovieRef
A non-authoritative reference to the conceptual film.

Fields:
- `tmdb_movie_id` (integer, required)
- `title` (string, optional, informational only)
- `year` (integer, optional, informational only)

Rules:
- `tmdb_movie_id` is the canonical movie pointer.
- `title` and `year` must never participate in identity hashing.

### 3.2 Edition
A specific released product variant (e.g., UHD Steelbook, Criterion Blu-ray, Region B keepcase).

Core fields (identity-significant unless noted):
- `movies` (array of MovieRef, required, min 1) — sorted by `tmdb_movie_id` for identity. Legacy `movie` migrated to 1-element array.
- `release_year` (integer, required) — Year of first commercial release for that SKU, not reprint year.
- `publisher` (string, required) — Normalized via publisher registry.
- `packaging` (object, required)
  - `type` (enum: keepcase, steelbook, digipak, slipcover, boxset, other) — identity-significant
  - `notes` (string, optional, NOT identity-significant)
- `upc` (string, optional) — **Identity-significant when present.** Normalized (digits-only, leading zeros preserved). Omitted when empty.
- `discs` (array, required; min 1) — Ordered as provided. `disc_count > 1` means N identical discs (same format/region), not distinct discs.
- `edition_tags` (array, optional) — Identity-significant. Normalized: lowercase, spaces/hyphens to underscores. Use tag registry (schema/edition_tags.json) for canonical vocabulary and aliases.
- `notes` (string, optional, NOT identity-significant)
- `external_refs` (array, optional, NOT identity-significant)
  - Format: `[{ "source": "blu-ray.com", "id": "390212", "url": "https://..." }]`
  - **Normalization:** `source` lowercase slug, `id` trimmed, `url` optional.
  - Sorted by `source` then `id` for deterministic canon.json.

#### 3.2.1 Disc
Fields (identity-significant unless noted):
- `format` (enum: UHD, BLURAY, DVD, CD, OTHER)
- `disc_count` (integer, required)
- `region` (optional) — Playback region. Omit = region-free or unspecified. Use `UNKNOWN` when curator researched but could not determine. Do not collapse unknown into region-free.
- `movie_tmdb_id` (optional) — Maps this disc to a specific movie in `movies[]`. When present, must exist in edition movies. Omit when disc contains multiple films.
- `languages` — NOT identity-significant (collector-level model).

### 3.3 Region Mapping
Canon contains a mapping table. Region strings normalized to canonical enum values.

### 3.4 Publisher Normalization
Publisher registry prevents spelling drift. Edition.publisher stored as `publisher_id`.

---

## 4. Identity Hash Derivation

### 4.1 Canonicalization
- Only identity-significant fields included.
- Keys sorted lexicographically.
- Arrays: sets sorted; ordered structures (discs) as provided.
- Strings trimmed; enums in stable form.
- **UPC:** Omitted from canonical JSON when empty/undefined after normalization; otherwise included as normalized digits-only string (leading zeros preserved).

**Canonical shape example** (keys in lexicographic order; curators may model off this):

```json
{
  "discs": [
    { "disc_count": 1, "format": "UHD", "region": "REGION_FREE" }
  ],
  "edition_tags": ["director_cut"],
  "movies": [{ "tmdb_movie_id": 123 }],
  "packaging": { "type": "steelbook" },
  "publisher": "criterion",
  "release_year": 2022,
  "upc": "012345678905"
}
```

### 4.2 Hash Algorithm
- Input: UTF-8 canonical JSON
- Hash: SHA-256, lowercase hex
- Identity string: `edition:v<version>:<sha256hex>`

**Current:** New identities use v4. v1/v2/v3 are legacy only; redirects map them to v4.

Version history:
- v1: edition.region in identity
- v2: region moved to disc
- v3: UPC in identity when present
- v4: movies[] array (sorted by tmdb_movie_id). Discs may include optional movie_tmdb_id. **Current.**

---

## 5. Stability Rules

Identity must NOT change due to:
- Field reordering, whitespace, formatting
- Non-identity notes, external_refs, display names

Identity MAY change only if:
- Identity-significant field changes (publisher, release_year, packaging.type, upc, disc structure, edition_tags)

---

## 6. Future Surface Area (Deferred)

Dimensions that may require v4+ if added later:
- Slipcover present/absent
- Limited edition numbering
- Retailer exclusives
- 3D vs 2D, Dolby Vision vs HDR10, IMAX Enhanced
- Structured packaging features

Decide before ingesting large datasets. Migrations become political after scale.

---

## 7. Edition Storage (File Persistence)

**Edition identity is the primary key. Movie ID is a foreign key.**

- Each edition file is keyed by identity hash: `editions/<sha256hex>.json`
- Filename derives from identity string (e.g. `edition:v4:<hex>`) → `<hex>.json`
- Multiple editions per movie (region variants, packaging, UPC) are preserved as separate files
- File overwrites occur only when identity matches (same hash)
- Hash collision = real collision (structurally impossible with SHA-256 in practice)

---

## 8. Legacy Normalizer Freeze

**Do not modify** `normalizeUpc`, `normalizeTag`, `canonicalStringify`, or region normalization logic without either:

1. Snapshotting legacy versions for v1/v2/v3 hashing, or
2. Versioning those normalizers explicitly (e.g. `normalizeUpcV1`, `normalizeUpcV4`).

v1/v2/v3 hash computation relies on these shared functions. Changing them silently breaks redirect generation — legacy hashes will no longer match `identity_redirects.json`. The `legacyIdentitySnapshot.test.ts` fixture in canon-tools asserts v1/v2/v3 hashes never change. If that test fails, history has been rewritten.

---

## 9. Identity Redirects (Contract)

- Canon publishes `identity_redirects.json` at repo root.
- When an edition is updated and identity changes (e.g. region, UPC), the old hash is added to redirects pointing to the new hash. Clients resolve before 404.
- Maps old identity strings (edition:v1|v2|v3) to current (edition:v4).
- **Clients** must resolve requested ID via redirects before returning 404.
- Chains are flattened: all old IDs point directly to current.
- Redirect resolution is non-identity-significant metadata.
