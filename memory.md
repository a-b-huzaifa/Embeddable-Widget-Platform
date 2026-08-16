# Agent Memory Log - FlyRank Capstone

**Project**: `flyrank-capstone-widget-platform`  
**Workspace**: FlyRank Capstone Embeddable Widget & Lead-Capture Platform  
**Stage**: Phase 2 - Authentication & Tenant Isolation Implementation  
**Last Updated**: 2026-08-17  

---

## 1. Project Context & Objectives
- **Goal**: Build an enterprise-grade, embeddable lead capture widget and management platform backend.
- **Core Capabilities**:
  - Multi-tenant data segregation (Tenants, Users, Widgets, Submissions).
  - Strict tenant isolation enforced at both middleware and service/repository layers.
  - Geo-targeting resolution with dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
  - High-performance, secure public endpoints for script configuration fetch and lead submission.
  - Granular analytics and tenant submission exporting.

---

## 2. Technical Decisions & Invariants
- **Language**: Plain JavaScript (CommonJS / Node.js 18+). No TypeScript.
- **Authentication**: JWT (`jsonwebtoken`) + password hashing via `bcryptjs` (pure JS, zero native compile friction on Windows).
- **Tenant Isolation**:
  - `src/middleware/auth.js` verifies token and binds `req.tenantId` & `req.user`. Missing/invalid tokens return **401 Unauthorized**.
  - `src/middleware/tenantGuard.js` exports `assertTenantOwnership(resourceTenantId, currentTenantId)` and `tenantGuard`. Cross-tenant attempts throw `ForbiddenError` returning **403 Forbidden**.
  - `src/repositories/widgetRepository.js` provides tenant-scoped queries.
  - `src/services/widgetService.js` guards all read, update, and delete mutations.
- **Testing**: Automated unit & integration test suites in `tests/tenantIsolation.test.js` and `tests/apiTenantIsolation.test.js` (19 passing test cases verifying 401 unauthenticated & 403 cross-tenant isolation).
- **Git Invariant**: Agent MUST NOT execute any git commands. User manages git manually.

---

## 3. Current Stage Status
- [x] Implemented JWT authentication endpoints (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`).
- [x] Implemented `authMiddleware` enforcing 401 on missing/invalid/expired tokens and attaching `req.tenantId`.
- [x] Implemented reusable tenant isolation guard `assertTenantOwnership` enforcing 403 on cross-tenant access.
- [x] Implemented tenant-isolated widget management CRUD endpoints (`/api/v1/widgets`).
- [x] Built comprehensive automated test suite (19 tests) proving:
  - Missing/invalid tokens return 401.
  - Tenant A can access and modify their own widget (200).
  - Tenant B cannot read, update, or delete Tenant A's widget (403).
- [x] Updated `NOTES.md`, `memory.md`, and `walkthrough.md`.

---

## 4. Next Immediate Steps
1. Implement Geo-Targeting Service (`src/services/geoService.js`) with resilient dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
2. Build public embed configuration serving endpoint (`GET /api/v1/public/widgets/:widgetKey/config`) with domain whitelisting check.
3. Build public lead capture submission endpoint (`POST /api/v1/public/widgets/:widgetKey/submit`) with payload validation & rate limiting.
