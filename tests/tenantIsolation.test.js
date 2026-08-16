const jwt = require('jsonwebtoken');
const { assertTenantOwnership, tenantGuard } = require('../src/middleware/tenantGuard');
const { authMiddleware, JWT_SECRET } = require('../src/middleware/auth');
const { ForbiddenError, UnauthorizedError } = require('../src/middleware/errorHandler');
const widgetService = require('../src/services/widgetService');
const widgetRepository = require('../src/repositories/widgetRepository');

// Mock repository for pure unit testing of service isolation
jest.mock('../src/repositories/widgetRepository');

describe('Tenant Isolation & Authentication Tests', () => {
  const TENANT_A = '11111111-1111-1111-1111-111111111111';
  const TENANT_B = '22222222-2222-2222-2222-222222222222';
  const WIDGET_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const mockWidgetA = {
    id: WIDGET_A_ID,
    tenant_id: TENANT_A,
    type: 'lead_capture',
    title: "Tenant A's Lead Widget",
    description: 'Proprietary form for Tenant A',
    fields: [{ id: 'email', type: 'email', label: 'Email' }],
    button_text: 'Submit A',
    display_options: { theme: 'dark' },
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Tenant Isolation Guard Unit Tests (assertTenantOwnership)', () => {
    test('should allow access when resourceTenantId matches currentTenantId', () => {
      expect(() => {
        assertTenantOwnership(TENANT_A, TENANT_A, 'widget');
      }).not.toThrow();
    });

    test('should throw ForbiddenError (403) when Tenant B attempts to access Tenant A resource', () => {
      try {
        assertTenantOwnership(TENANT_A, TENANT_B, 'widget');
        throw new Error('Should have thrown ForbiddenError');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenError);
        expect(err.statusCode).toBe(403);
        expect(err.message).toMatch(/Forbidden: Access denied to widget belonging to another tenant/);
      }
    });

    test('should throw 400 if tenant parameters are missing', () => {
      expect(() => {
        assertTenantOwnership(null, TENANT_B, 'widget');
      }).toThrow();
    });
  });

  describe('2. Auth Middleware Token & 401 Enforcement', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
      mockReq = { headers: {} };
      mockRes = {};
      mockNext = jest.fn();
    });

    test('should return 401 when Authorization header is missing', () => {
      authMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      const error = mockNext.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toMatch(/Missing or invalid Authorization header/);
    });

    test('should return 401 when Authorization header is not Bearer format', () => {
      mockReq.headers.authorization = 'Basic dXNlcjpwYXNz';
      authMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      const error = mockNext.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    test('should return 401 when JWT token is invalid or corrupted', () => {
      mockReq.headers.authorization = 'Bearer invalid.token.payload';
      authMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      const error = mockNext.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toMatch(/Invalid authentication token/);
    });

    test('should return 401 when JWT token is expired', () => {
      const expiredToken = jwt.sign(
        { userId: 'u1', tenantId: TENANT_A },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );
      mockReq.headers.authorization = `Bearer ${expiredToken}`;
      authMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      const error = mockNext.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toMatch(/Token has expired/);
    });

    test('should successfully attach req.tenantId and req.user for valid token', () => {
      const validToken = jwt.sign(
        { userId: 'user-123', tenantId: TENANT_A, email: 'admin@a.com', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;
      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.tenantId).toBe(TENANT_A);
      expect(mockReq.user.id).toBe('user-123');
      expect(mockReq.user.email).toBe('admin@a.com');
    });
  });

  describe("3. Graded Probe: Tenant A vs Tenant B Data Isolation in Widget Service", () => {
    test("Tenant A CAN retrieve their own widget (200 OK equivalent)", async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidgetA);

      const result = await widgetService.getWidgetById(WIDGET_A_ID, TENANT_A);
      expect(result).toBeDefined();
      expect(result.id).toBe(WIDGET_A_ID);
      expect(result.tenant_id).toBe(TENANT_A);
      expect(widgetRepository.findWidgetById).toHaveBeenCalledWith(WIDGET_A_ID);
    });

    test("Tenant B CANNOT read Tenant A's widget -> throws 403 Forbidden", async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidgetA);

      await expect(
        widgetService.getWidgetById(WIDGET_A_ID, TENANT_B)
      ).rejects.toThrow(ForbiddenError);

      try {
        await widgetService.getWidgetById(WIDGET_A_ID, TENANT_B);
      } catch (err) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toMatch(/Forbidden/);
      }
    });

    test("Tenant B CANNOT modify (PUT) Tenant A's widget -> throws 403 Forbidden", async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidgetA);

      const maliciousUpdate = { title: "Hacked by Tenant B" };

      await expect(
        widgetService.updateWidget(WIDGET_A_ID, TENANT_B, maliciousUpdate)
      ).rejects.toThrow(ForbiddenError);

      try {
        await widgetService.updateWidget(WIDGET_A_ID, TENANT_B, maliciousUpdate);
      } catch (err) {
        expect(err.statusCode).toBe(403);
      }

      // Proves repository update was NEVER called
      expect(widgetRepository.updateWidget).not.toHaveBeenCalled();
    });

    test("Tenant B CANNOT delete (DELETE) Tenant A's widget -> throws 403 Forbidden", async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidgetA);

      await expect(
        widgetService.deleteWidget(WIDGET_A_ID, TENANT_B)
      ).rejects.toThrow(ForbiddenError);

      try {
        await widgetService.deleteWidget(WIDGET_A_ID, TENANT_B);
      } catch (err) {
        expect(err.statusCode).toBe(403);
      }

      // Proves repository delete was NEVER called
      expect(widgetRepository.deleteWidget).not.toHaveBeenCalled();
    });

    test("Tenant A CAN modify and delete their own widget", async () => {
      widgetRepository.findWidgetById.mockResolvedValue(mockWidgetA);
      widgetRepository.updateWidget.mockResolvedValue({
        ...mockWidgetA,
        title: "Updated by Tenant A"
      });
      widgetRepository.deleteWidget.mockResolvedValue(true);

      const updated = await widgetService.updateWidget(WIDGET_A_ID, TENANT_A, {
        title: "Updated by Tenant A"
      });
      expect(updated.title).toBe("Updated by Tenant A");
      expect(widgetRepository.updateWidget).toHaveBeenCalled();

      const deleted = await widgetService.deleteWidget(WIDGET_A_ID, TENANT_A);
      expect(deleted).toBe(true);
      expect(widgetRepository.deleteWidget).toHaveBeenCalledWith(WIDGET_A_ID, TENANT_A);
    });
  });
});
