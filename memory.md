# Agent Memory Log - FlyRank Capstone

**Project**: `flyrank-capstone-widget-platform`  
**Workspace**: FlyRank Capstone Embeddable Widget & Lead-Capture Platform  
**Stage**: Phase 4 - Embed Snippet Generation & Documentation  
**Last Updated**: 2026-08-17  

---

## 1. Project Context & Objectives
- **Goal**: Build an enterprise-grade, embeddable lead capture widget and management platform backend.
- **Core Capabilities**:
  - Multi-tenant data segregation (Tenants, Users, Widgets, Submissions).
  - Strict tenant isolation enforced at both middleware and service/repository layers.
  - Boundary validation with Zod schemas ensuring clean 4xx responses.
  - Ready-to-paste embed script snippet generation (`<script src="http://localhost:PORT/widget.js?id=WIDGET_ID"></script>`).
  - Geo-targeting resolution with dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
  - High-performance, secure public endpoints for script configuration fetch and lead submission.
  - Granular analytics and tenant submission exporting.

---

## 2. Technical Decisions & Invariants
- **Language**: Plain JavaScript (CommonJS / Node.js 18+). No TypeScript.
- **Validation**: `zod` schema validation at the HTTP boundary via `src/middleware/validate.js`. Invalid data returns formatted **400 Bad Request** JSON with field-level issues, never leaking unhandled 500s.
- **Embed Snippet Generation**:
  - Centralized in `src/utils/snippetHelper.js`.
  - Automatically attached to widget responses upon creation (`POST /api/widgets`), retrieval (`GET /api/widgets/:id`), and listing (`GET /api/widgets`).
  - Dedicated endpoint: `GET /api/widgets/:id/embed` returning `{ success: true, data: { widget_id, snippet } }`.
- **Testing**: 36 passing automated tests across 3 test suites (`tests/widgetManagement.test.js`, `tests/tenantIsolation.test.js`, `tests/apiTenantIsolation.test.js`).
- **Git Invariant**: Agent MUST NOT execute any git commands. User manages git manually.

---

## 3. Current Stage Status
- [x] Implemented embed snippet generator in `src/utils/snippetHelper.js`.
- [x] Integrated snippet attachment in `src/services/widgetService.js`.
- [x] Implemented `GET /api/widgets/:id/embed` endpoint in `src/routes/widgetRoutes.js`.
- [x] Documented 4-step embed flow in `README.md` referencing `DESIGN.md`.
- [x] Added automated tests asserting snippet format, widget ID accuracy, and cross-tenant protection in `tests/widgetManagement.test.js`.
- [x] Updated `EVIDENCE.md`, `NOTES.md`, `memory.md`, and `walkthrough.md`.

---

## 4. Next Immediate Steps
1. Implement Geo-Targeting Service (`src/services/geoService.js`) with resilient dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
2. Build public embed configuration serving endpoint (`GET /api/v1/public/widgets/:widgetKey/config` or `/api/public/widgets/:widgetKey/config`) with domain whitelisting check.
3. Build public lead capture submission endpoint (`POST /api/v1/public/widgets/:widgetKey/submit`) with payload validation & rate limiting.
