# API Stability Review

## Overview

Audit all server endpoints for response shape stability, route consistency, and backward compatibility.

The Apple TV client must never break due to silent API changes.

---

## Scope

- All REST endpoints
- Response schemas
- Status codes
- Error structures
- Versioning strategy

---

## Steps

### 1. Route Consistency

- Detect renamed endpoints.
- Detect removed endpoints.
- Detect route signature changes.

---

### 2. Response Shape Stability

- Compare response shapes across usage.
- Detect added/removed fields.
- Detect type changes.
- Ensure optional vs required fields are stable.

---

### 3. Status Code Consistency

- Verify correct use of:
  - 200
  - 202
  - 206
  - 400
  - 404
  - 500
- Ensure no ambiguous error responses.

---

### 4. Versioning Discipline

- Confirm API versioning strategy exists.
- Ensure breaking changes are versioned.
- Ensure no silent JSON contract changes.

---

## Checklist

- [ ] No route drift
- [ ] No unannounced response shape changes
- [ ] Correct status code usage
- [ ] Error objects consistent
- [ ] Versioning respected

---

## Output

Provide:

- Any breaking change risks
- Any inconsistent response patterns
- Recommendations for contract stabilization
- Risk level assessment
