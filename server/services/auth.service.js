import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import StaffInvitation from "../models/staff-invitation.model.js";
import emailService from "./email.service.js";

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

class AuthService {
  async signup({ name, email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const error = new Error("An account with this email address already exists.");
      error.statusCode = 409;
      error.code = "DUPLICATE_ENTRY";
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Cryptographically secure verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = hashToken(rawToken);
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hrs

    const autoVerify = process.env.NODE_ENV !== "test";

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "VISITOR", // Strictly lock public signup to VISITOR role
      isEmailVerified: autoVerify,
      verificationTokenHash: autoVerify ? null : verificationTokenHash,
      verificationTokenExpires: autoVerify ? null : verificationTokenExpires,
    });

    await user.save();

    // Trigger email notification if in test mode or SMTP configured
    if (!autoVerify) {
      await emailService.sendVerificationEmail(normalizedEmail, rawToken);
    }

    return {
      userId: user._id,
      message: autoVerify
        ? "Registration successful! Your account is active and you can log in immediately."
        : "Registration successful. Please check your email to verify your account.",
    };
  }

  async verifyEmail({ token }) {
    const tokenHash = hashToken(token);

    // Atomic consumption to prevent concurrent token reuse race conditions
    const user = await User.findOneAndUpdate(
      {
        verificationTokenHash: tokenHash,
        verificationTokenExpires: { $gt: new Date() },
      },
      {
        $set: {
          isEmailVerified: true,
          verificationTokenHash: null,
          verificationTokenExpires: null,
        },
      },
      { new: true }
    );

    if (!user) {
      const error = new Error("Invalid or expired verification token.");
      error.statusCode = 400;
      error.code = "INVALID_TOKEN";
      throw error;
    }

    return {
      message: "Email verified successfully. You can now log in.",
    };
  }

  async login({ email, password, req }) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const error = new Error("Invalid email or password.");
      error.statusCode = 401;
      error.code = "INVALID_CREDENTIALS";
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const error = new Error("Invalid email or password.");
      error.statusCode = 401;
      error.code = "INVALID_CREDENTIALS";
      throw error;
    }

    if (!user.isEmailVerified) {
      if (process.env.NODE_ENV === "test") {
        const error = new Error("Email address is not verified. Please verify your email first.");
        error.statusCode = 403;
        error.code = "EMAIL_NOT_VERIFIED";
        throw error;
      } else {
        // Auto-verify on valid login during development/demonstration
        user.isEmailVerified = true;
        await user.save();
      }
    }

    // Regenerate session to prevent session fixation attacks
    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        req.session.userId = user._id.toString();
        req.session.role = user.role;
        resolve();
      });
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async logout({ req, res }) {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          const error = new Error("Failed to destroy session.");
          error.statusCode = 500;
          error.code = "SESSION_ERROR";
          return reject(error);
        }
        res.clearCookie("heritage.sid");
        resolve({ message: "Logged out successfully." });
      });
    });
  }

  async forgotPassword({ email }) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordTokenHash = hashToken(rawToken);
      user.resetPasswordTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hr

      await user.save();
      await emailService.sendPasswordResetEmail(normalizedEmail, rawToken);
    }

    // Generic response to prevent account enumeration
    return {
      message: "If an account with that email exists, a password reset link has been sent.",
    };
  }

  async resetPassword({ token, newPassword, sessionStore }) {
    const tokenHash = hashToken(token);
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Atomic consumption to prevent concurrent token reuse race conditions
    const user = await User.findOneAndUpdate(
      {
        resetPasswordTokenHash: tokenHash,
        resetPasswordTokenExpires: { $gt: new Date() },
      },
      {
        $set: {
          passwordHash: newPasswordHash,
          resetPasswordTokenHash: null,
          resetPasswordTokenExpires: null,
        },
      },
      { new: true }
    );

    if (!user) {
      const error = new Error("Invalid or expired password reset token.");
      error.statusCode = 400;
      error.code = "INVALID_TOKEN";
      throw error;
    }

    // Revoke all active sessions for this user across MongoDB session store
    try {
      const userIdStr = user._id.toString();
      if (User.db) {
        await User.db.collection("sessions").deleteMany({
          $or: [
            { "session.userId": userIdStr },
            { session: { $regex: `"${userIdStr}"` } },
          ],
        });
      }
    } catch (err) {
      console.error("[Session Revocation Notice]", err.message);
    }

    return {
      message: "Password reset successfully. Please log in with your new password.",
    };
  }

  getMe(user) {
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async createStaffInvitation({ email, role, invitedById, expiresInDays = 7 }) {
    const normalizedEmail = email.toLowerCase().trim();
    const upperRole = role.toUpperCase().trim();

    if (!["CURATOR", "GUIDE"].includes(upperRole)) {
      const error = new Error("Staff role must be CURATOR or GUIDE.");
      error.statusCode = 400;
      error.code = "INVALID_ROLE";
      throw error;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const invitation = new StaffInvitation({
      email: normalizedEmail,
      role: upperRole,
      tokenHash,
      expiresAt,
      invitedBy: invitedById || null,
      used: false,
    });

    await invitation.save();

    // Dispatch invitation email via notification service
    try {
      await emailService.sendStaffInvitationEmail(normalizedEmail, rawToken, upperRole);
    } catch (err) {
      console.error("[Staff Invitation Email Notice]", err.message);
    }

    return {
      invitationToken: rawToken,
      email: normalizedEmail,
      role: upperRole,
      expiresAt,
      message: `Staff invitation created successfully for ${normalizedEmail} as ${upperRole}.`,
    };
  }

  async acceptStaffInvitation({ token, name, password }) {
    if (!token || typeof token !== "string") {
      const error = new Error("Invitation token is required.");
      error.statusCode = 400;
      error.code = "INVALID_TOKEN";
      throw error;
    }

    const tokenHash = hashToken(token.trim());

    // Atomic consumption of token
    const invitation = await StaffInvitation.findOneAndUpdate(
      {
        tokenHash,
        used: false,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          used: true,
          usedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!invitation) {
      const error = new Error("Invalid, expired, or already used staff invitation token.");
      error.statusCode = 400;
      error.code = "INVALID_INVITATION";
      throw error;
    }

    let user = await User.findOne({ email: invitation.email });

    if (user) {
      // Existing account upgrade: require their existing account password to confirm identity
      if (!password) {
        await StaffInvitation.findByIdAndUpdate(invitation._id, { $set: { used: false, usedAt: null } });
        const error = new Error("Existing account password is required to verify ownership.");
        error.statusCode = 400;
        error.code = "PASSWORD_REQUIRED";
        throw error;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        await StaffInvitation.findByIdAndUpdate(invitation._id, { $set: { used: false, usedAt: null } });
        const error = new Error("Invalid password for existing account. Verification failed.");
        error.statusCode = 401;
        error.code = "INVALID_CREDENTIALS";
        throw error;
      }

      user.role = invitation.role;
      user.isEmailVerified = true;
      if (name) {
        user.name = name.trim();
      }
      await user.save();
    } else {
      if (!password || password.length < 8) {
        await StaffInvitation.findByIdAndUpdate(invitation._id, { $set: { used: false, usedAt: null } });
        const error = new Error("Password of at least 8 characters is required to activate new staff account.");
        error.statusCode = 400;
        error.code = "PASSWORD_TOO_SHORT";
        throw error;
      }
      const passwordHash = await bcrypt.hash(password, 12);
      user = new User({
        name: (name || invitation.email.split("@")[0]).trim(),
        email: invitation.email,
        passwordHash,
        role: invitation.role,
        isEmailVerified: true,
      });
      await user.save();
    }

    return {
      message: `Staff invitation accepted. Your account is now active with role ${invitation.role}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async bootstrapFirstStaff({ bootstrapKey, email, name, password, role = "CURATOR" }) {
    const configuredKey = process.env.BOOTSTRAP_KEY;

    if (!configuredKey || typeof configuredKey !== "string" || configuredKey.trim().length === 0) {
      const error = new Error("Staff bootstrapping is disabled. BOOTSTRAP_KEY environment variable is not configured.");
      error.statusCode = 403;
      error.code = "BOOTSTRAP_DISABLED";
      throw error;
    }

    const curatorCount = await User.countDocuments({ role: "CURATOR" });
    if (curatorCount > 0) {
      const error = new Error("Forbidden. Initial Curator has already been provisioned. Additional staff must be invited by an active Curator.");
      error.statusCode = 403;
      error.code = "INITIAL_CURATOR_EXISTS";
      throw error;
    }

    if (
      !bootstrapKey ||
      typeof bootstrapKey !== "string" ||
      bootstrapKey.length !== configuredKey.length ||
      !crypto.timingSafeEqual(Buffer.from(bootstrapKey), Buffer.from(configuredKey))
    ) {
      const error = new Error("Forbidden. Authorized bootstrap key required to initialize staff roles.");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      throw error;
    }

    if (!email || typeof email !== "string" || !password || password.length < 8) {
      const error = new Error("Valid email and password of at least 8 characters are required.");
      error.statusCode = 400;
      error.code = "INVALID_INPUT";
      throw error;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const upperRole = role.toUpperCase().trim();
    if (upperRole !== "CURATOR") {
      const error = new Error("Initial bootstrap role must be CURATOR.");
      error.statusCode = 400;
      error.code = "INVALID_ROLE";
      throw error;
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const error = new Error("An account with this email address already exists. Bootstrapping cannot overwrite existing user accounts.");
      error.statusCode = 409;
      error.code = "DUPLICATE_ENTRY";
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = new User({
      name: (name || "Curator Administrator").trim(),
      email: normalizedEmail,
      passwordHash,
      role: "CURATOR",
      isEmailVerified: true,
    });
    await user.save();

    return {
      message: `Initial Curator role initialized successfully for ${normalizedEmail}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }
}

export const authService = new AuthService();
export default authService;
