# Agent Memory Log - FlyRank Capstone

**Project**: `flyrank-capstone-widget-platform`  
**Workspace**: FlyRank Capstone Embeddable Widget & Lead-Capture Platform  
**Stage**: Phase 6 - Plain HTML Customer Site Simulation & Multi-Port Testing  
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
  - Geo-targeting resolution with dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
  - Secure public endpoints for lead submission ingestion with rate limiting and domain whitelisting.
  - Granular analytics and tenant submission exporting.

---

## 2. Technical Decisions & Invariants
- **Language**: Plain JavaScript (CommonJS / Node.js 18+). No TypeScript.
- **Customer Website Simulation**:
  - Static HTML5 file at `test-site/index.html` (zero frameworks, pure HTML/CSS/JS).
  - Served on `http://localhost:5500` via `npm run serve:test-site` (`npx -y serve test-site -p 5500`).
  - Confirmed as the "customer site" referenced throughout the capstone brief (no real hosting, domain, or CDN required).
  - Supports dynamic query parameter swapping: `http://localhost:5500/?widgetId=YOUR_WIDGET_UUID`.
- **Testing**: 44 passing automated tests across 4 test suites (`tests/widgetDelivery.test.js`, `tests/widgetManagement.test.js`, `tests/tenantIsolation.test.js`, `tests/apiTenantIsolation.test.js`).
- **Git Invariant**: Agent MUST NOT execute any git commands. User manages git manually.

---

## 3. Current Stage Status
- [x] Created `test-site/index.html` customer site simulation.
- [x] Added `serve:test-site` script to `package.json`.
- [x] Updated `README.md` with multi-port cross-origin verification guide and customer site clarification.
- [x] Updated `EVIDENCE.md`, `NOTES.md`, `memory.md`, and `walkthrough.md`.

---

## 4. Next Immediate Steps
1. Implement Geo-Targeting Service (`src/services/geoService.js`) with resilient dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
2. Build public lead capture submission endpoint (`POST /api/public/widgets/:id/submit`) with payload validation, rate limiting, and domain whitelisting check.
3. Build analytics aggregation and CSV submission export endpoints.
