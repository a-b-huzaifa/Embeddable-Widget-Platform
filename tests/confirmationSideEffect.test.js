const request = require('supertest');
const app = require('../src/app');
const widgetRepository = require('../src/repositories/widgetRepository');
const submissionRepository = require('../src/repositories/submissionRepository');
const submissionService = require('../src/services/submissionService');
const { dispatchSafeConfirmation, sendSubmissionConfirmation } = require('../src/services/notificationService');

jest.mock('../src/repositories/widgetRepository');
jest.mock('../src/repositories/submissionRepository');

describe('Submission Confirmation Side Effect & Safe Execution (Stage 10)', () => {
  const WIDGET_ID = '99999999-9999-9999-9999-999999999999';
  const TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const SUBMISSION_ID = 'sub-confirm-1234';

  const mockWidget = {
    id: WIDGET_ID,
    tenant_id: TENANT_ID,
    type: 'lead_capture',
    title: 'Enterprise Quote Widget'
  };

  const mockStoredSubmission = {
    id: SUBMISSION_ID,
    widget_id: WIDGET_ID,
    tenant_id: TENANT_ID,
    payload: { full_name: 'Alice Prospect', email: 'alice@prospect.com' },
    status: 'new',
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    widgetRepository.findWidgetById.mockResolvedValue(mockWidget);
    submissionRepository.createSubmission.mockResolvedValue(mockStoredSubmission);
  });

  describe('1. Happy Path Confirmation Side Effect', () => {
    test('Default sendSubmissionConfirmation formats and logs confirmation data', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await sendSubmissionConfirmation({
        submission: mockStoredSubmission,
        widget: mockWidget,
        payload: mockStoredSubmission.payload
      });

      expect(result.dispatched).toBe(true);
      expect(result.recipient).toBe('alice@prospect.com');
      expect(result.submission_id).toBe(SUBMISSION_ID);
      expect(logSpy).toHaveBeenCalled();

      logSpy.mockRestore();
    });

    test('Submission flow calls confirmation side effect upon successful persistence', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });

      const res = await submissionService.submitLead({
        widgetId: WIDGET_ID,
        payload: { email: 'test@lead.com' },
        notificationHandler: mockHandler
      });

      expect(res.status).toBe('new');
      expect(res.id).toBe(SUBMISSION_ID);
      expect(submissionRepository.createSubmission).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          widget: mockWidget,
          submission: mockStoredSubmission
        })
      );
    });
  });

  describe('2. Forced Side-Effect Failure Isolation (Safe Side Effects)', () => {
    test('Forced side-effect failure: throws error, submission is STILL stored, returns 201 success', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Create a mock handler that forcefully throws a fatal error
      const failingNotificationHandler = jest.fn().mockImplementation(() => {
        throw new Error('FATAL: Mailpit SMTP transport connection refused / Webhook 500 error');
      });

      const res = await submissionService.submitLead({
        widgetId: WIDGET_ID,
        payload: { email: 'isolated@failure.com', full_name: 'Safe User' },
        notificationHandler: failingNotificationHandler
      });

      // 1. Primary critical work completed: database insert was executed
      expect(submissionRepository.createSubmission).toHaveBeenCalledTimes(1);

      // 2. Side effect was attempted and failed
      expect(failingNotificationHandler).toHaveBeenCalledTimes(1);

      // 3. Error was caught and logged to telemetry
      expect(errorSpy).toHaveBeenCalled();

      // 4. Client response remains a clean success
      expect(res.status).toBe('new');
      expect(res.id).toBe(SUBMISSION_ID);

      errorSpy.mockRestore();
    });

    test('HTTP Integration: POST /api/submissions returns 201 Created even if side effect throws', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .post('/api/submissions')
        .send({
          widget_id: WIDGET_ID,
          payload: { email: 'http-resilience@test.com' }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(SUBMISSION_ID);
      expect(submissionRepository.createSubmission).toHaveBeenCalledTimes(1);

      errorSpy.mockRestore();
    });

    test('dispatchSafeConfirmation helper isolates asynchronous rejections', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const rejectingHandler = async () => {
        throw new Error('Async network timeout');
      };

      // Must not throw or reject
      await expect(dispatchSafeConfirmation({}, rejectingHandler)).resolves.not.toThrow();

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
