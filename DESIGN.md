# FlyRank Capstone - System Design Document

**Project**: Embeddable Widget & Lead-Capture Platform (`flyrank-capstone-widget-platform`)  
**Status**: Initial Architecture & Design Draft  
**Target Runtime**: Node.js / Express (Plain JavaScript)

---

## 1. Problem Statement

Marketing teams, sales operations, and website owners need lightweight, highly customizable embeddable widgets (contact forms, quote calculators, email captures) that can be embedded into external websites with minimal integration effort (a single `<script>` snippet). 

Key engineering challenges addressed by this platform:
- Multi-tenancy with strict data isolation across tenants and users.
- Reliable geo-targeted form variation serving with resilient fallback between external geo-location providers.
- Low-latency public widget config fetching under high traffic.
- Secure, rate-limited lead submission processing that prevents spam and cross-origin abuse.

---

## 2. Architecture & Layer Sketch

The application follows a clean 4-tier modular separation of concerns:

```
                  ┌───────────────────────────────┐
                  │          HTTP Request         │
                  └──────────────┬────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Routes Layer (`src/routes/`)                                    │
│ - Request parsing, endpoint routing                             │
│ - Middleware application (Auth, Validation, Rate Limiting)      │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Services Layer (`src/services/`)                                │
│ - Core business logic, multi-provider geo resolution fallback   │
│ - Tenant isolation rules, token handling, submission processing │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Repositories Layer (`src/repositories/`)                        │
│ - Raw SQL / Data mapper abstraction                             │
│ - Query composition, pagination, transactional boundary helper  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Database Layer (`src/db/`)                                      │
│ - Connection pooling, schema migrations, seed utilities         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model Sketch

### 3.1 `tenants`
- `id` (UUID / SERIAL PK)
- `name` (VARCHAR)
- `slug` (VARCHAR, UNIQUE)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 3.2 `users`
- `id` (UUID / SERIAL PK)
- `tenant_id` (FK -> `tenants.id`)
- `email` (VARCHAR, UNIQUE)
- `password_hash` (VARCHAR)
- `role` (VARCHAR: `admin`, `member`)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 3.3 `widgets`
- `id` (UUID / SERIAL PK)
- `tenant_id` (FK -> `tenants.id`)
- `widget_key` (VARCHAR, UNIQUE indexed, public token for embed snippet)
- `name` (VARCHAR)
- `allowed_domains` (TEXT[] / JSONB - domain whitelisting)
- `config` (JSONB - styling, fields, copy, triggers, geo-targeting rules)
- `status` (VARCHAR: `active`, `paused`, `archived`)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 3.4 `submissions`
- `id` (UUID / SERIAL PK)
- `widget_id` (FK -> `widgets.id`)
- `tenant_id` (FK -> `tenants.id`)
- `payload` (JSONB - form responses such as email, name, custom fields)
- `ip_address` (VARCHAR)
- `user_agent` (TEXT)
- `geo_country` (VARCHAR(2))
- `geo_city` (VARCHAR)
- `referrer_url` (TEXT)
- `created_at` (TIMESTAMP)

---

## 4. API Surface (Route List)

### 4.1 Authentication & Tenant Management
- `POST   /api/v1/auth/register` - Create tenant organization & primary admin user
- `POST   /api/v1/auth/login` - Authenticate user & return JWT token
- `GET    /api/v1/auth/me` - Retrieve current authenticated user profile
- `GET    /api/v1/tenants/current` - Retrieve current tenant workspace details
- `PATCH  /api/v1/tenants/current` - Update tenant workspace settings

### 4.2 Widget Management (Tenant-Authenticated)
- `GET    /api/v1/widgets` - List all widgets for the tenant (supports filtering/pagination)
- `POST   /api/v1/widgets` - Create a new widget configuration
- `GET    /api/v1/widgets/:id` - Fetch single widget details and analytics summary
- `PUT    /api/v1/widgets/:id` - Update full widget configuration & targeting rules
- `PATCH  /api/v1/widgets/:id/status` - Toggle widget status (`active`/`paused`)
- `DELETE /api/v1/widgets/:id` - Archive/soft-delete a widget

### 4.3 Public Embed & Lead Capture (Public / CORS Whitelisted)
- `GET    /api/v1/public/widgets/:widgetKey/config` - Public endpoint to retrieve render config + resolved geo data
- `POST   /api/v1/public/widgets/:widgetKey/submit` - Public endpoint to ingest lead submission

### 4.4 Submissions & Analytics (Tenant-Authenticated)
- `GET    /api/v1/widgets/:id/submissions` - Retrieve paginated submissions for a widget
- `GET    /api/v1/submissions/export` - Export tenant submissions as CSV
- `GET    /api/v1/analytics/summary` - Aggregate performance metrics (impressions, submissions, conversion rates)

### 4.5 System & Health
- `GET    /health` - Basic liveness probe
- `GET    /health/ready` - Readiness probe (DB & external geo provider check)

---

## 5. Explicit Non-Goal

**No In-App Visual WYSIWYG Drag-and-Drop Drag-Builder Engine in Backend Scope:**
The backend will strictly accept, validate, store, and serve JSON-based widget configuration schemas and form definitions. The backend will NOT perform server-side visual drag-and-drop DOM compilation or real-time visual canvas rendering. Visual styling and rendering are handled client-side by the widget bundle and frontend dashboard consuming the schema.
