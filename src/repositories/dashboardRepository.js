const db = require('../db');

/**
 * Dashboard & Analytics Data Access Layer
 * All queries strictly enforce tenant scoping with parameterized SQL.
 */

async function getOverviewStats(tenantId, client = db) {
  const query = `
    SELECT
      (SELECT COUNT(*) FROM widgets WHERE tenant_id = $1) AS total_widgets,
      (SELECT COUNT(*) FROM submissions WHERE tenant_id = $1) AS total_submissions,
      (SELECT COUNT(*) FROM submissions WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days') AS submissions_7d,
      (SELECT COUNT(*) FROM submissions WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days') AS submissions_30d;
  `;
  const result = await client.query(query, [tenantId]);
  const row = result.rows[0];
  return {
    total_widgets: parseInt(row.total_widgets, 10) || 0,
    total_submissions: parseInt(row.total_submissions, 10) || 0,
    submissions_7d: parseInt(row.submissions_7d, 10) || 0,
    submissions_30d: parseInt(row.submissions_30d, 10) || 0
  };
}

async function getSubmissionsOverTime(tenantId, days = 30, client = db) {
  const query = `
    SELECT
      TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS date,
      COUNT(*) AS count
    FROM submissions
    WHERE tenant_id = $1 AND created_at >= NOW() - ($2 || ' days')::INTERVAL
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY DATE_TRUNC('day', created_at) ASC;
  `;
  const result = await client.query(query, [tenantId, days]);
  return result.rows.map((row) => ({
    date: row.date,
    count: parseInt(row.count, 10) || 0
  }));
}

async function getPerWidgetStats(tenantId, client = db) {
  const query = `
    SELECT
      w.id AS widget_id,
      w.title,
      w.type,
      w.button_text,
      COUNT(s.id) AS submission_count,
      MAX(s.created_at) AS latest_submission_at,
      w.created_at AS widget_created_at
    FROM widgets w
    LEFT JOIN submissions s ON w.id = s.widget_id AND s.tenant_id = w.tenant_id
    WHERE w.tenant_id = $1
    GROUP BY w.id, w.title, w.type, w.button_text, w.created_at
    ORDER BY submission_count DESC, w.created_at DESC;
  `;
  const result = await client.query(query, [tenantId]);
  return result.rows.map((row) => ({
    widget_id: row.widget_id,
    title: row.title,
    type: row.type,
    button_text: row.button_text,
    submission_count: parseInt(row.submission_count, 10) || 0,
    latest_submission_at: row.latest_submission_at,
    widget_created_at: row.widget_created_at
  }));
}

async function getGeoBreakdown(tenantId, client = db) {
  const query = `
    SELECT
      COALESCE(geo->>'country', 'Unknown') AS country,
      COALESCE(geo->>'country_code', 'XX') AS country_code,
      COUNT(*) AS count
    FROM submissions
    WHERE tenant_id = $1
    GROUP BY country, country_code
    ORDER BY count DESC;
  `;
  const result = await client.query(query, [tenantId]);
  const total = result.rows.reduce((sum, row) => sum + (parseInt(row.count, 10) || 0), 0);

  return result.rows.map((row) => {
    const count = parseInt(row.count, 10) || 0;
    return {
      country: row.country,
      country_code: row.country_code,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0
    };
  });
}

async function getRecentSubmissions(tenantId, limit = 10, client = db) {
  const query = `
    SELECT
      s.id,
      s.widget_id,
      w.title AS widget_title,
      s.payload,
      s.geo,
      s.status,
      s.created_at
    FROM submissions s
    JOIN widgets w ON s.widget_id = w.id
    WHERE s.tenant_id = $1
    ORDER BY s.created_at DESC
    LIMIT $2;
  `;
  const result = await client.query(query, [tenantId, limit]);
  return result.rows;
}

module.exports = {
  getOverviewStats,
  getSubmissionsOverTime,
  getPerWidgetStats,
  getGeoBreakdown,
  getRecentSubmissions
};
