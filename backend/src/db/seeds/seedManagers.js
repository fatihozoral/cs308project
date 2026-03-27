/**
 * Seed Script: Default Manager Accounts
 * CS 308 Online Ticketing Project
 *
 * Creates default sales_manager and product_manager accounts
 * Password for both: Admin1234!
 */

const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seedManagers() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting seed process for manager accounts...');

    // Generate bcrypt hash for password: Admin1234!
    const password = 'Admin1234!';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log('🔐 Password hash generated');

    // Insert managers
    const salesManager = {
      name: 'Sales Manager',
      email: 'sales@ticketing.com',
      password_hash: passwordHash,
      tax_id: '11111111111',
      home_address: 'HQ',
      role: 'sales_manager'
    };

    const productManager = {
      name: 'Product Manager',
      email: 'product@ticketing.com',
      password_hash: passwordHash,
      tax_id: '22222222222',
      home_address: 'HQ',
      role: 'product_manager'
    };

    // Insert sales manager
    await client.query(
      `INSERT INTO users (name, email, password_hash, tax_id, home_address, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [salesManager.name, salesManager.email, salesManager.password_hash,
       salesManager.tax_id, salesManager.home_address, salesManager.role]
    );
    console.log('✅ Sales Manager seeded: sales@ticketing.com');

    // Insert product manager
    await client.query(
      `INSERT INTO users (name, email, password_hash, tax_id, home_address, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [productManager.name, productManager.email, productManager.password_hash,
       productManager.tax_id, productManager.home_address, productManager.role]
    );
    console.log('✅ Product Manager seeded: product@ticketing.com');

    console.log('🎉 Seed process completed successfully!');
    console.log('📝 Login credentials:');
    console.log('   Sales Manager: sales@ticketing.com / Admin1234!');
    console.log('   Product Manager: product@ticketing.com / Admin1234!');

  } catch (error) {
    console.error('❌ Error seeding managers:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedManagers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = seedManagers;
