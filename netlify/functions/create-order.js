const crypto = require("crypto");
const { getAdminApp, response, verifyUser } = require("./_firebase");

const SHIPPING_FEE = 5000;
const MAX_ITEMS = 20;
const MAX_QUANTITY_PER_ITEM = 10;

function cleanText(value, maxLength = 180) {
  return String(value || "").trim().slice(0, maxLength);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return response(405, { error: "Method not allowed." });

  let decoded;
  try {
    decoded = await verifyUser(event);
  } catch (error) {
    return response(error.statusCode || 401, { error: error.message });
  }

  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { error: "Invalid order request." });
  }

  const customerName = cleanText(input.customerName, 100);
  const customerPhone = cleanText(input.customerPhone, 30);
  const customerEmail = cleanText(input.customerEmail, 160);
  const state = cleanText(input.state, 80);
  const city = cleanText(input.city, 80);
  const deliveryAddress = cleanText(input.deliveryAddress, 400);
  const items = Array.isArray(input.items) ? input.items : [];

  if (!customerName || !customerPhone || !state || !city || !deliveryAddress) {
    return response(400, { error: "Complete your name, phone, state, city and delivery address." });
  }
  if (!/^[+0-9()\-\s]{7,30}$/.test(customerPhone)) {
    return response(400, { error: "Enter a valid phone number." });
  }
  if (!items.length || items.length > MAX_ITEMS) {
    return response(400, { error: "Your cart is empty or contains too many different products." });
  }

  const requested = new Map();
  for (const item of items) {
    const id = cleanText(item.id, 100);
    const qty = Number(item.qty);
    if (!id || !Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY_PER_ITEM) {
      return response(400, { error: "One or more cart items are invalid." });
    }
    requested.set(id, (requested.get(id) || 0) + qty);
  }

  for (const qty of requested.values()) {
    if (qty > MAX_QUANTITY_PER_ITEM) return response(400, { error: "Maximum quantity per product is 10." });
  }

  try {
    const app = getAdminApp();
    const db = app.database();
    const orderRef = "VGT-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    const orderNode = db.ref("orders/" + orderRef);

    await orderNode.set({
      orderRef,
      customerUid: decoded.uid,
      customerName,
      customerPhone,
      customerEmail,
      state,
      city,
      deliveryAddress,
      items: [],
      totalAmount: 0,
      paymentStatus: "Pending Verification",
      orderStatus: "Validating Inventory",
      createdAt: new Date().toISOString()
    });

    let trustedItems = [];
    let subtotal = 0;
    const productsRef = db.ref("products");
    const transaction = await productsRef.transaction((products) => {
      if (!products) return;
      const next = { ...products };
      const currentItems = [];
      let currentSubtotal = 0;

      for (const [id, qty] of requested.entries()) {
        const product = next[id];
        if (!product || product.status === "Sold Out") return;
        const price = Number(product.price);
        const stock = Number(product.stock === undefined ? 1 : product.stock);
        if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < qty) return;

        currentItems.push({
          id,
          title: cleanText(product.title, 180),
          price,
          qty,
          condition: cleanText(product.condition, 80),
          storage: cleanText(product.storage, 80),
          image: cleanText(product.image, 1000)
        });
        currentSubtotal += price * qty;
        const newStock = stock - qty;
        next[id] = {
          ...product,
          stock: newStock,
          status: newStock <= 0 ? "Sold Out" : (product.status || "In Stock")
        };
      }

      trustedItems = currentItems;
      subtotal = currentSubtotal;
      return next;
    }, undefined, false);

    if (!transaction.committed) {
      await orderNode.update({
        orderStatus: "Rejected",
        rejectionReason: "One or more products are unavailable or have insufficient stock."
      });
      return response(409, { error: "Some products are no longer available in the requested quantities. Refresh your cart and try again." });
    }

    const totalAmount = subtotal + SHIPPING_FEE;
    await orderNode.update({
      items: trustedItems,
      subtotal,
      shippingFee: SHIPPING_FEE,
      totalAmount,
      orderStatus: "Order Received"
    });

    return response(200, { success: true, orderRef, subtotal, shippingFee: SHIPPING_FEE, totalAmount });
  } catch (error) {
    return response(500, { error: "We could not complete your order. Please contact support before submitting again." });
  }
};
