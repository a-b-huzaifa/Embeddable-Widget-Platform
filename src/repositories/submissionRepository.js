const db = require('../db');

async function createSubmission(
  {
    widgetId,
    tenantId,
    payload,
    geo = null,
    status = 'new'
  },
  client = db
) {
  const query = `
    INSERT INTO submissions (
      widget_id, tenant_id, payload, geo, status
    )
    VALUES ($1, $2, $3::jsonb, $4, $5)
    RETURNING id, widget_id, tenant_id, payload, geo, status, created_at;
  `;
  const result = await client.query(query, [
    widgetId,
    tenantId,
    JSON.stringify(payload),
    geo ? JSON.stringify(geo) : null,
    status
  ]);
  return result.rows[0];
}

async function listSubmissionsByWidget(widgetId, tenantId, client = db) {
  const query = `
    SELECT id, widget_id, tenant_id, payload, geo, status, created_at
    FROM submissions
    WHERE widget_id = $1 AND tenant_id = $2
    ORDER BY created_at DESC;
  `;
  const result = await client.query(query, [widgetId, tenantId]);
  return result.rows;
}

async function listSubmissionsByTenant(tenantId, client = db) {
  const query = `
    SELECT id, widget_id, tenant_id, payload, geo, status, created_at
    FROM submissions
    WHERE tenant_id = $1
    ORDER BY created_at DESC;
  `;
  const result = await client.query(query, [tenantId]);
  return result.rows;
}

module.exports = {
  createSubmission,
  listSubmissionsByWidget,
  listSubmissionsByTenant
};
