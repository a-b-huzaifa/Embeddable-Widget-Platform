const request = require('supertest');
const app = require('../src/app');
const dashboardRepository = require('../src/repositories/dashboardRepository');
const { generateToken } = require('../src/services/authService');

jest.mock('../src/repositories/dashboardRepository');

describe('Authenticated Owner Dashboard API (/api/dashboard)', () => {
  const TENANT_A_ID = '11111111-1111-1111-1111-111111111111';
  const TENANT_B_ID = '22222222-2222-2222-2222-222222222222';

  const tokenA = generateToken({
    userId: 'user-a-1',
    email: 'owner@tenant-a.com',
    tenantId: TENANT_A_ID
  });

  const tokenB = generateToken({
    userId: 'user-b-1',
    email: 'owner@tenant-b.com',
    tenantId: TENANT_B_ID
  });

  const mockOverviewA = {
    summary: {
      total_widgets: 3,
      total_submissions: 42,
      submissions_7d: 15,
      submissions_30d: 42
    },
    submissions_over_time: [
      { date: '2026-08-15', count: 10 },
      { date: '2026-08-16', count: 20 },
      { date: '2026-08-17', count: 12 }
    ],
    widgets: [
      {
        widget_id: 'w-1',
        title: 'Demo Widget A1',
        type: 'lead_capture',
        submission_count: 30,
        latest_submission_at: '2026-08-17T03:00:00.000Z'
      },
      {
        widget_id: 'w-2',
        title: 'Demo Widget A2',
        type: 'newsletter',
        submission_count: 12,
        latest_submission_at: '2026-08-16T12:00:00.000Z'
      }
    ],
    geo_breakdown: [
      { country: 'United States', country_code: 'US', count: 30, percentage: 71.43 },
      { country: 'Canada', country_code: 'CA', count: 12, percentage: 28.57 }
    ],
    recent_submissions: [
      { id: 'sub-1', widget_id: 'w-1', status: 'new', created_at: '2026-08-17T03:00:00.000Z' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Authentication Guard Verification', () => {
    test('GET /api/dashboard/overview - returns 401 Unauthorized when token is missing', async () => {
      const res = await request(app).get('/api/dashboard/overview');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(401);
      expect(dashboardRepository.getOverviewStats).not.toHaveBeenCalled();
    });

    test('GET /api/dashboard/overview - returns 401 Unauthorized for malformed/invalid token', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', 'Bearer invalid-token-xyz');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.statusCode).toBe(401);
    });
  });

  describe('2. Aggregation & Dashboard Query Verification', () => {
    test('GET /api/dashboard/overview - returns full aggregated analytics for authenticated tenant', async () => {
      dashboardRepository.getOverviewStats.mockResolvedValue(mockOverviewA.summary);
      dashboardRepository.getSubmissionsOverTime.mockResolvedValue(mockOverviewA.submissions_over_time);
      dashboardRepository.getPerWidgetStats.mockResolvedValue(mockOverviewA.widgets);
      dashboardRepository.getGeoBreakdown.mockResolvedValue(mockOverviewA.geo_breakdown);
      dashboardRepository.getRecentSubmissions.mockResolvedValue(mockOverviewA.recent_submissions);

      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.total_widgets).toBe(3);
      expect(res.body.data.summary.total_submissions).toBe(42);
      expect(res.body.data.widgets.length).toBe(2);
      expect(res.body.data.geo_breakdown[0].country).toBe('United States');

      // Verify all repo methods were called strictly with Tenant A's ID
      expect(dashboardRepository.getOverviewStats).toHaveBeenCalledWith(TENANT_A_ID);
      expect(dashboardRepository.getSubmissionsOverTime).toHaveBeenCalledWith(TENANT_A_ID, 30);
      expect(dashboardRepository.getPerWidgetStats).toHaveBeenCalledWith(TENANT_A_ID);
      expect(dashboardRepository.getGeoBreakdown).toHaveBeenCalledWith(TENANT_A_ID);
      expect(dashboardRepository.getRecentSubmissions).toHaveBeenCalledWith(TENANT_A_ID, 5);
    });

    test('GET /api/dashboard/submissions-over-time - returns time-series submission data', async () => {
      dashboardRepository.getSubmissionsOverTime.mockResolvedValue(mockOverviewA.submissions_over_time);

      const res = await request(app)
        .get('/api/dashboard/submissions-over-time?days=14')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(dashboardRepository.getSubmissionsOverTime).toHaveBeenCalledWith(TENANT_A_ID, 14);
    });

    test('GET /api/dashboard/widgets - returns per-widget performance metrics', async () => {
      dashboardRepository.getPerWidgetStats.mockResolvedValue(mockOverviewA.widgets);

      const res = await request(app)
        .get('/api/dashboard/widgets')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].title).toBe('Demo Widget A1');
      expect(res.body.data[0].submission_count).toBe(30);
      expect(dashboardRepository.getPerWidgetStats).toHaveBeenCalledWith(TENANT_A_ID);
    });

    test('GET /api/dashboard/geo - returns geo-demographic breakdown with percentages', async () => {
      dashboardRepository.getGeoBreakdown.mockResolvedValue(mockOverviewA.geo_breakdown);

      const res = await request(app)
        .get('/api/dashboard/geo')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].country).toBe('United States');
      expect(res.body.data[0].percentage).toBe(71.43);
      expect(dashboardRepository.getGeoBreakdown).toHaveBeenCalledWith(TENANT_A_ID);
    });
  });

  describe('3. Multi-Tenant Isolation in Dashboard Queries', () => {
    test('Tenant B dashboard queries strictly pass Tenant B ID and never touch Tenant A data', async () => {
      dashboardRepository.getOverviewStats.mockResolvedValue({
        total_widgets: 1,
        total_submissions: 5,
        submissions_7d: 2,
        submissions_30d: 5
      });
      dashboardRepository.getSubmissionsOverTime.mockResolvedValue([]);
      dashboardRepository.getPerWidgetStats.mockResolvedValue([]);
      dashboardRepository.getGeoBreakdown.mockResolvedValue([]);
      dashboardRepository.getRecentSubmissions.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.total_submissions).toBe(5);

      // Verify repository was called strictly with Tenant B's ID
      expect(dashboardRepository.getOverviewStats).toHaveBeenCalledWith(TENANT_B_ID);
      expect(dashboardRepository.getOverviewStats).not.toHaveBeenCalledWith(TENANT_A_ID);
    });
  });
});
