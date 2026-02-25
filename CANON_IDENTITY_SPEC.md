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

### 2.5 Box Sets
**Future vNext:** Box sets containing multiple films require explicit definition:
- Either separate editions per movie, or
- A special multi-movie edition type.

Current model: One Edition → one MovieRef. Multi-film box sets not yet modeled.

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
- `movie` (MovieRef, required) — `tmdb_movie_id` participates in identity.
- `release_year` (integer, required) — Year of this edition's release.
- `publisher` (string, required) — Normalized via publisher registry.
- `packaging` (object, required)
  - `type` (enum: keepcase, steelbook, digipak, slipcover, boxset, other) — identity-significant
  - `notes` (string, optional, NOT identity-significant)
- `upc` (string, optional) — **Identity-significant when present.** Different UPC = different edition.
- `discs` (array, required; min 1) — Ordered as provided.
- `edition_tags` (array, optional) — Identity-significant.
- `notes` (string, optional, NOT identity-significant)
- `external_refs` (array, optional, NOT identity-significant)
  - Format: `[{ "source": "blu-ray.com", "id": "390212", "url": "https://..." }]`
  - **Normalization:** `source` lowercase slug, `id` trimmed, `url` optional.
  - Sorted by `source` then `id` for deterministic canon.json.

#### 3.2.1 Disc
Fields (identity-significant unless noted):
- `format` (enum: UHD, BLURAY, DVD, CD, OTHER)
- `disc_count` (integer, required)
- `region` (optional) — Playback region. Omit for region-free.
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

### 4.2 Hash Algorithm
- Input: UTF-8 canonical JSON
- Hash: SHA-256, lowercase hex
- Identity string: `edition:v3:<sha256hex>`

Version history:
- v1: edition.region in identity
- v2: region moved to disc
- v3: UPC in identity when present

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
