/**
 * Cloud storage service for S3 / R2.
 * When STORAGE_* env vars are set, uploads go to cloud. Otherwise, use local disk via multer.
 */
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

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

  const ext = (originalName && originalName.includes(".")) ? originalName.split(".").pop().toLowerCase() : "pdf";
  const safeExt = ["pdf"].includes(ext) ? ext : "pdf";
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

module.exports = {
  isCloudStorage,
  upload,
  getStream,
};
