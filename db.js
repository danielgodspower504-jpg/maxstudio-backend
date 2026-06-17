// db.js
// Connects to a Postgres database (Render and Supabase both give you one for free)
// and makes sure the tables we need exist.

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }
});

async function initDb() {
  // users table: stores accounts and their credit balance
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      credits_used INTEGER NOT NULL DEFAULT 0,
      credits_limit INTEGER NOT NULL DEFAULT 15,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // generations table: a log of every image a user creates (useful for history/abuse checks)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS generations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      style TEXT,
      image_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log('Database tables ready.');
}

module.exports = { pool, initDb };
