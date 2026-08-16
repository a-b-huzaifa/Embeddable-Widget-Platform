const request = require('supertest');
const app = require('../src/app');
const widgetRepository = require('../src/repositories/widgetRepository');

jest.mock('../src/repositories/widgetRepository');

describe('Fast, Cached Widget Delivery Routes', () => {
  const WIDGET_ID = '99999999-9999-9999-9999-999999999999';

  const mockDbWidget = {
    id: WIDGET_ID,
    tenant_id: '11111111-1111-1111-1111-111111111111',
    type: 'lead_capture',
    title: 'Public Lead Widget',
    description: 'Contact us for a demo',
    fields: [
      { id: 'full_name', type: 'text', label: 'Full Name', required: true },
      { id: 'email', type: 'email', label: 'Work Email', required: true }
    ],
    button_text: 'Get Started',
    display_options: {
      theme: 'dark',
      primary_color: '#2563eb',
      position: 'bottom-right'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Versioned Widget Bundle Delivery (/widget.v1.js & /widget.js)', () => {
    test('GET /widget.v1.js - returns JS bundle with far-future immutable Cache-Control and CORS', async () => {
      const res = await request(app).get('/widget.v1.js');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/javascript/);
      expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.text).toContain('[FlyRank Widget]');
    });

    test('GET /widget.js - alias route returns bundle with identical caching headers', async () => {
      const res = await request(app).get('/widget.js');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/javascript/);
      expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.text).toContain('[FlyRank Widget]');
    });

    test('Widget bundle endpoint requires NO authentication', async () => {
      const res = await request(app).get('/widget.v1.js');
      expect(res.status).toBe(200);
    });
  });

  describe('2. Public Widget Config Delivery (/widgets/:id/config)', () => {
    test('GET /widgets/:id/config - returns short-lived Cache-Control and CORS headers without auth', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockDbWidget);

      const res = await request(app).get(`/widgets/${WIDGET_ID}/config`);

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('public, max-age=60, s-maxage=60');
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.body.success).toBe(true);
    });

    test('GET /widgets/:id/config - payload shape contains all required display and field properties', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockDbWidget);

      const res = await request(app).get(`/widgets/${WIDGET_ID}/config`);

      expect(res.status).toBe(200);
      const config = res.body.data;
      expect(config.id).toBe(WIDGET_ID);
      expect(config.type).toBe('lead_capture');
      expect(config.title).toBe('Public Lead Widget');
      expect(config.description).toBe('Contact us for a demo');
      expect(config.button_text).toBe('Get Started');
      expect(Array.isArray(config.fields)).toBe(true);
      expect(config.fields.length).toBe(2);
      expect(config.display_options).toEqual({
        theme: 'dark',
        primary_color: '#2563eb',
        position: 'bottom-right'
      });

      // Crucial: Must NOT leak internal tenant isolation metadata
      expect(config.tenant_id).toBeUndefined();
    });

    test('GET /api/public/widgets/:id/config - alias route returns identical config', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockDbWidget);

      const res = await request(app).get(`/api/public/widgets/${WIDGET_ID}/config`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(WIDGET_ID);
    });

    test('GET /widgets/:id/config - returns 404 for non-existent widget', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(null);

      const res = await request(app).get(`/widgets/${WIDGET_ID}/config`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(404);
    });

    test('GET /widgets/:id/config - returns 400 for malformed non-UUID id param', async () => {
      const res = await request(app).get('/widgets/invalid-id-xyz/config');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/valid UUID/i);
    });
  });
});
