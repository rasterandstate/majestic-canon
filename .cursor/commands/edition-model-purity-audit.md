# Edition Model Purity Audit

## Overview

Audit the separation between:

- movie (conceptual film)
- disc_edition (specific release)
- physical_copy (owned instance)
- media_file (playback artifact)

Majestic must never collapse these layers.

---

## Steps

1. Ensure movie does not contain edition-level metadata.
2. Ensure disc_edition contains release-specific data only.
3. Ensure media_file does not alter edition identity.
4. Ensure physical_copy does not contain playback metadata.
5. Detect cross-layer leakage.

---

## Checklist

- [ ] Layer boundaries respected
- [ ] No file-level logic in edition
- [ ] No edition logic in movie
- [ ] No playback logic in physical_copy
- [ ] Clean separation maintained

---

## Output

Provide:

- Boundary violations
- Layer leakage risks
- Structural recommendations
