/**
 * Structured logging with pino.
 * Levels: error, warn, info.
 * Never log passwords, tokens, or other secrets.
 */
const pino = require("pino");

const isDev = process.env.NODE_ENV !== "production";

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "info" : "info"),
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

module.exports = logger;
