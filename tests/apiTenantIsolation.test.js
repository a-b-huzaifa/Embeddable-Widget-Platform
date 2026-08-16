const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const widgetRepository = require('../src/repositories/widgetRepository');
const { JWT_SECRET } = require('../src/middleware/auth');

jest.mock('../src/repositories/widgetRepository');

describe('HTTP API End-to-End Tenant Isolation & Auth Tests', () => {
  const TENANT_A = '11111111-1111-1111-1111-111111111111';
  const TENANT_B = '22222222-2222-2222-2222-222222222222';
  const WIDGET_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const tokenTenantA = jwt.sign(
    { userId: 'user-a', tenantId: TENANT_A, email: 'a@corp.com', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const tokenTenantB = jwt.sign(
    { userId: 'user-b', tenantId: TENANT_B, email: 'b@corp.com', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const mockWidgetA = {
    id: WIDGET_A_ID,
    tenant_id: TENANT_A,
    type: 'lead_capture',
    title: 'Tenant A Widget',
    description: 'Secret data',
    fields: [],
    button_text: 'Submit',
    display_options: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HTTP 401 Unauthorized probes', () => {
    test('GET /api/v1/widgets without token returns 401', async () => {
      const res = await request(app).get('/api/v1/widgets');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(401);
    });

    test('GET /api/v1/widgets with invalid token returns 401', async () => {
      const res = await request(app)
        .get('/api/v1/widgets')
        .set('Authorization', 'Bearer invalid-token-1234');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(401);
    });
  });

  describe('HTTP 403 Forbidden Cross-Tenant Access Probes', () => {
    test("Tenant B attempting GET /api/v1/widgets/:id of Tenant A's widget receives 403", async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidgetA);

      const res = await request(app)
        .get(`/api/v1/widgets/${WIDGET_A_ID}`)
        .set('Authorization', `Bearer ${tokenTenantB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(403);
      expect(res.body.error.message).toMatch(/Forbidden/);
    });

    test("Tenant B attempting PUT /api/v1/widgets/:id of Tenant A's widget receives 403", async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidgetA);

      const res = await request(app)
        .put(`/api/v1/widgets/${WIDGET_A_ID}`)
        .set('Authorization', `Bearer ${tokenTenantB}`)
        .send({ title: 'Overwritten by Tenant B' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(403);
    });

    test("Tenant B attempting DELETE /api/v1/widgets/:id of Tenant A's widget receives 403", async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidgetA);

      const res = await request(app)
        .delete(`/api/v1/widgets/${WIDGET_A_ID}`)
        .set('Authorization', `Bearer ${tokenTenantB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(403);
    });

    test("Tenant A accessing GET /api/v1/widgets/:id receives 200 OK with widget data", async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidgetA);

      const res = await request(app)
        .get(`/api/v1/widgets/${WIDGET_A_ID}`)
        .set('Authorization', `Bearer ${tokenTenantA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(WIDGET_A_ID);
    });
  });
});
