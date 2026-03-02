/**
 * Basic input sanitization to prevent injection and XSS.
 */

function sanitizeString(val, maxLength = 10000) {
  if (val == null || typeof val !== "string") return "";
  let s = String(val).trim();
  if (maxLength > 0 && s.length > maxLength) s = s.slice(0, maxLength);
  return s.replace(/\0/g, "");
}

function sanitizeObject(obj, keys) {
  if (!obj || typeof obj !== "object") return {};
  const result = {};
  for (const key of keys) {
    if (obj[key] !== undefined) {
      result[key] = typeof obj[key] === "string" ? sanitizeString(obj[key]) : obj[key];
    }
  }
  return result;
}

module.exports = { sanitizeString, sanitizeObject };
