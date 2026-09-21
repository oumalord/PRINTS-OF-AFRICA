require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.');
}

// Neon requires SSL; sslmode=require in the connection string handles this,
// but we also set it explicitly in case the string is provided without it.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
});

pool.on('error', (err) => {
    console.error('Unexpected Postgres pool error', err);
});

module.exports = pool;
