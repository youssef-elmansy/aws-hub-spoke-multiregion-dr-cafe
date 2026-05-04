const express = require("express");

const { getReadPool, getWritePool } = require("../config/db");

const router = express.Router();

// ─── Helper: attach proxy image URL ───────────────
function attachImageUrl(item) {
  if (!item || !item.image_key) return item;
  item.image_url = `/api/images/${encodeURIComponent(item.image_key)}`;
  return item;
}

// ─── GET /api/menu → READ ─────────────────────────
router.get("/", async (req, res) => {
  try {
    const pool   = await getReadPool();
    const [rows] = await pool.query(
      "SELECT * FROM menu_items WHERE available = 1 ORDER BY category, name"
    );
    rows.forEach(attachImageUrl);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ GET /api/menu failed:", err);
    res.status(500).json({ success: false, message: "Failed to load menu" });
  }
});

// ─── GET /api/menu/:id → READ ─────────────────────
router.get("/:id", async (req, res) => {
  try {
    const pool   = await getReadPool();
    const [rows] = await pool.query(
      "SELECT * FROM menu_items WHERE id = ?",
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    attachImageUrl(rows[0]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ GET /api/menu/:id failed:", err);
    res.status(500).json({ success: false, message: "Failed to load item" });
  }
});

// ─── PUT /api/menu/:id/image → WRITE ──────────────
router.put("/:id/image", async (req, res) => {
  try {
    const { image_key } = req.body;
    if (!image_key) {
      return res.status(400).json({ success: false, message: "image_key is required" });
    }
    const pool = await getWritePool();
    await pool.query(
      "UPDATE menu_items SET image_key = ? WHERE id = ?",
      [image_key, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ PUT /api/menu/:id/image failed:", err);
    res.status(500).json({ success: false, message: "Failed to update image" });
  }
});

module.exports = router;
