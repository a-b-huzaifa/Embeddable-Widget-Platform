const request = require('supertest');
const app = require('../src/app');
const { generateToken } = require('../src/services/authService');
const { eventStreamService } = require('../src/services/eventStreamService');

describe('Stretch Goal: Real-Time Dashboard via Server-Sent Events (SSE)', () => {
  const TENANT_A_ID = '11111111-1111-1111-1111-111111111111';
  const TENANT_B_ID = '22222222-2222-2222-2222-222222222222';

  const tokenA = generateToken({
    userId: 'user-stream-a',
    tenantId: TENANT_A_ID,
    email: 'stream-a@example.com',
    role: 'admin'
  });

  const tokenB = generateToken({
    userId: 'user-stream-b',
    tenantId: TENANT_B_ID,
    email: 'stream-b@example.com',
    role: 'admin'
  });

  beforeEach(() => {
    eventStreamService.removeAllListeners();
  });

  describe('1. Authentication & Security for Event Stream', () => {
    test('GET /api/dashboard/stream - rejected with 401 when token is missing', async () => {
      const res = await request(app).get('/api/dashboard/stream');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(401);
    });

    test('GET /api/dashboard/stream - rejected with 401 when token is invalid', async () => {
      const res = await request(app)
        .get('/api/dashboard/stream?token=invalid-jwt-token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. SSE Connection Headers & Handshake', () => {
    test('GET /api/dashboard/stream - returns valid SSE headers and initial handshake', (done) => {
      const reqStream = request(app)
        .get('/api/dashboard/stream')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect('Content-Type', /text\/event-stream/)
        .expect('Cache-Control', /no-cache/)
        .expect('Connection', 'keep-alive')
        .expect(200);

      reqStream.buffer(false).parse((res, callback) => {
        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          if (buffer.includes('connected')) {
            expect(buffer).toContain('data:');
            expect(buffer).toContain(TENANT_A_ID);
            res.destroy();
            done();
          }
        });
      }).end(() => {});
    });

    test('Supports ?token= query parameter for browser EventSource client authentication', (done) => {
      const reqStream = request(app)
        .get(`/api/dashboard/stream?token=${tokenA}`)
        .expect('Content-Type', /text\/event-stream/)
        .expect(200);

      reqStream.buffer(false).parse((res) => {
        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          if (buffer.includes('connected')) {
            res.destroy();
            done();
          }
        });
      }).end(() => {});
    });
  });

  describe('3. Real-Time Broadcast & Strict Tenant Isolation', () => {
    test('Published lead event is delivered to Tenant A and NOT leaked to Tenant B', (done) => {
      const tenantAListener = jest.fn();
      const tenantBListener = jest.fn();

      // Register direct channel listeners
      eventStreamService.on(`tenant:${TENANT_A_ID}`, tenantAListener);
      eventStreamService.on(`tenant:${TENANT_B_ID}`, tenantBListener);

      const leadPayload = {
        id: 'sub-live-001',
        widget_id: 'w-live-001',
        payload: { email: 'live-visitor@test.com' }
      };

      // Broadcast lead for Tenant A
      eventStreamService.publishLeadEvent(TENANT_A_ID, leadPayload);

      // Verify Tenant A received payload
      expect(tenantAListener).toHaveBeenCalledTimes(1);
      expect(tenantAListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'new_lead',
          tenantId: TENANT_A_ID,
          data: leadPayload
        })
      );

      // Verify Tenant B received NOTHING (Zero Cross-Tenant Leakage)
      expect(tenantBListener).not.toHaveBeenCalled();
      done();
    });

    test('Safe side effect: Publishing with null/undefined tenant does not crash or throw', () => {
      expect(() => {
        eventStreamService.publishLeadEvent(null, { test: true });
        eventStreamService.publishLeadEvent(undefined, { test: true });
      }).not.toThrow();
    });
  });
});
