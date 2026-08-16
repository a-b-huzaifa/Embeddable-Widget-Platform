const db = require('../db');

async function createWidget(
  {
    tenantId,
    type = 'lead_capture',
    title,
    description = '',
    fields = [],
    buttonText = 'Submit',
    displayOptions = {}
  },
  client = db
) {
  const query = `
    INSERT INTO widgets (
      tenant_id, type, title, description, fields, button_text, display_options
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb)
    RETURNING id, tenant_id, type, title, description, fields, button_text, display_options, created_at, updated_at;
  `;
  const result = await client.query(query, [
    tenantId,
    type,
    title,
    description,
    JSON.stringify(fields),
    buttonText,
    JSON.stringify(displayOptions)
  ]);
  return result.rows[0];
}

async function listWidgetsByTenant(tenantId, client = db) {
  const query = `
    SELECT id, tenant_id, type, title, description, fields, button_text, display_options, created_at, updated_at
    FROM widgets
    WHERE tenant_id = $1
    ORDER BY created_at DESC;
  `;
  const result = await client.query(query, [tenantId]);
  return result.rows;
}

async function findWidgetById(id, client = db) {
  const query = `
    SELECT id, tenant_id, type, title, description, fields, button_text, display_options, created_at, updated_at
    FROM widgets
    WHERE id = $1;
  `;
  const result = await client.query(query, [id]);
  return result.rows[0] || null;
}

async function findWidgetByIdAndTenant(id, tenantId, client = db) {
  const query = `
    SELECT id, tenant_id, type, title, description, fields, button_text, display_options, created_at, updated_at
    FROM widgets
    WHERE id = $1 AND tenant_id = $2;
  `;
  const result = await client.query(query, [id, tenantId]);
  return result.rows[0] || null;
}

async function updateWidget(
  {
    id,
    tenantId,
    type,
    title,
    description,
    fields,
    buttonText,
    displayOptions
  },
  client = db
) {
  const query = `
    UPDATE widgets
    SET
      type = COALESCE($3, type),
      title = COALESCE($4, title),
      description = COALESCE($5, description),
      fields = COALESCE($6::jsonb, fields),
      button_text = COALESCE($7, button_text),
      display_options = COALESCE($8::jsonb, display_options),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND tenant_id = $2
    RETURNING id, tenant_id, type, title, description, fields, button_text, display_options, created_at, updated_at;
  `;
  const result = await client.query(query, [
    id,
    tenantId,
    type,
    title,
    description,
    fields !== undefined ? JSON.stringify(fields) : null,
    buttonText,
    displayOptions !== undefined ? JSON.stringify(displayOptions) : null
  ]);
  return result.rows[0] || null;
}

async function deleteWidget(id, tenantId, client = db) {
  const query = `
    DELETE FROM widgets
    WHERE id = $1 AND tenant_id = $2
    RETURNING id;
  `;
  const result = await client.query(query, [id, tenantId]);
  return result.rowCount > 0;
}

module.exports = {
  createWidget,
  listWidgetsByTenant,
  findWidgetById,
  findWidgetByIdAndTenant,
  updateWidget,
  deleteWidget
};
