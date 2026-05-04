const express = require("express");
const { getReadPool, getWritePool } = require("../config/db");
const { getInstanceMetadata } = require("../config/metadata");

const router = express.Router();

// ─── POST /api/orders → WRITE ─────────────────────
router.post("/", async (req, res) => {
  const pool = await getWritePool();
  const conn = await pool.getConnection();
  try {
    const { customer_name, items } = req.body;

    if (!customer_name || !Array.isArray(items) || !items.length) {
      conn.release();
      return res.status(400).json({ success: false, message: "Invalid order payload" });
    }

    const meta  = await getInstanceMetadata();
    const total = items.reduce((s, it) => s + parseFloat(it.price_at_time || 0), 0);

    await conn.beginTransaction();

    const [orderResult] = await conn.query(
      `INSERT INTO orders
         (customer_name, total, status, served_by_instance, served_by_az, created_at)
       VALUES (?, ?, 'pending', ?, ?, NOW())`,
      [customer_name, total.toFixed(2), meta.instanceId, meta.az]
    );
    const orderId = orderResult.insertId;

    for (const it of items) {
      await conn.query(
        `INSERT INTO order_items (order_id, menu_item_id, price_at_time)
         VALUES (?, ?, ?)`,
        [orderId, it.menu_item_id, parseFloat(it.price_at_time)]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      data: {
        order_id:  orderId,
        customer:  customer_name,
        total:     `£${total.toFixed(2)}`,
        served_by: meta.instanceId,
        az:        meta.az,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("❌ POST /api/orders failed:", err);
    res.status(500).json({ success: false, message: "Failed to create order" });
  } finally {
    conn.release();
  }
});

// ─── GET /api/orders → READ ───────────────────────
router.get("/", async (req, res) => {
  try {
    const pool = await getReadPool();

    const [orders] = await pool.query(
      "SELECT * FROM orders ORDER BY created_at DESC"
    );

    // Pull items in one go and group in JS
    const [allItems] = await pool.query(
      `SELECT oi.*, mi.name
         FROM order_items oi
         LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
        ORDER BY oi.order_id DESC`
    );

    const itemsByOrder = {};
    for (const it of allItems) {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
      itemsByOrder[it.order_id].push(it);
    }
    for (const o of orders) {
      o.items = itemsByOrder[o.id] || [];
    }

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("❌ GET /api/orders failed:", err);
    res.status(500).json({ success: false, message: "Failed to load orders" });
  }
});

// ─── GET /api/orders/:id → READ ───────────────────
router.get("/:id", async (req, res) => {
  try {
    const pool = await getReadPool();

    const [orders] = await pool.query(
      "SELECT * FROM orders WHERE id = ?",
      [req.params.id]
    );
    if (!orders.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const [items] = await pool.query(
      `SELECT oi.*, mi.name
         FROM order_items oi
         LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE oi.order_id = ?`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...orders[0], items } });
  } catch (err) {
    console.error("❌ GET /api/orders/:id failed:", err);
    res.status(500).json({ success: false, message: "Failed to load order" });
  }
});

// ─── PATCH /api/orders/:id/status → WRITE ─────────
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "completed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const pool = await getWritePool();
    await pool.query(
      "UPDATE orders SET status = ? WHERE id = ?",
      [status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ PATCH /api/orders/:id/status failed:", err);
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
});

module.exports = router;
