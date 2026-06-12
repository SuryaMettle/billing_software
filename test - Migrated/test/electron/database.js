import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use USER_DATA_PATH env var set by Electron main.js
const dbPath = process.env.USER_DATA_PATH
  ? path.join(process.env.USER_DATA_PATH, "billing.db")
  : path.join(__dirname, "billing.db");

// Copy seed DB if it doesn't exist yet (packaged app first run)
if (process.env.USER_DATA_PATH) {
  const seedPath = path.join(process.resourcesPath || __dirname, "billing.db");
  if (!fs.existsSync(dbPath) && fs.existsSync(seedPath)) {
    fs.copyFileSync(seedPath, dbPath);
  }
}

console.log("DB path:", dbPath);

const db = new Database(dbPath);

function addColumnIfMissing(tableName, columnName, columnDefinition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((col) => col.name === columnName);

  if (!exists) {
    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`).run();
  }
}

// Products
db.prepare(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    tax_rate REAL DEFAULT 0
  )
`).run();

// Customers
db.prepare(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT
  )
`).run();

// Parties (Customers + Suppliers)
db.prepare(`
  CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    state TEXT,
    pincode TEXT,
    city TEXT,
    type TEXT,
    balance REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Invoices
db.prepare(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_id INTEGER,
    total REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Invoice Items
db.prepare(`
  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS invoice_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER,
    amount REAL,
    mode TEXT,
    note TEXT,
    created_at TEXT
  )
`).run();

addColumnIfMissing("products", "cost_price", "REAL");
addColumnIfMissing("invoice_items", "profit", "REAL");

addColumnIfMissing("invoice_items", "offer_id", "INTEGER");
addColumnIfMissing("invoice_items", "is_free", "INTEGER DEFAULT 0");
addColumnIfMissing("invoice_items", "offer_name", "TEXT DEFAULT ''");
addColumnIfMissing("invoice_items", "free_qty", "INTEGER DEFAULT 0");

addColumnIfMissing("invoices", "payment_mode", "TEXT");
addColumnIfMissing("invoices", "payment_status", "TEXT");
addColumnIfMissing("invoices", "paid_amount", "REAL DEFAULT 0");
addColumnIfMissing("invoices", "party_id", "INTEGER");
addColumnIfMissing("invoices", "payment_terms", "TEXT DEFAULT 'immediate'");
addColumnIfMissing("invoices", "due_date", "TEXT");

db.prepare(`
  CREATE TABLE IF NOT EXISTS purchase_invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_id INTEGER,
    total REAL,
    paid_amount REAL DEFAULT 0,
    payment_status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_invoice_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price REAL
  )
`).run();

addColumnIfMissing("products", "stock", "INTEGER DEFAULT 0");
addColumnIfMissing("products", "min_stock", "INTEGER DEFAULT 0");
addColumnIfMissing("products", "category", "TEXT");
addColumnIfMissing("products", "hsn_code", "TEXT DEFAULT ''");
addColumnIfMissing("products", "barcode", "TEXT DEFAULT ''");
addColumnIfMissing("products", "expiry_date", "TEXT DEFAULT ''");

addColumnIfMissing("purchase_invoices", "payment_mode", "TEXT");
addColumnIfMissing("purchase_invoices", "payment_terms", "TEXT DEFAULT 'immediate'");
addColumnIfMissing("purchase_invoices", "due_date", "TEXT");

db.prepare(`
  CREATE TABLE IF NOT EXISTS purchase_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER,
    amount REAL,
    mode TEXT,
    note TEXT,
    created_at TEXT
  )
`).run();

addColumnIfMissing("parties", "email", "TEXT");

// Settings
db.prepare(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    business_name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    pincode TEXT DEFAULT '',
    gstin TEXT DEFAULT ''
  )
`).run();

const existing = db.prepare(`SELECT id FROM settings WHERE id = 1`).get();

if (!existing) {
  db.prepare(`
    INSERT INTO settings (
      id, business_name, phone, email, address, city, state, pincode, gstin
    )
    VALUES (1, '', '', '', '', '', '', '', '')
  `).run();
}

addColumnIfMissing("parties", "shipping_address", "TEXT DEFAULT ''");
addColumnIfMissing("parties", "shipping_city", "TEXT DEFAULT ''");
addColumnIfMissing("parties", "shipping_state", "TEXT DEFAULT ''");
addColumnIfMissing("parties", "shipping_pincode", "TEXT DEFAULT ''");
addColumnIfMissing("parties", "logo", "TEXT DEFAULT ''");

addColumnIfMissing("products", "unit_type", "TEXT DEFAULT 'unit'");

db.prepare(`
  CREATE TABLE IF NOT EXISTS stock_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_product_id INTEGER,
    child_product_id INTEGER,
    parent_qty_deducted REAL,
    child_qty_added REAL,
    conversion_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    reference_id INTEGER,
    FOREIGN KEY (parent_product_id) REFERENCES products(id),
    FOREIGN KEY (child_product_id) REFERENCES products(id)
  )
`).run();

addColumnIfMissing("stock_conversions", "reference_id", "INTEGER");

addColumnIfMissing("products", "parent_id", "INTEGER");
addColumnIfMissing("products", "conversion_factor", "REAL DEFAULT 1");

addColumnIfMissing("parties", "loyalty_points", "REAL DEFAULT 0");

db.prepare(`
  CREATE TABLE IF NOT EXISTS loyalty_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_id INTEGER,
    invoice_id INTEGER,
    points_change REAL,
    type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES parties(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  )
`).run();

addColumnIfMissing("settings", "loyalty_earn_rate", "REAL DEFAULT 0.01");
addColumnIfMissing("settings", "loyalty_redeem_value", "REAL DEFAULT 1.0");
addColumnIfMissing("settings", "invoice_template", "TEXT DEFAULT 'modern-a4'");

db.prepare(`
  CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    offer_type TEXT,
    active INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    start_time TEXT,
    end_time TEXT,
    usage_limit INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    stackable INTEGER DEFAULT 1,
    buyProductId INTEGER,
    buy_product_id INTEGER,
    freeProductId INTEGER,
    free_product_id INTEGER,
    get_product_id INTEGER,
    buyQty REAL DEFAULT 0,
    buy_qty REAL DEFAULT 0,
    freeQty REAL DEFAULT 0,
    free_qty REAL DEFAULT 0,
    get_qty REAL DEFAULT 0,
    productId INTEGER,
    product_id INTEGER,
    discountPercent REAL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    discount_mode TEXT DEFAULT 'percent',
    minCartValue REAL DEFAULT 0,
    min_cart_value REAL DEFAULT 0,
    flatAmount REAL DEFAULT 0,
    flat_amount REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
  )
`).run();

addColumnIfMissing("offers", "type", "TEXT");
addColumnIfMissing("offers", "offer_type", "TEXT");
addColumnIfMissing("offers", "active", "INTEGER DEFAULT 1");
addColumnIfMissing("offers", "is_active", "INTEGER DEFAULT 1");
addColumnIfMissing("offers", "start_date", "TEXT");
addColumnIfMissing("offers", "end_date", "TEXT");
addColumnIfMissing("offers", "start_time", "TEXT");
addColumnIfMissing("offers", "end_time", "TEXT");
addColumnIfMissing("offers", "usage_limit", "INTEGER DEFAULT 0");
addColumnIfMissing("offers", "usage_count", "INTEGER DEFAULT 0");
addColumnIfMissing("offers", "priority", "INTEGER DEFAULT 0");
addColumnIfMissing("offers", "stackable", "INTEGER DEFAULT 1");
addColumnIfMissing("offers", "buyProductId", "INTEGER");
addColumnIfMissing("offers", "buy_product_id", "INTEGER");
addColumnIfMissing("offers", "freeProductId", "INTEGER");
addColumnIfMissing("offers", "free_product_id", "INTEGER");
addColumnIfMissing("offers", "get_product_id", "INTEGER");
addColumnIfMissing("offers", "buyQty", "REAL DEFAULT 0");
addColumnIfMissing("offers", "buy_qty", "REAL DEFAULT 0");
addColumnIfMissing("offers", "freeQty", "REAL DEFAULT 0");
addColumnIfMissing("offers", "free_qty", "REAL DEFAULT 0");
addColumnIfMissing("offers", "get_qty", "REAL DEFAULT 0");
addColumnIfMissing("offers", "productId", "INTEGER");
addColumnIfMissing("offers", "product_id", "INTEGER");
addColumnIfMissing("offers", "categoryId", "TEXT");
addColumnIfMissing("offers", "category_id", "TEXT");
addColumnIfMissing("offers", "discountPercent", "REAL DEFAULT 0");
addColumnIfMissing("offers", "discount_percent", "REAL DEFAULT 0");
addColumnIfMissing("offers", "discount_mode", "TEXT DEFAULT 'percent'");
addColumnIfMissing("offers", "minCartValue", "REAL DEFAULT 0");
addColumnIfMissing("offers", "min_cart_value", "REAL DEFAULT 0");
addColumnIfMissing("offers", "flatAmount", "REAL DEFAULT 0");
addColumnIfMissing("offers", "flat_amount", "REAL DEFAULT 0");
addColumnIfMissing("offers", "min_qty", "REAL DEFAULT 0");
addColumnIfMissing("offers", "minQty", "REAL DEFAULT 0");
addColumnIfMissing("offers", "updated_at", "TEXT");

db.prepare(`
  CREATE TABLE IF NOT EXISTS offer_conditions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id INTEGER NOT NULL,
    condition_type TEXT NOT NULL,
    product_id INTEGER,
    min_qty REAL DEFAULT 0,
    min_amount REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (offer_id) REFERENCES offers(id)
  )
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_offers_active ON offers (active, is_active)
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_offers_type ON offers (type, offer_type)
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_offer_conditions_offer_id ON offer_conditions (offer_id)
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS credit_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    return_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    remaining REAL NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES parties(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS credit_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    credit_note_id INTEGER NOT NULL,
    party_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id),
    FOREIGN KEY (party_id) REFERENCES parties(id)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS return_refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    return_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    mode TEXT NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES parties(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  )
`).run();

addColumnIfMissing("sales_returns", "refund_status", "TEXT DEFAULT 'pending'");
addColumnIfMissing("sales_returns", "refund_amount", "REAL DEFAULT 0");
addColumnIfMissing("sales_returns", "credit_note_id", "INTEGER");

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

const userCount = db.prepare(`SELECT COUNT(*) AS count FROM users`).get().count;

if (userCount === 0) {
  db.prepare(`
    INSERT INTO users (username, password_hash, role, active)
    VALUES (?, ?, 'admin', 1)
  `).run("admin", bcrypt.hashSync("admin123", 10));
}

// ── Migration: allow nullable party_id for walk-in customer returns ──
try {
  db.prepare(`ALTER TABLE return_refunds RENAME TO return_refunds_old`).run();
  db.prepare(`
    CREATE TABLE return_refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_id INTEGER,
      invoice_id INTEGER NOT NULL,
      return_id INTEGER,
      amount REAL NOT NULL,
      mode TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  db.prepare(`INSERT INTO return_refunds SELECT * FROM return_refunds_old`).run();
  db.prepare(`DROP TABLE return_refunds_old`).run();
} catch {}

try {
  db.prepare(`ALTER TABLE credit_notes RENAME TO credit_notes_old`).run();
  db.prepare(`
    CREATE TABLE credit_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_id INTEGER,
      invoice_id INTEGER NOT NULL,
      return_id INTEGER,
      amount REAL NOT NULL,
      remaining REAL NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  db.prepare(`INSERT INTO credit_notes SELECT * FROM credit_notes_old`).run();
  db.prepare(`DROP TABLE credit_notes_old`).run();
} catch {}

try {
  db.exec(`ALTER TABLE invoices ADD COLUMN created_by TEXT DEFAULT NULL;`);
} catch (e) {}

try {
  db.exec(`ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL;`);
} catch(e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      login_at TEXT NOT NULL,
      logout_at TEXT,
      total_sales REAL DEFAULT 0,
      invoice_count INTEGER DEFAULT 0
    );
  `);
} catch(e) {}

db.prepare(`DELETE FROM user_sessions`).run();

export default db;