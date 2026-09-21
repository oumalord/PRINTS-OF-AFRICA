require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const pool = require('./db');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);

app.use(express.json());
app.use(cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
}));

const projectRoot = path.join(__dirname, '..');
app.use('/assets', express.static(path.join(projectRoot, 'assets')));
app.get('/', (req, res) => res.sendFile(path.join(projectRoot, 'index.html')));

// --- Image uploads -------------------------------------------------------

const ALLOWED_IMAGE_MIME_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_IMAGE_MIME_TYPES[file.mimetype]) return cb(new Error('Unsupported file type'));
        cb(null, true);
    }
});

app.post('/api/upload', (req, res) => {
    upload.array('images', 8)(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });
        Promise.all(req.files.map(file => pool.query(
            'INSERT INTO uploaded_images (mime_type, data) VALUES ($1, $2) RETURNING id',
            [file.mimetype, file.buffer]
        )))
            .then(results => res.status(201).json({ urls: results.map(({ rows }) => `/api/uploads/${rows[0].id}`) }))
            .catch(error => {
                console.error(error);
                res.status(500).json({ error: 'Failed to store images in Neon' });
            });
    });
});

app.get('/api/uploads/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT mime_type, data FROM uploaded_images WHERE id = $1',
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Image not found' });
        res.set('Content-Type', rows[0].mime_type);
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.send(rows[0].data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to load image' });
    }
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

function uploadedImageIds(images = []) {
    return images
        .map(image => String(image).match(/\/api\/uploads\/([0-9a-f-]{36})/i)?.[1])
        .filter(Boolean);
}

async function removeUnusedUploadedImages(imageUrls) {
    const ids = uploadedImageIds(imageUrls);
    if (!ids.length) return;
    await pool.query(
        `DELETE FROM uploaded_images image
         WHERE image.id = ANY($1::uuid[])
           AND NOT EXISTS (
               SELECT 1 FROM products product
               WHERE product.image = '/api/uploads/' || image.id::text
                  OR product.images::text LIKE '%' || image.id::text || '%'
           )`,
        [ids]
    );
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
        const previous = await pool.query('SELECT image, images FROM products WHERE id = $1', [id]);
        const nextImages = images && images.length ? images : [image];
        if (Number(stock ?? 0) <= 0 && previous.rows.length) {
            await pool.query('DELETE FROM products WHERE id = $1', [id]);
            await removeUnusedUploadedImages([
                previous.rows[0].image,
                ...(previous.rows[0].images || []),
                image,
                ...nextImages
            ]);
            return res.status(204).end();
        }
        const { rows } = await pool.query(
            `INSERT INTO products (id, name, category, price, color, swatches, sizes, image, images, description, tag, stock)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, category = EXCLUDED.category, price = EXCLUDED.price,
                color = EXCLUDED.color, swatches = EXCLUDED.swatches, sizes = EXCLUDED.sizes,
                image = EXCLUDED.image, images = EXCLUDED.images, description = EXCLUDED.description, tag = EXCLUDED.tag,
                stock = EXCLUDED.stock, updated_at = now()
             RETURNING *`,
            [id, name, category, price, color, JSON.stringify(swatches || []), JSON.stringify(sizes || []), image, JSON.stringify(nextImages), description, tag || 'New Arrival', stock ?? 0]
        );
        if (previous.rows.length) {
            await removeUnusedUploadedImages([
                previous.rows[0].image,
                ...(previous.rows[0].images || [])
            ]);
        }
        res.status(201).json(rowToProduct(rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save product' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const previous = await pool.query('SELECT image, images FROM products WHERE id = $1', [req.params.id]);
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        if (previous.rows.length) {
            await removeUnusedUploadedImages([
                previous.rows[0].image,
                ...(previous.rows[0].images || [])
            ]);
        }
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

// Vercel imports the Express app as a serverless function; local development
// still starts the regular HTTP server through `npm start`.
if (require.main === module) {
    app.listen(PORT, () => console.log(`Prints of Africa API listening on port ${PORT}`));
}

module.exports = app;
