const request = require('supertest');
const app = require('../src/app');
const widgetRepository = require('../src/repositories/widgetRepository');
const submissionRepository = require('../src/repositories/submissionRepository');
const dashboardRepository = require('../src/repositories/dashboardRepository');
const { generateToken } = require('../src/services/authService');

jest.mock('../src/repositories/widgetRepository');
jest.mock('../src/repositories/submissionRepository');
jest.mock('../src/repositories/dashboardRepository');

describe('Full End-to-End Capstone Integration Lifecycle (Stage 12)', () => {
  const TENANT_ID = '33333333-3333-3333-3333-333333333333';
  const WIDGET_ID = '44444444-4444-4444-4444-444444444444';
  const SUBMISSION_ID = '55555555-5555-5555-5555-555555555555';

  const authToken = generateToken({
    userId: 'user-owner-e2e',
    tenantId: TENANT_ID,
    email: 'owner@e2e-corp.com',
    role: 'admin'
  });

  const mockCreatedWidget = {
    id: WIDGET_ID,
    tenant_id: TENANT_ID,
    type: 'lead_capture',
    title: 'E2E Demo Widget',
    description: 'Schedule a discovery call',
    fields: [
      { id: 'full_name', type: 'text', label: 'Full Name', required: true },
      { id: 'work_email', type: 'email', label: 'Work Email', required: true }
    ],
    button_text: 'Schedule Now',
    display_options: { theme: 'dark', position: 'bottom-right' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockStoredSubmission = {
    id: SUBMISSION_ID,
    widget_id: WIDGET_ID,
    tenant_id: TENANT_ID,
    payload: { full_name: 'Lead Person', work_email: 'lead@enterprise.com' },
    geo: { country: 'United States', city: 'New York', client_ip: '198.51.100.10' },
    status: 'new',
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Complete End-to-End Lifecycle Flow', async () => {
    // 1. Create Widget as authenticated tenant
    widgetRepository.createWidget.mockResolvedValue(mockCreatedWidget);

    const createWidgetRes = await request(app)
      .post('/api/widgets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'E2E Demo Widget',
        type: 'lead_capture',
        description: 'Schedule a discovery call',
        fields: mockCreatedWidget.fields,
        button_text: 'Schedule Now',
        display_options: { theme: 'dark', position: 'bottom-right' }
      });

    expect(createWidgetRes.status).toBe(201);
    expect(createWidgetRes.body.data.id).toBe(WIDGET_ID);
    expect(createWidgetRes.body.data.snippet).toContain('<script src=');

    // 2. Fetch Public Widget Bundle with immutable caching
    const bundleRes = await request(app).get('/widget.v1.js');
    expect(bundleRes.status).toBe(200);
    expect(bundleRes.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(bundleRes.headers['access-control-allow-origin']).toBe('*');

    // 3. Customer Website fetches Widget Configuration (cross-origin, short cache)
    widgetRepository.findWidgetById.mockResolvedValue(mockCreatedWidget);

    const configRes = await request(app)
      .get(`/widgets/${WIDGET_ID}/config`)
      .set('Origin', 'http://localhost:5500');

    expect(configRes.status).toBe(200);
    expect(configRes.headers['cache-control']).toBe('public, max-age=60, s-maxage=60');
    expect(configRes.headers['access-control-allow-origin']).toBe('*');
    expect(configRes.body.data.title).toBe('E2E Demo Widget');
    expect(configRes.body.data.tenant_id).toBeUndefined(); // internal field hidden

    // 4. Ingest Lead Submission from customer site
    submissionRepository.createSubmission.mockResolvedValue(mockStoredSubmission);

    const submitRes = await request(app)
      .post('/api/submissions')
      .set('Origin', 'http://localhost:5500')
      .send({
        widget_id: WIDGET_ID,
        payload: {
          full_name: 'Lead Person',
          work_email: 'lead@enterprise.com'
        },
        referrer: 'http://localhost:5500'
      });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.id).toBe(SUBMISSION_ID);
    expect(submitRes.body.data.tenant_id).toBe(TENANT_ID);

    // 5. Tenant owner inspects Dashboard Analytics
    dashboardRepository.getOverviewStats.mockResolvedValue({
      total_widgets: 1,
      total_submissions: 1,
      submissions_7d: 1,
      submissions_30d: 1
    });
    dashboardRepository.getSubmissionsOverTime.mockResolvedValue([
      { date: '2026-08-17', count: 1 }
    ]);
    dashboardRepository.getPerWidgetStats.mockResolvedValue([
      {
        widget_id: WIDGET_ID,
        title: 'E2E Demo Widget',
        type: 'lead_capture',
        submission_count: 1,
        latest_submission_at: new Date().toISOString()
      }
    ]);
    dashboardRepository.getGeoBreakdown.mockResolvedValue([
      { country: 'United States', country_code: 'US', count: 1, percentage: 100 }
    ]);
    dashboardRepository.getRecentSubmissions.mockResolvedValue([mockStoredSubmission]);

    const dashboardRes = await request(app)
      .get('/api/dashboard/overview')
      .set('Authorization', `Bearer ${authToken}`);

    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body.data.summary.total_widgets).toBe(1);
    expect(dashboardRes.body.data.summary.total_submissions).toBe(1);
    expect(dashboardRes.body.data.widgets[0].title).toBe('E2E Demo Widget');
  });
});
