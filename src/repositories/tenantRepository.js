const db = require('../db');

async function createTenant({ name, slug }, client = db) {
  const query = `
    INSERT INTO tenants (name, slug)
    VALUES ($1, $2)
    RETURNING id, name, slug, created_at, updated_at;
  `;
  const result = await client.query(query, [name, slug]);
  return result.rows[0];
}

async function findTenantById(id, client = db) {
  const query = `
    SELECT id, name, slug, created_at, updated_at
    FROM tenants
    WHERE id = $1;
  `;
  const result = await client.query(query, [id]);
  return result.rows[0] || null;
}

async function findTenantBySlug(slug, client = db) {
  const query = `
    SELECT id, name, slug, created_at, updated_at
    FROM tenants
    WHERE slug = $1;
  `;
  const result = await client.query(query, [slug]);
  return result.rows[0] || null;
}

module.exports = {
  createTenant,
  findTenantById,
  findTenantBySlug
};
