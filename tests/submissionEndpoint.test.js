const request = require('supertest');
const app = require('../src/app');
const widgetRepository = require('../src/repositories/widgetRepository');
const submissionRepository = require('../src/repositories/submissionRepository');

jest.mock('../src/repositories/widgetRepository');
jest.mock('../src/repositories/submissionRepository');

describe('Public Lead Submission Endpoint (POST /api/submissions)', () => {
  const TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const WIDGET_ID = '99999999-9999-9999-9999-999999999999';
  const SUBMISSION_ID = 'ssssssss-ssss-ssss-ssss-ssssssssssss';

  const mockWidget = {
    id: WIDGET_ID,
    tenant_id: TENANT_ID,
    type: 'lead_capture',
    title: 'Lead Widget',
    fields: [{ id: 'email', type: 'email', label: 'Email' }]
  };

  const mockStoredSubmission = {
    id: SUBMISSION_ID,
    widget_id: WIDGET_ID,
    tenant_id: TENANT_ID,
    payload: { email: 'lead@customer.com', name: 'John Doe' },
    geo: { client_ip: '127.0.0.1', referrer: 'http://localhost:5500' },
    status: 'new',
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Valid End-to-End Submission & Tenant Linking', () => {
    test('POST /api/submissions - successfully ingests submission linked to correct widget_id and tenant_id (201 Created)', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);
      submissionRepository.createSubmission.mockResolvedValue(mockStoredSubmission);

      const res = await request(app)
        .post('/api/submissions')
        .set('Origin', 'http://localhost:5500')
        .send({
          widget_id: WIDGET_ID,
          payload: { email: 'lead@customer.com', name: 'John Doe' },
          referrer: 'http://localhost:5500'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(SUBMISSION_ID);
      expect(res.body.data.widget_id).toBe(WIDGET_ID);
      expect(res.body.data.tenant_id).toBe(TENANT_ID);

      // Verify repository was called with correct tenant linkage
      expect(submissionRepository.createSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          widgetId: WIDGET_ID,
          tenantId: TENANT_ID,
          payload: { email: 'lead@customer.com', name: 'John Doe' },
          status: 'new'
        })
      );
    });

    test('POST /api/submissions requires NO authentication header', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);
      submissionRepository.createSubmission.mockResolvedValue(mockStoredSubmission);

      const res = await request(app)
        .post('/api/submissions')
        .send({
          widget_id: WIDGET_ID,
          payload: { email: 'lead@customer.com' }
        });

      expect(res.status).toBe(201);
    });
  });

  describe('2. Strict Input Validation (400 Bad Request JSON)', () => {
    test('POST /api/submissions - rejects missing or empty payload with 400 JSON', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .send({
          widget_id: WIDGET_ID,
          payload: {}
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/Validation error/i);
      expect(submissionRepository.createSubmission).not.toHaveBeenCalled();
    });

    test('POST /api/submissions - rejects malformed payload data type with 400 JSON', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .send({
          widget_id: WIDGET_ID,
          payload: 'not-an-object'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(400);
      expect(submissionRepository.createSubmission).not.toHaveBeenCalled();
    });

    test('POST /api/submissions - rejects malformed non-UUID widget_id with 400 JSON', async () => {
      const res = await request(app)
        .post('/api/submissions')
        .send({
          widget_id: 'invalid-non-uuid-widget-id',
          payload: { email: 'test@example.com' }
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/valid UUID/i);
      expect(submissionRepository.createSubmission).not.toHaveBeenCalled();
    });

    test('POST /api/submissions - rejects non-existent widget_id with 404 JSON', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/submissions')
        .send({
          widget_id: '00000000-0000-0000-0000-000000000000',
          payload: { email: 'test@example.com' }
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(404);
      expect(submissionRepository.createSubmission).not.toHaveBeenCalled();
    });

    test('POST /api/submissions - rejects oversized payload (>10KB) with 400 JSON', async () => {
      // Create an oversized object payload exceeding 10KB
      const hugeString = 'A'.repeat(12 * 1024);
      const oversizedPayload = {
        email: 'attacker@evil.com',
        massive_field: hugeString
      };

      const res = await request(app)
        .post('/api/submissions')
        .send({
          widget_id: WIDGET_ID,
          payload: oversizedPayload
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(400);
      expect(res.body.error.message).toMatch(/exceeds the maximum allowed size/i);
      expect(submissionRepository.createSubmission).not.toHaveBeenCalled();
    });
  });

  describe('3. CORS Preflight & Origin Whitelist Handling', () => {
    test('OPTIONS /api/submissions - returns correct CORS preflight headers for whitelisted origin (http://localhost:5500)', async () => {
      const res = await request(app)
        .options('/api/submissions')
        .set('Origin', 'http://localhost:5500')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5500');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
      expect(res.headers['access-control-allow-headers']).toBeDefined();
    });

    test('POST /api/submissions - returns Access-Control-Allow-Origin for whitelisted origin (http://127.0.0.1:5500)', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);
      submissionRepository.createSubmission.mockResolvedValue(mockStoredSubmission);

      const res = await request(app)
        .post('/api/submissions')
        .set('Origin', 'http://127.0.0.1:5500')
        .send({
          widget_id: WIDGET_ID,
          payload: { email: 'lead@127.com' }
        });

      expect(res.status).toBe(201);
      expect(res.headers['access-control-allow-origin']).toBe('http://127.0.0.1:5500');
    });

    test('OPTIONS /api/submissions - rejects disallowed origin without Access-Control-Allow-Origin header', async () => {
      const res = await request(app)
        .options('/api/submissions')
        .set('Origin', 'http://disallowed-malicious-site.com')
        .set('Access-Control-Request-Method', 'POST');

      // For disallowed origin, CORS middleware does NOT echo back the disallowed origin
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('POST /api/submissions - disallowed origin does NOT receive Access-Control-Allow-Origin header', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);
      submissionRepository.createSubmission.mockResolvedValue(mockStoredSubmission);

      const res = await request(app)
        .post('/api/submissions')
        .set('Origin', 'http://disallowed-malicious-site.com')
        .send({
          widget_id: WIDGET_ID,
          payload: { email: 'hacker@disallowed.com' }
        });

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
