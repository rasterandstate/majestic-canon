# Performance Budget Monitor

## Overview

Audit growth in performance footprint over time.

Majestic must remain efficient on modest NAS hardware.

---

## Scope

- Server memory usage
- Startup time
- API latency
- Rust binary size
- Client bundle size

---

## Steps

1. Measure server RSS baseline.
2. Measure API response latency.
3. Measure Rust binary size.
4. Measure client bundle size.
5. Detect regressions beyond 10% thresholds.

---

## Checklist

- [ ] Memory within expected range
- [ ] No latency regressions
- [ ] Binary growth controlled
- [ ] Bundle size controlled
- [ ] No performance drift

---

## Output

Provide:

- Current performance metrics
- Regressions detected
- Risk level assessment
