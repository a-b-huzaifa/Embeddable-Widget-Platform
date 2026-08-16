const { pool } = require('./index');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting database seed...');
    await client.query('BEGIN');

    // 1. Insert Demo Tenant (Upsert by slug)
    const tenantRes = await client.query(`
      INSERT INTO tenants (name, slug)
      VALUES ('Acme Corp', 'acme-corp')
      ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP
      RETURNING id, name, slug;
    `);
    const demoTenant = tenantRes.rows[0];
    console.log(`✅ Tenant ready: ${demoTenant.name} (${demoTenant.id})`);

    // 2. Insert Demo Admin User for Tenant
    const userRes = await client.query(`
      INSERT INTO users (tenant_id, email, password_hash, role)
      VALUES (
        $1,
        'admin@acme.example.com',
        '$2b$10$demoHashedPasswordPlaceHolder1234567890123456789012345678',
        'admin'
      )
      ON CONFLICT (email) DO UPDATE
      SET tenant_id = EXCLUDED.tenant_id, updated_at = CURRENT_TIMESTAMP
      RETURNING id, email, role;
    `, [demoTenant.id]);
    const demoUser = userRes.rows[0];
    console.log(`✅ User ready: ${demoUser.email} (${demoUser.id})`);

    // 3. Insert Demo Widget
    const sampleFields = JSON.stringify([
      {
        id: 'full_name',
        label: 'Full Name',
        type: 'text',
        required: true,
        placeholder: 'Jane Doe'
      },
      {
        id: 'email',
        label: 'Business Email',
        type: 'email',
        required: true,
        placeholder: 'jane@company.com'
      },
      {
        id: 'company_size',
        label: 'Company Size',
        type: 'select',
        required: false,
        options: ['1-10', '11-50', '51-200', '200+']
      },
      {
        id: 'message',
        label: 'How can we help?',
        type: 'textarea',
        required: false,
        placeholder: 'Tell us about your project...'
      }
    ]);

    const sampleDisplayOptions = JSON.stringify({
      theme: 'dark',
      primary_color: '#3b82f6',
      background_color: '#0f172a',
      text_color: '#f8fafc',
      position: 'bottom-right',
      trigger: 'delay',
      trigger_delay_ms: 3000,
      allowed_domains: ['example.com', 'localhost']
    });

    const widgetRes = await client.query(`
      INSERT INTO widgets (tenant_id, type, title, description, fields, button_text, display_options)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb)
      RETURNING id, title, type;
    `, [
      demoTenant.id,
      'lead_capture',
      'Request a Product Demo',
      'Fill out the form below to get in touch with our enterprise sales team.',
      sampleFields,
      'Get Started',
      sampleDisplayOptions
    ]);
    const demoWidget = widgetRes.rows[0];
    console.log(`✅ Widget ready: "${demoWidget.title}" (${demoWidget.id})`);

    await client.query('COMMIT');
    console.log('🎉 Seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seed runner error:', err);
    process.exit(1);
  });
}

module.exports = { seed };
