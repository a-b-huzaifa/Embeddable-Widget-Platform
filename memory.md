# Agent Memory Log - FlyRank Capstone

**Project**: `flyrank-capstone-widget-platform`  
**Workspace**: FlyRank Capstone Embeddable Widget & Lead-Capture Platform  
**Stage**: Phase 5 - Fast, Cached Widget Delivery Implementation  
**Last Updated**: 2026-08-17  

---

## 1. Project Context & Objectives
- **Goal**: Build an enterprise-grade, embeddable lead capture widget and management platform backend.
- **Core Capabilities**:
  - Multi-tenant data segregation (Tenants, Users, Widgets, Submissions).
  - Strict tenant isolation enforced at both middleware and service/repository layers.
  - Boundary validation with Zod schemas ensuring clean 4xx responses.
  - High-performance, cached public delivery for widget JS bundles (`/widget.v1.js`) and JSON config (`/widgets/:id/config`).
  - Geo-targeting resolution with dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
  - Secure public endpoints for lead submission ingestion with rate limiting and domain whitelisting.
  - Granular analytics and tenant submission exporting.

---

## 2. Technical Decisions & Invariants
- **Language**: Plain JavaScript (CommonJS / Node.js 18+). No TypeScript.
- **Public Widget Delivery & Caching Strategy**:
  - `GET /widget.v1.js` (and `/widget.js`): Served from `src/public/widget.v1.js` (vanilla JS, zero dependencies, responsive form builder, auto DOM injection). Cached with `Cache-Control: public, max-age=31536000, immutable`.
  - `GET /widgets/:id/config` (and `/api/public/widgets/:id/config`): Returns public-sanitized JSON schema (title, fields, display options) excluding internal tenant IDs. Cached with `Cache-Control: public, max-age=60, s-maxage=60`.
  - Both routes are fully public (no auth required) with wildcard CORS (`Access-Control-Allow-Origin: *`).
- **Testing**: 44 passing automated tests across 4 test suites (`tests/widgetDelivery.test.js`, `tests/widgetManagement.test.js`, `tests/tenantIsolation.test.js`, `tests/apiTenantIsolation.test.js`).
- **Git Invariant**: Agent MUST NOT execute any git commands. User manages git manually.

---

## 3. Current Stage Status
- [x] Created vanilla JS client bundle `src/public/widget.v1.js`.
- [x] Implemented public sanitized config query `getPublicWidgetConfig` in `src/services/widgetService.js`.
- [x] Created `src/routes/publicRoutes.js` with tailored `Cache-Control` headers and wildcard CORS.
- [x] Mounted public routes in `src/app.js`.
- [x] Built test suite `tests/widgetDelivery.test.js` verifying caching headers, CORS, public access, config shape, and 404/400 errors.
- [x] Updated `EVIDENCE.md`, `NOTES.md`, `memory.md`, and `walkthrough.md`.

---

## 4. Next Immediate Steps
1. Implement Geo-Targeting Service (`src/services/geoService.js`) with resilient dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
2. Build public lead capture submission endpoint (`POST /api/public/widgets/:id/submit`) with payload validation, rate limiting, and domain whitelisting check.
3. Build analytics aggregation and CSV submission export endpoints.
