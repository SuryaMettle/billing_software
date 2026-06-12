/**
 * offerEngine.js
 * ─────────────────────────────────────────────────────────────
 * Production-grade Offer & Promotion Engine
 * ─────────────────────────────────────────────────────────────
 * RULES:
 *  - Never mutates input arrays/objects
 *  - Never touches manualDiscountAmount / manualDiscountPercent
 *  - Never overwrites GST values
 *  - Always returns a new cart array
 *  - Idempotent: calling applyOffers twice gives same result
 * ─────────────────────────────────────────────────────────────
 */

import {
  isOfferActive,
  normalizeOffer,
  createFreeItem,
  createCartDiscountItem,
  generateCartItemId,
  groupPaidItems,
  calcBxgyFreeQty,
} from "./offerHelpers.js";

// ─── Public API ───────────────────────────────────────────────

/**
 * Main entry point called from Billing.jsx.
 *
 * @param {Array}  cart   - Current cart array (not mutated)
 * @param {Array}  offers - Active offers from DB
 * @returns {Array} New cart array with offers applied
 */

function getConflictKey(offer) {
  if (offer.type === "FLAT_DISCOUNT") return "cart_flat";
  if (offer.type === "BXGY") return `bxgy_${offer.buyProductId}`;
  if (offer.type === "CATEGORY_DISCOUNT") return `category_${offer.categoryId}`;
  if (offer.type === "HAPPY_HOURS") {
    return offer.categoryId ? `happy_hours_${offer.categoryId}` : "happy_hours_all";
  }
  return `product_${offer.productId ?? offer.buyProductId}`;
}

function isEligible(cart, offer) {
  if (offer.type === "FLAT_DISCOUNT") {
    const cartTotal = cart
      .filter(i => !i.isCartDiscountItem && !i.isFreeItem)
      .reduce((s, i) => s + Number(i.total || 0), 0);
    return cartTotal >= offer.minCartValue;
  }

  if (offer.type === "BXGY") {
    const buyRows = groupPaidItems(cart, offer.buyProductId);
    const totalQty = buyRows.reduce((s, r) => s + Number(r.quantity || 0), 0);
    return totalQty >= offer.buyQty;
  }

  if (offer.type === "PERCENT_DISCOUNT") {
    const rows = groupPaidItems(cart, offer.productId);
    const totalQty = rows.reduce((s, r) => s + Number(r.quantity || 0), 0);
    const minQty = offer.minQty ?? 0;
    return rows.length > 0 && (minQty === 0 || totalQty >= minQty);
  }

  if (offer.type === "TIERED_DISCOUNT") {
    const rows = groupPaidItems(cart, offer.productId);
    const totalQty = rows.reduce((s, r) => s + Number(r.quantity || 0), 0);
    return totalQty >= offer.buyQty;
  }

  if (offer.type === "CATEGORY_DISCOUNT") {
  return cart.some(
    (item) =>
      !item.isFreeItem &&
      !item.isCartDiscountItem &&
      String(item.category || "").trim() === String(offer.categoryId || "").trim()
  );
}

  if (offer.type === "HAPPY_HOURS") {
  return isHappyHourNow(offer) && cart.some(
    (item) =>
      !item.isFreeItem &&
      !item.isCartDiscountItem &&
      (
        !offer.categoryId ||
        String(item.category || "").trim() === String(offer.categoryId || "").trim()
      )
  );
}

  return false;
}

export function applyOffers(cart, offers, resolvedConflicts = {}) {
  if (!Array.isArray(cart) || cart.length === 0) return { cart, conflicts: {} };
  if (!Array.isArray(offers) || offers.length === 0) {
    return { cart: stripOfferItems(cart), conflicts: {} };
  }

  let workingCart = stripOfferItems(cart);

  const activeOffers = offers
    .map(normalizeOffer)
    .filter(isOfferActive)
    .sort((a, b) => b.priority - a.priority);

  const orderedOffers = [
  ...activeOffers.filter(o => o.type === "HAPPY_HOURS"),
  ...activeOffers.filter(o => o.type === "PERCENT_DISCOUNT"),
  ...activeOffers.filter(o => o.type === "CATEGORY_DISCOUNT"),
  ...activeOffers.filter(o => o.type === "TIERED_DISCOUNT"),
  ...activeOffers.filter(o => o.type === "BXGY"),
  ...activeOffers.filter(o => o.type === "FLAT_DISCOUNT"),
];

  // ── Detect eligible offers per conflict key ──
  const eligibilityMap = {}; // key → [offer, offer, ...]

  for (const offer of orderedOffers) {
    const key = getConflictKey(offer);
    const eligible = isEligible(workingCart, offer);
    if (!eligible) continue;

    if (!eligibilityMap[key]) eligibilityMap[key] = [];
    eligibilityMap[key].push(offer);
  }

  // ── Find conflicts (2+ eligible offers for same key) ──
  const newConflicts = {};
  for (const [key, eligibleOffers] of Object.entries(eligibilityMap)) {
    if (eligibleOffers.length > 1) {
      // Check if user already resolved this conflict
      if (!(key in resolvedConflicts)) {
  newConflicts[key] = eligibleOffers;
}
    }
  }

  // ── If any unresolved conflicts exist, return them without applying ──
  if (Object.keys(newConflicts).length > 0) {
    return { cart: workingCart, conflicts: newConflicts };
  }

  // ── Apply offers (no conflicts, or all resolved) ──
  let nonStackableApplied = false;

  for (const offer of orderedOffers) {
  if (!offer.stackable && nonStackableApplied) continue;

  const key = getConflictKey(offer);
  const eligibleOffers = eligibilityMap[key] || [];

  if (resolvedConflicts[key] === null) continue;

  // Skip offers that are not eligible at all for current cart
  if (!isEligible(workingCart, offer)) continue;

  if (eligibleOffers.length > 1) {
    const chosenId = resolvedConflicts[key];
    if (chosenId === null || chosenId === undefined) continue;
    if (offer.id !== chosenId) continue;
  } else if (eligibleOffers.length === 0) {
  // Offer was previously resolved but no longer eligible
  continue;
}
    let result = null;

    switch (offer.type) {
      case "BXGY":
        result = applyBxgy(workingCart, offer);
        break;
      case "PERCENT_DISCOUNT":
        result = applyPercentDiscount(workingCart, offer);
        break;
      case "CATEGORY_DISCOUNT":
        result = applyCategoryDiscount(workingCart, offer);
        break;
      case "TIERED_DISCOUNT":
        result = applyTieredDiscount(workingCart, offer);
        break;
      case "FLAT_DISCOUNT":
        result = applyFlatDiscount(workingCart, offer);
        break;
      case "HAPPY_HOURS":
        result = applyHappyHours(workingCart, offer);
        break;
      default:
        break;
    }

    if (result) {
      workingCart = result;
      if (!offer.stackable) nonStackableApplied = true;
    }
  }

  return { cart: workingCart, conflicts: {} };
}

// ─── Offer Type Handlers ──────────────────────────────────────

/**
 * BUY X GET Y FREE
 * Supports: same product (Buy 2 Coke → 1 Coke free)
 *           cross product (Buy 2 Shampoo → 1 Soap free)
 */
function applyBxgy(cart, offer) {
  const { id, buyProductId, freeProductId, buyQty, freeQty, name } = offer;

  // Find all paid rows for the BUY product
  const buyRows = groupPaidItems(cart, buyProductId);
  const totalBuyQty = buyRows.reduce((s, r) => s + Number(r.quantity || 0), 0);

  if (totalBuyQty < buyQty) return cart;

  const entitledFreeQty = calcBxgyFreeQty(totalBuyQty, buyQty, freeQty);

  // ── FIX: always look up the FREE product separately ──
  let freeProductSource = null;

  if (freeProductId === buyProductId) {
    // Same product (Buy 2 Coke → Get 1 Coke free)
    freeProductSource = buyRows[0];
  } else {
    // Different product — check cart first, then use offer's joined product fields
    freeProductSource =
      cart.find((i) => i.id === freeProductId && !i.isFreeItem) ||
      (offer.freeProduct
        ? {
            id: freeProductId,
            name: offer.freeProduct.name,
            price: offer.freeProduct.price ?? 0,
            stock: offer.freeProduct.stock ?? 999,
            tax_rate: offer.freeProduct.tax_rate ?? 0,
            hsn_code: offer.freeProduct.hsn_code ?? "",
            unit_type: "unit",
            cost_price: 0,
            category: "",
          }
        : null);
  }

  if (!freeProductSource) return cart;

  const parentRow = buyRows[0];

  const freeItem = createFreeItem({
    sourceProduct: freeProductSource,
    quantity: entitledFreeQty,
    offerId: id,
    offerName: name,
    parentCartItemId: parentRow.cartItemId,
    parentProductId: buyProductId,
  });

  const updatedCart = cart.map((item) => {
  if (item.cartItemId === parentRow.cartItemId) {
    return {
      ...item,
      appliedOfferId: id,
      appliedOfferType: "BXGY",
      appliedOfferName: name,
    };
  }
  return item;
});

return [...updatedCart, freeItem];
}

/**
 * PERCENTAGE DISCOUNT on a specific product
 * Preserves manualDiscountAmount; offer discount is additive
 */
function applyPercentDiscount(cart, offer) {
  const { id, productId, discountPercent, name } = offer;
  const minQty = offer.minQty ?? 0;

  if (!productId || !discountPercent) return null;

  let applied = false;

  const updatedCart = cart.map((item) => {
    if (item.id !== productId || item.isFreeItem || item.isOfferItem) return item;
    if (minQty > 0 && Number(item.quantity || 0) < minQty) return item;

    const baseTotal = Number(item.quantity || 0) * Number(item.price || 0);
    const manualDisc = Number(item.manualDiscountAmount ?? 0);
    const offerDisc = parseFloat(((baseTotal * discountPercent) / 100).toFixed(2));
    const newTotal = Math.max(0, baseTotal - manualDisc - offerDisc);

    applied = true;

    return {
      ...item,
      offerDiscountAmount: offerDisc,
      appliedOfferId: id,
      appliedOfferType: "PERCENT_DISCOUNT",
      appliedOfferName: name,
      // ── NEVER write to discountPercent or discountAmount ──
      // Those fields are owned by manual discount handlers only
      total: newTotal,
    };
  });

  return applied ? updatedCart : null;
}

/**
 * FLAT DISCOUNT on cart total
 * Adds a special "OFFER" row (negative value) when threshold met
 * Removes it automatically when cart falls below threshold
 */
function applyFlatDiscount(cart, offer) {
  const { id, minCartValue, flatAmount, name } = offer;

  const cartTotal = cart
    .filter((i) => !i.isCartDiscountItem && !i.isFreeItem)
    .reduce((s, i) => s + Number(i.total || 0), 0);

  if (cartTotal < minCartValue) return null;

  // Distribute flat discount proportionally across all paid items
  const paidItems = cart.filter((i) => !i.isCartDiscountItem && !i.isFreeItem);
  const actualDiscount = Math.min(flatAmount, cartTotal);

  let applied = false;

  const updatedCart = cart.map((item) => {
    if (item.isCartDiscountItem || item.isFreeItem) return item;

    const itemShare = cartTotal > 0 ? (Number(item.total || 0) / cartTotal) : 0;
    const itemDiscount = parseFloat((actualDiscount * itemShare).toFixed(2));
    const manualDisc = Number(item.manualDiscountAmount ?? 0);
    const baseTotal = Number(item.quantity || 0) * Number(item.price || 0);

    applied = true;

    return {
      ...item,
      offerDiscountAmount: itemDiscount,
      appliedOfferId: id,
      appliedOfferType: "FLAT_DISCOUNT",
      appliedOfferName: name,
      total: Math.max(0, baseTotal - manualDisc - itemDiscount),
    };
  });

  return applied ? updatedCart : null;
}

function applyCategoryDiscount(cart, offer) {
  const { id, categoryId, discountPercent, name } = offer;

  if (!categoryId || !discountPercent) return null;

  let applied = false;

  const updatedCart = cart.map((item) => {
  const itemCategory = String(item.category || "").trim();
  const offerCategory = String(categoryId || "").trim();

  if (
    itemCategory !== offerCategory ||
    item.isFreeItem ||
    item.isOfferItem ||
    item.isCartDiscountItem
  ) {
    return item;
  }

    const baseTotal = Number(item.quantity || 0) * Number(item.price || 0);
    const manualDisc = Number(item.manualDiscountAmount ?? 0);
    const offerDisc = parseFloat(((baseTotal * discountPercent) / 100).toFixed(2));
    const newTotal = Math.max(0, baseTotal - manualDisc - offerDisc);

    applied = true;

    return {
      ...item,
      offerDiscountAmount: offerDisc,
      appliedOfferId: id,
      appliedOfferType: "CATEGORY_DISCOUNT",
      appliedOfferName: name,
      total: newTotal,
    };
  });

  return applied ? updatedCart : null;
}

function isHappyHourNow(offer) {
  if (!offer.startTime || !offer.endTime) return false;

  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = offer.startTime.split(":").map(Number);
  const [eh, em] = offer.endTime.split(":").map(Number);

  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  if (start <= end) return current >= start && current <= end;
  return current >= start || current <= end;
}

function applyHappyHours(cart, offer) {
  const { id, categoryId, discountPercent, flatAmount, discountMode, name } = offer;
  // Empty category means all categories.

  let applied = false;

  const updatedCart = cart.map((item) => {
    if (
  item.isFreeItem ||
  item.isOfferItem ||
  item.isCartDiscountItem ||
  (
    categoryId &&
    String(item.category || "").trim() !== String(categoryId || "").trim()
  )
) {
  return item;
}

    const baseTotal = Number(item.quantity || 0) * Number(item.price || 0);
    const manualDisc = Number(item.manualDiscountAmount ?? 0);
    const offerDisc =
      discountMode === "amount"
        ? Math.min(Number(flatAmount || 0), Math.max(0, baseTotal - manualDisc))
        : parseFloat(((baseTotal * Number(discountPercent || 0)) / 100).toFixed(2));

    if (offerDisc <= 0) return item;

    applied = true;

    return {
      ...item,
      offerDiscountAmount: offerDisc,
      appliedOfferId: id,
      appliedOfferType: "HAPPY_HOURS",
      appliedOfferName: name,
      total: Math.max(0, baseTotal - manualDisc - offerDisc),
    };
  });

  return applied ? updatedCart : null;
}

function applyTieredDiscount(cart, offer) {
  const { id, productId, discountPercent, buyQty, name } = offer;

  if (!productId || !discountPercent || !buyQty) return null;

  let applied = false;

  const updatedCart = cart.map((item) => {
    if (item.id !== productId || item.isFreeItem || item.isOfferItem) return item;

    const qty = Number(item.quantity || 0);
    const sets = Math.floor(qty / buyQty); // how many complete sets

    if (sets === 0) return item; // didn't buy enough for even 1 set

    const totalDiscountPercent = sets * discountPercent; // 5 sets × 5% = 25%
    const cappedPercent = Math.min(totalDiscountPercent, 100); // never exceed 100%

    const baseTotal = qty * Number(item.price || 0);
    const manualDisc = Number(item.manualDiscountAmount ?? 0);
    const offerDisc = parseFloat(((baseTotal * cappedPercent) / 100).toFixed(2));
    const newTotal = Math.max(0, baseTotal - manualDisc - offerDisc);

    applied = true;

    return {
      ...item,
      offerDiscountAmount: offerDisc,
      appliedOfferId: id,
      appliedOfferType: "TIERED_DISCOUNT",
      appliedOfferName: `${name} (${cappedPercent}% off)`,
      total: newTotal,
    };
  });

  return applied ? updatedCart : null;
}

// ─── Internal Helpers ─────────────────────────────────────────

/**
 * Remove all rows that were added by the offer engine:
 *  - isFreeItem: true   (BXGY free rows)
 *  - isOfferItem: true  (any offer-generated row)
 *  - isCartDiscountItem (flat discount rows)
 * Also reset per-item offer fields on paid rows.
 */
function stripOfferItems(cart) {
  return cart
    .filter((item) => !item.isFreeItem && !item.isOfferItem && !item.isCartDiscountItem)
    .map((item) => {
      // If this item had an offer discount, reset it; keep manual discount intact
      if (item.appliedOfferId) {
        const baseTotal = Number(item.quantity || 0) * Number(item.price || 0);
        const manualDisc = Number(item.manualDiscountAmount ?? 0);
        return {
          ...item,
          offerDiscountAmount: 0,
          appliedOfferId: null,
          appliedOfferType: null,
          appliedOfferName: null,
          discountAmount: manualDisc,
          discountPercent: baseTotal > 0
            ? parseFloat(((manualDisc / baseTotal) * 100).toFixed(2))
            : 0,
          total: Math.max(0, baseTotal - manualDisc),
        };
      }
      return item;
    });
}