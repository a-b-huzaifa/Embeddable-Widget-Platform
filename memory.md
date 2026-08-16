# Agent Memory Log - FlyRank Capstone

**Project**: `flyrank-capstone-widget-platform`  
**Workspace**: FlyRank Capstone Embeddable Widget & Lead-Capture Platform  
**Stage**: Phase 10 - Lead Confirmation Side Effect & Safe Execution Boundary  
**Last Updated**: 2026-08-17  

---

## 1. Project Context & Objectives
- **Goal**: Build an enterprise-grade, embeddable lead capture widget and management platform backend.
- **Core Capabilities**:
  - Multi-tenant data segregation (Tenants, Users, Widgets, Submissions).
  - Strict tenant isolation enforced at both middleware and service/repository layers.
  - Boundary validation with Zod schemas ensuring clean 4xx responses.
  - Fast, cached public delivery for widget JS bundles (`/widget.v1.js`) and JSON config (`/widgets/:id/config`).
  - Standalone customer site simulation (`test-site/index.html`) running on port 5500 for cross-origin verification.
  - Public lead capture ingestion (`POST /api/submissions`) with explicit CORS preflight and allowed-origin whitelisting.
  - Abuse protection: Per-IP and Per-Widget rate limiting returning 429 Too Many Requests on burst, plus honeypot anti-spam silent bot drop.
  - IP-to-Geo Enrichment with Fallback Chain: Pluggable dual-provider fallback (`ip-api.com` -> `ipapi.co` -> graceful degradation).
  - Safe Confirmation Side Effect: Dispatches lead notifications after storage with complete error isolation (`dispatchSafeConfirmation`), ensuring submissions never fail.
  - Granular analytics and tenant submission exporting.

---

## 2. Technical Decisions & Invariants
- **Language**: Plain JavaScript (CommonJS / Node.js 18+). No TypeScript.
- **Safe Side-Effect Architecture**:
  - `src/services/notificationService.js`: Built-in zero-dependency structured console email dispatcher (extensible to Mailpit and webhooks) wrapped in `dispatchSafeConfirmation`.
  - Side effects execute post-persistence. If an unhandled exception or transport timeout occurs, it is caught, recorded in error logs, and completely isolated from the HTTP response pipeline.
- **Testing**: 72 passing automated tests across 8 test suites (`tests/confirmationSideEffect.test.js`, `tests/geoEnrichment.test.js`, `tests/abuseProtection.test.js`, `tests/submissionEndpoint.test.js`, `tests/widgetDelivery.test.js`, `tests/widgetManagement.test.js`, `tests/tenantIsolation.test.js`, `tests/apiTenantIsolation.test.js`).
- **Git Invariant**: Agent MUST NOT execute any git commands. User manages git manually.

---

## 3. Current Stage Status
- [x] Implemented `notificationService.js` with `sendSubmissionConfirmation` and `dispatchSafeConfirmation`.
- [x] Integrated post-persistence confirmation dispatching in `submissionService.js`.
- [x] Documented architectural choice and safe execution guarantee in `README.md`.
- [x] Built test suite `tests/confirmationSideEffect.test.js` verifying forced-failure error isolation and 201 Created guarantees.
- [x] Updated `EVIDENCE.md`, `NOTES.md`, `memory.md`, and `walkthrough.md`.

---

## 4. Next Immediate Steps
1. Build domain whitelisting validation (`allowed_domains`) for widgets.
2. Build analytics aggregation queries and CSV submission export endpoints.
