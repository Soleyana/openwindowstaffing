const multer = require("multer");
const path = require("path");
const storageService = require("../services/storageService");
const { MAX_RESUME_SIZE_MB } = require("../config/env");

const uploadsDir = path.join(__dirname, "..", "uploads");

const SAFE_EXT = [".pdf"];

function sanitizeResumeFilename(originalname) {
  const ext = (path.extname(originalname || "") || "").toLowerCase();
  const safeExt = SAFE_EXT.includes(ext) ? ext : ".pdf";
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, sanitizeResumeFilename(file.originalname)),
});

const memoryStorage = multer.memoryStorage();

const storage = storageService.isCloudStorage() ? memoryStorage : diskStorage;

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF resumes allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_RESUME_SIZE_MB * 1024 * 1024 },
});

module.exports = upload;
