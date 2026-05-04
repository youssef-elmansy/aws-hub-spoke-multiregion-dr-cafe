const express = require("express");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getS3, getBucket } = require("../config/s3");

const router = express.Router();

// GET /api/images/:key — proxies image from S3/MRAP through backend
router.get("/:key(*)", async (req, res) => {
  try {
    const s3     = await getS3();
    const bucket = await getBucket();
    const key    = decodeURIComponent(req.params.key);

    console.log(`🖼️  Fetching image: ${key} from ${bucket}`);

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key:    key,
    });

    const s3Response = await s3.send(command);

    res.setHeader("Content-Type",  s3Response.ContentType  || "image/webp");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.setHeader("Content-Length", s3Response.ContentLength);

    s3Response.Body.pipe(res);

  } catch (err) {
    console.error("❌ Image proxy failed:", err.message, "key:", req.params.key);
    res.status(404).send("Image not found");
  }
});

module.exports = router;
