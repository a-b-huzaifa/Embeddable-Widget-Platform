# FlyRank Capstone - Embeddable Widget & Lead-Capture Platform

Enterprise-grade backend platform for managing multi-tenant embeddable lead capture widgets, fast cached script delivery, resilient geo-targeting with provider fallbacks, abuse protection, and real-time analytics.

---

## Overview

The Embeddable Widget & Lead-Capture Platform allows businesses and website owners (tenants) to generate customizable lead-capture widgets that can be embedded onto third-party sites via a single lightweight `<script>` tag.

### Core Capabilities
- **Multi-Tenancy & Auth**: JWT authentication with strict tenant-scoped isolation across all resources.
- **Dynamic Widget Management**: Full CRUD for widget configurations (JSON fields, themes, triggers, positions).
- **Fast, Cached Delivery**: Zero-dependency vanilla JS bundle (`/widget.v1.js`) with far-future immutable caching and short-lived config delivery.
- **Abuse Protection & Spam Prevention**: Per-IP and per-widget rate limiting (429 burst protection) plus honeypot anti-spam silent bot drop.
- **Resilient IP-to-Geo Fallback**: Pluggable dual-provider geolocation (`ip-api.com` -> `ipapi.co` -> graceful degradation) that never fails client requests.
- **Safe Confirmation Side Effects**: Post-persistence notification dispatch with total error isolation.
- **Owner Dashboard & Analytics**: Aggregated KPIs, time-series velocity, per-widget leaderboards, and geo-demographic breakdown.

---

## System Architecture

```
+---------------------------------------------------------------------------------------------------+
|                                      CLIENT BROWSER / HOST SITE                                    |
|   - Loads: <script src="http://localhost:3000/widget.v1.js?id=WIDGET_ID"></script>                |
|   - Fetches Config: GET /widgets/:id/config                                                       |
|   - Submits Lead:   POST /api/submissions                                                         |
+---------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
|                                        EXPRESS HTTP SERVER                                        |
|                                                                                                   |
|  ┌────────────────────────┐   ┌────────────────────────┐   ┌───────────────────────────────────┐  |
|  │    CORS Middleware     │   │   Rate Limiter (429)   │   │       JWT Auth Middleware         │  |
|  │ (Origin Whitelist/Opt) │   │ (Per-IP & Per-Widget)  │   │  (Tenant Scoping & 401/403 Guard) │  |
|  └───────────┬────────────┘   └───────────┬────────────┘   └─────────────────┬─────────────────┘  |
|              │                            │                                  │                    |
|              ▼                            ▼                                  ▼                    |
|  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │                                      ROUTES LAYER                                           │  |
|  │  - Public Delivery:  GET /widget.v1.js, GET /widgets/:id/config                             │  |
|  │  - Lead Ingestion:   POST /api/submissions                                                  │  |
|  │  - Authentication:   POST /api/v1/auth/register, POST /api/v1/auth/login, GET /me          │  |
|  │  - Widget CRUD:      GET, POST, PUT, DELETE /api/widgets, GET /api/widgets/:id/embed        │  |
|  │  - Owner Dashboard:  GET /api/dashboard/overview, /submissions-over-time, /widgets, /geo   │  |
|  └──────────────────────────────────────────────┬──────────────────────────────────────────────┘  |
|                                                 │                                                 |
|                                                 ▼                                                 |
|  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │                                     SERVICES LAYER                                          │  |
|  │  - WidgetService       - SubmissionService (Honeypot + Side Effects)                        │  |
|  │  - AuthService (JWT)   - GeoEnrichmentService (Dual-Provider Fallback Chain)                │  |
|  │  - DashboardService    - NotificationService (Simulated Email / Webhooks)                   │  |
|  └──────────────────────────────────────────────┬──────────────────────────────────────────────┘  |
|                                                 │                                                 |
|                                                 ▼                                                 |
|  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐  |
|  │                                  REPOSITORIES LAYER (SQL)                                   │  |
|  │  - widgetRepository      - submissionRepository                                             │  |
|  │  - tenantRepository      - userRepository       - dashboardRepository                       │  |
|  └──────────────────────────────────────────────┬──────────────────────────────────────────────┘  |
+─────────────────────────────────────────────────┼─────────────────────────────────────────────────+
                                                  │
                         ┌────────────────────────┴────────────────────────┐
                         ▼                                                 ▼
        ┌───────────────────────────────────┐             ┌───────────────────────────────────┐
        │      PostgreSQL 16 Database       │             │     External Geo Providers        │
        │  - tenants, users, widgets,       │             │  - Primary: ip-api.com            │
        │    submissions tables & indexes   │             │  - Fallback: ipapi.co             │
        └───────────────────────────────────┘             └───────────────────────────────────┘
```

---

## Embed Flow & Integration Lifecycle

```
+-------------------------------------------------------------------------------+
|                             Client Browser / Site                             |
+-------------------------------------------------------------------------------+
        │                                                               │
1. Load Snippet Tag                                             4. Ingest Lead
   <script src=".../widget.v1.js?id=WIDGET_ID">                    POST /api/submissions
        │                                                               ▲
        ▼                                                               │
+------------------------------------+          +-------------------------------+
| 2. Fetch Public Config             |          | 3. Render Widget UI           |
|    GET /widgets/:id/config         |--------->|    - Theme / Dynamic Fields   |
|    - Fast delivery (short cache)   |          |    - Auto DOM Mount           |
+------------------------------------+          +-------------------------------+
                                                                │
                                                                ▼
                                                +-------------------------------+
                                                | User submits form data        |
                                                +-------------------------------+
```

1. **Snippet Placement**: The tenant creates a widget and copies the ready-to-paste embed snippet:
   ```html
   <script src="http://localhost:3000/widget.js?id=YOUR_WIDGET_UUID"></script>
   ```
2. **Config Fetch**: On page load, the script calls `GET /widgets/:id/config` (cached with `Cache-Control: public, max-age=60`).
3. **Dynamic Render**: The vanilla script builds the DOM structure according to the JSON fields, themes, and display settings.
4. **Lead Ingestion & Telemetry**: When a visitor submits the form, payload data is securely sent to `POST /api/submissions`, validated, rate-limited, enriched with geolocation data, stored in PostgreSQL, and confirmed via safe side effects.

---

## Setup & Run

### Prerequisites
- Node.js (v18+ recommended)
- npm
- Docker & Docker Compose

### 1. Installation & Environment Configuration
```bash
# Clone and install dependencies
npm install

# Setup environment variables (pre-configured for docker-compose)
cp .env.example .env
```

### 2. Start PostgreSQL via Docker
```bash
docker compose up -d
```
*(Verify container status: `docker compose ps`)*

### 3. Run Database Migrations & Seed
```bash
# Run schema migrations (creates tenants, users, widgets, submissions tables & indexes)
npm run db:migrate

# Seed demo tenant ('Acme Corp'), demo admin user, and sample lead capture widget
npm run db:seed
```

### 4. Run Application
```bash
# Development Mode (auto-reload)
npm run dev

# Production Mode
npm start
```

### 5. Stop Database Container
```bash
docker compose down
```

---

## Testing

Run the full automated test suite (unit, integration, and E2E probes):
```bash
npm test
```

### Test Suite Summary:
- **10 Test Suites / 80 Passing Tests**
- Covers: CORS preflights, invalid payload schemas, oversized payload rejection, rate limiting burst recovery, honeypot anti-spam silent discard, IP-to-geo provider fallback, public widget delivery, multi-tenant isolation, safe side-effect failure isolation, and full end-to-end integration lifecycle.

---

## Customer Site Simulation (`test-site/`) & Cross-Origin Verification

The project includes a standalone static HTML website simulation at [`test-site/index.html`](file:///d:/FlyRank%20Internship/FlyRank%20Capstone%20Embeddable%20Widget%20&%20Lead-Capture%20Platform/test-site/index.html).

> [!NOTE]
> **Customer Site Context**: This represents the **"customer site"** referenced in the capstone brief. **No real hosting, domain registration, or external CDN is needed.**

### Cross-Origin Verification Steps
1. Ensure the API is running on port **3000**:
   ```bash
   npm run dev
   ```
2. In a separate terminal, serve the customer test site on port **5500**:
   ```bash
   npm run serve:test-site
   ```
3. Open `http://localhost:5500` in your browser.
4. Inspect Network DevTools:
   - `http://localhost:3000/widget.v1.js` loads cross-origin with `Cache-Control: public, max-age=31536000, immutable`.
   - `http://localhost:3000/widgets/:id/config` loads cross-origin with `Cache-Control: public, max-age=60, s-maxage=60`.
5. Dynamic widget testing: Swap widget IDs via query param (e.g. `http://localhost:5500/?widgetId=e4b281f9-9065-4f46-92da-246e9dfd0891`).

---

## Confirmation Side Effects & Safe Execution Architecture

When a submission is received, the system follows a resilient two-phase execution lifecycle:
1. **Critical Work (Synchronous & Mandatory)**: Boundary validation, honeypot spam detection, tenant resolution, safe IP-to-geo enrichment, and PostgreSQL persistence in `submissions`.
2. **Safe Side Effect (Post-Persistence)**: Upon successful database commit, the system triggers `notificationService.sendSubmissionConfirmation`.

### Choice of Confirmation Mechanism
- **Built-in Console Mail Logger (`src/services/notificationService.js`)**: Emits structured email dispatch logs containing recipient, subject, widget title, lead payload, and timestamp.
- **Design Rationale**: A built-in zero-dependency console mail dispatcher provides immediate, transparent observability during local development and evaluation without requiring external SMTP credentials or brittle third-party network dependencies. Pluggable adapters allow seamless forwarding to Mailpit (`localhost:1025`) or tenant webhook URLs.
- **Safe Isolation Guarantee**: Side effects are wrapped in a resilient execution boundary (`dispatchSafeConfirmation`). If a webhook or SMTP transport throws an unhandled exception or connection timeout, the error is safely caught and logged to error telemetry, **guaranteeing the submission remains persisted and the client receives a 201 Created response**.

---

## Limitations

- **Multi-Region Clustering**: Database replication is configured as a single primary instance; active-active multi-region clustering is not included in this release.
- **Asynchronous Queue Broker**: Post-submission confirmations run in an in-process safe execution wrapper rather than an external distributed message broker (e.g. RabbitMQ or Redis BullMQ).
- **Dynamic Bundler Compilation**: Widget scripts are served as an optimized pre-bundled vanilla JS asset rather than dynamically compiled per-tenant at edge nodes.
- **Dead-Letter Webhook Retries**: Webhook delivery does not currently persist undelivered payloads to an explicit dead-letter storage table after retry exhaustion.
