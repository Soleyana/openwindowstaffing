/**
 * Password policy: min length, uppercase, lowercase, number.
 * Optional symbol. Rejects common passwords.
 */

const { PASSWORD_MIN_LENGTH } = require("../config/env");

const COMMON_PASSWORDS = new Set([
  "password", "12345678", "123456789", "password1", "abc123", "qwerty123", "password123",
  "admin", "letmein", "welcome", "monkey", "1234567890", "qwerty", "123456", "1234567",
  "football", "iloveyou", "admin123", "1234", "12345", "master", "shadow", "123123",
  "666666", "123qwe", "654321", "superman", "qazwsx", "michael", "football1",
  "password2", "baseball", "hello", "charlie", "donald", "trustno1", "sunshine",
  "password!", "password@", "qwertyuiop", "1q2w3e4r", "abc12345", "password12",
  "welcome1", "monkey123", "dragon", "master123", "login", "princess", "sunshine1",
  "admin1", "passw0rd", "pass123", "password99", "admin@123", "test1234", "root",
  "changeme", "secret", "p@ssw0rd", "P@ssw0rd", "Password1", "Password123",
]);

const MIN_LENGTH = PASSWORD_MIN_LENGTH;

/**
 * Validate password against policy.
 * @returns {{ valid: boolean, message?: string }}
 */
function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "Password is required" };
  }
  const p = password.trim();
  if (p.length < MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${MIN_LENGTH} characters` };
  }
  if (!/[A-Z]/.test(p)) {
    return { valid: false, message: "Password must include at least one uppercase letter" };
  }
  if (!/[a-z]/.test(p)) {
    return { valid: false, message: "Password must include at least one lowercase letter" };
  }
  if (!/[0-9]/.test(p)) {
    return { valid: false, message: "Password must include at least one number" };
  }
  const lower = p.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    return { valid: false, message: "Password is too common. Choose a stronger password" };
  }
  return { valid: true };
}

module.exports = { validatePassword, MIN_LENGTH, PASSWORD_RULES: `At least ${MIN_LENGTH} characters, including uppercase, lowercase, and a number` };
