import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import session from "express-session";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createApp } from "../server.js";
import { User } from "../models/user.model.js";
import { Trail } from "../models/trail.model.js";
import { Place } from "../models/place.model.js";
import { Chunk } from "../models/chunk.model.js";
import StaffInvitation from "../models/staff-invitation.model.js";
import { EditorialReview } from "../models/editorial-review.model.js";
import authService from "../services/auth.service.js";
import { setCustomRetriever } from "../api/chat.router.js";
import { setChatModel } from "../services/llm.service.js";

describe("Security Audit Regression Suite (AUTH-001, AUTH-003, API-001, AUTH-004, AUTH-005, SEC-001)", () => {
  let app;
  let memoryStore;

  const originalUserFind = User.find;
  const originalUserFindOne = User.findOne;
  const originalUserFindById = User.findById;
  const originalUserCountDocuments = User.countDocuments;
  const originalUserPrototypeSave = User.prototype.save;
  const originalTrailFind = Trail.find;
  const originalTrailFindById = Trail.findById;
  const originalPlaceFind = Place.find;
  const originalEditorialReviewCreate = EditorialReview.create;
  const originalStaffInvitationSave = StaffInvitation.prototype.save;
  const originalStaffInvitationFindOneAndUpdate = StaffInvitation.findOneAndUpdate;
  const originalStaffInvitationFindByIdAndUpdate = StaffInvitation.findByIdAndUpdate;
  const originalChunkAggregate = Chunk.aggregate;

  const curatorId = "507f1f77bcf86cd799439071";
  const guideId = "507f1f77bcf86cd799439072";
  const visitorId = "507f1f77bcf86cd799439073";
  const otherVisitorId = "507f1f77bcf86cd799439074";

  const approvedPlaceId = "507f1f77bcf86cd799439011";
  const unapprovedPlaceId = "507f1f77bcf86cd799439012";
  const testTrailId = "507f1f77bcf86cd799439041";

  const curatorUser = {
    _id: curatorId,
    name: "Head Curator",
    email: "curator@example.com",
    role: "CURATOR",
    isEmailVerified: true,
  };

  const guideUser = {
    _id: guideId,
    name: "Heritage Guide",
    email: "guide@example.com",
    role: "GUIDE",
    isEmailVerified: true,
  };

  const visitorUser = {
    _id: visitorId,
    name: "Explorer Visitor",
    email: "visitor@example.com",
    role: "VISITOR",
    isEmailVerified: true,
  };

  const unverifiedVisitor = {
    _id: otherVisitorId,
    name: "Unverified Visitor",
    email: "unverified@example.com",
    role: "VISITOR",
    isEmailVerified: false,
  };

  const mockApprovedPlace = {
    _id: approvedPlaceId,
    name: "Sri Venkateswara Museum",
    status: "approved",
  };

  beforeEach(() => {
    memoryStore = new session.MemoryStore();
    app = createApp(memoryStore);

    // Test session helper
    app.post("/test-session", (req, res) => {
      req.session.userId = req.body.userId;
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, sessionUserId: req.session.userId });
      });
    });

    // Mock User.findById for session hydration
    User.findById = (id) => ({
      select: () => {
        const idStr = id?.toString();
        if (idStr === curatorId) return Promise.resolve(curatorUser);
        if (idStr === guideId) return Promise.resolve(guideUser);
        if (idStr === visitorId) return Promise.resolve(visitorUser);
        if (idStr === otherVisitorId) return Promise.resolve(unverifiedVisitor);
        return Promise.resolve(null);
      },
    });

    Chunk.aggregate = () => Promise.resolve([]);
    setCustomRetriever(null);
    setChatModel(null);
  });

  afterEach(() => {
    User.find = originalUserFind;
    User.findOne = originalUserFindOne;
    User.findById = originalUserFindById;
    User.countDocuments = originalUserCountDocuments;
    User.prototype.save = originalUserPrototypeSave;
    Trail.find = originalTrailFind;
    Trail.findById = originalTrailFindById;
    Place.find = originalPlaceFind;
    Chunk.aggregate = originalChunkAggregate;
    EditorialReview.create = originalEditorialReviewCreate;
    StaffInvitation.prototype.save = originalStaffInvitationSave;
    StaffInvitation.findOneAndUpdate = originalStaffInvitationFindOneAndUpdate;
    StaffInvitation.findByIdAndUpdate = originalStaffInvitationFindByIdAndUpdate;
  });

  // Helper to establish an authenticated session agent with CSRF token
  const createAgent = async (userId = null) => {
    const agent = request.agent(app);
    const csrfRes = await agent.get("/api/csrf-token");
    const csrfToken = csrfRes.body?.data?.csrfToken || "";

    if (userId) {
      await agent
        .post("/test-session")
        .set("x-csrf-token", csrfToken)
        .send({ userId });
    }
    return { agent, csrfToken };
  };

  // =========================================================================
  // 1. AUTH-001: Bootstrap-staff Privilege Escalation & Account Takeover
  // =========================================================================
  describe("AUTH-001: Secure Staff Bootstrapping & Takeover Protection", () => {
    const originalBootstrapKey = process.env.BOOTSTRAP_KEY;

    afterEach(() => {
      process.env.BOOTSTRAP_KEY = originalBootstrapKey;
    });

    it("fails with 403 BOOTSTRAP_DISABLED when BOOTSTRAP_KEY is unconfigured", async () => {
      delete process.env.BOOTSTRAP_KEY;

      const { agent, csrfToken } = await createAgent();
      const res = await agent
        .post("/api/auth/bootstrap-staff")
        .set("x-csrf-token", csrfToken)
        .send({
          bootstrapKey: "any-key",
          email: "firstcurator@example.com",
          password: "SecurePassword123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("BOOTSTRAP_DISABLED");
    });

    it("rejects unauthorized or invalid bootstrap key with 403 FORBIDDEN", async () => {
      process.env.BOOTSTRAP_KEY = "super-secret-bootstrap-token-998877";

      User.countDocuments = () => Promise.resolve(0);

      const { agent, csrfToken } = await createAgent();
      const res = await agent
        .post("/api/auth/bootstrap-staff")
        .set("x-csrf-token", csrfToken)
        .send({
          bootstrapKey: "wrong-bootstrap-key",
          email: "curator@example.com",
          password: "SecurePassword123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects bootstrap when an active Curator already exists (403 INITIAL_CURATOR_EXISTS)", async () => {
      process.env.BOOTSTRAP_KEY = "super-secret-bootstrap-token-998877";

      // 1 curator already exists in DB
      User.countDocuments = () => Promise.resolve(1);

      const { agent, csrfToken } = await createAgent();
      const res = await agent
        .post("/api/auth/bootstrap-staff")
        .set("x-csrf-token", csrfToken)
        .send({
          bootstrapKey: "super-secret-bootstrap-token-998877",
          email: "anothercurator@example.com",
          password: "SecurePassword123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("INITIAL_CURATOR_EXISTS");
    });

    it("prevents arbitrary account takeover: rejects if email already belongs to an existing user (409 DUPLICATE_ENTRY)", async () => {
      process.env.BOOTSTRAP_KEY = "super-secret-bootstrap-token-998877";

      User.countDocuments = () => Promise.resolve(0);
      User.findOne = () => Promise.resolve({ _id: visitorId, email: "existingvisitor@example.com" });

      const { agent, csrfToken } = await createAgent();
      const res = await agent
        .post("/api/auth/bootstrap-staff")
        .set("x-csrf-token", csrfToken)
        .send({
          bootstrapKey: "super-secret-bootstrap-token-998877",
          email: "existingvisitor@example.com",
          password: "NewAttackerPassword123!",
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("DUPLICATE_ENTRY");
    });

    it("prohibits bypassing curator auth on staff-invitation route via previous default bootstrap key", async () => {
      const { agent, csrfToken } = await createAgent();

      const res = await agent
        .post("/api/auth/staff-invitation")
        .set("x-csrf-token", csrfToken)
        .set("x-bootstrap-key", "heritage-secure-bootstrap-key")
        .send({
          email: "unauthorizedguide@example.com",
          role: "GUIDE",
        });

      // Must be blocked because user is unauthenticated
      expect(res.status).toBe(401);
    });

    it("provisions the first curator successfully when requirements are satisfied", async () => {
      process.env.BOOTSTRAP_KEY = "super-secret-bootstrap-token-998877";

      User.countDocuments = () => Promise.resolve(0);
      User.findOne = () => Promise.resolve(null);
      User.prototype.save = function () {
        this._id = "507f1f77bcf86cd799439099";
        return Promise.resolve(this);
      };

      const { agent, csrfToken } = await createAgent();
      const res = await agent
        .post("/api/auth/bootstrap-staff")
        .set("x-csrf-token", csrfToken)
        .send({
          bootstrapKey: "super-secret-bootstrap-token-998877",
          name: "Founding Curator",
          email: "founding@example.com",
          password: "ValidSecurePassword123!",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe("CURATOR");
      expect(res.body.data.user.email).toBe("founding@example.com");
    });
  });

  // =========================================================================
  // 2. AUTH-003: Unauthorized Publication of Visitor's Private Trail
  // =========================================================================
  describe("AUTH-003: Trail Publication Authorization & Consent", () => {
    it("blocks unauthenticated publication requests with 401 UNAUTHORIZED", async () => {
      const { agent, csrfToken } = await createAgent();

      const res = await agent
        .post(`/api/guide/trails/${testTrailId}/publish`)
        .set("x-csrf-token", csrfToken);

      expect(res.status).toBe(401);
    });

    it("blocks non-staff visitor from publishing routes with 403 FORBIDDEN", async () => {
      const { agent, csrfToken } = await createAgent(visitorId);

      const res = await agent
        .post(`/api/guide/trails/${testTrailId}/publish`)
        .set("x-csrf-token", csrfToken);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("blocks a guide from publishing another visitor's unsubmitted private trail (403 FORBIDDEN)", async () => {
      const { agent, csrfToken } = await createAgent(guideId);

      // Private draft trail owned by visitor, NOT submitted for review
      const mockVisitorTrail = {
        _id: testTrailId,
        ownerId: visitorId,
        title: "Visitor's Secret Private Draft",
        status: "draft",
        visibility: "private",
        stops: [approvedPlaceId],
      };

      Trail.findById = () => Promise.resolve(mockVisitorTrail);

      const res = await agent
        .post(`/api/guide/trails/${testTrailId}/publish`)
        .set("x-csrf-token", csrfToken);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
      expect(res.body.error.message).toContain("without submission consent");
    });

    it("blocks publishing an already published trail with 400 INVALID_STATE_TRANSITION", async () => {
      const { agent, csrfToken } = await createAgent(guideId);

      const mockPublishedTrail = {
        _id: testTrailId,
        ownerId: guideId,
        title: "Already Published Guide",
        status: "published",
        visibility: "public",
        stops: [approvedPlaceId],
      };

      Trail.findById = () => Promise.resolve(mockPublishedTrail);

      const res = await agent
        .post(`/api/guide/trails/${testTrailId}/publish`)
        .set("x-csrf-token", csrfToken);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
    });

    it("blocks publishing a trail with unapproved heritage stops with 400 INELIGIBLE_TRAIL_RESOURCES", async () => {
      const { agent, csrfToken } = await createAgent(guideId);

      const mockTrail = {
        _id: testTrailId,
        ownerId: guideId,
        title: "Guide Trail With Unapproved Stop",
        status: "draft",
        visibility: "private",
        stops: [unapprovedPlaceId],
      };

      Trail.findById = () => Promise.resolve(mockTrail);
      Place.find = () => ({
        lean: () => Promise.resolve([{ _id: unapprovedPlaceId, status: "draft" }]),
      });

      const res = await agent
        .post(`/api/guide/trails/${testTrailId}/publish`)
        .set("x-csrf-token", csrfToken);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INELIGIBLE_TRAIL_RESOURCES");
    });

    it("allows a guide to publish their own approved trail (200 OK)", async () => {
      const { agent, csrfToken } = await createAgent(guideId);

      let saved = false;
      const mockTrail = {
        _id: testTrailId,
        ownerId: guideId,
        title: "Own Guide Route",
        status: "draft",
        visibility: "private",
        stops: [approvedPlaceId],
        save: () => {
          saved = true;
          return Promise.resolve();
        },
      };

      Trail.findById = () => Promise.resolve(mockTrail);
      Place.find = () => ({
        lean: () => Promise.resolve([mockApprovedPlace]),
      });
      EditorialReview.create = (doc) => Promise.resolve({ ...doc, _id: "507f1f77bcf86cd799439091" });

      const res = await agent
        .post(`/api/guide/trails/${testTrailId}/publish`)
        .set("x-csrf-token", csrfToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trail.status).toBe("published");
      expect(res.body.data.trail.visibility).toBe("public");
      expect(saved).toBe(true);
    });

    it("allows a guide to publish a visitor's trail that was submitted for review (status === pending_review)", async () => {
      const { agent, csrfToken } = await createAgent(guideId);

      let saved = false;
      const mockSubmittedTrail = {
        _id: testTrailId,
        ownerId: visitorId, // Owned by visitor
        title: "Visitor's Submitted Trail",
        status: "pending_review", // Consented for editorial review!
        visibility: "private",
        stops: [approvedPlaceId],
        save: () => {
          saved = true;
          return Promise.resolve();
        },
      };

      Trail.findById = () => Promise.resolve(mockSubmittedTrail);
      Place.find = () => ({
        lean: () => Promise.resolve([mockApprovedPlace]),
      });
      EditorialReview.create = (doc) => Promise.resolve({ ...doc, _id: "507f1f77bcf86cd799439092" });

      const res = await agent
        .post(`/api/guide/trails/${testTrailId}/publish`)
        .set("x-csrf-token", csrfToken);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trail.status).toBe("published");
      expect(saved).toBe(true);
    });
  });

  // =========================================================================
  // 3. API-001: Chat Endpoint Bounds, Rate-Limiting & Access Policy
  // =========================================================================
  describe("API-001: Consistent Authentication & Abuse Protection on Chat Endpoints", () => {
    it("rejects questions exceeding 1000 characters with 400 INVALID_QUESTION", async () => {
      const { agent, csrfToken } = await createAgent();

      const oversizedQuestion = "A".repeat(1001);
      const res = await agent
        .post("/api/chat")
        .set("x-csrf-token", csrfToken)
        .send({ question: oversizedQuestion });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_QUESTION");
      expect(res.body.error.message).toContain("1000 characters");
    });

    it("rejects conversation history exceeding 20 messages with 400 INVALID_HISTORY", async () => {
      const { agent, csrfToken } = await createAgent();

      const oversizedHistory = Array.from({ length: 21 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}`,
      }));

      const res = await agent
        .post("/api/chat")
        .set("x-csrf-token", csrfToken)
        .send({
          question: "When was Tirumala built?",
          history: oversizedHistory,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_HISTORY");
      expect(res.body.error.message).toContain("20 messages");
    });

    it("enforces authentication on /api/heritage-chat: unauthenticated gets 401 UNAUTHORIZED", async () => {
      const { agent, csrfToken } = await createAgent();

      const res = await agent
        .post("/api/heritage-chat")
        .set("x-csrf-token", csrfToken)
        .send({ question: "Tell me about Tirupati." });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("enforces email verification on /api/heritage-chat: unverified member gets 403 EMAIL_NOT_VERIFIED", async () => {
      const { agent, csrfToken } = await createAgent(otherVisitorId); // unverified user

      const res = await agent
        .post("/api/heritage-chat")
        .set("x-csrf-token", csrfToken)
        .send({ question: "Tell me about Tirupati." });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("EMAIL_NOT_VERIFIED");
    });
  });

  // =========================================================================
  // 4. AUTH-004 & SEC-001: CSRF Exemptions & Token Validation
  // =========================================================================
  describe("AUTH-004 & SEC-001: CSRF Token Integrity & Search Exemption Bounds", () => {
    it("allows POST /api/search/semantic without CSRF token (read-only search query)", async () => {
      const res = await request(app)
        .post("/api/search/semantic")
        .send({ query: "temple gopuram" });

      // May return 200 or 503 depending on vector search availability, but NOT 403 EBADCSRFTOKEN
      expect(res.status).not.toBe(403);
      if (res.body.error) {
        expect(res.body.error.code).not.toBe("EBADCSRFTOKEN");
      }
    });

    it("strictly requires CSRF token for mutating endpoints or non-search routes", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Attacker",
          email: "attacker@example.com",
          password: "Password123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("EBADCSRFTOKEN");
    });

    it("rejects forged or tampered CSRF tokens with 403 EBADCSRFTOKEN", async () => {
      const { agent } = await createAgent();

      const res = await agent
        .post("/api/auth/logout")
        .set("x-csrf-token", "tampered-csrf-token-12345678901234567890123456789012")
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("EBADCSRFTOKEN");
    });

    it("protects active session against cookie-tossing: attacker cookie cannot overwrite session CSRF token", async () => {
      const { agent, csrfToken } = await createAgent(visitorId);

      const attackerForgedToken = crypto.randomBytes(32).toString("hex");

      // Attacker tries to inject a tossed cookie and matching header
      const res = await agent
        .post("/api/auth/logout")
        .set("Cookie", `XSRF-TOKEN=${attackerForgedToken}`)
        .set("x-csrf-token", attackerForgedToken)
        .send({});

      // Rejected because session.csrfToken is authoritative and differs from attackerForgedToken
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("EBADCSRFTOKEN");
    });
  });

  // =========================================================================
  // 5. AUTH-005: Staff Invitation Token Redemption Security
  // =========================================================================
  describe("AUTH-005: Staff Invitation Token Redemption & Identity Verification", () => {
    it("requires existing account password to confirm identity when upgrading an existing user", async () => {
      const rawToken = "invitation-token-1234567890123456";
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      const mockInvitation = {
        _id: "507f1f77bcf86cd799439061",
        email: "existingvisitor@example.com",
        role: "GUIDE",
        used: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      StaffInvitation.findOneAndUpdate = () => Promise.resolve(mockInvitation);
      let rolledBack = false;
      StaffInvitation.findByIdAndUpdate = () => {
        rolledBack = true;
        return Promise.resolve();
      };

      const existingPasswordHash = await bcrypt.hash("RealPassword123!", 10);
      User.findOne = () =>
        Promise.resolve({
          _id: visitorId,
          email: "existingvisitor@example.com",
          passwordHash: existingPasswordHash,
          role: "VISITOR",
          save: () => Promise.resolve(),
        });

      const { agent, csrfToken } = await createAgent();

      // Attempt redemption without password
      const resNoPass = await agent
        .post("/api/auth/accept-invitation")
        .set("x-csrf-token", csrfToken)
        .send({ token: rawToken });

      expect(resNoPass.status).toBe(400);
      expect(resNoPass.body.error.code).toBe("PASSWORD_REQUIRED");
      expect(rolledBack).toBe(true);

      // Attempt redemption with wrong password
      const resWrongPass = await agent
        .post("/api/auth/accept-invitation")
        .set("x-csrf-token", csrfToken)
        .send({ token: rawToken, password: "WrongPassword999!" });

      expect(resWrongPass.status).toBe(401);
      expect(resWrongPass.body.error.code).toBe("INVALID_CREDENTIALS");

      // Successful redemption with correct password
      let savedUser = null;
      User.findOne = () =>
        Promise.resolve({
          _id: visitorId,
          email: "existingvisitor@example.com",
          passwordHash: existingPasswordHash,
          role: "VISITOR",
          save: function () {
            savedUser = this;
            return Promise.resolve(this);
          },
        });

      const resValid = await agent
        .post("/api/auth/accept-invitation")
        .set("x-csrf-token", csrfToken)
        .send({ token: rawToken, password: "RealPassword123!" });

      expect(resValid.status).toBe(200);
      expect(resValid.body.success).toBe(true);
      expect(savedUser.role).toBe("GUIDE");
      expect(savedUser.isEmailVerified).toBe(true);
    });

    it("requires a password of at least 8 characters when creating a new staff account", async () => {
      const rawToken = "new-staff-token-1234567890123456";
      const mockInvitation = {
        _id: "507f1f77bcf86cd799439062",
        email: "brandnewguide@example.com",
        role: "GUIDE",
        used: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      StaffInvitation.findOneAndUpdate = () => Promise.resolve(mockInvitation);
      StaffInvitation.findByIdAndUpdate = () => Promise.resolve();
      User.findOne = () => Promise.resolve(null); // No existing account

      const { agent, csrfToken } = await createAgent();

      const res = await agent
        .post("/api/auth/accept-invitation")
        .set("x-csrf-token", csrfToken)
        .send({
          token: rawToken,
          name: "Brand New Guide",
          password: "short", // < 8 characters
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("PASSWORD_TOO_SHORT");
    });
  });
});
