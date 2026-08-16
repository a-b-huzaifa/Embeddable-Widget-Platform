# Agent Memory Log - FlyRank Capstone

**Project**: `flyrank-capstone-widget-platform`  
**Workspace**: FlyRank Capstone Embeddable Widget & Lead-Capture Platform  
**Stage**: Phase 3 - Authenticated Widget Management API Implementation  
**Last Updated**: 2026-08-17  

---

## 1. Project Context & Objectives
- **Goal**: Build an enterprise-grade, embeddable lead capture widget and management platform backend.
- **Core Capabilities**:
  - Multi-tenant data segregation (Tenants, Users, Widgets, Submissions).
  - Strict tenant isolation enforced at both middleware and service/repository layers.
  - Boundary validation with Zod schemas ensuring clean 4xx responses.
  - Geo-targeting resolution with dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
  - High-performance, secure public endpoints for script configuration fetch and lead submission.
  - Granular analytics and tenant submission exporting.

---

## 2. Technical Decisions & Invariants
- **Language**: Plain JavaScript (CommonJS / Node.js 18+). No TypeScript.
- **Validation**: `zod` schema validation at the HTTP boundary via `src/middleware/validate.js`. Invalid data returns formatted **400 Bad Request** JSON with field-level issues, never leaking unhandled 500s.
- **Layered Architecture**: Strict `route` -> `service` -> `repository` separation. Routes handle only parsing/validation and response formatting; services enforce business logic and tenant isolation guards; repositories execute SQL queries.
- **Widget Management**: Endpoints available at `/api/widgets` and `/api/v1/widgets` behind `authMiddleware`.
- **Testing**: 33 passing automated tests across 3 test suites (`tests/widgetManagement.test.js`, `tests/tenantIsolation.test.js`, `tests/apiTenantIsolation.test.js`).
- **Git Invariant**: Agent MUST NOT execute any git commands. User manages git manually.

---

## 3. Current Stage Status
- [x] Installed `zod` and built boundary validation middleware (`src/middleware/validate.js`).
- [x] Defined comprehensive widget validation schemas in `src/schemas/widgetSchemas.js`.
- [x] Mounted full widget management CRUD API under `/api/widgets` and `/api/v1/widgets`.
- [x] Verified strict 3-tier layering (`widgetRoutes.js` -> `widgetService.js` -> `widgetRepository.js`).
- [x] Created `tests/widgetManagement.test.js` covering CRUD happy paths, Zod validation failures (400), and cross-tenant access rejection (403).
- [x] Created `EVIDENCE.md` with complete test output logs and HTTP curl transcripts for all DoD boxes.
- [x] Updated `NOTES.md`, `memory.md`, and `walkthrough.md`.

---

## 4. Next Immediate Steps
1. Implement Geo-Targeting Service (`src/services/geoService.js`) with resilient dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
2. Build public embed configuration serving endpoint (`GET /api/v1/public/widgets/:widgetKey/config` or `/api/public/widgets/:widgetKey/config`) with domain whitelisting check.
3. Build public lead capture submission endpoint (`POST /api/v1/public/widgets/:widgetKey/submit`) with payload validation & rate limiting.
