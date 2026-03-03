const { z } = require("zod");

const emailSchema = z.string().min(1, "Email is required").email("Invalid email format").transform((v) => v.trim().toLowerCase());
const passwordSchema = z.string().min(1, "Password is required");
const nameSchema = z.string().min(1, "Name is required").max(200).transform((v) => v.trim());

exports.registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

exports.loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

exports.forgotPasswordSchema = z.object({
  email: emailSchema,
});

exports.resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: passwordSchema,
});

exports.acceptInviteSchema = z.object({
  token: z.string().min(1, "Token is required"),
  name: nameSchema,
  password: passwordSchema,
});
