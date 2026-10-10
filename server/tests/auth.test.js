import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../server.js";
import User from "../models/user.model.js";
import requireRole from "../middlewares/role.middleware.js";
import requireAuth from "../middlewares/auth.middleware.js";

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  app = createApp();

  // Register temporary test endpoint for RBAC role verification
  app.get("/api/test-curator-only", requireAuth, requireRole("CURATOR"), (req, res) => {
    res.status(200).json({ success: true, data: { message: "Curator access granted" }, error: null });
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  if (mongoose.connection.db) {
    await mongoose.connection.db.collection("sessions").deleteMany({});
  }
});

const getCsrfToken = async () => {
  const res = await request(app).get("/api/csrf-token");
  const cookies = res.headers["set-cookie"] || [];
  const xsrfCookie = cookies.find((c) => c.startsWith("XSRF-TOKEN=")) || "";
  let csrfToken = res.body.data?.csrfToken;
  if (!csrfToken && xsrfCookie) {
    csrfToken = xsrfCookie.split(";")[0].split("=")[1];
  }
  return { csrfToken: csrfToken || "dummy_token", cookie: xsrfCookie };
};

describe("P2 Authentication API Contract & Security Tests", () => {
  describe("1. POST /api/auth/signup", () => {
    it("should successfully register a new user as a VISITOR", async () => {
      const { csrfToken, cookie } = await getCsrfToken();

      const res = await request(app)
        .post("/api/auth/signup")
        .set("Cookie", cookie)
        .set("x-csrf-token", csrfToken)
        .send({
          name: "Test Visitor",
          email: "visitor@example.com",
          password: "SecurePassword123!",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBeDefined();

      const user = await User.findOne({ email: "visitor@example.com" });
      expect(user).not.toBeNull();
      expect(user.role).toBe("VISITOR");
      expect(user.isEmailVerified).toBe(false);
      expect(user.verificationTokenHash).toBeDefined();
    });

    it("should block client-supplied CURATOR or GUIDE role escalation", async () => {
      const { csrfToken, cookie } = await getCsrfToken();

      const res = await request(app)
        .post("/api/auth/signup")
        .set("Cookie", cookie)
        .set("x-csrf-token", csrfToken)
        .send({
          name: "Attacker",
          email: "attacker@example.com",
          password: "SecurePassword123!",
          role: "CURATOR", // Privilege escalation attempt
        });

      expect(res.status).toBe(201);
      const user = await User.findOne({ email: "attacker@example.com" });
      expect(user.role).toBe("VISITOR"); // Must ignore client role input
    });

    it("should reject duplicate email registration with 409 DUPLICATE_ENTRY", async () => {
      const { csrfToken, cookie } = await getCsrfToken();

      await User.create({
        name: "Existing User",
        email: "duplicate@example.com",
        passwordHash: "somehash",
        role: "VISITOR",
        isEmailVerified: false,
      });

      const res = await request(app)
        .post("/api/auth/signup")
        .set("Cookie", cookie)
        .set("x-csrf-token", csrfToken)
        .send({
          name: "Duplicate User",
          email: "DUPLICATE@example.com", // Case normalization test
          password: "SecurePassword123!",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("DUPLICATE_ENTRY");
    });

    it("should reject weak password or invalid email format", async () => {
      const { csrfToken, cookie } = await getCsrfToken();

      const res = await request(app)
        .post("/api/auth/signup")
        .set("Cookie", cookie)
        .set("x-csrf-token", csrfToken)
        .send({
          name: "Short Pass",
          email: "invalid-email",
          password: "123",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("2. POST /api/auth/verify-email", () => {
    it("should verify email with valid token and mark account verified", async () => {
      const { csrfToken, cookie } = await getCsrfToken();

      const signupRes = await request(app)
        .post("/api/auth/signup")
        .set("Cookie", cookie)
        .set("x-csrf-token", csrfToken)
        .send({
          name: "Unverified User",
          email: "unverified@example.com",
          password: "SecurePassword123!",
        });

      const userBefore = await User.findById(signupRes.body.data.userId);
      const rawToken = "test_raw_token_verification_123456789";
      const crypto = await import("crypto");
      userBefore.verificationTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      userBefore.verificationTokenExpires = new Date(Date.now() + 10000);
      await userBefore.save();

      const res = await request(app)
        .post("/api/auth/verify-email")
        .set("Cookie", cookie)
        .set("x-csrf-token", csrfToken)
        .send({ token: rawToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const userAfter = await User.findById(signupRes.body.data.userId);
      expect(userAfter.isEmailVerified).toBe(true);
      expect(userAfter.verificationTokenHash).toBeNull();
    });

    it("should reject invalid or expired verification token", async () => {
      const { csrfToken, cookie } = await getCsrfToken();

      const res = await request(app)
        .post("/api/auth/verify-email")
        .set("Cookie", cookie)
        .set("x-csrf-token", csrfToken)
        .send({ token: "nonexistent_token" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_TOKEN");
    });
  });

  describe("3. POST /api/auth/login", () => {
    it("should reject login for unverified user", async () => {
      const { csrfToken, cookie } = await getCsrfToken();

      await request(app)
        .post("/api/auth/signup")
        .set("Cookie", cookie)
        .set("x-csrf-token", csrfToken)
        .send({
          name: "Unverified Login",
          email: "loginunverified@example.com",
          password: "SecurePassword123!",
        });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Cookie", cookie)
        .set("x-csrf-token", csrfToken)
        .send({
          email: "loginunverified@example.com",
          password: "SecurePassword123!",
        });

      expect(loginRes.status).toBe(403);
      expect(loginRes.body.error.code).toBe("EMAIL_NOT_VERIFIED");
    });

    it("should login verified user and return safe user data with session cookie", async () => {
      const { csrfToken, cookie } = await getCsrfToken();
      const bcrypt = await import("bcryptjs");

      await User.create({
        name: "Verified User",
        email: "verified@example.com",
        passwordHash: await bcrypt.hash("SecurePassword123!", 12),
        role: "VISITOR",
        isEmailVerified: true,
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Cookie", cookie)
        .set("x-csrf-token", csrfToken)
        .send({
          email: "verified@example.com",
          password: "SecurePassword123!",
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.email).toBe("verified@example.com");
      expect(loginRes.body.data.user.passwordHash).toBeUndefined();

      const sessionCookie = loginRes.headers["set-cookie"].find((c) => c.startsWith("heritage.sid"));
      expect(sessionCookie).toBeDefined();
    });

    it("should return generic error for wrong password", async () => {
      const { csrfToken, cookie } = await getCsrfToken();

      const res = await request(app)
        .post("/api/auth/login")
        .set("Cookie", cookie)
        .set("x-csrf-token", csrfToken)
        .send({
          email: "nonexistent@example.com",
          password: "WrongPassword!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("4. GET /api/auth/me & POST /api/auth/logout", () => {
    it("should return current profile when authenticated and destroy session on logout", async () => {
      const { csrfToken, cookie: initCookie } = await getCsrfToken();
      const bcrypt = await import("bcryptjs");

      await User.create({
        name: "Logged In User",
        email: "loggedin@example.com",
        passwordHash: await bcrypt.hash("SecurePassword123!", 12),
        role: "VISITOR",
        isEmailVerified: true,
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Cookie", initCookie)
        .set("x-csrf-token", csrfToken)
        .send({
          email: "loggedin@example.com",
          password: "SecurePassword123!",
        });

      const sessionCookie = loginRes.headers["set-cookie"].find((c) => c.startsWith("heritage.sid"));

      // GET /me
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [sessionCookie, initCookie]);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe("loggedin@example.com");

      // Logout
      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", [sessionCookie, initCookie])
        .set("x-csrf-token", csrfToken);

      expect(logoutRes.status).toBe(200);

      // GET /me after logout should return 401
      const meAfterLogout = await request(app)
        .get("/api/auth/me")
        .set("Cookie", [sessionCookie, initCookie]);

      expect(meAfterLogout.status).toBe(401);
    });
  });

  describe("5. Password Recovery Workflow & Session Invalidation", () => {
    it("should return generic success for forgot-password", async () => {
      const { csrfToken, cookie } = await getCsrfToken();

      const res = await request(app)
        .post("/api/auth/forgot-password")
        .set("Cookie", cookie)
        .set("x-csrf-token", csrfToken)
        .send({ email: "anyone@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reset password with valid token, update hash, and purge old active sessions", async () => {
      const { csrfToken, cookie } = await getCsrfToken();
      const bcrypt = await import("bcryptjs");
      const crypto = await import("crypto");

      const rawResetToken = "raw_reset_token_123_456_789";
      const resetTokenHash = crypto.createHash("sha256").update(rawResetToken).digest("hex");

      const user = await User.create({
        name: "Reset User",
        email: "resetuser@example.com",
        passwordHash: await bcrypt.hash("OldPassword123!", 12),
        role: "VISITOR",
        isEmailVerified: true,
        resetPasswordTokenHash: resetTokenHash,
        resetPasswordTokenExpires: new Date(Date.now() + 3600000),
      });

      // Simulate active session in DB
      if (mongoose.connection.db) {
        await mongoose.connection.db.collection("sessions").insertOne({
          _id: "test_active_session_id",
          session: JSON.stringify({ cookie: {}, userId: user._id.toString() }),
        });
      }

      const resetRes = await request(app)
        .post("/api/auth/reset-password")
        .set("Cookie", cookie)
        .set("x-csrf-token", csrfToken)
        .send({
          token: rawResetToken,
          newPassword: "NewSecurePassword456!",
        });

      expect(resetRes.status).toBe(200);

      const userAfter = await User.findById(user._id);
      expect(userAfter.resetPasswordTokenHash).toBeNull();
      const isNewMatch = await bcrypt.compare("NewSecurePassword456!", userAfter.passwordHash);
      expect(isNewMatch).toBe(true);

      // Verify active session was invalidated
      if (mongoose.connection.db) {
        const sessionCount = await mongoose.connection.db.collection("sessions").countDocuments({
          _id: "test_active_session_id",
        });
        expect(sessionCount).toBe(0);
      }
    });
  });

  describe("6. CSRF & Role Enforcement Tests", () => {
    it("should reject POST requests without CSRF token", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "CSRF Test",
          email: "csrf@example.com",
          password: "SecurePassword123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("EBADCSRFTOKEN");
    });

    it("should reject VISITOR account from accessing CURATOR-only endpoints", async () => {
      const { csrfToken, cookie: initCookie } = await getCsrfToken();
      const bcrypt = await import("bcryptjs");

      await User.create({
        name: "Normal Visitor",
        email: "visitor2@example.com",
        passwordHash: await bcrypt.hash("SecurePassword123!", 12),
        role: "VISITOR",
        isEmailVerified: true,
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Cookie", initCookie)
        .set("x-csrf-token", csrfToken)
        .send({
          email: "visitor2@example.com",
          password: "SecurePassword123!",
        });

      const sessionCookie = loginRes.headers["set-cookie"].find((c) => c.startsWith("heritage.sid"));

      const curatorRes = await request(app)
        .get("/api/test-curator-only")
        .set("Cookie", [sessionCookie, initCookie]);

      expect(curatorRes.status).toBe(403);
      expect(curatorRes.body.error.code).toBe("FORBIDDEN");
    });
  });
});
