const db = require('../db');

async function createUser({ tenantId, email, passwordHash, role = 'admin' }, client = db) {
  const query = `
    INSERT INTO users (tenant_id, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, tenant_id, email, role, created_at, updated_at;
  `;
  const result = await client.query(query, [tenantId, email, passwordHash, role]);
  return result.rows[0];
}

async function findUserByEmail(email, client = db) {
  const query = `
    SELECT id, tenant_id, email, password_hash, role, created_at, updated_at
    FROM users
    WHERE email = $1;
  `;
  const result = await client.query(query, [email]);
  return result.rows[0] || null;
}

async function findUserById(id, client = db) {
  const query = `
    SELECT id, tenant_id, email, role, created_at, updated_at
    FROM users
    WHERE id = $1;
  `;
  const result = await client.query(query, [id]);
  return result.rows[0] || null;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById
};
