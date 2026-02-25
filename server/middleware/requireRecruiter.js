const jwt = require("jsonwebtoken");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const { JWT_SECRET } = require("../config/env");

function requireRecruiter(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please log in.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "recruiter") {
      return res.status(403).json({
        success: false,
        message: "Recruiter access only",
      });
    }

    req.user = { _id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
      });
    }
    return res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Authentication failed"),
    });
  }
}

module.exports = requireRecruiter;
