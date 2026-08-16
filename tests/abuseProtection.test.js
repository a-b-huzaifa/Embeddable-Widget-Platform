const request = require('supertest');
const express = require('express');
const app = require('../src/app');
const widgetRepository = require('../src/repositories/widgetRepository');
const submissionRepository = require('../src/repositories/submissionRepository');
const { createCustomRateLimiter } = require('../src/middleware/rateLimiter');
const { validate } = require('../src/middleware/validate');
const { createSubmissionSchema } = require('../src/schemas/submissionSchemas');
const submissionService = require('../src/services/submissionService');

jest.mock('../src/repositories/widgetRepository');
jest.mock('../src/repositories/submissionRepository');

describe('Abuse Protection & Rate Limiting (Stage 8)', () => {
  const WIDGET_ID = '99999999-9999-9999-9999-999999999999';
  const TENANT_ID = '11111111-1111-1111-1111-111111111111';

  const mockWidget = {
    id: WIDGET_ID,
    tenant_id: TENANT_ID,
    type: 'lead_capture',
    title: 'Protected Lead Widget'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Honeypot Anti-Spam Protection', () => {
    test('Honeypot filled in top-level _hp_check: silently drops spam without database write', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);

      const res = await request(app)
        .post('/api/submissions')
        .send({
          widget_id: WIDGET_ID,
          payload: {
            full_name: 'Spam Bot 3000',
            email: 'bot@spamnetwork.com'
          },
          _hp_check: 'http://spam-link.com' // Bot filled hidden field
        });

      // Returns success so bot thinks it succeeded
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('spam_dropped');

      // CRITICAL: Must NOT call database insert
      expect(submissionRepository.createSubmission).not.toHaveBeenCalled();
    });

    test('Honeypot filled inside payload._hp_check: silently drops spam without database write', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);

      const res = await request(app)
        .post('/api/submissions')
        .send({
          widget_id: WIDGET_ID,
          payload: {
            full_name: 'Crawler Bot',
            email: 'crawler@spam.com',
            _hp_check: 'malicious bot text'
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('spam_dropped');
      expect(submissionRepository.createSubmission).not.toHaveBeenCalled();
    });

    test('Legitimate submission with empty/omitted honeypot field succeeds and calls database insert', async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);
      submissionRepository.createSubmission.mockResolvedValue({
        id: 'ssssssss-ssss-ssss-ssss-ssssssssssss',
        widget_id: WIDGET_ID,
        tenant_id: TENANT_ID,
        payload: { full_name: 'Human Lead', email: 'human@company.com' },
        status: 'new',
        created_at: new Date().toISOString()
      });

      const res = await request(app)
        .post('/api/submissions')
        .send({
          widget_id: WIDGET_ID,
          payload: { full_name: 'Human Lead', email: 'human@company.com' },
          _hp_check: '' // Human leaves hidden field empty
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('new');
      expect(submissionRepository.createSubmission).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Rate Limiting & 429 Too Many Requests Burst Protection', () => {
    test('Burst of requests exceeding rate limit threshold triggers 429 Too Many Requests JSON', async () => {
      const testApp = express();
      testApp.use(express.json());

      // Create a test route with a strict limit of 3 requests per 1000ms window
      const testLimiter = createCustomRateLimiter({
        windowMs: 1000,
        max: 3,
        message: 'Too many submission attempts. Please slow down and try again later.'
      });

      testApp.post(
        '/api/test-submissions',
        testLimiter,
        validate(createSubmissionSchema, 'body'),
        async (req, res, next) => {
          try {
            const result = await submissionService.submitLead({
              widgetId: req.body.widget_id,
              payload: req.body.payload,
              hpCheck: req.body._hp_check
            });
            res.status(201).json({ success: true, data: result });
          } catch (err) {
            next(err);
          }
        }
      );

      widgetRepository.findWidgetById.mockResolvedValue(mockWidget);
      submissionRepository.createSubmission.mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        widget_id: WIDGET_ID,
        status: 'new'
      });

      const payload = {
        widget_id: WIDGET_ID,
        payload: { email: 'burst@test.com' }
      };

      // Request 1: OK
      const res1 = await request(testApp).post('/api/test-submissions').send(payload);
      expect(res1.status).toBe(201);

      // Request 2: OK
      const res2 = await request(testApp).post('/api/test-submissions').send(payload);
      expect(res2.status).toBe(201);

      // Request 3: OK
      const res3 = await request(testApp).post('/api/test-submissions').send(payload);
      expect(res3.status).toBe(201);

      // Request 4 (Burst): Should be blocked with 429
      const res4 = await request(testApp).post('/api/test-submissions').send(payload);
      expect(res4.status).toBe(429);
      expect(res4.body.success).toBe(false);
      expect(res4.body.error.statusCode).toBe(429);
      expect(res4.body.error.message).toMatch(/Too many submission attempts/i);
    });

    test('Rate limit recovers after window expiry allowing subsequent legitimate requests', async () => {
      const testApp = express();
      testApp.use(express.json());

      // Create a test route with a 50ms window and max 1 request
      const fastLimiter = createCustomRateLimiter({
        windowMs: 50,
        max: 1
      });

      testApp.post('/api/test-recover', fastLimiter, (req, res) => {
        res.status(201).json({ success: true });
      });

      // Request 1: OK
      const res1 = await request(testApp).post('/api/test-recover').send({});
      expect(res1.status).toBe(201);

      // Immediate burst: 429
      const res2 = await request(testApp).post('/api/test-recover').send({});
      expect(res2.status).toBe(429);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Subsequent request: OK (recovered)
      const res3 = await request(testApp).post('/api/test-recover').send({});
      expect(res3.status).toBe(201);
    });
  });
});
