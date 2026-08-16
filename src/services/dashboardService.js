const dashboardRepository = require('../repositories/dashboardRepository');
const { BadRequestError } = require('../middleware/errorHandler');

/**
 * Dashboard & Analytics Business Logic Layer
 */

async function getDashboardOverview(tenantId) {
  if (!tenantId) {
    throw new BadRequestError('Tenant ID is required');
  }

  const [stats, submissionsOverTime, widgetStats, geoBreakdown, recentSubmissions] = await Promise.all([
    dashboardRepository.getOverviewStats(tenantId),
    dashboardRepository.getSubmissionsOverTime(tenantId, 30),
    dashboardRepository.getPerWidgetStats(tenantId),
    dashboardRepository.getGeoBreakdown(tenantId),
    dashboardRepository.getRecentSubmissions(tenantId, 5)
  ]);

  return {
    summary: stats,
    submissions_over_time: submissionsOverTime,
    widgets: widgetStats,
    geo_breakdown: geoBreakdown,
    recent_submissions: recentSubmissions
  };
}

async function getSubmissionsOverTime(tenantId, days = 30) {
  if (!tenantId) {
    throw new BadRequestError('Tenant ID is required');
  }
  const parsedDays = Math.min(Math.max(parseInt(days, 10) || 30, 1), 365);
  return dashboardRepository.getSubmissionsOverTime(tenantId, parsedDays);
}

async function getPerWidgetStats(tenantId) {
  if (!tenantId) {
    throw new BadRequestError('Tenant ID is required');
  }
  return dashboardRepository.getPerWidgetStats(tenantId);
}

async function getGeoBreakdown(tenantId) {
  if (!tenantId) {
    throw new BadRequestError('Tenant ID is required');
  }
  return dashboardRepository.getGeoBreakdown(tenantId);
}

async function getRecentSubmissions(tenantId, limit = 10) {
  if (!tenantId) {
    throw new BadRequestError('Tenant ID is required');
  }
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  return dashboardRepository.getRecentSubmissions(tenantId, parsedLimit);
}

module.exports = {
  getDashboardOverview,
  getSubmissionsOverTime,
  getPerWidgetStats,
  getGeoBreakdown,
  getRecentSubmissions
};
