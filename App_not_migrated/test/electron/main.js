import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import path from "path";
import db from "./database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeOfferPayload(data = {}) {
  const type = data.type || data.offer_type || "BXGY";

  return {
    name: String(data.name || "").trim(),
    type,
    active: Number(data.active ?? data.is_active ?? 1),
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    start_time: data.start_time || null,
end_time: data.end_time || null,
discount_mode: data.discount_mode || "percent",
    usage_limit: Number(data.usage_limit || 0),
    priority: Number(data.priority || 0),
    stackable: Number(data.stackable ?? 1),
    minQty: Number(data.minQty ?? data.min_qty ?? 0),
    min_qty: Number(data.minQty ?? data.min_qty ?? 0),

    buyProductId: nullableNumber(data.buyProductId ?? data.buy_product_id),
    freeProductId: nullableNumber(
      data.freeProductId ?? data.free_product_id ?? data.get_product_id
    ),

    buyQty: Number(data.buyQty ?? data.buy_qty ?? 0),
    freeQty: Number(data.freeQty ?? data.free_qty ?? data.get_qty ?? 0),

    productId: nullableNumber(data.productId ?? data.product_id ?? data.buy_product_id),
    categoryId: data.categoryId ?? data.category_id ?? null,

    discountPercent: Number(data.discountPercent ?? data.discount_percent ?? 0),

    minCartValue: Number(data.minCartValue ?? data.min_cart_value ?? 0),
    flatAmount: Number(data.flatAmount ?? data.flat_amount ?? 0)
  };
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function incrementUsedOfferCounts(items = []) {
  const usedOfferIds = [
    ...new Set(
      items
        .map((item) => item.appliedOfferId)
        .filter(Boolean)
    )
  ];

  for (const offerId of usedOfferIds) {
    db.prepare(`
      UPDATE offers
      SET usage_count = COALESCE(usage_count, 0) + 1,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(offerId);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs")
    },
  });

  win.loadURL("http://localhost:5173");

  // Optional: open dev tools
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  db.exec(`
    CREATE TABLE IF NOT EXISTS sales_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      invoice_item_id INTEGER,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_invoice_id INTEGER NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      purchase_invoice_item_id INTEGER,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL
    );
  `);

  // Add gstin column to parties if not exists
try {
  db.prepare(`ALTER TABLE parties ADD COLUMN gstin TEXT DEFAULT ''`).run();
} catch(e) {
  // Column already exists, ignore
}

  ipcMain.removeHandler("add-product");

  ipcMain.handle("add-product", (event, data) => {
    const stmt = db.prepare(`
      INSERT INTO products (
        name, price, cost_price, tax_rate, hsn_code, 
        category, stock, min_stock, unit_type, parent_id, conversion_factor, expiry_date
      )
      VALUES (
        @name, @price, @cost_price, @tax_rate, @hsn_code, 
        @category, @stock, @min_stock, @unit_type, @parent_id, @conversion_factor, @expiry_date
      )
    `);
    const result = stmt.run(data);
    return { success: true, id: result.lastInsertRowid };
  });

  ipcMain.removeHandler("get-products");

  ipcMain.handle("get-products", async () => {
    const rows = db.prepare(`
      SELECT 
        p1.*, 
        p2.name AS parent_name 
      FROM products p1
      LEFT JOIN products p2 ON p1.parent_id = p2.id
      ORDER BY p1.id DESC
    `).all();
    return rows;
  });

  ipcMain.removeHandler("get-categories");

ipcMain.handle("get-categories", () => {
  return db.prepare(`
    SELECT 
      category AS id,
      category AS name
    FROM products
    WHERE category IS NOT NULL
      AND TRIM(category) != ''
    GROUP BY category
    ORDER BY category COLLATE NOCASE ASC
  `).all();
});

  ipcMain.removeHandler("delete-product");

  ipcMain.handle("delete-product", (event, id) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
    return { success: true };
  });

  ipcMain.removeHandler("create-invoice");

ipcMain.handle("create-invoice", (event, data) => {
  const {
    items = [],
    total,
    payments = [],
    party_id,
    payment_terms,
    due_date
  } = data;

  const allowedModes = ["cash", "upi", "card", "net_banking"];

  const validPayments = payments
    .map((payment) => ({
      mode: payment.mode,
      amount: Number(payment.amount || 0)
    }))
    .filter((payment) => payment.amount > 0);

  for (const payment of validPayments) {
    if (!allowedModes.includes(payment.mode)) {
      throw new Error(`Invalid payment mode: ${payment.mode}`);
    }
  }

  const totalPaid = validPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  const balance = Number(total || 0) - totalPaid;

  let paymentStatus = "pending";
  if (balance <= 0) paymentStatus = "paid";
  else if (totalPaid > 0) paymentStatus = "partial";

  const primaryPaymentMode =
    validPayments.length === 1
      ? validPayments[0].mode
      : validPayments.length > 1
      ? "split"
      : "";

  const transaction = db.transaction(() => {
    const stockRequiredByProduct = new Map();

    for (const item of items) {
      if (item.isCartDiscountItem) continue;
      if (!item.id) continue;

      const productId = Number(item.id);
      const requiredQty = Number(item.quantity || 0);

      if (requiredQty <= 0) {
        throw new Error(`Invalid quantity for product ID ${productId}`);
      }

      stockRequiredByProduct.set(
        productId,
        (stockRequiredByProduct.get(productId) || 0) + requiredQty
      );
    }

    for (const [productId, requiredQty] of stockRequiredByProduct.entries()) {
      const product = db.prepare(`SELECT name, stock, expiry_date FROM products WHERE id = ?`).get(productId);

      if (!product || Number(product.stock || 0) < requiredQty) {
        throw new Error(`Not enough stock for product ID ${productId}`);
      }

      if (product.expiry_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiryDate = new Date(`${product.expiry_date}T00:00:00`);

        if (!Number.isNaN(expiryDate.getTime()) && expiryDate < today) {
          throw new Error(`${product.name || `Product ID ${productId}`} is expired and cannot be billed`);
        }
      }
    }

    const result = db.prepare(`
      INSERT INTO invoices (
        party_id, total, payment_mode, paid_amount, payment_status, payment_terms, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      party_id,
      Number(total || 0),
      primaryPaymentMode,
      totalPaid,
      paymentStatus,
      payment_terms,
      due_date
    );

    const invoiceId = result.lastInsertRowid;
    const balanceChange = Number(total || 0) - totalPaid;

    db.prepare(`UPDATE parties SET balance = balance + ? WHERE id = ?`).run(
      balanceChange,
      party_id
    );

    const itemStmt = db.prepare(`
      INSERT INTO invoice_items (
        invoice_id, product_id, quantity, price, profit, is_free, offer_id, offer_name, free_qty
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      if (item.isCartDiscountItem) {
        continue;
      }

      const product = db.prepare(`
        SELECT stock, cost_price FROM products WHERE id = ?
      `).get(item.id);

      if (!product) {
        throw new Error(`Product not found for ID ${item.id}`);
      }

      const isFree = item.isFreeItem ? 1 : 0;
      const quantity = Number(item.quantity || 0);
      const price = item.isFreeItem ? 0 : Number(item.price || 0);
      const costPrice = Number(product.cost_price || 0);

      const profit = item.isFreeItem
        ? 0
        : Number(item.total || 0) - costPrice * quantity;

      itemStmt.run(
        invoiceId,
        item.id,
        quantity,
        price,
        profit,
        isFree,
        item.appliedOfferId || null,
        item.appliedOfferName || null,
        item.freeQuantity || 0
      );

      db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`).run(
        quantity,
        item.id
      );
    }

    const paymentStmt = db.prepare(`
      INSERT INTO invoice_payments (invoice_id, amount, mode, note, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    for (const payment of validPayments) {
      paymentStmt.run(invoiceId, payment.amount, payment.mode, "Invoice payment");
    }

    const { loyalty_redeem = 0 } = data;

    if (loyalty_redeem > 0 && party_id) {
      const partyRow = db.prepare(`
        SELECT loyalty_points FROM parties WHERE id = ?
      `).get(party_id);

      const available = partyRow?.loyalty_points ?? 0;
      const toRedeem = Math.min(loyalty_redeem, available);

      if (toRedeem > 0) {
        db.prepare(`
          UPDATE parties SET loyalty_points = loyalty_points - ? WHERE id = ?
        `).run(toRedeem, party_id);

        db.prepare(`
          INSERT INTO loyalty_ledger (party_id, invoice_id, points_change, type)
          VALUES (?, ?, ?, 'redeemed')
        `).run(party_id, invoiceId, -toRedeem);
      }
    }

    const loyaltySettings = db.prepare(`
      SELECT loyalty_earn_rate FROM settings WHERE id = 1
    `).get();

    const earnRate = loyaltySettings?.loyalty_earn_rate ?? 0.01;
    const pointsEarned = Math.floor(Number(total || 0) * earnRate);

    if (pointsEarned > 0 && party_id) {
      db.prepare(`
        UPDATE parties SET loyalty_points = loyalty_points + ? WHERE id = ?
      `).run(pointsEarned, party_id);

      db.prepare(`
        INSERT INTO loyalty_ledger (party_id, invoice_id, points_change, type)
        VALUES (?, ?, ?, 'earned')
      `).run(party_id, invoiceId, pointsEarned);
    }

    incrementUsedOfferCounts(items);

    return { success: true, id: invoiceId, pointsEarned };
  });

  return transaction();
});


  // ── OFFERS: Get all active offers with product names ──
  ipcMain.removeHandler("get-offers");

ipcMain.handle("get-offers", () => {
  return db.prepare(`
    SELECT
      o.*,

      COALESCE(o.type, o.offer_type) AS type,
      COALESCE(o.active, o.is_active, 1) AS active,

      COALESCE(o.buyProductId, o.buy_product_id) AS buyProductId,
      COALESCE(o.freeProductId, o.free_product_id, o.get_product_id) AS freeProductId,

      COALESCE(o.buyQty, o.buy_qty, 0) AS buyQty,
      COALESCE(o.freeQty, o.free_qty, o.get_qty, 0) AS freeQty,

      COALESCE(o.productId, o.product_id, o.buyProductId, o.buy_product_id) AS productId,
      COALESCE(o.categoryId, o.category_id) AS categoryId,
      COALESCE(o.discountPercent, o.discount_percent, 0) AS discountPercent,
COALESCE(o.discount_mode, 'percent') AS discountMode,
o.start_time AS start_time,
o.end_time AS end_time,
COALESCE(o.minQty, o.min_qty, 0) AS minQty,

      COALESCE(o.minCartValue, o.min_cart_value, 0) AS minCartValue,
      COALESCE(o.flatAmount, o.flat_amount, 0) AS flatAmount,

      bp.name AS buy_product_name,
      bp.price AS buy_product_price,
      bp.stock AS buy_product_stock,
      bp.hsn_code AS buy_product_hsn_code,
      bp.tax_rate AS buy_product_tax_rate,

      fp.name AS free_product_name,
      fp.price AS free_product_price,
      fp.stock AS free_product_stock,
      fp.hsn_code AS free_product_hsn_code,
      fp.tax_rate AS free_product_tax_rate

    FROM offers o
    LEFT JOIN products bp
      ON bp.id = COALESCE(o.buyProductId, o.buy_product_id, o.productId, o.product_id)
    LEFT JOIN products fp
      ON fp.id = COALESCE(o.freeProductId, o.free_product_id, o.get_product_id)
    WHERE COALESCE(o.active, o.is_active, 1) = 1
      AND (o.start_date IS NULL OR o.start_date = '' OR date(o.start_date) <= date('now'))
      AND (o.end_date IS NULL OR o.end_date = '' OR date(o.end_date) >= date('now'))
      AND (
        COALESCE(o.usage_limit, 0) = 0
        OR COALESCE(o.usage_count, 0) < COALESCE(o.usage_limit, 0)
      )
    ORDER BY COALESCE(o.priority, 0) DESC, o.id DESC
  `).all();
});

ipcMain.handle("get-all-offers", () => {
  return db.prepare(`SELECT * FROM offers ORDER BY id DESC`).all();
});

  // ── OFFERS: Create a new offer ──
  ipcMain.removeHandler("create-offer");

ipcMain.handle("create-offer", (event, data) => {
  const offer = normalizeOfferPayload(data);

  if (!offer.name) {
    throw new Error("Offer name is required");
  }

  if (!offer.type) {
    throw new Error("Offer type is required");
  }

  const result = db.prepare(`
    INSERT INTO offers (
      name,

      type,
      offer_type,

      active,
      is_active,

      start_date,
end_date,
start_time,
end_time,

      usage_limit,
      usage_count,

      priority,
      stackable,

      buyProductId,
      buy_product_id,

      freeProductId,
      free_product_id,
      get_product_id,

      buyQty,
      buy_qty,

      freeQty,
      free_qty,
      get_qty,

      productId,
      product_id,

      categoryId,
      category_id,

      discountPercent,
discount_percent,
discount_mode,

      minCartValue,
      min_cart_value,

      flatAmount,
      flat_amount,

      minQty,       
      min_qty, 

      updated_at
    )
    VALUES (
      @name,

      @type,
      @type,

      @active,
      @active,

      @start_date,
      @end_date,
      @start_time,
      @end_time,

      @usage_limit,
      0,

      @priority,
      @stackable,

      @buyProductId,
      @buyProductId,

      @freeProductId,
      @freeProductId,
      @freeProductId,

      @buyQty,
      @buyQty,

      @freeQty,
      @freeQty,
      @freeQty,

      @productId,
      @productId,

      @categoryId,
      @categoryId,

      @discountPercent,
@discountPercent,
@discount_mode,

      @minCartValue,
      @minCartValue,

      @flatAmount,
      @flatAmount,

      @minQty,       
      @minQty,

      datetime('now')
    )
  `).run(offer);

  return { success: true, id: result.lastInsertRowid };
});

  // ── OFFERS: Delete (deactivate) an offer ──
  ipcMain.removeHandler("delete-offer");

ipcMain.handle("delete-offer", (event, id) => {
  db.prepare(`DELETE FROM offer_conditions WHERE offer_id = ?`).run(id);
  db.prepare(`DELETE FROM offers WHERE id = ?`).run(id);
  return { success: true };
});

ipcMain.handle("toggle-offer", (event, { id, active }) => {
  db.prepare(`
    UPDATE offers
    SET active = ?,
        is_active = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(active ? 1 : 0, active ? 1 : 0, id);
  return { success: true };
});

  // Get loyalty ledger for a party
  ipcMain.handle("get-loyalty-ledger", (event, partyId) => {
    return db.prepare(`
      SELECT ll.*, i.total AS invoice_total
      FROM loyalty_ledger ll
      LEFT JOIN invoices i ON ll.invoice_id = i.id
      WHERE ll.party_id = ?
      ORDER BY ll.created_at DESC
    `).all(partyId);
  });

  // Get loyalty settings
  ipcMain.handle("get-loyalty-settings", () => {
    return db.prepare(`
      SELECT loyalty_earn_rate, loyalty_redeem_value FROM settings WHERE id = 1
    `).get();
  });

  // Get a party's current loyalty points balance
  ipcMain.handle("get-party-loyalty-points", (event, partyId) => {
    return db.prepare(`
      SELECT loyalty_points FROM parties WHERE id = ?
    `).get(partyId);
  });

  ipcMain.removeHandler("create-purchase-invoice");

  ipcMain.handle("create-purchase-invoice", (event, data) => {
    const { party_id, items, total, paid_amount, payment_status, payment_mode, payment_terms, due_date } = data;

    const result = db.prepare(`
      INSERT INTO purchase_invoices (
        party_id, total, paid_amount, payment_status, payment_mode, payment_terms, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(party_id, total, paid_amount, payment_status, payment_mode, payment_terms, due_date);

    const invoiceId = result.lastInsertRowid;
    const balanceChange = total - paid_amount;

    db.prepare(`UPDATE parties SET balance = balance - ? WHERE id = ?`).run(balanceChange, party_id);

    const itemStmt = db.prepare(`
      INSERT INTO purchase_invoice_items (purchase_invoice_id, product_id, quantity, price)
      VALUES (?, ?, ?, ?)
    `);

    for (const item of items) {
      itemStmt.run(invoiceId, item.id, item.quantity, item.price);
      db.prepare(`UPDATE products SET stock = stock + ? WHERE id = ?`).run(item.quantity, item.id);
    }

    return { success: true, id: invoiceId };
  });

  ipcMain.removeHandler("get-purchase-invoices");

  ipcMain.handle("get-purchase-invoices", () => {
    return db.prepare(`
      SELECT 
        purchase_invoices.*,
        parties.name AS party_name,
        parties.phone AS party_phone,
        CASE 
          WHEN COALESCE(return_summary.return_count, 0) > 0 THEN 1 
          ELSE 0 
        END AS has_return,
        COALESCE(return_summary.return_total, 0) AS return_total
      FROM purchase_invoices
      LEFT JOIN parties ON purchase_invoices.party_id = parties.id
      LEFT JOIN (
        SELECT 
          purchase_invoice_id,
          COUNT(*) AS return_count,
          SUM(total) AS return_total
        FROM purchase_returns
        GROUP BY purchase_invoice_id
      ) return_summary
        ON purchase_invoices.id = return_summary.purchase_invoice_id
      ORDER BY purchase_invoices.id DESC
    `).all();
  });

  ipcMain.handle("get-purchase-invoice-details", (event, invoiceId) => {
    const invoice = db.prepare(`
      SELECT
        purchase_invoices.*,
        parties.name    AS party_name,
        parties.phone   AS party_phone,
        parties.address AS party_address,
        parties.city    AS party_city,
        parties.state   AS party_state,
        parties.pincode AS party_pincode,
        parties.shipping_address  AS party_shipping_address,
        parties.shipping_city     AS party_shipping_city,
        parties.shipping_state    AS party_shipping_state,
        parties.shipping_pincode  AS party_shipping_pincode
      FROM purchase_invoices
      LEFT JOIN parties ON purchase_invoices.party_id = parties.id
      WHERE purchase_invoices.id = ?
    `).get(invoiceId);

    const items = db.prepare(`
      SELECT
        purchase_invoice_items.*,
        products.name,
        products.hsn_code,
        products.tax_rate
      FROM purchase_invoice_items
      LEFT JOIN products ON purchase_invoice_items.product_id = products.id
      WHERE purchase_invoice_id = ?
    `).all(invoiceId);

    const payments = db.prepare(`
      SELECT * FROM purchase_payments WHERE invoice_id = ? ORDER BY created_at DESC
    `).all(invoiceId);

    const settings = db.prepare(`SELECT * FROM settings WHERE id = 1`).get();

    const returns = db.prepare(`
      SELECT * FROM purchase_returns WHERE purchase_invoice_id = ? ORDER BY created_at DESC
    `).all(invoiceId);

    const returnItemsStmt = db.prepare(`
      SELECT
        purchase_return_items.*,
        purchase_return_items.quantity AS return_qty,
        products.name
      FROM purchase_return_items
      LEFT JOIN products ON purchase_return_items.product_id = products.id
      WHERE purchase_return_items.return_id = ?
    `);

    const returnsWithItems = returns.map((ret) => ({
      ...ret,
      items: returnItemsStmt.all(ret.id)
    }));

    return { invoice, items, payments, returns: returnsWithItems, settings };
  });

  ipcMain.removeHandler("process-sales-return");

  ipcMain.handle("process-sales-return", (event, data) => {
    const { invoice_id, items } = data;

    const transaction = db.transaction(() => {
      const total = items.reduce((sum, item) => {
        return sum + Number(item.returnQty || 0) * Number(item.price || item.rate || 0);
      }, 0);

      const result = db.prepare(`
        INSERT INTO sales_returns (invoice_id, total) VALUES (?, ?)
      `).run(invoice_id, total);

      const returnId = result.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO sales_return_items (return_id, invoice_item_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of items) {
  const qty = Number(item.returnQty || 0);
  if (qty <= 0) continue;
  const price = Number(item.price || item.rate || 0);
  insertItem.run(returnId, item.id, item.product_id, qty, price);
  db.prepare(`UPDATE products SET stock = stock + ? WHERE id = ?`).run(qty, item.product_id);
}

// Reduce party balance by return total
const inv = db.prepare(`SELECT party_id FROM invoices WHERE id = ?`).get(invoice_id);
if (inv?.party_id) {
  db.prepare(`UPDATE parties SET balance = balance - ? WHERE id = ?`).run(total, inv.party_id);
}

return { success: true, id: returnId, total };
    });

    return transaction();
  });

  ipcMain.removeHandler("process-purchase-return");

  ipcMain.handle("process-purchase-return", (event, data) => {
    const { purchase_invoice_id, items } = data;

    const transaction = db.transaction(() => {
      const returnTotal = items.reduce((sum, item) => {
        return sum + Number(item.returnQty || 0) * Number(item.price || item.rate || 0);
      }, 0);

      const result = db.prepare(`
        INSERT INTO purchase_returns (purchase_invoice_id, total) VALUES (?, ?)
      `).run(purchase_invoice_id, returnTotal);

      const returnId = result.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO purchase_return_items (return_id, purchase_invoice_item_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        const qty = Number(item.returnQty || 0);
        if (qty <= 0) continue;
        const price = Number(item.price || item.rate || 0);
        insertItem.run(returnId, item.id, item.product_id, qty, price);
        db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`).run(qty, item.product_id);
      }

      const invoice = db.prepare(`
        SELECT total, paid_amount FROM purchase_invoices WHERE id = ?
      `).get(purchase_invoice_id);

      const totalReturned = db.prepare(`
        SELECT COALESCE(SUM(total), 0) AS total FROM purchase_returns WHERE purchase_invoice_id = ?
      `).get(purchase_invoice_id).total;

      const effectiveBalance = Number(invoice.total) - Number(invoice.paid_amount) - Number(totalReturned);

      let newStatus = "pending";
      if (effectiveBalance <= 0) newStatus = "paid";
      else if (Number(invoice.paid_amount) > 0) newStatus = "partial";

      db.prepare(`
        UPDATE purchase_invoices SET payment_status = ? WHERE id = ?
      `).run(newStatus, purchase_invoice_id);

      return { success: true, id: returnId, total: returnTotal };
    });

    return transaction();
  });

  ipcMain.handle("get-settings", () => {
    return db.prepare(`SELECT * FROM settings WHERE id = 1`).get();
  });

  ipcMain.handle("save-settings", (event, data) => {
  db.prepare(`
    UPDATE settings
    SET business_name = ?, phone = ?, email = ?, address = ?,
        city = ?, state = ?, pincode = ?, gstin = ?,
        loyalty_earn_rate = ?, loyalty_redeem_value = ?,
        invoice_template = ?
    WHERE id = 1
  `).run(
    data.business_name, data.phone, data.email, data.address,
    data.city, data.state, data.pincode, data.gstin,
    data.loyalty_earn_rate ?? 0.01, data.loyalty_redeem_value ?? 1.0,
    data.invoice_template ?? "modern-a4"
  );
  return { success: true };
});

  ipcMain.handle("add-purchase-payment", (event, data) => {
    const { invoice_id, amount, mode, note } = data;

    db.prepare(`
      INSERT INTO purchase_payments (invoice_id, amount, mode, note, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(invoice_id, amount, mode, note);

    db.prepare(`UPDATE purchase_invoices SET paid_amount = paid_amount + ? WHERE id = ?`).run(amount, invoice_id);

    const inv = db.prepare(`SELECT total, paid_amount FROM purchase_invoices WHERE id = ?`).get(invoice_id);

    const totalReturned = db.prepare(`
      SELECT COALESCE(SUM(total), 0) AS total FROM purchase_returns WHERE purchase_invoice_id = ?
    `).get(invoice_id).total;

    const effectiveBalance = Number(inv.total) - Number(inv.paid_amount) - Number(totalReturned);

    let newStatus = "pending";
    if (effectiveBalance <= 0) newStatus = "paid";
    else if (Number(inv.paid_amount) > 0) newStatus = "partial";

    db.prepare(`UPDATE purchase_invoices SET payment_status = ? WHERE id = ?`).run(newStatus, invoice_id);

    const invoice = db.prepare(`SELECT party_id FROM purchase_invoices WHERE id = ?`).get(invoice_id);
    db.prepare(`UPDATE parties SET balance = balance + ? WHERE id = ?`).run(amount, invoice.party_id);

    return { success: true };
  });

 ipcMain.removeHandler("update-product");

ipcMain.handle("update-product", (event, product) => {
  const result = db.prepare(`
    UPDATE products
    SET name = ?,
        price = ?,
        cost_price = ?,
        tax_rate = ?,
        hsn_code = ?,
        category = ?,
        stock = ?,
        min_stock = ?,
        unit_type = ?,
        parent_id = ?,
        conversion_factor = ?,
        barcode = ?,
        expiry_date = ?
    WHERE id = ?
  `).run(
    product.name,
    Number(product.price) || 0,
    Number(product.cost_price) || 0,
    Number(product.tax_rate) || 0,
    product.hsn_code || "",
    product.category || "",
    Number(product.stock) || 0,
    Number(product.min_stock) || 0,
    product.unit_type || "unit",
    product.unit_type === "retail" ? Number(product.parent_id) || null : null,
    Number(product.conversion_factor) || 1,
    product.barcode || "",
    product.expiry_date || "",
    product.id
  );

  console.log("update-product result:", result);
  console.log("updated product:", product);

  return {
    success: true,
    changes: result.changes,
  };
});

  ipcMain.handle("get-party-details", async (event, partyId) => {
    const party = db.prepare(`SELECT * FROM parties WHERE id = ?`).get(partyId);

    const sales = db.prepare(`
      SELECT id, 'Sale' AS type, total, paid_amount, payment_status, payment_mode, due_date, created_at
      FROM invoices WHERE party_id = ?
    `).all(partyId);

    const purchases = db.prepare(`
      SELECT id, 'Purchase' AS type, total, paid_amount, payment_status, payment_mode, due_date, created_at
      FROM purchase_invoices WHERE party_id = ?
    `).all(partyId);

    const transactions = [...sales, ...purchases].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    return { party, transactions };
  });

  ipcMain.handle("delete-party", (event, id) => {
    db.prepare("DELETE FROM parties WHERE id = ?").run(id);
    return { success: true };
  });

  ipcMain.handle("update-party", (event, party) => {
  db.prepare(`
    UPDATE parties 
    SET name = ?, phone = ?, email = ?, address = ?, state = ?, pincode = ?, city = ?,
        shipping_address = ?, shipping_city = ?, shipping_state = ?, shipping_pincode = ?,
        gstin = ?
    WHERE id = ?
  `).run(
    party.name, party.phone, party.email, party.address,
    party.state, party.pincode, party.city,
    party.shipping_address || "", party.shipping_city || "",
    party.shipping_state || "", party.shipping_pincode || "",
    party.gstin || "",
    party.id
  );
  return { success: true };
});

  ipcMain.handle("create-party", (event, data) => {
  db.prepare(`
    INSERT INTO parties (name, phone, type, address, city, state, pincode, balance,
      shipping_address, shipping_city, shipping_state, shipping_pincode, gstin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.name, data.phone, data.type, data.address,
    data.city, data.state, data.pincode, data.balance,
    data.shipping_address || "", data.shipping_city || "",
    data.shipping_state || "", data.shipping_pincode || "",
    data.gstin || ""
  );
  return { success: true };
});

  ipcMain.removeHandler("get-parties");

  ipcMain.handle("get-parties", () => {
    return db.prepare("SELECT * FROM parties ORDER BY id DESC").all();
  });

  ipcMain.removeHandler("get-invoices-with-profit");

  ipcMain.handle("get-invoices-with-profit", () => {
    const invoices = db.prepare(`
      SELECT 
        invoices.*, 
        parties.name AS party_name,
        COALESCE(SUM(invoice_items.profit), 0) AS profit,
        CASE 
          WHEN COALESCE(return_summary.return_count, 0) > 0 THEN 1
          ELSE 0
        END AS has_return,
        COALESCE(return_summary.return_total, 0) AS return_total
      FROM invoices
      LEFT JOIN invoice_items ON invoices.id = invoice_items.invoice_id
      LEFT JOIN parties ON invoices.party_id = parties.id
      LEFT JOIN (
        SELECT invoice_id, COUNT(*) AS return_count, SUM(total) AS return_total
        FROM sales_returns
        GROUP BY invoice_id
      ) return_summary ON invoices.id = return_summary.invoice_id
      GROUP BY invoices.id
      ORDER BY invoices.id DESC
    `).all();

    return invoices;
  });

  ipcMain.removeHandler("get-invoices");

  ipcMain.handle("get-invoices", () => {
    return db.prepare(`
      SELECT 
        invoices.*, 
        parties.name AS party_name,
        parties.phone AS party_phone
      FROM invoices
      LEFT JOIN parties ON invoices.party_id = parties.id
      ORDER BY invoices.id DESC
    `).all();
  });

  ipcMain.handle("get-party-stats", () => {
    const toCollect = db.prepare(`SELECT SUM(balance) as total FROM parties WHERE balance > 0`).get();
    const toPay = db.prepare(`SELECT SUM(balance) as total FROM parties WHERE balance < 0`).get();
    return {
      toCollect: toCollect.total || 0,
      toPay: Math.abs(toPay.total || 0)
    };
  });

  ipcMain.handle("get-sales-stats", () => {
    const totalSales    = db.prepare(`SELECT SUM(total)  as total  FROM invoices`).get();
    const totalProfit   = db.prepare(`SELECT SUM(profit) as profit FROM invoice_items`).get();
    const totalInvoices = db.prepare(`SELECT COUNT(*)    as count  FROM invoices`).get();
    return {
      totalSales:    totalSales.total    || 0,
      totalProfit:   totalProfit.profit  || 0,
      totalInvoices: totalInvoices.count || 0
    };
  });

  ipcMain.handle("add-invoice-payment", (event, data) => {
    const { invoice_id, amount, mode, note } = data;

    db.prepare(`
      INSERT INTO invoice_payments (invoice_id, amount, mode, note, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(invoice_id, amount, mode, note);

    db.prepare(`UPDATE invoices SET paid_amount = paid_amount + ? WHERE id = ?`).run(amount, invoice_id);

    db.prepare(`
      UPDATE invoices
      SET payment_status =
        CASE
          WHEN paid_amount >= total THEN 'paid'
          WHEN paid_amount > 0 THEN 'partial'
          ELSE 'pending'
        END
      WHERE id = ?
    `).run(invoice_id);

    const invoice = db.prepare(`SELECT party_id FROM invoices WHERE id = ?`).get(invoice_id);
    db.prepare(`UPDATE parties SET balance = balance - ? WHERE id = ?`).run(amount, invoice.party_id);

    return { success: true };
  });

  ipcMain.handle("convert-stock", async (event, data) => {
    const { parentId, qtyToDeduct, purchaseId } = data;

    const childProduct = db.prepare("SELECT * FROM products WHERE parent_id = ?").get(parentId);

    if (!childProduct) {
      return { success: false, message: "No child product found" };
    }

    const transaction = db.transaction(() => {
      const conversionFactor = childProduct.conversion_factor || 100;
      const qtyToAdd = qtyToDeduct * conversionFactor;

      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(qtyToDeduct, parentId);
      db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(qtyToAdd, childProduct.id);

      db.prepare(`
        INSERT INTO stock_conversions (parent_product_id, child_product_id, parent_qty_deducted, child_qty_added, reference_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(parentId, childProduct.id, qtyToDeduct, qtyToAdd, purchaseId);
    });

    transaction();
    return { success: true };
  });

  ipcMain.removeHandler("get-invoice-details");

  ipcMain.handle("get-invoice-details", (event, invoiceId) => {
    const invoice = db.prepare(`
      SELECT 
        invoices.*, 
        parties.name AS party_name,
        parties.phone AS party_phone,
        parties.address AS party_address,
        parties.city AS party_city,
        parties.state AS party_state,
        parties.pincode AS party_pincode,
        parties.gstin AS party_gstin, 
        parties.shipping_address AS party_shipping_address,
        parties.shipping_city AS party_shipping_city,
        parties.shipping_state AS party_shipping_state,
        parties.shipping_pincode AS party_shipping_pincode
      FROM invoices
      LEFT JOIN parties ON invoices.party_id = parties.id
      WHERE invoices.id = ?
    `).get(invoiceId);

    const items = db.prepare(`
      SELECT 
        invoice_items.*,
        products.name,
        products.hsn_code,
        products.tax_rate
      FROM invoice_items
      LEFT JOIN products ON invoice_items.product_id = products.id
      WHERE invoice_id = ?
    `).all(invoiceId);

    const payments = db.prepare(`
      SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY created_at DESC
    `).all(invoiceId);

    const returns = db.prepare(`
      SELECT * FROM sales_returns WHERE invoice_id = ? ORDER BY created_at DESC
    `).all(invoiceId);

    const returnItemsStmt = db.prepare(`
      SELECT
        sales_return_items.*,
        sales_return_items.quantity AS return_qty,
        products.name
      FROM sales_return_items
      LEFT JOIN products ON sales_return_items.product_id = products.id
      WHERE sales_return_items.return_id = ?
    `);

    const returnsWithItems = returns.map((ret) => ({
      ...ret,
      items: returnItemsStmt.all(ret.id)
    }));

    const settings = db.prepare(`SELECT * FROM settings WHERE id = 1`).get();

    return { invoice, items, payments, returns: returnsWithItems, settings };
  });

  // ── Get return refund status for an invoice ──
ipcMain.handle("get-return-refund-info", (event, invoiceId) => {
  const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);
  if (!invoice) return null;

  const returns = db.prepare(`SELECT * FROM sales_returns WHERE invoice_id = ?`).all(invoiceId);
  const totalReturned = returns.reduce((s, r) => s + Number(r.total || 0), 0);

  const paid = Number(invoice.paid_amount || 0);
  const total = Number(invoice.total || 0);
  const netInvoice = total - totalReturned;
  const refundDue = Math.max(0, paid - netInvoice);

  const refunds = db.prepare(`SELECT * FROM return_refunds WHERE invoice_id = ?`).all(invoiceId);
  const totalRefunded = refunds.reduce((s, r) => s + Number(r.amount || 0), 0);

  const creditNote = db.prepare(`SELECT * FROM credit_notes WHERE invoice_id = ?`).get(invoiceId);
  const totalCredited = creditNote ? Number(creditNote.amount || 0) : 0;

  return {
    refundDue,
    totalRefunded,
    totalCredited,
    remainingRefund: Math.max(0, refundDue - totalRefunded - totalCredited),
    creditNote: creditNote || null,
    refunds,
    hasReturn: returns.length > 0,
    totalReturned,
  };
});

// ── Process To Pay (cash refund to customer) ──
ipcMain.handle("process-return-refund", (event, data) => {
  const { invoice_id, party_id, return_id, amount, mode, note } = data;

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO return_refunds (party_id, invoice_id, return_id, amount, mode, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(party_id, invoice_id, return_id || null, amount, mode, note || "");

    // You paid customer back → your negative balance reduces → balance goes UP
    db.prepare(`UPDATE parties SET balance = balance + ? WHERE id = ?`).run(amount, party_id);

    // Update return refund_status
    db.prepare(`
      UPDATE sales_returns SET refund_status = 'refunded', refund_amount = refund_amount + ?
      WHERE invoice_id = ?
    `).run(amount, invoice_id);

    return { success: true };
  });

  return transaction();
});

// ── Create Credit Note ──
ipcMain.handle("create-credit-note", (event, data) => {
  const { party_id, invoice_id, return_id, amount } = data;

  const existing = db.prepare(`SELECT id FROM credit_notes WHERE invoice_id = ?`).get(invoice_id);
  if (existing) {
    // Add to existing credit note
    db.prepare(`UPDATE credit_notes SET amount = amount + ?, remaining = remaining + ? WHERE id = ?`)
      .run(amount, amount, existing.id);
    db.prepare(`UPDATE sales_returns SET credit_note_id = ? WHERE invoice_id = ?`)
      .run(existing.id, invoice_id);
    return { success: true, id: existing.id };
  }

  const result = db.prepare(`
    INSERT INTO credit_notes (party_id, invoice_id, return_id, amount, remaining, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(party_id, invoice_id, return_id || null, amount, amount);

  db.prepare(`UPDATE sales_returns SET credit_note_id = ? WHERE invoice_id = ?`)
    .run(result.lastInsertRowid, invoice_id);

  return { success: true, id: result.lastInsertRowid };
});

// ── Get credit notes for a party ──
ipcMain.handle("get-party-credit-notes", (event, partyId) => {
  return db.prepare(`
    SELECT cn.*,
      COALESCE(SUM(cr.amount), 0) AS redeemed,
      cn.remaining
    FROM credit_notes cn
    LEFT JOIN credit_redemptions cr ON cn.id = cr.credit_note_id
    WHERE cn.party_id = ? AND cn.status = 'active' AND cn.remaining > 0
    GROUP BY cn.id
    ORDER BY cn.created_at DESC
  `).all(partyId);
});



// ── Redeem Credit Note ──
ipcMain.handle("redeem-credit-note", (event, data) => {
  const { credit_note_id, party_id, amount, note } = data;

  const transaction = db.transaction(() => {
    const cn = db.prepare(`SELECT * FROM credit_notes WHERE id = ?`).get(credit_note_id);
    if (!cn) throw new Error("Credit note not found");

    const redeemAmount = Math.min(amount, cn.remaining);

    db.prepare(`
      INSERT INTO credit_redemptions (credit_note_id, party_id, amount, note)
      VALUES (?, ?, ?, ?)
    `).run(credit_note_id, party_id, redeemAmount, note || "");

    const newRemaining = cn.remaining - redeemAmount;
    db.prepare(`
      UPDATE credit_notes SET remaining = ?, status = ?
      WHERE id = ?
    `).run(newRemaining, newRemaining <= 0 ? 'used' : 'active', credit_note_id);

    // Reduce party balance on redemption
    db.prepare(`UPDATE parties SET balance = balance + ? WHERE id = ?`).run(redeemAmount, party_id);

    return { success: true, redeemed: redeemAmount };
  });

  return transaction();
});

// Get product by barcode (for scanner)
ipcMain.handle("get-product-by-barcode", (event, barcode) => {
  return db.prepare(`SELECT * FROM products WHERE barcode = ?`).get(barcode);
});

// Save barcode to product
ipcMain.handle("save-product-barcode", (event, { id, barcode }) => {
  db.prepare(`UPDATE products SET barcode = ? WHERE id = ?`).run(barcode, id);
  return { success: true };
});

// ── ADD THESE TWO HANDLERS TO main.js ──
// Place them anywhere before the closing });  of app.whenReady().then(()

// ── 1. GET GSTR-1 DATA ──
ipcMain.handle("get-gstr1-data", (event, { filterType, month, year, date }) => {
  const settings = db.prepare(`SELECT * FROM settings WHERE id = 1`).get();

  let whereClause = "";
  let params = [];

  if (filterType === "date" && date) {
  whereClause = `WHERE date(invoices.created_at, 'localtime') = ?`;
  params = [date];
} else if (filterType === "year") {
  whereClause = `WHERE strftime('%Y', invoices.created_at, 'localtime') = ?`;
  params = [String(year)];
} else {
  whereClause = `WHERE strftime('%m', invoices.created_at, 'localtime') = ? AND strftime('%Y', invoices.created_at, 'localtime') = ?`;
  params = [String(month).padStart(2, "0"), String(year)];
}

  const invoices = db.prepare(`
    SELECT
      invoices.*,
      parties.name AS party_name,
      parties.gstin AS party_gstin,
      parties.state AS party_state
    FROM invoices
    LEFT JOIN parties ON invoices.party_id = parties.id
    ${whereClause}
  `).all(...params);

  const b2b = [];
  const b2cs = [];
  const hsn = {};

  for (const inv of invoices) {
    const items = db.prepare(`
      SELECT
        invoice_items.*,
        products.name,
        products.hsn_code,
        products.tax_rate
      FROM invoice_items
      LEFT JOIN products ON invoice_items.product_id = products.id
      WHERE invoice_id = ?
        AND invoice_items.is_free = 0
    `).all(inv.id);

    // Group items by tax rate
    const rateGroups = {};
    for (const item of items) {
      const rate = Number(item.tax_rate || 0);
      const itemTotal = Number(item.price) * Number(item.quantity);
      const base = itemTotal / (1 + rate / 100);
      const taxAmt = itemTotal - base;

      if (!rateGroups[rate]) rateGroups[rate] = { rate, taxableValue: 0, taxAmount: 0 };
      rateGroups[rate].taxableValue += base;
      rateGroups[rate].taxAmount += taxAmt;

      // HSN summary
      const hsnCode = item.hsn_code || "N/A";
      if (!hsn[hsnCode]) hsn[hsnCode] = { quantity: 0, total: 0, taxableValue: 0, taxAmount: 0 };
      hsn[hsnCode].quantity += Number(item.quantity);
      hsn[hsnCode].total += itemTotal;
      hsn[hsnCode].taxableValue += base;
      hsn[hsnCode].taxAmount += taxAmt;
    }

    const invoiceData = {
      ...inv,
      rateGroups: Object.values(rateGroups)
    };

    // Split into b2b or b2cs based on GSTIN
    if (inv.party_gstin && inv.party_gstin.trim() !== "") {
      b2b.push(invoiceData);
    } else {
      b2cs.push(invoiceData);
    }
  }

  const isSameState = true; // Tamil Nadu business — most sales intrastate

  return { b2b, b2cs, hsn, settings, isSameState };
});

// ── 2. SAVE FILE WITH DIALOG ──
ipcMain.handle("save-file", async (event, { buffer, defaultName, filters }) => {
  const { dialog } = await import("electron");
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: filters || [{ name: "Excel Files", extensions: ["xlsx"] }]
  });

  if (canceled || !filePath) return { success: false, cancelled: true };

  const fs = await import("fs");
  fs.writeFileSync(filePath, Buffer.from(buffer));
  return { success: true, filePath };
});

});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});