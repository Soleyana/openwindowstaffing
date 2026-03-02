const User = require("../models/User");
const Invite = require("../models/Invite");
const RecruiterMembership = require("../models/RecruiterMembership");
const PasswordResetToken = require("../models/PasswordResetToken");
const jwt = require("jsonwebtoken");
const { sanitizeErrorMessage } = require("../utils/sanitizeError");
const { validatePassword } = require("../utils/passwordPolicy");
const { JWT_SECRET, JWT_EXPIRES_IN, CLIENT_URL } = require("../config/env");
const { COOKIE_NAME, COOKIE_MAX_AGE_MS, getAuthCookieOptions, getClearCookieOptions } = require("../utils/cookieOptions");
const emailService = require("../services/emailService");
const { ROLES } = require("../constants/roles");
const authService = require("../services/authService");

function generateJwt(userId, role) {
  return jwt.sign(
    { id: userId, role: role || ROLES.APPLICANT },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function setAuthCookie(res, token, req) {
  res.cookie(COOKIE_NAME, token, getAuthCookieOptions(req));
}

function clearAuthCookie(res, req) {
  res.clearCookie(COOKIE_NAME, getClearCookieOptions(req));
}

function userResponse(user) {
  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      return res.status(400).json({ success: false, message: pwdCheck.message });
    }

    const role = await authService.resolveRoleForRegistration();
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
    });

    const token = generateJwt(user._id, user.role);
    setAuthCookie(res, token, req);

    res.status(201).json({
      success: true,
      user: userResponse(user),
      message: role === ROLES.OWNER ? "Account created. You are the system owner." : "Account created successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Registration failed"),
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.comparePassword(String(password).trim());
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateJwt(user._id, user.role);
    setAuthCookie(res, token, req);

    res.status(200).json({
      success: true,
      user: userResponse(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Login failed"),
    });
  }
};

exports.logout = (req, res) => {
  clearAuthCookie(res, req);
  res.status(200).json({ success: true, message: "Logged out" });
};

exports.me = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(200).json({ success: true, user: null });
    }
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      clearAuthCookie(res, req);
      return res.status(200).json({ success: true, user: null });
    }
    res.status(200).json({ success: true, user: userResponse(user) });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to fetch profile"),
    });
  }
};

exports.acceptInvite = async (req, res) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Token, name, and password are required",
      });
    }

    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      return res.status(400).json({ success: false, message: pwdCheck.message });
    }

    const invite = await Invite.verifyAndConsume(token);
    if (!invite) {
      return res.status(400).json({
        success: false,
        message: "Invalid, expired, or already used invite link. Please request a new one.",
      });
    }

    const role = authService.resolveRoleForInvite(invite);
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Invalid invite",
      });
    }

    const normalizedEmail = invite.email.trim().toLowerCase();

    let user = await User.findOne({ email: normalizedEmail });
    if (user) {
      if (user.role === role) {
        if (invite.companyId) {
          const existing = await RecruiterMembership.findOne({
            userId: user._id,
            companyId: invite.companyId,
            status: "active",
          });
          if (existing) {
            return res.status(400).json({
              success: false,
              message: "You already have access to this company. Please sign in.",
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            message: "You already have an account with this access. Please sign in.",
          });
        }
      }
      user.role = role;
      user.password = password;
      await user.save();
    } else {
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        role,
      });
    }

    if (invite.companyId) {
      await RecruiterMembership.findOneAndUpdate(
        { userId: user._id, companyId: invite.companyId },
        {
          userId: user._id,
          companyId: invite.companyId,
          role: invite.role || ROLES.RECRUITER,
          status: "active",
        },
        { upsert: true, new: true }
      );
    }

    const authToken = generateJwt(user._id, user.role);
    setAuthCookie(res, authToken, req);

    res.status(201).json({
      success: true,
      user: userResponse(user),
      message: "Account created. Welcome.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to accept invite"),
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.trim()?.toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If that email exists, we sent a reset link. Check your inbox.",
      });
    }

    const token = await PasswordResetToken.createToken(normalizedEmail);
    const baseUrl = CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    emailService.sendPasswordResetLink(normalizedEmail, resetUrl).then(() => {
      const activityLogService = require("../services/activityLogService");
      activityLogService.log({
        req,
        targetType: "User",
        actionType: "password_reset_sent",
        message: "Password reset link sent",
        metadata: { email: normalizedEmail },
      }).catch(() => {});
    }).catch((err) =>
      require("../utils/logger").error({ err: err?.message }, "[Email] Password reset link failed")
    );

    res.status(200).json({
      success: true,
      message: "If that email exists, we sent a reset link. Check your inbox.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to send reset email"),
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    const pwdCheck = validatePassword(newPassword);
    if (!pwdCheck.valid) {
      return res.status(400).json({ success: false, message: pwdCheck.message });
    }

    const resetDoc = await PasswordResetToken.verifyAndConsume(token);
    if (!resetDoc) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link. Request a new one.",
      });
    }

    const user = await User.findOne({ email: resetDoc.email }).select("+password");
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found. Request a new reset link.",
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now sign in.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to reset password"),
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { name, email, currentPassword, newPassword } = req.body;

    if (name !== undefined && name !== null) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({ success: false, message: "Name cannot be empty" });
      }
      user.name = trimmed;
    }

    if (email !== undefined && email !== null) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ success: false, message: "Email cannot be empty" });
      }
      if (normalizedEmail !== user.email) {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
          return res.status(400).json({ success: false, message: "Email is already in use" });
        }
        user.email = normalizedEmail;
      }
    }

    if (newPassword) {
      const pwdCheck = validatePassword(newPassword);
      if (!pwdCheck.valid) {
        return res.status(400).json({ success: false, message: pwdCheck.message });
      }
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password is required to change password" });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Current password is incorrect" });
      }
      user.password = newPassword;
    }

    await user.save();

    const updated = await User.findById(user._id);
    const token = generateJwt(updated._id, updated.role);
    setAuthCookie(res, token, req);

    res.status(200).json({
      success: true,
      user: userResponse(updated),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: sanitizeErrorMessage(error, "Failed to update profile"),
    });
  }
};
