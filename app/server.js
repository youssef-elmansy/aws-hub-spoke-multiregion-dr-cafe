const express = require("express");
const path    = require("path");

const menuRoutes   = require("./routes/menu");
const ordersRoutes = require("./routes/orders");
const blogRoutes   = require("./routes/blog");
const uploadRoutes = require("./routes/upload");
const imagesRoutes = require("./routes/images");

const { getWritePool, getReadPool } = require("./config/db");
const { getS3, getBucket }          = require("./config/s3");
const { getInstanceMetadata }       = require("./config/metadata");

const app  = express();
const PORT = process.env.PORT || 5002;

// ─── Middleware ───────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Static Files ─────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ─── API Routes ───────────────────────────────────
app.use("/api/menu",   menuRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/blog",   blogRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/images", imagesRoutes);

// ─── Health Check ─────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Region Endpoint ──────────────────────────────
let cachedMeta;
app.get("/api/region", async (req, res) => {
  try {
    if (!cachedMeta) cachedMeta = await getInstanceMetadata();
    res.json({
      success: true,
      data: {
        region:     cachedMeta.region,
        az:         cachedMeta.az,
        instanceId: cachedMeta.instanceId,
        privateIp:  cachedMeta.privateIp,
      },
    });
  } catch (err) {
    console.error("❌ /api/region failed:", err);
    res.status(500).json({ success: false });
  }
});

// ─── Staff Portal ─────────────────────────────────
app.get("/staff", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "staff.html"));
});

// ─── Root ─────────────────────────────────────────
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ─── Startup ──────────────────────────────────────
async function start() {
  try {
    console.log("🔄 Warming up connections...");

    const [writePool, readPool, s3Bucket, meta] = await Promise.all([
      getWritePool(),
      getReadPool(),
      getBucket(),
      getInstanceMetadata(),
    ]);

    cachedMeta = meta;

    await writePool.query("SELECT 1");
    await readPool.query("SELECT 1");

    console.log("✅ Write pool ready");
    console.log("✅ Read pool ready");
    console.log(`✅ S3 bucket: ${s3Bucket}`);
    console.log(`✅ Region: ${meta.region} · AZ: ${meta.az}`);

    app.listen(PORT, () => {
      console.log(`☕ Cafe app running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Startup failed:", err);
    process.exit(1);
  }
}

start();
