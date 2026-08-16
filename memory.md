# Agent Memory Log - FlyRank Capstone

**Project**: `flyrank-capstone-widget-platform`  
**Workspace**: FlyRank Capstone Embeddable Widget & Lead-Capture Platform  
**Stage**: Phase 1 - Docker PostgreSQL & Database Layer Setup  
**Last Updated**: 2026-08-17  

---

## 1. Project Context & Objectives
- **Goal**: Build an enterprise-grade, embeddable lead capture widget and management platform backend.
- **Core Capabilities**:
  - Multi-tenant data segregation (Tenants, Users, Widgets, Submissions).
  - Geo-targeting resolution with dual-provider fallback (`GEO_PROVIDER_A_URL` -> `GEO_PROVIDER_B_URL`).
  - High-performance, secure public endpoints for script configuration fetch and lead submission.
  - Granular analytics and tenant submission exporting.

---

## 2. Technical Decisions & Invariants
- **Language**: Plain JavaScript (CommonJS / Node.js 18+). No TypeScript.
- **Framework**: Express.js with a modular 4-tier layer pattern:
  - `src/routes/`: Route definitions and request parsing.
  - `src/middleware/`: Authentication (JWT), input validation, rate limiting, and CORS error handling.
  - `src/services/`: Business logic, geo fallback mechanisms, domain verification.
  - `src/repositories/`: Database interaction queries and mutations.
  - `src/db/`: Connection pool (`pg.Pool`), idempotent migration runner (`src/db/migrate.js`), seed scripts (`src/db/seed.js`), and schema DDL (`src/db/migrations/`).
  - `tests/`: Integration and unit test suites.
- **Database & Migrations**: PostgreSQL 16 via Docker Compose (`docker-compose.yml`) with persistent volume `pgdata`. Schema migrations are written in pure, transparent `.sql` files without heavy ORM bloat and executed idempotently via `npm run db:migrate`.
- **Git Invariant**: Agent MUST NOT execute any git commands (`git init`, `git add`, `git commit`, etc.). All git/GitHub operations are managed manually by the user.

---

## 3. Current Stage Status
- [x] Initialized directory structure: `src/routes`, `src/services`, `src/repositories`, `src/middleware`, `src/db`, `tests`.
- [x] Configured Docker Compose for PostgreSQL 16 with health check and named volume.
- [x] Implemented PostgreSQL connection pool in `src/db/index.js`.
- [x] Created initial schema migration `src/db/migrations/001_initial_schema.sql` defining:
  - `tenants`, `users` (auth), `widgets`, and `submissions` tables.
  - Required indexes: `idx_widgets_tenant_id`, `idx_submissions_tenant_id`, `idx_submissions_widget_id`, `idx_users_tenant_id`.
- [x] Implemented migration runner (`src/db/migrate.js`) with `schema_migrations` tracking.
- [x] Implemented seed script (`src/db/seed.js`) inserting demo tenant ('Acme Corp'), demo admin user, and sample lead-capture widget.
- [x] Added `db:migrate` and `db:seed` scripts and `pg` dependency to `package.json`.
- [x] Updated `README.md`, `NOTES.md`, and `memory.md`.

---

## 4. Next Immediate Steps
1. Configure Express server entry point in `src/app.js` with base middleware and health check routes.
2. Build repository layer (`tenantRepository.js`, `userRepository.js`, `widgetRepository.js`, `submissionRepository.js`).
3. Build authentication & tenant isolation layer (`src/middleware/auth.js`, `src/services/authService.js`).
4. Implement geo-fallback service (`src/services/geoService.js`) with provider A/B failover.
