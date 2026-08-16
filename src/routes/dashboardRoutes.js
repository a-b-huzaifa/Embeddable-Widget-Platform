const express = require('express');
const cors = require('cors');
const router = express.Router();
const dashboardService = require('../services/dashboardService');
const { authMiddleware } = require('../middleware/auth');

router.use(cors());

// All dashboard endpoints require valid JWT authentication
router.use(authMiddleware);

/**
 * GET /api/dashboard/overview (and /api/dashboard)
 * Aggregated tenant summary overview
 */
async function handleOverview(req, res, next) {
  try {
    const overview = await dashboardService.getDashboardOverview(req.tenantId);
    res.status(200).json({
      success: true,
      data: overview
    });
  } catch (err) {
    next(err);
  }
}

router.get('/overview', handleOverview);
router.get('/', handleOverview);

/**
 * GET /api/dashboard/submissions-over-time
 * Time-series aggregated submission counts
 */
router.get('/submissions-over-time', async (req, res, next) => {
  try {
    const days = req.query.days || 30;
    const data = await dashboardService.getSubmissionsOverTime(req.tenantId, days);
    res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/widgets
 * Per-widget performance stats and submission volume
 */
router.get('/widgets', async (req, res, next) => {
  try {
    const data = await dashboardService.getPerWidgetStats(req.tenantId);
    res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/geo
 * Geo-demographic aggregation breakdown
 */
router.get('/geo', async (req, res, next) => {
  try {
    const data = await dashboardService.getGeoBreakdown(req.tenantId);
    res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/recent-submissions
 * Recent inbound leads for the tenant
 */
router.get('/recent-submissions', async (req, res, next) => {
  try {
    const limit = req.query.limit || 10;
    const data = await dashboardService.getRecentSubmissions(req.tenantId, limit);
    res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
