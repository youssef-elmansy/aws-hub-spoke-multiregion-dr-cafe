const express  = require("express");
const multer   = require("multer");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { randomUUID } = require("crypto");
const path     = require("path");

const { getS3, getBucket, getMenuFolder, getBlogFolder } = require("../config/s3");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ─── Helper: upload buffer to S3/MRAP ─────────────
async function uploadToS3(folder, file) {
  const s3     = await getS3();
  const bucket = await getBucket();
  const ext    = path.extname(file.originalname) || ".webp";
  const key    = `${folder}/${randomUUID()}${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket:      bucket,
    Key:         key,
    Body:        file.buffer,
    ContentType: file.mimetype,
  }));

  console.log(`✅ Uploaded: ${key}`);
  return { key, url: `/api/images/${encodeURIComponent(key)}` };
}

// ─── POST /api/upload/menu ────────────────────────
router.post("/menu", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }
    const folder = await getMenuFolder();
    const result = await uploadToS3(folder, req.file);
    res.json({ success: true, key: result.key, url: result.url });
  } catch (err) {
    console.error("❌ /api/upload/menu failed:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// ─── POST /api/upload/blog ────────────────────────
router.post("/blog", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }
    const folder = await getBlogFolder();
    const result = await uploadToS3(folder, req.file);
    res.json({ success: true, key: result.key, url: result.url });
  } catch (err) {
    console.error("❌ /api/upload/blog failed:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

module.exports = router;
