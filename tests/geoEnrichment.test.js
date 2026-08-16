const { GeoEnrichmentService } = require('../src/services/geoService');
const submissionService = require('../src/services/submissionService');
const widgetRepository = require('../src/repositories/widgetRepository');
const submissionRepository = require('../src/repositories/submissionRepository');

jest.mock('../src/repositories/widgetRepository');
jest.mock('../src/repositories/submissionRepository');

describe('IP-to-Geo Enrichment with Fallback Chain (Stage 9)', () => {
  const WIDGET_ID = '99999999-9999-9999-9999-999999999999';
  const TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const PUBLIC_IP = '198.51.100.42';

  const mockWidget = {
    id: WIDGET_ID,
    tenant_id: TENANT_ID,
    type: 'lead_capture',
    title: 'Geo-Enabled Widget'
  };

  // Mock Provider A (ip-api.com)
  class MockProviderA {
    constructor(shouldSucceed = true) {
      this.name = 'ip-api.com';
      this.shouldSucceed = shouldSucceed;
    }

    async lookup(ip) {
      if (!this.shouldSucceed) {
        throw new Error('Connection timeout to ip-api.com');
      }
      return {
        country: 'United States',
        country_code: 'US',
        city: 'Austin',
        region: 'Texas',
        latitude: 30.2672,
        longitude: -97.7431,
        provider: this.name
      };
    }
  }

  // Mock Provider B (ipapi.co)
  class MockProviderB {
    constructor(shouldSucceed = true) {
      this.name = 'ipapi.co';
      this.shouldSucceed = shouldSucceed;
    }

    async lookup(ip) {
      if (!this.shouldSucceed) {
        throw new Error('Rate limit exceeded on ipapi.co');
      }
      return {
        country: 'Canada',
        country_code: 'CA',
        city: 'Toronto',
        region: 'Ontario',
        latitude: 43.6532,
        longitude: -79.3832,
        provider: this.name
      };
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
    widgetRepository.findWidgetById.mockResolvedValue(mockWidget);
  });

  describe('1. GeoEnrichmentService Fallback Chain Unit Tests', () => {
    test('Provider A succeeds: returns Provider A geo data without calling Provider B', async () => {
      const providerA = new MockProviderA(true);
      const providerB = new MockProviderB(true);
      const spyB = jest.spyOn(providerB, 'lookup');

      const service = new GeoEnrichmentService([providerA, providerB]);
      const result = await service.resolveIpGeo(PUBLIC_IP);

      expect(result).not.toBeNull();
      expect(result.country).toBe('United States');
      expect(result.city).toBe('Austin');
      expect(result.provider).toBe('ip-api.com');
      expect(spyB).not.toHaveBeenCalled();
    });

    test('Provider A fails, Provider B succeeds: falls back to Provider B', async () => {
      const providerA = new MockProviderA(false); // Provider A down
      const providerB = new MockProviderB(true);  // Provider B up

      const service = new GeoEnrichmentService([providerA, providerB]);
      const result = await service.resolveIpGeo(PUBLIC_IP);

      expect(result).not.toBeNull();
      expect(result.country).toBe('Canada');
      expect(result.city).toBe('Toronto');
      expect(result.provider).toBe('ipapi.co');
    });

    test('Both Provider A and Provider B fail: returns null without throwing', async () => {
      const providerA = new MockProviderA(false); // Provider A down
      const providerB = new MockProviderB(false); // Provider B down

      const service = new GeoEnrichmentService([providerA, providerB]);
      const result = await service.resolveIpGeo(PUBLIC_IP);

      expect(result).toBeNull();
    });

    test('Private/Localhost IP (127.0.0.1): skips external lookups and returns null', async () => {
      const providerA = new MockProviderA(true);
      const spyA = jest.spyOn(providerA, 'lookup');

      const service = new GeoEnrichmentService([providerA]);
      const result = await service.resolveIpGeo('127.0.0.1');

      expect(result).toBeNull();
      expect(spyA).not.toHaveBeenCalled();
    });
  });

  describe('2. Submission Flow Integration with Fallback Chain', () => {
    test('Scenario 1: Provider A succeeds -> submission stored with Provider A geo data', async () => {
      const mockProviders = [new MockProviderA(true), new MockProviderB(false)];

      submissionRepository.createSubmission.mockImplementation((data) => ({
        id: 'sub-1111',
        ...data,
        created_at: new Date().toISOString()
      }));

      const res = await submissionService.submitLead({
        widgetId: WIDGET_ID,
        payload: { email: 'lead1@example.com' },
        clientIp: PUBLIC_IP,
        geoProviders: mockProviders
      });

      expect(res.status).toBe('new');
      expect(submissionRepository.createSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          widgetId: WIDGET_ID,
          tenantId: TENANT_ID,
          geo: expect.objectContaining({
            country: 'United States',
            city: 'Austin',
            provider: 'ip-api.com',
            client_ip: PUBLIC_IP
          })
        })
      );
    });

    test('Scenario 2: Provider A fails, Provider B succeeds -> submission stored with Provider B geo data', async () => {
      const mockProviders = [new MockProviderA(false), new MockProviderB(true)];

      submissionRepository.createSubmission.mockImplementation((data) => ({
        id: 'sub-2222',
        ...data,
        created_at: new Date().toISOString()
      }));

      const res = await submissionService.submitLead({
        widgetId: WIDGET_ID,
        payload: { email: 'lead2@example.com' },
        clientIp: PUBLIC_IP,
        geoProviders: mockProviders
      });

      expect(res.status).toBe('new');
      expect(submissionRepository.createSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          widgetId: WIDGET_ID,
          tenantId: TENANT_ID,
          geo: expect.objectContaining({
            country: 'Canada',
            city: 'Toronto',
            provider: 'ipapi.co',
            client_ip: PUBLIC_IP
          })
        })
      );
    });

    test('Scenario 3: Both providers fail -> submission is STILL stored successfully (graceful degradation)', async () => {
      const mockProviders = [new MockProviderA(false), new MockProviderB(false)];

      submissionRepository.createSubmission.mockImplementation((data) => ({
        id: 'sub-3333',
        ...data,
        created_at: new Date().toISOString()
      }));

      const res = await submissionService.submitLead({
        widgetId: WIDGET_ID,
        payload: { email: 'lead3@example.com' },
        clientIp: PUBLIC_IP,
        geoProviders: mockProviders
      });

      expect(res.status).toBe('new');
      expect(submissionRepository.createSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          widgetId: WIDGET_ID,
          tenantId: TENANT_ID,
          geo: expect.objectContaining({
            client_ip: PUBLIC_IP
          })
        })
      );
    });
  });
});
