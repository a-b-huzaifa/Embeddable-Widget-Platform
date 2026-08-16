# Agent Memory Log - FlyRank Capstone

**Project**: `flyrank-capstone-widget-platform`  
**Workspace**: FlyRank Capstone Embeddable Widget & Lead-Capture Platform  
**Stage**: Phase 7 - Public Lead Submission Endpoint Implementation  
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
  - Geo-targeting resolution with dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
  - Granular analytics and tenant submission exporting.

---

## 2. Technical Decisions & Invariants
- **Language**: Plain JavaScript (CommonJS / Node.js 18+). No TypeScript.
- **Submission Ingestion & Security**:
  - Endpoint: `POST /api/submissions` (and `/api/public/widgets/:widgetId/submit`).
  - Explicit CORS via `src/middleware/corsConfig.js`: Whitelists trusted client origins (`http://localhost:5500`, `http://127.0.0.1:5500`), handles preflight `OPTIONS` requests, and strips CORS headers from unauthorized origins.
  - Strict Zod validation (`src/schemas/submissionSchemas.js`): Rejects empty payloads, malformed types, and oversized payloads (>10KB) with **400 Bad Request** JSON.
  - Automatic tenant linkage: Resolves target `widget_id`, binds submission to the owning `tenant_id`, and stores in PostgreSQL (`submissions` table).
- **Testing**: 55 passing automated tests across 5 test suites (`tests/submissionEndpoint.test.js`, `tests/widgetDelivery.test.js`, `tests/widgetManagement.test.js`, `tests/tenantIsolation.test.js`, `tests/apiTenantIsolation.test.js`).
- **Git Invariant**: Agent MUST NOT execute any git commands. User manages git manually.

---

## 3. Current Stage Status
- [x] Defined Zod submission validation schema in `src/schemas/submissionSchemas.js`.
- [x] Configured explicit CORS middleware with preflight handling in `src/middleware/corsConfig.js`.
- [x] Implemented submission data access in `src/repositories/submissionRepository.js`.
- [x] Implemented submission service logic and tenant binding in `src/services/submissionService.js`.
- [x] Built submission route handlers in `src/routes/submissionRoutes.js` and mounted in `src/app.js`.
- [x] Built comprehensive test suite `tests/submissionEndpoint.test.js` (11 tests) verifying end-to-end storage, tenant linking, payload size bounds, 400 validations, and CORS preflights.
- [x] Updated `EVIDENCE.md`, `NOTES.md`, `memory.md`, and `walkthrough.md`.

---

## 4. Next Immediate Steps
1. Implement Geo-Targeting Service (`src/services/geoService.js`) with resilient dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
2. Implement submission rate limiting middleware (`src/middleware/rateLimiter.js`) to protect against spam attacks.
3. Build analytics aggregation and CSV submission export endpoints.
