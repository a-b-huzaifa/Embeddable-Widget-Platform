# Build Log & AI Collaboration History

This document details the stage-by-stage engineering journey of the **FlyRank Capstone Embeddable Widget & Lead-Capture Platform**, documenting where AI (Antigravity) accelerated delivery, issues encountered/fixed during development, and key technical design decisions.

---

## Stage-by-Stage Breakdown

### Stage 1: Scaffolding & Initial Architecture
- **AI Contributions**: Generated the repository directory structure (`src/routes`, `src/services`, `src/repositories`, `src/middleware`, `src/db`, `tests`), configured `.env.example`, `.gitignore`, `package.json`, and drafted initial architectural specifications (`DESIGN.md`, `README.md`, `memory.md`, `NOTES.md`).
- **Issues Encountered & Fixes**:
  - *Question on `.gitkeep`*: User inquired why `.gitkeep` was placed in empty directories. Explained standard Git convention for preserving empty folder structures.
  - *Context tracking*: Initialized `memory.md` and `NOTES.md` to persist cross-session state across agent handoffs.

### Stage 2: Dockerized PostgreSQL & Schema Migrations
- **AI Contributions**: Authored `docker-compose.yml` (PostgreSQL 16 on port 5432 with persistent volume `pgdata`), idempotent SQL migration runner `src/db/migrate.js`, schema definition `src/db/migrations/001_initial_schema.sql` (tables for `tenants`, `users`, `widgets`, `submissions` with B-tree indexes), and seed script `src/db/seed.js`.
- **Issues Encountered & Fixes**:
  - *Windows Path Spacing Quirk*: When running Jest on Windows under directories with spaces (`FlyRank Capstone Embeddable Widget & Lead-Capture Platform`), standard `jest` binary calls encountered path resolution errors. Fixed `package.json` test script to `"node ./node_modules/jest/bin/jest.js --runInBand --detectOpenHandles"`.

### Stage 3: Multi-Tenancy Authentication & Widget CRUD API
- **AI Contributions**: Built JWT authentication (`authService.js`, `authRoutes.js`), bcrypt password hashing, auth middleware (`auth.js`), reusable tenant isolation guard (`tenantGuard.js`), Zod schema boundary validation (`widgetSchemas.js`, `validate.js`), and full CRUD endpoints under `/api/widgets`.
- **Issues Encountered & Fixes**:
  - *Cross-tenant access status code*: Explicitly enforced HTTP 403 Forbidden for cross-tenant access attempts and HTTP 401 Unauthorized for missing/expired tokens.
  - *Validation error cleanliness*: Configured Zod error formatting to return clean 400 JSON without unhandled 500 exceptions.

### Stage 4: Embed Snippet Generation
- **AI Contributions**: Implemented `src/utils/snippetHelper.js` to dynamically generate ready-to-paste script tags `<script src="http://localhost:PORT/widget.js?id=WIDGET_ID"></script>` attached to widget responses and exposed via dedicated `GET /api/widgets/:id/embed`.
- **Issues Encountered & Fixes**:
  - *Snippet host agility*: Snippet generator references dynamic `process.env.APP_URL` or fallback host port so it works across development and deployment environments.

### Stage 5: Fast, Cached Widget Delivery
- **AI Contributions**: Developed vanilla JS client-side embed bundle `src/public/widget.v1.js` (zero third-party dependencies, responsive form builder, auto DOM injection), created public routes `src/routes/publicRoutes.js` (`GET /widget.v1.js` with `Cache-Control: public, max-age=31536000, immutable` and `GET /widgets/:id/config` with `Cache-Control: public, max-age=60, s-maxage=60`), and exposed public config query `getPublicWidgetConfig`.
- **Issues Encountered & Fixes**:
  - *Syntax edit correction*: During atomic file replacement in `widgetService.js`, an unclosed function bracket in `deleteWidget` was caught and corrected immediately before test execution.
  - *Data sanitization*: Ensured `getPublicWidgetConfig` strictly omits internal `tenant_id` metadata from the public config payload.

### Stage 6: Customer Site Simulation (`test-site/`)
- **AI Contributions**: Created framework-free static HTML landing page `test-site/index.html` simulating a third-party host with container placeholder and dynamic embed script tag, added `"serve:test-site"` script (`npx -y serve test-site -p 5500`), and documented cross-origin multi-port testing in `README.md`.
- **Issues Encountered & Fixes**:
  - *Local testing clarity*: Confirmed in `README.md` that no external domains, paid hosting, or CDNs are needed to test cross-origin delivery.

### Stage 7: Public Lead Submission Endpoint & Strict Validation
- **AI Contributions**: Built `POST /api/submissions` with explicit CORS whitelist (`corsConfig.js`), preflight `OPTIONS` management, strict Zod boundary validation (rejecting empty and oversized payloads >10KB with 400 Bad Request), and PostgreSQL persistence linked to the widget's `tenant_id`.
- **Issues Encountered & Fixes**:
  - *CORS Whitelisting*: Replaced open wildcard CORS on submissions with an explicit origin whitelist (`http://localhost:5500`, `http://127.0.0.1:5500`), properly handling preflight `OPTIONS` and stripping headers from disallowed origins.

### Stage 8: Abuse Protection & Rate Limiting
- **AI Contributions**: Installed `express-rate-limit`, created `src/middleware/rateLimiter.js` (per-IP and per-widget rate limiters returning 429 Too Many Requests), injected hidden honeypot field (`_hp_check`) in `widget.v1.js`, and implemented silent bot discard in `submissionService.js`.
- **Issues Encountered & Fixes**:
  - *Relative import path in tests*: `tests/abuseProtection.test.js` initially imported `'../middleware/validate'` instead of `'../src/middleware/validate'`. The runner caught the module resolution error and the path was immediately corrected.

### Stage 9: IP-to-Geo Enrichment with Dual-Provider Fallback
- **AI Contributions**: Implemented pluggable `GeoEnrichmentService` in `src/services/geoService.js` supporting `IpApiProvider` (ip-api.com) and `IpApiCoProvider` (ipapi.co) with timeout handling (2500ms), loopback IP skipping, and integrated safe side-effect enrichment into `submissionService.js`.
- **Issues Encountered & Fixes**:
  - *Safe degradation invariant*: Guaranteed that external provider outages or rate limits never cause submission requests to throw 500 or fail.

### Stage 10: Confirmation Safe Side Effect
- **AI Contributions**: Built `src/services/notificationService.js` with `sendSubmissionConfirmation` (structured console email dispatch log) and `dispatchSafeConfirmation` (resilient execution wrapper), ensuring post-storage confirmation failures never impact the 201 Created client response.
- **Issues Encountered & Fixes**:
  - *Order of operations*: Guaranteed that side effects run strictly after PostgreSQL persistence commits.

### Stage 11: Authenticated Owner Dashboard API
- **AI Contributions**: Implemented tenant-scoped SQL aggregations in `src/repositories/dashboardRepository.js` (overview counts, submissions over time time-series, per-widget leaderboards, geo distribution), created `dashboardService.js`, and exposed `/api/dashboard` behind JWT authentication.
- **Issues Encountered & Fixes**:
  - *JWT Payload Property Alignment*: In `tests/dashboardApi.test.js`, mock tokens were generated with `id` and `tenant_id` rather than `userId` and `tenantId`. `authMiddleware` returned 401. Adjusted test token generation to match the exact schema expected by `authService.js`.

### Stage 12: Final Test Consolidation & Verification
- **AI Contributions**: Verified 100% test coverage across all required criteria (CORS preflight, invalid payload, oversized payload, rate limiting, spam control, provider fallback, widget rendering, tenant isolation, safe side effect failure), created `tests/e2eIntegration.test.js`, ran the full test suite (80 passed, 0 failed), and compiled `BUILDLOG.md`, `EVIDENCE.md`, `NOTES.md`, and `memory.md`.

### Stage 13: Documentation & Manifest Finalization
- **AI Contributions**: Created `capstone.yaml` evaluation manifest, finalized `README.md` with complete ASCII architecture diagrams, exact setup/seed/run/test commands, and an honest Limitations section.

### Stage 14: Stretch Goal - Real-Time Dashboard via Server-Sent Events (SSE)
- **AI Contributions**: Implemented in-memory tenant-isolated event broker in `src/services/eventStreamService.js`, added `GET /api/dashboard/stream` supporting both Bearer headers and query-based JWT auth for browser `EventSource`, connected post-persistence live broadcast in `src/services/submissionService.js`, built dedicated test suite `tests/realtimeEvents.test.js`, and documented in `README.md`, `EVIDENCE.md`, and `NOTES.md`.

---

## Final Quality Summary
- **Test Suites**: 11 passed, 11 total (100% pass rate)
- **Automated Tests**: 86 passed, 86 total
- **Git Compliance**: Zero git commands executed by agent; all commits and pushes managed manually by the user.
