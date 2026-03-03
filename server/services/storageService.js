/**
 * Cloud storage service for S3 / R2.
 * When STORAGE_* env vars are set, uploads go to cloud. Otherwise, use local disk via multer.
 */
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const fs = require("fs");

const BUCKET = process.env.STORAGE_BUCKET;
const REGION = process.env.STORAGE_REGION || "auto";
const ACCESS_KEY = process.env.STORAGE_ACCESS_KEY;
const SECRET_KEY = process.env.STORAGE_SECRET_KEY;
const ENDPOINT = process.env.STORAGE_ENDPOINT; // R2: https://<account>.r2.cloudflarestorage.com
const PUBLIC_URL_BASE = process.env.STORAGE_PUBLIC_URL_BASE; // e.g. https://pub-xxx.r2.dev/bucket or custom CDN

const PREFIX = process.env.STORAGE_PREFIX || "resumes";

function isCloudStorage() {
  return !!(BUCKET && ACCESS_KEY && SECRET_KEY);
}

let client = null;

function getClient() {
  if (!client) {
    const config = {
      region: REGION,
      credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
    };
    if (ENDPOINT) config.endpoint = ENDPOINT;
    if (process.env.STORAGE_FORCE_PATH_STYLE === "true") config.forcePathStyle = true;
    client = new S3Client(config);
  }
  return client;
}

const ALLOWED_UPLOAD_EXT = ["pdf", "jpg", "jpeg", "png"];

function sanitizeUploadExt(originalName) {
  if (!originalName || typeof originalName !== "string") return "pdf";
  const parts = originalName.split(".");
  const ext = (parts.length > 1 ? parts.pop() : "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ALLOWED_UPLOAD_EXT.includes(ext) ? ext : "pdf";
}

/**
 * Upload buffer to S3/R2.
 * @param {Buffer} buffer - File content
 * @param {string} originalName - Original filename (e.g. resume.pdf)
 * @returns {Promise<{ url: string | null, key: string }>}
 */
async function upload(buffer, originalName) {
  if (!isCloudStorage()) {
    throw new Error("Cloud storage not configured. Set STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY.");
  }

  const safeExt = sanitizeUploadExt(originalName);
  const key = `${PREFIX}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${safeExt}`;

  const s3 = getClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "application/pdf",
    })
  );

  const url = PUBLIC_URL_BASE
    ? (PUBLIC_URL_BASE.endsWith("/") ? PUBLIC_URL_BASE + key : `${PUBLIC_URL_BASE}/${key}`)
    : null;

  return { url, key };
}

/**
 * Stream a file from S3/R2. Used when bucket is private (no PUBLIC_URL_BASE).
 * @param {string} key - Object key (e.g. resumes/123.pdf)
 * @returns {Promise<{ Body: import("stream").Readable, ContentType: string } | null>}
 */
async function getStream(key) {
  if (!isCloudStorage() || !key) return null;
  try {
    const s3 = getClient();
    const result = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key })
    );
    return {
      Body: result.Body,
      ContentType: result.ContentType || "application/pdf",
    };
  } catch (err) {
    return null;
  }
}

/**
 * Delete a file. For local: fileUrl is filename in uploads/. For S3: key is stored as fileKey.
 * @param {string} fileUrlOrKey - Local filename or S3 key
 * @param {object} doc - Optional doc with fileKey, storageProvider
 * @returns {Promise<boolean>}
 */
async function deleteFile(fileUrlOrKey, doc = {}) {
  if (isCloudStorage() && (doc.fileKey || fileUrlOrKey?.startsWith(PREFIX + "/"))) {
    const key = doc.fileKey || fileUrlOrKey;
    try {
      const s3 = getClient();
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
      return true;
    } catch (err) {
      return false;
    }
  }
  const uploadsDir = path.join(__dirname, "..", "uploads");
  const safeName = path.basename(String(fileUrlOrKey || "")).replace(/\.\./g, "");
  const filePath = path.join(uploadsDir, safeName);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

module.exports = {
  isCloudStorage,
  upload,
  getStream,
  deleteFile,
};
