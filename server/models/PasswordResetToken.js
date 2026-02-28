const mongoose = require("mongoose");
const crypto = require("crypto");

const TOKEN_BYTES = 32;
const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const schema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date },
}, { timestamps: true });

schema.index({ tokenHash: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL - MongoDB deletes expired docs

function hashToken(plain) {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

schema.statics.createToken = async function (email) {
  const plain = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(plain);
  await this.create({
    email: email.toLowerCase().trim(),
    tokenHash,
    expiresAt: new Date(Date.now() + EXPIRY_MS),
  });
  return plain;
};

schema.statics.verifyAndConsume = async function (plainToken) {
  const tokenHash = hashToken(plainToken);
  const doc = await this.findOneAndUpdate(
    { tokenHash, expiresAt: { $gt: new Date() }, usedAt: null },
    { $set: { usedAt: new Date() } },
    { new: true }
  );
  return doc;
};

module.exports = mongoose.model("PasswordResetToken", schema);
