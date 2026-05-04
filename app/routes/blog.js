const express = require("express");

const { getReadPool, getWritePool } = require("../config/db");

const router = express.Router();

// ─── Helper: attach proxy image URL ───────────────
function attachImageUrl(post) {
  if (!post || !post.image_key) return post;
  post.image_url = `/api/images/${encodeURIComponent(post.image_key)}`;
  return post;
}

// ─── GET /api/blog → READ ─────────────────────────
router.get("/", async (req, res) => {
  try {
    const pool   = await getReadPool();
    const [rows] = await pool.query(
      "SELECT * FROM blog_posts ORDER BY created_at DESC"
    );
    rows.forEach(attachImageUrl);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ GET /api/blog failed:", err);
    res.status(500).json({ success: false, message: "Failed to load blog" });
  }
});

// ─── GET /api/blog/:id → READ ─────────────────────
router.get("/:id", async (req, res) => {
  try {
    const pool   = await getReadPool();
    const [rows] = await pool.query(
      "SELECT * FROM blog_posts WHERE id = ?",
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    attachImageUrl(rows[0]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ GET /api/blog/:id failed:", err);
    res.status(500).json({ success: false, message: "Failed to load post" });
  }
});

// ─── POST /api/blog → WRITE ───────────────────────
router.post("/", async (req, res) => {
  try {
    const { title, content, image_key } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: "Title and content required" });
    }
    const pool = await getWritePool();
    const [result] = await pool.query(
      `INSERT INTO blog_posts (title, content, image_key, created_at)
       VALUES (?, ?, ?, NOW())`,
      [title, content, image_key || null]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    console.error("❌ POST /api/blog failed:", err);
    res.status(500).json({ success: false, message: "Failed to create post" });
  }
});

// ─── DELETE /api/blog/:id → WRITE ─────────────────
router.delete("/:id", async (req, res) => {
  try {
    const pool = await getWritePool();
    await pool.query("DELETE FROM blog_posts WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE /api/blog/:id failed:", err);
    res.status(500).json({ success: false, message: "Failed to delete post" });
  }
});

module.exports = router;
