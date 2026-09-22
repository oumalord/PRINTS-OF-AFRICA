// One-off script to load the storefront's default catalog into Neon.
// Usage: npm run seed
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('./db');

const DEFAULT_PRODUCTS = [
    { id: 'pa-001', name: 'Asymmetric High-Low Cape Top', category: 'tops', price: 4500, color: 'Emerald Green', swatches: ['#004D40', '#C85A32', '#4A154B', '#141414'], sizes: [8, 10, 12, 14, 16, 18, 20, 22], image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80', description: 'Signature flowing silhouette with dramatic asymmetric drop drape. Designed for maximum elegance and modest flare.', tag: 'Bestseller', stock: 12 },
    { id: 'pa-002', name: 'Royal Heritage Kaftan Maxi', category: 'kaftans', price: 6500, color: 'Rich Terracotta', swatches: ['#C85A32', '#004D40', '#D4AF37'], sizes: [10, 12, 14, 16, 18, 20, 22, 24], image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80', description: 'Full-length luxury modest kaftan featuring soft metallic print trim and tailored wrist cuffs.', tag: 'New Arrival', stock: 9 },
    { id: 'pa-003', name: 'Modest Two-Piece Co-ord Set', category: 'coords', price: 5800, color: 'Mauve Pink & Black', swatches: ['#C58B70', '#141414'], sizes: [6, 8, 10, 12, 14, 16], image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80', description: 'Flowing asymmetrical layered top paired with structured tailored wide-leg trousers.', tag: 'Trending', stock: 7 },
    { id: 'pa-004', name: 'African Print Statement Cape Dress', category: 'prints', price: 6200, color: 'Golden Ochre Print', swatches: ['#D4AF37', '#B87333'], sizes: [8, 10, 12, 14, 16, 18, 20], image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80', description: 'Vibrant custom print design celebrating authentic African motifs with a structured modest fit.', tag: 'Exclusive', stock: 6 },
    { id: 'pa-005', name: 'Royal Purple Draped Tunic', category: 'tops', price: 4200, color: 'Deep Violet', swatches: ['#4A154B', '#004D40', '#C58B70'], sizes: [8, 10, 12, 14, 16, 18, 20, 22, 24], image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80', description: 'Effortless fluid tunic top with comfortable modest neckline and wide batwing drape.', tag: 'Popular', stock: 11 },
    { id: 'pa-006', name: 'Elegance Satin Outerwear Abaya', category: 'kaftans', price: 6800, color: 'Midnight Onyx', swatches: ['#141414', '#D4AF37'], sizes: [10, 12, 14, 16, 18, 20, 22], image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80', description: 'Open-front luxury satin outerwear layer with gold metallic brocade borders.', tag: 'Luxury', stock: 5 },
    { id: 'pa-007', name: 'Monroe Set - Blush Abstract Print', category: 'coords', price: 5000, color: 'Blush Beige & Rust Print', swatches: ['#D8B4A0', '#8B4B3B', '#A45C40'], sizes: [8, 10, 12, 14, 16, 18, 20, 22], image: 'assets/products/monroe-set-blush.jpg', description: 'Draped asymmetric abstract-print cape top with a cinched drawstring waist, paired with a flowing rust wide-leg palazzo trouser. Full Set.', tag: 'New Arrival', stock: 10 },
    { id: 'pa-008', name: 'Bahamas Palazzo Set', category: 'coords', price: 5000, color: 'Ruby Red & Print Kimono', swatches: ['#C0272D', '#D4AF37'], sizes: [8, 10, 12, 14, 16, 18, 20], image: 'assets/products/bahamas-set.jpg', description: 'Bold red wide-leg palazzo trousers styled with an open printed kimono cape overlay. Palazzo Set.', tag: 'New Arrival', stock: 8 },
    { id: 'pa-009', name: 'Bahamas Short Set', category: 'coords', price: 3500, color: 'Ruby Red & Print Kimono', swatches: ['#C0272D', '#D4AF37'], sizes: [8, 10, 12, 14, 16, 18, 20], image: 'assets/products/bahamas-set-citrus.jpg', description: 'Flowy printed cape top paired with chic tailored shorts. Perfect for slaying on vacation. Short Set.', tag: 'New Arrival', stock: 8 },
    { id: 'pa-010', name: 'Monroe Set - Emerald Satin', category: 'coords', price: 5000, color: 'Emerald Green', swatches: ['#004D40', '#00695C'], sizes: [8, 10, 12, 14, 16, 18, 20, 22], image: 'assets/products/monroe-set-emerald.jpg', description: 'Luxurious emerald satin draped top with a ruched drawstring waist, paired with matching wide-leg satin trousers. Full Set.', tag: 'New Arrival', stock: 10 },
    { id: 'pa-011', name: 'Luxe Kaftan Gown', category: 'kaftans', price: 3500, color: 'Ruby Red', swatches: ['#C0272D', '#4A154B', '#556B2F', '#C85A32'], sizes: ['Free Size'], image: 'assets/products/luxe-khaftan-red.jpg', description: 'Free-size luxe kaftan gown with inbelts that tie to size and snatch the waist. Matching braided head piece sold separately (KSh 1,000).', tag: 'New Arrival', stock: 6 },
    { id: 'pa-012', name: 'Malkia Set - Monochrome Print', category: 'coords', price: 5000, color: 'Black & White Print', swatches: ['#141414', '#FFFFFF'], sizes: [8, 10, 12, 14, 16, 18, 20], image: 'assets/products/malkia-set-black.jpg', description: 'Wrap-tie satin blouse with balloon sleeves in a graphic monochrome print, styled with tailored wide-leg black trousers.', tag: 'New Arrival', stock: 9 },
    { id: 'pa-013', name: 'Malkia Set - Emerald Print', category: 'coords', price: 5000, color: 'Emerald Green & White Print', swatches: ['#004D40', '#FFFFFF'], sizes: [8, 10, 12, 14, 16, 18, 20], image: 'assets/products/malkia-set-green.jpg', description: 'Wrap-tie satin blouse with balloon sleeves in an emerald abstract print, styled with tailored wide-leg emerald trousers.', tag: 'New Arrival', stock: 9 },
    { id: 'pa-014', name: 'Ruby Long Top - Noir', category: 'tops', price: 3500, color: 'Black', swatches: ['#141414'], sizes: ['Free Size'], image: 'assets/products/ruby-long-top-black.jpg', description: 'Dramatic high-low cape top with flowing batwing sleeves, worn over fitted leggings for a striking silhouette.', tag: 'New Arrival', stock: 12 },
    { id: 'pa-015', name: 'Ruby Long Top - Amethyst', category: 'tops', price: 3500, color: 'Purple', swatches: ['#4A154B'], sizes: ['Free Size'], image: 'assets/products/ruby-long-top-purple.jpg', description: 'Dramatic high-low cape top with flowing batwing sleeves in rich amethyst purple, worn over fitted leggings.', tag: 'New Arrival', stock: 12 },
    { id: 'pa-016', name: 'Ruby Long Top - Emerald Teal', category: 'tops', price: 3500, color: 'Teal', swatches: ['#00695C'], sizes: ['Free Size'], image: 'assets/products/ruby-long-top-teal.jpg', description: 'Dramatic high-low cape top with flowing batwing sleeves in emerald teal, worn over fitted leggings.', tag: 'New Arrival', stock: 12 },
    { id: 'pa-017', name: 'Ruby Long Top - Chocolate Brown', category: 'tops', price: 3500, color: 'Chocolate Brown', swatches: ['#5C3A21'], sizes: ['Free Size'], image: 'assets/products/ruby-long-top-brown.jpg', description: 'Dramatic high-low cape top with flowing batwing sleeves in rich chocolate brown, worn over fitted leggings.', tag: 'New Arrival', stock: 12 },
    { id: 'pa-018', name: 'Monroe Set - Noir', category: 'coords', price: 5000, color: 'Classic Black', swatches: ['#141414'], sizes: ['S', 'M', 'L', 'XL', '2XL'], image: 'assets/products/monroe-set-black.jpg', description: 'Chic and bold flowy top with waist-cinching in-belts, paired with palazzo pants with functional pockets. Now available in classic, timeless black. Full Set.', tag: 'New Arrival', stock: 10 },
    { id: 'pa-019', name: 'Luxe Kaftan Gown - Olive Green', category: 'kaftans', price: 3500, color: 'Olive Green', swatches: ['#556B2F', '#D4AF37'], sizes: ['Free Size'], image: 'assets/products/luxe-khaftan-olive.jpg', description: 'Free-size luxe kaftan gown in olive green with an ornate gold waist belt and inbelts that tie to size. Matching braided head piece sold separately (KSh 1,000).', tag: 'New Arrival', stock: 6 },
    { id: 'pa-020', name: 'Luxe Kaftan Gown - Black Satin', category: 'kaftans', price: 3500, color: 'Black Satin', swatches: ['#141414', '#D4AF37'], sizes: ['Free Size'], image: 'assets/products/luxe-khaftan-black-satin.jpg', description: 'Free-size luxe kaftan gown in liquid black satin with an ornate gold waist belt and inbelts that tie to size.', tag: 'New Arrival', stock: 6 }
];

function hashAdminPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

async function seed() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set in server/.env');
    console.log('Connecting to Neon...');
    await pool.query('SELECT 1');
    console.log('Connected. Applying database schema...');
    await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    console.log('Schema ready. Seeding owner account...');
    await pool.query(
        `INSERT INTO admin_accounts (username, password_hash, role)
         VALUES ('admin', $1, 'owner')
         ON CONFLICT (username) DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            role = 'owner'`,
        [hashAdminPassword(process.env.ADMIN_INITIAL_PASSWORD || 'PA2026!')]
    );

    for (const p of DEFAULT_PRODUCTS) {
        await pool.query(
            `INSERT INTO products (id, name, category, price, color, swatches, sizes, image, images, description, tag, stock)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (id) DO NOTHING`,
            [p.id, p.name, p.category, p.price, p.color, JSON.stringify(p.swatches), JSON.stringify(p.sizes), p.image, JSON.stringify([p.image]), p.description, p.tag, p.stock]
        );
    }
    console.log(`Seeded ${DEFAULT_PRODUCTS.length} products and reset the admin owner password.`);
}

seed()
    .then(async () => {
        await pool.end();
        process.exit(0);
    })
    .catch(async err => {
        console.error(`Seed failed: ${err.message}`);
        await pool.end();
        process.exit(1);
    });
