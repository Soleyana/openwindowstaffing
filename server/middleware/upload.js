const multer = require("multer");
const path = require("path");
const storageService = require("../services/storageService");

const uploadsDir = path.join(__dirname, "..", "uploads");

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
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

const upload = multer({ storage, fileFilter });

module.exports = upload;
