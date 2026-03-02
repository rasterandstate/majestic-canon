# Repo Interrogation

Perform a full interrogation of this repository as if preparing it for public release or production use.

This is not a code explanation. This is a readiness, integrity, and risk audit.

Produce: `docs/REPO_INTERROGATION_REPORT.md`

Be specific. Cite exact files and code references (paths + function names).

---

## 1. Identity & Purpose

- What is this repository responsible for?
- Is its purpose clearly defined?
- Does it overlap responsibility with other repos in the workspace?
- Is its scope too broad or too vague?

Output:
- Clear 1–3 sentence description
- List of primary responsibilities
- List of secondary responsibilities
- Architectural boundary assessment

---

## 2. Public Surface Area

List all externally callable surfaces:

- HTTP endpoints
- CLI commands
- Exported library APIs
- Background jobs
- WebSocket/SSE streams
- File system writes
- Cron tasks

For each:
- Is it authenticated?
- Is it authorized?
- Is input validated?
- Is output sanitized?
- Is rate limiting applied?
- Is it documented?

Flag:
- Surfaces callable without auth
- Debug endpoints exposed
- Endpoints that mutate data

---

## 3. Authentication & Authorization (if applicable)

- Is auth enforced server-side?
- Are role/permission checks centralized?
- Is privilege derived from trusted source?
- Are there any UI-only protections?
- Are tokens ever logged?
- Are sessions revocable?

If auth is optional:
- What happens when auth is disabled?
- Does the system fail open or fail closed?

---

## 4. Data Integrity & Concurrency

- How is data stored? (DB, files, git, memory)
- Are writes atomic?
- Are race conditions possible?
- Is optimistic locking used?
- What happens on concurrent mutation?
- Are destructive actions reversible?
- Is there an audit trail?

Flag:
- Last-write-wins behavior
- Missing rollback paths
- Silent overwrite risks

---

## 5. Configuration & Environment

- List required env vars.
- Are they validated at startup?
- Does the app fail fast if misconfigured?
- Are secrets loaded securely?
- Are dev and prod behaviors clearly separated?

Flag:
- Implicit defaults
- Fallback paths that hide misconfiguration
- HTTP allowed in production

---

## 6. Security Posture

- Are security headers set? (if web app)
- Is CSP present?
- Any use of eval / dynamic execution?
- Any raw HTML injection?
- Any unbounded file uploads?
- Any unsafe deserialization?
- Are error responses leaking sensitive data?

Flag:
- Missing CSP
- Wildcard CORS
- Broad connect-src
- Unauthenticated file access

---

## 7. Operational Readiness

- Is logging structured?
- Are errors captured?
- Are there health checks?
- Is deployment documented?
- Is there a launch checklist?
- Is backup strategy documented (if stateful)?

Flag:
- console.log scattered
- No log levels
- No startup validation
- No deployment doc

---

## 8. Testing Discipline

- How many test files?
- What is covered?
- Are tests meaningful or shallow?
- Are there skipped tests?
- Are tests deterministic?
- Does CI likely pass?

Flag:
- Red CI
- it.skip without rationale
- Snapshot overuse without validation
- No integration tests for critical flows

---

## 9. Dependency & Supply Risk

- List top-level dependencies.
- Any outdated or high-risk packages?
- Any unnecessary dependencies?
- Any transitive risk (eval, template engines, file parsers)?

Flag:
- Large unneeded dependencies
- Abandoned libraries
- Security-sensitive packages

---

## 10. Production Readiness Verdict

Provide:

- GO / NO-GO for:
  - Internal use
  - Paying customers
  - Internet exposure
- List:
  - Must fix before release
  - Should fix before scaling
  - Can defer
- Confidence score (0–100)

---

## Constraints

- Do not propose a rewrite.
- Do not suggest cloud services unless clearly necessary.
- Keep recommendations surgical and proportionate.
- Cite exact files for every claim.

Be ruthless but precise.
