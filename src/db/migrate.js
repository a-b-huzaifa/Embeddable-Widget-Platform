const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting database migrations...');

    // Create migrations tracker table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found.');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const res = await client.query('SELECT name FROM schema_migrations WHERE name = $1', [file]);
      if (res.rows.length === 0) {
        console.log(`⏳ Applying migration: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`✅ Applied migration: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`❌ Migration failed: ${file}`, err.message);
          throw err;
        }
      } else {
        console.log(`⏩ Skipping already applied migration: ${file}`);
      }
    }

    console.log('🎉 All migrations completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations().catch((err) => {
    console.error('Migration runner error:', err);
    process.exit(1);
  });
}

module.exports = { runMigrations };
