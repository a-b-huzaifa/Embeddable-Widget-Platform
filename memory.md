# Agent Memory Log - FlyRank Capstone

**Project**: `flyrank-capstone-widget-platform`  
**Workspace**: FlyRank Capstone Embeddable Widget & Lead-Capture Platform  
**Stage**: Phase 8 - Abuse Protection & Rate Limiting Implementation  
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
  - Geo-targeting resolution with dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
  - Granular analytics and tenant submission exporting.

---

## 2. Technical Decisions & Invariants
- **Language**: Plain JavaScript (CommonJS / Node.js 18+). No TypeScript.
- **Abuse Protection & Rate Limiting**:
  - Rate limiting via `express-rate-limit` in `src/middleware/rateLimiter.js`:
    - `submissionIpLimiter`: Limits submission rate per client IP.
    - `submissionWidgetLimiter`: Limits submission rate per specific widget ID to prevent targeted floods.
    - Returns **429 Too Many Requests** JSON response without leaking internals.
  - Honeypot anti-spam control:
    - Injected into DOM as `<input type="text" name="_hp_check" ...>` in `src/public/widget.v1.js`.
    - Checked in `src/services/submissionService.js`. If filled, the submission is silently dropped (returns success to the bot, but bypasses database write completely).
- **Testing**: 60 passing automated tests across 6 test suites (`tests/abuseProtection.test.js`, `tests/submissionEndpoint.test.js`, `tests/widgetDelivery.test.js`, `tests/widgetManagement.test.js`, `tests/tenantIsolation.test.js`, `tests/apiTenantIsolation.test.js`).
- **Git Invariant**: Agent MUST NOT execute any git commands. User manages git manually.

---

## 3. Current Stage Status
- [x] Installed and configured `express-rate-limit` in `src/middleware/rateLimiter.js`.
- [x] Added `_hp_check` honeypot support in `src/schemas/submissionSchemas.js`.
- [x] Implemented honeypot detection and silent discard in `src/services/submissionService.js`.
- [x] Injected hidden honeypot input in `src/public/widget.v1.js`.
- [x] Applied rate limiters to `src/routes/submissionRoutes.js`.
- [x] Created test suite `tests/abuseProtection.test.js` verifying 429 burst rate limiting, recovery, and honeypot spam drops.
- [x] Updated `EVIDENCE.md`, `NOTES.md`, `memory.md`, and `walkthrough.md`.

---

## 4. Next Immediate Steps
1. Implement Geo-Targeting Service (`src/services/geoService.js`) with resilient dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
2. Build domain whitelisting validation (`allowed_domains`) for widgets.
3. Build analytics aggregation and CSV submission export endpoints.
