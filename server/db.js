require('dotenv').config();
const { Pool } = require('pg');

// Neon requires SSL; sslmode=require in the connection string handles this,
// but we also set it explicitly in case the string is provided without it.
const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: true },
        connectionTimeoutMillis: 10000,
        query_timeout: 15000,
        statement_timeout: 15000,
        keepAlive: true
    })
    : {
        query: async () => {
            throw new Error('DATABASE_URL is not configured');
        },
        on: () => {},
        end: async () => {}
    };

pool.on('error', (err) => {
    console.error('Unexpected Postgres pool error', err);
});

module.exports = pool;
