const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const widgetRepository = require('../src/repositories/widgetRepository');
const { JWT_SECRET } = require('../src/middleware/auth');

jest.mock('../src/repositories/widgetRepository');

describe('Authenticated Widget Management API (/api/widgets)', () => {
  const TENANT_A = '11111111-1111-1111-1111-111111111111';
  const TENANT_B = '22222222-2222-2222-2222-222222222222';
  const WIDGET_ID = '99999999-9999-9999-9999-999999999999';

  const tokenTenantA = jwt.sign(
    { userId: 'user-a', tenantId: TENANT_A, email: 'a@acme.com', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const tokenTenantB = jwt.sign(
    { userId: 'user-b', tenantId: TENANT_B, email: 'b@beta.com', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const mockWidget = {
    id: WIDGET_ID,
    tenant_id: TENANT_A,
    type: 'lead_capture',
    title: 'Newsletter Subscription Widget',
    description: 'Captures visitor emails',
    fields: [
      { id: 'email', type: 'email', label: 'Email Address', required: true }
    ],
    button_text: 'Subscribe Now',
    display_options: {
      theme: 'dark',
      position: 'bottom-right'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Happy Paths (CRUD)', () => {
    test('POST /api/widgets - creates widget successfully (201 Created)', async () => {
      widgetRepository.createWidget.mockResolvedValue(mockWidget);

      const res = await request(app)
        .post('/api/widgets')
        .set('Authorization', `Bearer ${tokenTenantA}`)
        .send({
          title: 'Newsletter Subscription Widget',
          description: 'Captures visitor emails',
          fields: [{ id: 'email', type: 'email', label: 'Email Address', required: true }],
          button_text: 'Subscribe Now',
          display_options: { theme: 'dark', position: 'bottom-right' }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(WIDGET_ID);
      expect(res.body.data.title).toBe('Newsletter Subscription Widget');
      expect(widgetRepository.createWidget).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_A,
          title: 'Newsletter Subscription Widget'
        })
      );
    });

    test('GET /api/widgets - lists all widgets for tenant (200 OK)', async () => {
      widgetRepository.listWidgetsByTenant.mockResolvedValue([mockWidget]);

      const res = await request(app)
        .get('/api/widgets')
        .set('Authorization', `Bearer ${tokenTenantA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(WIDGET_ID);
      expect(widgetRepository.listWidgetsByTenant).toHaveBeenCalledWith(TENANT_A);
    });

    test('GET /api/widgets/:id - retrieves single widget for owning tenant (200 OK)', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);

      const res = await request(app)
        .get(`/api/widgets/${WIDGET_ID}`)
        .set('Authorization', `Bearer ${tokenTenantA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(WIDGET_ID);
      expect(widgetRepository.findWidgetById).toHaveBeenCalledWith(WIDGET_ID);
    });

    test('PUT /api/widgets/:id - updates widget for owning tenant (200 OK)', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);
      const updatedMock = { ...mockWidget, title: 'Updated Title', button_text: 'Join Us' };
      widgetRepository.updateWidget.mockResolvedValue(updatedMock);

      const res = await request(app)
        .put(`/api/widgets/${WIDGET_ID}`)
        .set('Authorization', `Bearer ${tokenTenantA}`)
        .send({
          title: 'Updated Title',
          button_text: 'Join Us'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Title');
      expect(widgetRepository.updateWidget).toHaveBeenCalled();
    });

    test('DELETE /api/widgets/:id - deletes widget for owning tenant (200 OK)', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);
      widgetRepository.deleteWidget.mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/widgets/${WIDGET_ID}`)
        .set('Authorization', `Bearer ${tokenTenantA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/deleted successfully/);
      expect(widgetRepository.deleteWidget).toHaveBeenCalledWith(WIDGET_ID, TENANT_A);
    });
  });

  describe('2. Boundary Validation Failures (Zod 400 Bad Request JSON)', () => {
    test('POST /api/widgets - missing or empty title returns clean 400 JSON', async () => {
      const res = await request(app)
        .post('/api/widgets')
        .set('Authorization', `Bearer ${tokenTenantA}`)
        .send({
          description: 'No title provided',
          fields: []
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/Validation error/i);
      expect(widgetRepository.createWidget).not.toHaveBeenCalled();
    });

    test('POST /api/widgets - whitespace-only title returns clean 400 JSON', async () => {
      const res = await request(app)
        .post('/api/widgets')
        .set('Authorization', `Bearer ${tokenTenantA}`)
        .send({
          title: '   '
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(400);
      expect(widgetRepository.createWidget).not.toHaveBeenCalled();
    });

    test('POST /api/widgets - invalid field definition structure returns clean 400 JSON', async () => {
      const res = await request(app)
        .post('/api/widgets')
        .set('Authorization', `Bearer ${tokenTenantA}`)
        .send({
          title: 'Valid Title',
          fields: [{ id: 'test', type: 'unsupported_type_xyz', label: 'Test' }]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(400);
      expect(res.body.error.details).toBeDefined();
    });

    test('GET /api/widgets/:id - malformed non-UUID id param returns clean 400 JSON', async () => {
      const res = await request(app)
        .get('/api/widgets/not-a-valid-uuid')
        .set('Authorization', `Bearer ${tokenTenantA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/valid UUID/i);
      expect(widgetRepository.findWidgetById).not.toHaveBeenCalled();
    });
  });

  describe('3. Cross-Tenant Isolation Rejection (403 Forbidden)', () => {
    test("Tenant B attempting GET /api/widgets/:id on Tenant A's widget is blocked with 403", async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);

      const res = await request(app)
        .get(`/api/widgets/${WIDGET_ID}`)
        .set('Authorization', `Bearer ${tokenTenantB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(403);
      expect(res.body.error.message).toMatch(/Forbidden/);
    });

    test("Tenant B attempting PUT /api/widgets/:id on Tenant A's widget is blocked with 403", async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);

      const res = await request(app)
        .put(`/api/widgets/${WIDGET_ID}`)
        .set('Authorization', `Bearer ${tokenTenantB}`)
        .send({ title: 'Tenant B Attempted Takeover' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(403);
      expect(widgetRepository.updateWidget).not.toHaveBeenCalled();
    });

    test("Tenant B attempting DELETE /api/widgets/:id on Tenant A's widget is blocked with 403", async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);

      const res = await request(app)
        .delete(`/api/widgets/${WIDGET_ID}`)
        .set('Authorization', `Bearer ${tokenTenantB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(403);
      expect(widgetRepository.deleteWidget).not.toHaveBeenCalled();
    });
  });

  describe('4. Unauthenticated Access (401 Unauthorized)', () => {
    test('POST /api/widgets without token returns 401', async () => {
      const res = await request(app)
        .post('/api/widgets')
        .send({ title: 'Unauthenticated' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(401);
    });

    test('GET /api/widgets without token returns 401', async () => {
      const res = await request(app).get('/api/widgets');
      expect(res.status).toBe(401);
    });
  });
});
