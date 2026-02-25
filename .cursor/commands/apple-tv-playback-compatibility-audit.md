# Apple TV Playback Compatibility Audit

## Overview

Audit playback prediction, stream preparation, and adaptive handling logic to ensure reliable Apple TV playback.

Majestic must prioritize direct play and predictable adaptive preparation without silent degradation.

---

## Scope

- playback_prediction logic
- probe_state handling
- Prewarm endpoint
- Adaptive build logic
- Stream endpoint compatibility

---

## Steps

### 1. Playback Classification

- Verify direct vs adaptive classification is deterministic.
- Confirm MKV + TrueHD logic is handled correctly.
- Ensure no silent transcoding logic exists.
- Validate prediction logic matches Apple TV AVPlayer capabilities.

---

### 2. Prewarm Logic Review

- Confirm prewarm:
  - Only triggers when needed.
  - Reuses build locks.
  - Cleans up stale builds.
- Ensure no resource leaks.
- Validate idempotency.

---

### 3. Stream Validation

- Confirm:
  - Proper 200 / 202 / 206 handling.
  - Correct Content-Type headers.
  - Proper Range support.
- Verify abort path does not leak file descriptors.

---

### 4. Error Handling

- Ensure user-facing errors are:
  - Explicit
  - Deterministic
  - Non-silent
- Confirm no “best guess” fallback.

---

## Checklist

- [ ] Deterministic playback prediction
- [ ] No silent format coercion
- [ ] Prewarm safe and idempotent
- [ ] Stream endpoint AVPlayer-compatible
- [ ] No FD or memory leaks

---

## Output

Provide:

- Any playback instability vectors
- Any mismatches with Apple TV capabilities
- Resource safety risks
- Risk level assessment
