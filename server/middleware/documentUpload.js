const multer = require("multer");
const path = require("path");
const storageService = require("../services/storageService");
const { MAX_CREDENTIAL_SIZE_MB, ALLOWED_DOCUMENT_MIMES } = require("../config/env");

const uploadsDir = path.join(__dirname, "..", "uploads");

const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png"];

function sanitizeStorageFilename(originalname) {
  const ext = (path.extname(originalname || "") || "").toLowerCase();
  const safeExt = ALLOWED_EXT.includes(ext) ? ext : ".pdf";
  return `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, sanitizeStorageFilename(file.originalname)),
});

const memoryStorage = multer.memoryStorage();
const storage = storageService.isCloudStorage() ? memoryStorage : diskStorage;

const fileFilter = (req, file, cb) => {
  if (ALLOWED_DOCUMENT_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Only ${ALLOWED_DOCUMENT_MIMES.join(", ")} allowed`), false);
  }
};

const documentUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_CREDENTIAL_SIZE_MB * 1024 * 1024 },
});

module.exports = documentUpload;
