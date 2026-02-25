# File Movement Resilience Audit

## Overview

Audit the media file registry and scanning system to ensure Majestic remains resilient to file renames, file moves, drive remounts, and library rescans.

Majestic must preserve identity independently of file path. Files serve identity. Identity does not serve files.

---

## Scope

- media_file fingerprint logic
- Library root scanning logic
- Offline detection logic
- Rescan behavior
- Duplicate detection
- File availability transitions

---

## Steps

### 1. Fingerprint Stability Review

- Verify fingerprint uses:
  - File size
  - Hash of first 16MB
  - Hash of last 16MB
- Ensure fingerprint does NOT include:
  - File path
  - Filename
  - Library root ID
- Confirm partial hash algorithm consistency.
- Ensure hashing is deterministic across platforms.

---

### 2. Path Independence Verification

- Confirm no identity logic depends on file path.
- Ensure media_file path updates do not create new records.
- Verify file rename does not generate duplicate media_file entries.
- Confirm file move across roots preserves identity.

---

### 3. Rescan Safety

- Ensure rescans:
  - Match existing fingerprints first.
  - Do not create duplicate records.
  - Do not orphan valid editions.
- Validate offline root detection:
  - If 95%+ disappear → mark root offline.
  - Do not mark individual files missing in that scenario.

---

### 4. Duplicate Detection

- Confirm fingerprint collisions are handled safely.
- Verify duplicate detection logic prevents:
  - Multiple entries for same file.
  - Incorrect linking to wrong edition.

---

## Checklist

- [ ] Fingerprint excludes path data
- [ ] Renames do not create duplicates
- [ ] Moves across roots do not create duplicates
- [ ] Rescans are idempotent
- [ ] Offline detection safe
- [ ] No fingerprint instability

---

## Output

Provide:

- Any identity risks
- Any duplication vectors
- Any scan logic weaknesses
- Risk level assessment (Low / Moderate / High)
