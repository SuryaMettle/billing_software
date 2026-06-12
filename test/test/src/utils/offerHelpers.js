/**
 * offerHelpers.js
 * ─────────────────────────────────────────────────────────────
 * Pure helper functions for the offer engine.
 * No React, no state, no DB calls.
 * ─────────────────────────────────────────────────────────────
 */

// ─── ID Generator ─────────────────────────────────────────────

export function generateCartItemId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cart_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// ─── Offer Normalization ──────────────────────────────────────
/**
 * The DB schema has both camelCase and snake_case columns
 * (due to iterative development). This normalizes everything
 * to a single camelCase shape so the engine only reads one format.
 */
export function normalizeOffer(raw) {
  return {
    id: raw.id,
    name: raw.name || "",

    type: (raw.type || raw.offer_type || "").toUpperCase(),

    active: raw.active ?? raw.is_active ?? 1,
    priority: Number(raw.priority ?? 0),
    stackable: raw.stackable !== 0,

    startDate: raw.start_date || raw.startDate || null,
    endDate: raw.end_date || raw.endDate || null,

    startTime: raw.start_time || raw.startTime || null,
endTime: raw.end_time || raw.endTime || null,

    usageLimit: Number(raw.usage_limit ?? raw.usageLimit ?? 0),
    usageCount: Number(raw.usage_count ?? raw.usageCount ?? 0),

    buyProductId: raw.buyProductId ?? raw.buy_product_id ?? null,
    freeProductId: raw.freeProductId ?? raw.free_product_id ?? raw.get_product_id ?? null,
    buyQty: Number(raw.buyQty ?? raw.buy_qty ?? 0),
    freeQty: Number(raw.freeQty ?? raw.free_qty ?? raw.get_qty ?? 0),

    productId: raw.productId ?? raw.product_id ?? null,
    categoryId: raw.categoryId ?? raw.category_id ?? null,

    discountPercent: Number(raw.discountPercent ?? raw.discount_percent ?? 0),
    discountMode: raw.discount_mode || raw.discountMode || "percent",

    minCartValue: Number(raw.minCartValue ?? raw.min_cart_value ?? 0),
    flatAmount: Number(raw.flatAmount ?? raw.flat_amount ?? 0),

    minQty: Number(raw.minQty ?? raw.min_qty ?? 0),

    freeProduct: raw.free_product_name
      ? {
          name: raw.free_product_name,
          price: raw.free_product_price ?? 0,
          stock: raw.free_product_stock ?? 999,
          tax_rate: raw.free_product_tax_rate ?? 0,
          hsn_code: raw.free_product_hsn_code ?? "",
        }
      : null,

    buyProduct: raw.buy_product_name
      ? {
          name: raw.buy_product_name,
          price: raw.buy_product_price ?? 0,
          stock: raw.buy_product_stock ?? 999,
          tax_rate: raw.buy_product_tax_rate ?? 0,
          hsn_code: raw.buy_product_hsn_code ?? "",
        }
      : null,
  };
}

// ─── Offer Validity Check ─────────────────────────────────────

export function isOfferActive(offer) {
  if (!offer.active) return false;

  const now = new Date();

  if (offer.startDate) {
    const start = new Date(offer.startDate);
    if (now < start) return false;
  }

  if (offer.endDate) {
    const end = new Date(offer.endDate);
    // Set end to end of day
    end.setHours(23, 59, 59, 999);
    if (now > end) return false;
  }

  // Usage limit check (0 = unlimited)
  if (offer.usageLimit > 0 && offer.usageCount >= offer.usageLimit) return false;

  return true;
}

// ─── Free Quantity Calculation ────────────────────────────────
/**
 * Given: buy 2 get 1 free, and customer has 5 units in cart
 * → Math.floor(5 / 2) * 1 = 2 free units
 */
export function calcBxgyFreeQty(totalBuyQty, buyQty, freeQty) {
  if (!buyQty || buyQty <= 0) return 0;
  return Math.floor(totalBuyQty / buyQty) * freeQty;
}

// ─── Cart Item Grouping ───────────────────────────────────────
/**
 * Returns all paid (non-free, non-offer) rows for a given productId
 */
export function groupPaidItems(cart, productId) {
  return cart.filter(
    (item) =>
      item.id === productId &&
      !item.isFreeItem &&
      !item.isOfferItem &&
      !item.isCartDiscountItem
  );
}

// ─── Item Factories ───────────────────────────────────────────

/**
 * Create a BXGY free item row.
 * Total is always 0. Quantity is auto-calculated.
 */
export function createFreeItem({
  sourceProduct,
  quantity,
  offerId,
  offerName,
  parentCartItemId,
  parentProductId,
}) {
  return {
    // Product identity
    id: sourceProduct.id,
    name: sourceProduct.name,
    price: sourceProduct.price,
    cost_price: sourceProduct.cost_price ?? 0,
    stock: sourceProduct.stock ?? 0,
    tax_rate: sourceProduct.tax_rate ?? 0,
    hsn_code: sourceProduct.hsn_code ?? "",
    unit_type: sourceProduct.unit_type ?? "unit",
    category: sourceProduct.category ?? "",

    // Cart identity – unique per free row
    cartItemId: generateCartItemId(),

    // Quantities
    quantity,
    paidQuantity: 0,
    freeQuantity: quantity,

    // Financials – free items cost nothing
    total: 0,
    discountPercent: 100,
    discountAmount: sourceProduct.price * quantity,
    manualDiscountPercent: 0,
    manualDiscountAmount: 0,
    offerDiscountAmount: sourceProduct.price * quantity,

    // Offer metadata
    isFreeItem: true,
    isOfferItem: true,
    isCartDiscountItem: false,
    appliedOfferId: offerId,
    appliedOfferType: "BXGY",
    appliedOfferName: offerName,
    parentCartItemId,
    parentProductId,
  };
}

/**
 * Create a flat-discount cart row (appears as negative total line).
 * Shows as "OFFER" badge in the cart UI.
 */
export function createCartDiscountItem({ offerId, offerName, flatAmount }) {
  return {
    id: `offer_flat_${offerId}`,
    name: offerName,
    price: 0,
    cost_price: 0,
    stock: Infinity,
    tax_rate: 0,
    hsn_code: "",
    unit_type: "unit",
    category: "",

    cartItemId: generateCartItemId(),

    quantity: 1,
    paidQuantity: 0,
    freeQuantity: 0,

    // Negative total reduces overall cart value
    total: -Math.abs(flatAmount),
    discountPercent: 0,
    discountAmount: 0,
    manualDiscountPercent: 0,
    manualDiscountAmount: 0,
    offerDiscountAmount: flatAmount,

    isFreeItem: false,
    isOfferItem: true,
    isCartDiscountItem: true,
    appliedOfferId: offerId,
    appliedOfferType: "FLAT_DISCOUNT",
    appliedOfferName: offerName,
    parentCartItemId: null,
    parentProductId: null,
  };
}

// ─── Cart Total Helpers ───────────────────────────────────────

/**
 * Compute cart total excluding offer/free rows.
 * Used to check flat discount thresholds.
 */
export function getPaidCartTotal(cart) {
  return cart
    .filter((i) => !i.isCartDiscountItem && !i.isFreeItem)
    .reduce((s, i) => s + Number(i.total || 0), 0);
}

/**
 * Summarize what offers are currently applied (for display/debugging)
 */
export function getAppliedOfferSummary(cart) {
  const freeItems = cart.filter((i) => i.isFreeItem);
  const discountItems = cart.filter((i) => i.isCartDiscountItem);
  const percentItems = cart.filter((i) => i.appliedOfferType === "PERCENT_DISCOUNT");

  return {
    bxgy: freeItems.map((i) => ({
      name: i.name,
      qty: i.quantity,
      offerName: i.appliedOfferName,
    })),
    flat: discountItems.map((i) => ({
      offerName: i.appliedOfferName,
      amount: Math.abs(i.total),
    })),
    percent: percentItems.map((i) => ({
      name: i.name,
      offerName: i.appliedOfferName,
      saved: i.offerDiscountAmount,
    })),
  };
}