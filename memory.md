# Agent Memory Log - FlyRank Capstone

**Project**: `flyrank-capstone-widget-platform`  
**Workspace**: FlyRank Capstone Embeddable Widget & Lead-Capture Platform  
**Stage**: Phase 9 - IP-to-Geo Enrichment with Fallback Chain Implementation  
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
  - IP-to-Geo Enrichment with Fallback Chain: Pluggable dual-provider fallback (`ip-api.com` -> `ipapi.co` -> graceful degradation) that enriches submissions without ever blocking or failing requests.
  - Granular analytics and tenant submission exporting.

---

## 2. Technical Decisions & Invariants
- **Language**: Plain JavaScript (CommonJS / Node.js 18+). No TypeScript.
- **IP-to-Geo Enrichment & Fallback Strategy**:
  - Pluggable service in `src/services/geoService.js` with `IpApiProvider` (Provider A) and `IpApiCoProvider` (Provider B).
  - Safe side-effect model: Lookups run with timeouts (2500ms). If Provider A fails, Provider B is queried. If both fail, submission is stored with telemetry metadata (`client_ip`, `referrer`) and without geo data.
  - The HTTP request always returns **201 Created** regardless of external network conditions.
  - Zero external network requests in automated tests (mocked providers).
- **Testing**: 67 passing automated tests across 7 test suites (`tests/geoEnrichment.test.js`, `tests/abuseProtection.test.js`, `tests/submissionEndpoint.test.js`, `tests/widgetDelivery.test.js`, `tests/widgetManagement.test.js`, `tests/tenantIsolation.test.js`, `tests/apiTenantIsolation.test.js`).
- **Git Invariant**: Agent MUST NOT execute any git commands. User manages git manually.

---

## 3. Current Stage Status
- [x] Created pluggable geo provider architecture in `src/services/geoService.js`.
- [x] Integrated fallback chain in `src/services/submissionService.js`.
- [x] Built comprehensive test suite `tests/geoEnrichment.test.js` verifying Provider A success, Provider B fallback, both-down graceful degradation, and loopback IP skipping.
- [x] Updated `EVIDENCE.md`, `NOTES.md`, `memory.md`, and `walkthrough.md`.

---

## 4. Next Immediate Steps
1. Build domain whitelisting validation (`allowed_domains`) for widgets.
2. Build analytics aggregation queries and CSV submission export endpoints.
