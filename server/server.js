require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pool = require('./db');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);

app.use(express.json());
app.use(cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
}));

// --- Image uploads -------------------------------------------------------

const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_IMAGE_MIME_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
};

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadsDir),
        // Random filename avoids path traversal / collisions from user-supplied names.
        filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED_IMAGE_MIME_TYPES[file.mimetype]}`)
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_IMAGE_MIME_TYPES[file.mimetype]) return cb(new Error('Unsupported file type'));
        cb(null, true);
    }
});

app.use('/uploads', express.static(uploadsDir));

app.post('/api/upload', (req, res) => {
    upload.array('images', 8)(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });
        res.status(201).json({ urls: req.files.map(file => `/uploads/${file.filename}`) });
    });
});

function rowToProduct(row) {
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        price: Number(row.price),
        color: row.color,
        swatches: row.swatches,
        sizes: row.sizes,
        image: row.image,
        images: row.images && row.images.length ? row.images : [row.image],
        description: row.description,
        tag: row.tag,
        stock: row.stock
    };
}

function rowToOrder(row) {
    return {
        id: row.id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        deliveryLocation: row.delivery_location,
        items: row.items,
        total: Number(row.total),
        status: row.status,
        createdAt: row.created_at
    };
}

// --- Products ---------------------------------------------------------

app.get('/api/products', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
        res.json(rows.map(rowToProduct));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load products' });
    }
});

app.post('/api/products', async (req, res) => {
    const { id, name, category, price, color, swatches, sizes, image, images, description, tag, stock } = req.body;
    if (!id || !name || !category || price == null || !color || !image || !description) {
        return res.status(400).json({ error: 'Missing required product fields' });
    }
    try {
        const { rows } = await pool.query(
            `INSERT INTO products (id, name, category, price, color, swatches, sizes, image, images, description, tag, stock)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, category = EXCLUDED.category, price = EXCLUDED.price,
                color = EXCLUDED.color, swatches = EXCLUDED.swatches, sizes = EXCLUDED.sizes,
                image = EXCLUDED.image, images = EXCLUDED.images, description = EXCLUDED.description, tag = EXCLUDED.tag,
                stock = EXCLUDED.stock, updated_at = now()
             RETURNING *`,
            [id, name, category, price, color, JSON.stringify(swatches || []), JSON.stringify(sizes || []), image, JSON.stringify(images && images.length ? images : [image]), description, tag || 'New Arrival', stock ?? 0]
        );
        res.status(201).json(rowToProduct(rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save product' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// --- Orders -------------------------------------------------------------

app.get('/api/orders', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(rows.map(rowToOrder));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load orders' });
    }
});

app.post('/api/orders', async (req, res) => {
    const { id, customerName, customerPhone, deliveryLocation, items, total, status } = req.body;
    if (!id || !customerName || !customerPhone || !deliveryLocation || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Missing required order fields' });
    }
    try {
        const { rows } = await pool.query(
            `INSERT INTO orders (id, customer_name, customer_phone, delivery_location, items, total, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             RETURNING *`,
            [id, customerName, customerPhone, deliveryLocation, JSON.stringify(items), total || 0, status || 'Pending']
        );
        res.status(201).json(rowToOrder(rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save order' });
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Missing status' });
    try {
        const { rows } = await pool.query(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Order not found' });
        res.json(rowToOrder(rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Prints of Africa API listening on port ${PORT}`));
