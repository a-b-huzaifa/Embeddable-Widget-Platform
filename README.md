# FlyRank Capstone - Embeddable Widget & Lead-Capture Platform

Backend service for managing embeddable lead capture widgets, multi-tenant widget configurations, geo-targeted form serving, submission routing, and analytics.

---

## Overview

The Embeddable Widget & Lead-Capture Platform allows tenants (businesses and website owners) to generate customizable lead-capture widgets that can be embedded onto third-party sites via a lightweight script. The platform handles:
- Multi-tenant authentication and widget management
- Geo-targeted widget presentation and provider fallback
- Lead submission ingestion, validation, and analytics storage
- Rate-limiting, security validation, and domain whitelisting

<!-- TODO: Add high-level system diagram and deployment links -->

---

## Architecture

This project follows a clean 4-tier modular architecture in Plain JavaScript (Node.js + Express):

```
HTTP Request
     │
     ▼
┌───────────────────────────────┐
│         Routes Layer          │  -> src/routes (HTTP routing, validation middleware)
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│        Services Layer         │  -> src/services (Business logic, geo-fallbacks, JWT)
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│      Repositories Layer       │  -> src/repositories (Data access queries & mutations)
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│        Database Layer         │  -> src/db (Connection pool, migrations, schema)
└───────────────────────────────┘
```

<!-- TODO: Document caching layer, event queueing, and webhook notifications -->

---

## Embed Flow & Integration Lifecycle

The platform enables zero-code embeddable lead capture integration across third-party websites. As outlined in [DESIGN.md](file:///d:/FlyRank%20Internship/FlyRank%20Capstone%20Embeddable%20Widget%20&%20Lead-Capture%20Platform/DESIGN.md), the end-to-end integration lifecycle operates through a 4-step sequence:

```
+-------------------------------------------------------------------------------+
|                             Client Browser / Site                             |
+-------------------------------------------------------------------------------+
        |                                                               │
1. Load Snippet Tag                                             4. Ingest Lead
   <script src=".../widget.js?id=WIDGET_ID">                       POST /api/public/submit
        │                                                               ▲
        ▼                                                               │
+------------------------------------+          +-------------------------------+
| 2. Fetch Public Config             |          | 3. Render Widget UI           |
|    GET /api/public/config          |--------->|    - Theme / Form Fields      |
|    - Geo-resolution & variant rules|          |    - Trigger (delay/scroll)   |
+------------------------------------+          +-------------------------------+
                                                                │
                                                                ▼
                                                +-------------------------------+
                                                | User submits form data        |
                                                +-------------------------------+
```

1. **Snippet Placement**: The tenant creates a widget and copies the ready-to-paste embed snippet:
   ```html
   <script src="http://localhost:3000/widget.js?id=WIDGET_ID"></script>
   ```
2. **Config & Geo Fetch**: When the client page loads, the script calls `GET /api/public/widgets/:id/config` (or resolves geo-targeted variants via `src/services/geoService.js`).
3. **Dynamic Render**: The widget script parses the returned JSON schema (fields, theme, placement, triggers) and dynamically mounts the UI into the DOM / Shadow DOM without interfering with host page styles.
4. **Lead Ingestion & Telemetry**: When a visitor submits the form, payload data is securely sent to `POST /api/public/widgets/:id/submit`, validated, rate-limited, and recorded with referrer and geolocation metadata.

---

## Setup

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Docker & Docker Compose (for running PostgreSQL container)

### 1. Installation
1. Clone the repository and navigate to the project directory:
   ```bash
   cd flyrank-capstone-widget-platform
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Default values in .env.example are pre-configured to match docker-compose.yml
   ```

### 2. Start PostgreSQL via Docker
Start the PostgreSQL 16 container with persistent storage:
```bash
docker compose up -d
```
*(Verify container status: `docker compose ps`)*

### 3. Run Database Migrations & Seed
Execute the idempotent SQL schema migrations and populate initial demo data:
```bash
# Run schema migrations (creates tenants, users, widgets, submissions tables & indexes)
npm run db:migrate

# Seed demo tenant ('Acme Corp'), demo admin user, and sample lead capture widget
npm run db:seed
```

---

## Run

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Stop Database Container
```bash
docker compose down
```

---

## Test

Run automated test suites (unit, integration, and E2E):
```bash
npm test
```

<!-- TODO: Add test coverage thresholds and CI workflow instructions -->

---

## Limitations

- Multi-region database replication is not implemented for the initial prototype.
- Webhook retry queue currently does not support dead-letter exchanges (planned for future iteration).
- Dynamic script bundling for widgets is served statically without edge compute compilation.

<!-- TODO: Update limitations as features progress through development milestones -->
