-- Run this once against your Neon database to create the required tables.
-- In the Neon console: open the SQL editor for your project and paste this in,
-- or run: psql "$DATABASE_URL" -f schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    category     TEXT NOT NULL,
    price        NUMERIC(10, 2) NOT NULL,
    color        TEXT NOT NULL,
    swatches     JSONB NOT NULL DEFAULT '[]',
    sizes        JSONB NOT NULL DEFAULT '[]',
    image        TEXT NOT NULL,
    images       JSONB NOT NULL DEFAULT '[]',
    description  TEXT NOT NULL,
    tag          TEXT NOT NULL DEFAULT 'New Arrival',
    stock        INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Run this if the table already existed before the "images" gallery column was added.
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS uploaded_images (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mime_type  TEXT NOT NULL,
    data       BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
    id                 TEXT PRIMARY KEY,
    customer_name      TEXT NOT NULL,
    customer_phone     TEXT NOT NULL,
    delivery_location  TEXT NOT NULL,
    items              JSONB NOT NULL DEFAULT '[]',
    total              NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status             TEXT NOT NULL DEFAULT 'Pending',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
