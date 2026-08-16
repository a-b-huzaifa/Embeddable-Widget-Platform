# Capstone Definition of Done (DoD) Implementation Mapping

This document maps each capstone requirement and Definition of Done (DoD) criterion to the corresponding architectural layer and file location in the codebase.

---

## 1. Definition of Done (DoD) Checklist

> *Paste your final capstone checklist below or mark checkboxes as completed during implementation:*

- [ ] **Architecture & Scaffolding**
  - [x] Node.js + Express backend scaffolding in plain JavaScript
  - [x] Strict 4-tier layer pattern (`routes` -> `services` -> `repositories` -> `db`)
  - [x] Environment configuration management via `.env.example`
  - [x] Docker Compose PostgreSQL 16 service with persistent storage
  - [x] Database connection pool in `src/db/index.js`
  - [x] Idempotent SQL migration runner (`src/db/migrate.js`)
  - [x] Initial schema DDL with `tenants`, `users`, `widgets`, and `submissions` (`001_initial_schema.sql`)
  - [x] Multi-tenant & relational indexes (`idx_widgets_tenant_id`, `idx_submissions_tenant_id`, `idx_submissions_widget_id`, `idx_users_tenant_id`)
  - [x] Database seeding script (`src/db/seed.js`)
  - [x] Global error handling and standardized JSON response format (`src/middleware/errorHandler.js`, `src/app.js`)
- [x] **Multi-Tenancy & Authentication**
  - [x] Tenant signup and user registration (`src/routes/authRoutes.js`, `src/services/authService.js`, `src/repositories/tenantRepository.js`, `src/repositories/userRepository.js`)
  - [x] JWT authentication with bcrypt password hashing (`src/services/authService.js`, `src/middleware/auth.js`)
  - [x] Tenant isolation middleware & reusable guard (all operations scoped to authenticated `tenant_id`, 403 on cross-tenant access) (`src/middleware/tenantGuard.js`, `src/middleware/auth.js`, `src/services/widgetService.js`)
- [x] **Widget Configuration & Management**
  - [x] Multi-tenant CRUD API for widget configurations under `/api/widgets` (`src/routes/widgetRoutes.js`, `src/services/widgetService.js`, `src/repositories/widgetRepository.js`)
  - [x] Boundary validation with Zod schemas returning clean 400 JSON (`src/schemas/widgetSchemas.js`, `src/middleware/validate.js`)
  - [x] Embed snippet generation (`<script src="http://localhost:PORT/widget.js?id=WIDGET_ID"></script>`) on creation, fetch, and dedicated `GET /api/widgets/:id/embed` endpoint (`src/utils/snippetHelper.js`, `src/routes/widgetRoutes.js`)
  - [ ] Domain whitelisting validation (`allowed_domains`)
  - [x] Dynamic JSON schema storage for widget layouts/fields (`src/db/migrations/001_initial_schema.sql`, `src/repositories/widgetRepository.js`)
- [ ] **Geo-Targeting Resolution & Provider Fallback**
  - [ ] Dual-provider fallback integration (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`)
  - [ ] Resilient error recovery when provider times out or fails
  - [ ] Geo-targeted widget variant serving based on client IP
- [ ] **Public Embed & Lead Ingestion**
  - [x] Fast public endpoint for widget configuration delivery with short-lived caching (`GET /widgets/:id/config`, `src/routes/publicRoutes.js`, `src/services/widgetService.js`)
  - [x] Fast, versioned vanilla JS bundle delivery with far-future immutable caching (`GET /widget.v1.js`, `src/public/widget.v1.js`, `src/routes/publicRoutes.js`)
  - [x] Customer site simulation page for cross-origin multi-port verification (`test-site/index.html`, `npm run serve:test-site`)
  - [x] Public lead submission ingestion endpoint linked to tenant and widget (`POST /api/submissions`, `src/routes/submissionRoutes.js`, `src/services/submissionService.js`, `src/repositories/submissionRepository.js`)
  - [x] Input validation and payload sanitization via Zod boundary checks (`src/schemas/submissionSchemas.js`, `src/middleware/validate.js`)
  - [x] Explicit CORS preflight and allowed origin whitelist verification (`src/middleware/corsConfig.js`)
  - [x] Per-IP and per-widget rate limiting returning 429 Too Many Requests on burst (`src/middleware/rateLimiter.js`, `src/routes/submissionRoutes.js`)
  - [x] Honeypot anti-spam protection with silent bot discarding (`src/public/widget.v1.js`, `src/services/submissionService.js`, `src/schemas/submissionSchemas.js`)
- [ ] **Analytics & Reporting**
  - [ ] Submission tracking with IP, country, city, and referrer metadata
  - [ ] Aggregated conversion/impression metrics query
  - [ ] Export submissions to CSV endpoint
- [ ] **Testing & Quality Assurance**
  - [x] Unit tests for core services and tenant isolation guard (`tests/tenantIsolation.test.js`)
  - [x] Integration tests for authenticated endpoints (`tests/apiTenantIsolation.test.js`)
  - [x] Widget CRUD happy paths, embed snippet format/ID assertions, boundary validation failures, and cross-tenant tests (`tests/widgetManagement.test.js`)
  - [x] Public widget delivery and Cache-Control header verification tests (`tests/widgetDelivery.test.js`)
  - [x] Public lead submission ingestion, CORS preflight, and payload validation tests (`tests/submissionEndpoint.test.js`)
  - [x] Abuse protection tests: 429 burst rate limiting, recovery, and honeypot spam drop verification (`tests/abuseProtection.test.js`)
  - [x] Negative test cases for missing/invalid tokens (401) and cross-tenant access attempts (403) (`tests/tenantIsolation.test.js`, `tests/apiTenantIsolation.test.js`, `tests/widgetManagement.test.js`)

---

## 2. Implementation Layer & File Mapping

| Feature / DoD Item | Layer | Target File(s) | Description |
|---|---|---|---|
| **Server Boot & Routing** | Entry & Routes | `src/app.js`, `src/routes/index.js` | Express app initialization, routing index, global error handler |
| **Auth & Security Middleware** | Middleware | `src/middleware/auth.js`, `src/middleware/rateLimiter.js` | JWT verification, tenant scoping, IP rate limiting |
| **Tenant & User Auth** | Routes / Services / Repos | `src/routes/authRoutes.js`, `src/services/authService.js`, `src/repositories/userRepository.js` | User login/registration and password hashing |
| **Widget Management** | Routes / Services / Repos | `src/routes/widgetRoutes.js`, `src/services/widgetService.js`, `src/repositories/widgetRepository.js` | CRUD endpoints for widgets, domain verification |
| **Geo Provider Fallback** | Services | `src/services/geoService.js` | Fallback logic calling Provider A with timeout failover to Provider B |
| **Public Lead Capture API** | Routes / Services / Repos | `src/routes/publicRoutes.js`, `src/services/submissionService.js`, `src/repositories/submissionRepository.js` | Public config serving & lead submission ingestion |
| **Analytics & Export** | Services / Repos | `src/services/analyticsService.js`, `src/repositories/submissionRepository.js` | Submission aggregation and CSV formatting |
| **Database Pool & Migrations** | Database | `src/db/index.js`, `src/db/schema.sql` | Connection pool and table definitions |
| **Automated Tests** | Tests | `tests/unit/`, `tests/integration/` | Jest/Supertest test suites |
