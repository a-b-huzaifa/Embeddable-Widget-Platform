# Evidence & Test Transcripts - FlyRank Capstone

This document provides concrete execution logs, test outputs, and curl transcripts mapped directly to each Definition of Done (DoD) requirement for the `flyrank-capstone-widget-platform`.

---

## 1. Automated Test Suite Execution

```
> flyrank-capstone-widget-platform@1.0.0 test
> node ./node_modules/jest/bin/jest.js --runInBand --detectOpenHandles

PASS tests/widgetManagement.test.js
  Authenticated Widget Management API (/api/widgets)
    1. Happy Paths (CRUD)
      √ POST /api/widgets - creates widget successfully (201 Created) (38 ms)
      √ GET /api/widgets - lists all widgets for tenant (200 OK) (7 ms)
      √ GET /api/widgets/:id - retrieves single widget for owning tenant (200 OK) (5 ms)
      √ PUT /api/widgets/:id - updates widget for owning tenant (200 OK) (8 ms)
      √ DELETE /api/widgets/:id - deletes widget for owning tenant (200 OK) (6 ms)
    2. Boundary Validation Failures (Zod 400 Bad Request JSON)
      √ POST /api/widgets - missing or empty title returns clean 400 JSON (8 ms)
      √ POST /api/widgets - whitespace-only title returns clean 400 JSON (6 ms)
      √ POST /api/widgets - invalid field definition structure returns clean 400 JSON (6 ms)
      √ GET /api/widgets/:id - malformed non-UUID id param returns clean 400 JSON (5 ms)
    3. Cross-Tenant Isolation Rejection (403 Forbidden)
      √ Tenant B attempting GET /api/widgets/:id on Tenant A's widget is blocked with 403 (6 ms)
      √ Tenant B attempting PUT /api/widgets/:id on Tenant A's widget is blocked with 403 (6 ms)
      √ Tenant B attempting DELETE /api/widgets/:id on Tenant A's widget is blocked with 403 (6 ms)
    4. Unauthenticated Access (401 Unauthorized)
      √ POST /api/widgets without token returns 401 (4 ms)
      √ GET /api/widgets without token returns 401 (3 ms)

PASS tests/tenantIsolation.test.js
  Tenant Isolation & Authentication Tests
    1. Tenant Isolation Guard Unit Tests (assertTenantOwnership)
      √ should allow access when resourceTenantId matches currentTenantId (1 ms)
      √ should throw ForbiddenError (403) when Tenant B attempts to access Tenant A resource (8 ms)
      √ should throw 400 if tenant parameters are missing (1 ms)
    2. Auth Middleware Token & 401 Enforcement
      √ should return 401 when Authorization header is missing (1 ms)
      √ should return 401 when Authorization header is not Bearer format (1 ms)
      √ should return 401 when JWT token is invalid or corrupted (1 ms)
      √ should return 401 when JWT token is expired (1 ms)
      √ should successfully attach req.tenantId and req.user for valid token (1 ms)
    3. Graded Probe: Tenant A vs Tenant B Data Isolation in Widget Service
      √ Tenant A CAN retrieve their own widget (200 OK equivalent) (1 ms)
      √ Tenant B CANNOT read Tenant A's widget -> throws 403 Forbidden (1 ms)
      √ Tenant B CANNOT modify (PUT) Tenant A's widget -> throws 403 Forbidden (1 ms)
      √ Tenant B CANNOT delete (DELETE) Tenant A's widget -> throws 403 Forbidden (1 ms)
      √ Tenant A CAN modify and delete their own widget (2 ms)

PASS tests/apiTenantIsolation.test.js
  HTTP API End-to-End Tenant Isolation & Auth Tests
    HTTP 401 Unauthorized probes
      √ GET /api/v1/widgets without token returns 401 (10 ms)
      √ GET /api/v1/widgets with invalid token returns 401 (7 ms)
    HTTP 403 Forbidden Cross-Tenant Access Probes
      √ Tenant B attempting GET /api/v1/widgets/:id of Tenant A's widget receives 403 (8 ms)
      √ Tenant B attempting PUT /api/v1/widgets/:id of Tenant A's widget receives 403 (9 ms)
      √ Tenant B attempting DELETE /api/v1/widgets/:id of Tenant A's widget receives 403 (9 ms)
      √ Tenant A accessing GET /api/v1/widgets/:id receives 200 OK with widget data (10 ms)

Test Suites: 3 passed, 3 total
Tests:       33 passed, 33 total
Snapshots:   0 total
Time:        1.958 s
Ran all test suites.
```

---

## 2. Definition-of-Done (DoD) Transcripts & Proofs

### Box: [x] Multi-Tenant Widget CRUD API (`/api/widgets`)
**Transcript: Create Widget (201 Created)**
```http
POST /api/widgets HTTP/1.1
Host: localhost:3000
Authorization: Bearer <tenant_jwt_token>
Content-Type: application/json

{
  "title": "Enterprise Contact Widget",
  "type": "lead_capture",
  "description": "Capture inbound sales leads",
  "button_text": "Request Quote",
  "fields": [
    { "id": "full_name", "type": "text", "label": "Full Name", "required": true },
    { "id": "email", "type": "email", "label": "Work Email", "required": true }
  ],
  "display_options": {
    "theme": "dark",
    "position": "bottom-right"
  }
}

HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{
  "success": true,
  "message": "Widget created successfully",
  "data": {
    "id": "e4b281f9-9065-4f46-92da-246e9dfd0891",
    "tenant_id": "11111111-1111-1111-1111-111111111111",
    "type": "lead_capture",
    "title": "Enterprise Contact Widget",
    "description": "Capture inbound sales leads",
    "fields": [
      { "id": "full_name", "type": "text", "label": "Full Name", "required": true },
      { "id": "email", "type": "email", "label": "Work Email", "required": true }
    ],
    "button_text": "Request Quote",
    "display_options": { "theme": "dark", "position": "bottom-right" },
    "created_at": "2026-08-17T02:40:00.000Z",
    "updated_at": "2026-08-17T02:40:00.000Z"
  }
}
```

---

### Box: [x] Zod Boundary Validation Failure (400 Bad Request JSON)
**Transcript: Empty Title Rejected without 500 error**
```http
POST /api/widgets HTTP/1.1
Host: localhost:3000
Authorization: Bearer <tenant_jwt_token>
Content-Type: application/json

{
  "title": "",
  "fields": []
}

HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": {
    "message": "Validation error: title Widget title is required and cannot be whitespace only",
    "statusCode": 400,
    "details": [
      {
        "field": "title",
        "message": "Title cannot be empty",
        "code": "too_small"
      },
      {
        "field": "title",
        "message": "Widget title is required and cannot be whitespace only",
        "code": "custom"
      }
    ]
  }
}
```

---

### Box: [x] Cross-Tenant Access Rejection (403 Forbidden)
**Transcript: Tenant B attempting to read Tenant A's widget**
```http
GET /api/widgets/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa HTTP/1.1
Host: localhost:3000
Authorization: Bearer <tenant_b_jwt_token>

HTTP/1.1 403 Forbidden
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": {
    "message": "Forbidden: Access denied to widget belonging to another tenant",
    "statusCode": 403
  }
}
```

---

### Box: [x] Embed Snippet Generation (`GET /api/widgets/:id/embed`)
**Transcript: Fetch ready-to-paste embed snippet string**
```http
GET /api/widgets/99999999-9999-9999-9999-999999999999/embed HTTP/1.1
Host: localhost:3000
Authorization: Bearer <tenant_jwt_token>

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "success": true,
  "data": {
    "widget_id": "99999999-9999-9999-9999-999999999999",
    "snippet": "<script src=\"http://localhost:3000/widget.js?id=99999999-9999-9999-9999-999999999999\"></script>"
  }
}
```

---

### Box: [x] Cross-Tenant Embed Snippet Rejection (403 Forbidden)
**Transcript: Tenant B attempting to fetch Tenant A's widget embed snippet**
```http
GET /api/widgets/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/embed HTTP/1.1
Host: localhost:3000
Authorization: Bearer <tenant_b_jwt_token>

HTTP/1.1 403 Forbidden
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": {
    "message": "Forbidden: Access denied to widget belonging to another tenant",
    "statusCode": 403
  }
}
```

---

### Box: [x] Customer Site Simulation (`test-site/index.html`) & Multi-Port Serving
**Setup Details**:
- Single static HTML file located at `test-site/index.html`.
- Served on `http://localhost:5500` via `npm run serve:test-site` (`npx -y serve test-site -p 5500`).
- Embeds snippet `<script src="http://localhost:3000/widget.v1.js?id=..."></script>`.
- Browser initiates cross-origin GET requests from `http://localhost:5500` to `http://localhost:3000` for the JS bundle and `/widgets/:id/config` JSON, rendering the interactive lead form dynamically in the DOM.

---

### Box: [x] Fast, Cached Public Widget Bundle Delivery (`GET /widget.v1.js`)
**Transcript: Fetch versioned bundle with far-future immutable Cache-Control**
```http
GET /widget.v1.js HTTP/1.1
Host: localhost:3000

HTTP/1.1 200 OK
Content-Type: application/javascript; charset=utf-8
Cache-Control: public, max-age=31536000, immutable
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS

(function () {
  'use strict';
  // [FlyRank Widget] self-executing bundle...
})();
```

---

### Box: [x] Public Widget Configuration Delivery with Short Cache (`GET /widgets/:id/config`)
**Transcript: Fetch public widget config (no auth, short-lived cache)**
```http
GET /widgets/99999999-9999-9999-9999-999999999999/config HTTP/1.1
Host: localhost:3000

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: public, max-age=60, s-maxage=60
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS

{
  "success": true,
  "data": {
    "id": "99999999-9999-9999-9999-999999999999",
    "type": "lead_capture",
    "title": "Public Lead Widget",
    "description": "Contact us for a demo",
    "fields": [
      {
        "id": "full_name",
        "type": "text",
        "label": "Full Name",
        "required": true
      },
      {
        "id": "email",
        "type": "email",
        "label": "Work Email",
        "required": true
      }
    ],
    "button_text": "Get Started",
    "display_options": {
      "theme": "dark",
      "primary_color": "#2563eb",
      "position": "bottom-right"
    }
  }
}
```

---

### Box: [x] Missing Authentication Token (401 Unauthorized)
**Transcript: Unauthenticated request to protected endpoint**
```http
GET /api/widgets HTTP/1.1
Host: localhost:3000

HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8

{
  "success": false,
  "error": {
    "message": "Missing or invalid Authorization header",
    "statusCode": 401
  }
}
```
