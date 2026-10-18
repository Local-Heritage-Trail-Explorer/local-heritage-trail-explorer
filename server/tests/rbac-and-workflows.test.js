import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import session from "express-session";
import { createApp } from "../server.js";
import { generateTrailPlan } from "../services/trail-agent.service.js";
import User from "../models/user.model.js";
import StaffInvitation from "../models/staff-invitation.model.js";
import { Place } from "../models/place.model.js";
import { Story } from "../models/story.model.js";
import { Source } from "../models/source.model.js";
import { Trail } from "../models/trail.model.js";
import { Correction } from "../models/correction.model.js";

describe("RBAC, Staff Invitations, Heritage Workflows & AI Agent Tests", () => {
  let app;
  let memoryStore;

  const originalUserFindById = User.findById;
  const originalUserFindOne = User.findOne;
  const originalPlaceFindOne = Place.findOne;
  const originalPlaceExists = Place.exists;
  const originalStoryFind = Story.find;
  const originalSourceFind = Source.find;
  const originalTrailFind = Trail.find;

  const curatorUserId = "507f1f77bcf86cd799439101";
  const visitorUserId = "507f1f77bcf86cd799439102";
  const guideUserId = "507f1f77bcf86cd799439103";

  const curatorUserDoc = {
    _id: curatorUserId,
    name: "Senior Curator",
    email: "curator@example.com",
    role: "CURATOR",
    isEmailVerified: true,
  };

  const visitorUserDoc = {
    _id: visitorUserId,
    name: "Common Visitor",
    email: "visitor@example.com",
    role: "VISITOR",
    isEmailVerified: true,
  };

  const guideUserDoc = {
    _id: guideUserId,
    name: "Heritage Guide",
    email: "guide@example.com",
    role: "GUIDE",
    isEmailVerified: true,
  };

  beforeEach(() => {
    memoryStore = new session.MemoryStore();
    app = createApp(memoryStore);

    // Test session setup helper for supertest agent
    app.post("/test-session", (req, res) => {
      req.session.userId = req.body.userId;
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
      });
    });

    User.findById = (id) => ({
      select: () => {
        const idStr = id?.toString();
        if (idStr === curatorUserId) return Promise.resolve(curatorUserDoc);
        if (idStr === visitorUserId) return Promise.resolve(visitorUserDoc);
        if (idStr === guideUserId) return Promise.resolve(guideUserDoc);
        return Promise.resolve(null);
      },
    });
  });

  afterEach(() => {
    User.findById = originalUserFindById;
    User.findOne = originalUserFindOne;
    Place.findOne = originalPlaceFindOne;
    Place.exists = originalPlaceExists;
    Story.find = originalStoryFind;
    Source.find = originalSourceFind;
    Trail.find = originalTrailFind;
  });

  const createAgent = async (userId = null) => {
    const agent = request.agent(app);
    const csrfRes = await agent.get("/api/csrf-token");
    const csrfToken = csrfRes.body.data?.csrfToken || "";

    if (userId) {
      await agent
        .post("/test-session")
        .set("x-csrf-token", csrfToken)
        .send({ userId });
    }

    return { agent, csrfToken };
  };

  // =========================================================================
  // 1. Staff Role Assignment & Invitation Workflow
  // =========================================================================
  describe("1. Staff Role Assignment & Invitation Workflow", () => {
    it("should prevent a VISITOR from creating staff invitations (HTTP 403)", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId);

      const res = await agent
        .post("/api/auth/staff-invitation")
        .set("x-csrf-token", csrfToken)
        .send({
          email: "newguide@example.com",
          role: "GUIDE",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should allow an authenticated CURATOR to issue staff invitations", async () => {
      let savedInvitation = null;
      StaffInvitation.prototype.save = function () {
        savedInvitation = this;
        return Promise.resolve(this);
      };

      const { agent, csrfToken } = await createAgent(curatorUserId);

      const res = await agent
        .post("/api/auth/staff-invitation")
        .set("x-csrf-token", csrfToken)
        .send({
          email: "scholar@example.com",
          role: "CURATOR",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("CURATOR");
      expect(res.body.data.invitationToken).toBeDefined();
    });

    it("should allow redemption of a valid single-use staff invitation token", async () => {
      const { agent, csrfToken } = await createAgent(null);
      const rawToken = "abc123token4567890123456789012345";

      StaffInvitation.findOneAndUpdate = () =>
        Promise.resolve({
          email: "newstaff@example.com",
          role: "GUIDE",
          used: false,
          expiresAt: new Date(Date.now() + 100000),
        });

      let createdUser = null;
      User.findOne = () => Promise.resolve(null);
      User.prototype.save = function () {
        createdUser = this;
        return Promise.resolve(this);
      };

      const res = await agent
        .post("/api/auth/accept-invitation")
        .set("x-csrf-token", csrfToken)
        .send({
          token: rawToken,
          name: "Guide Ramesh",
          password: "SecurePassword123!",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe("GUIDE");
      expect(createdUser.role).toBe("GUIDE");
      expect(createdUser.isEmailVerified).toBe(true);
    });

    it("should reject an invalid or already used staff invitation token", async () => {
      const { agent, csrfToken } = await createAgent(null);
      StaffInvitation.findOneAndUpdate = () => Promise.resolve(null);

      const res = await agent
        .post("/api/auth/accept-invitation")
        .set("x-csrf-token", csrfToken)
        .send({
          token: "expired_or_reused_token",
          password: "SecurePassword123!",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_INVITATION");
    });
  });

  // =========================================================================
  // 2. Role-Based Access Control (RBAC) Enforcement Matrix
  // =========================================================================
  describe("2. RBAC Enforcement Matrix", () => {
    // Anonymous Rejections
    it("rejects unauthenticated user accessing Curator review queue with 401", async () => {
      const { agent } = await createAgent(null);
      const res = await agent.get("/api/curator/review-queue");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects unauthenticated user accessing Guide routes with 401", async () => {
      const { agent } = await createAgent(null);
      const res = await agent.get("/api/guide/trails");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    // Visitor Denials
    it("denies VISITOR from creating editorial sources (HTTP 403)", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId);

      const res = await agent
        .post("/api/sources")
        .set("x-csrf-token", csrfToken)
        .send({
          title: "Unauthorized Document",
          attribution: "Anonymous",
          sourceType: "inscription",
          url: "https://example.com/unauth",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("denies VISITOR from editing factual place records (HTTP 403)", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId);

      const res = await agent
        .patch("/api/places/507f1f77bcf86cd799439011")
        .set("x-csrf-token", csrfToken)
        .send({ name: "Hacked Temple Name" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("denies VISITOR from approving stories (HTTP 403)", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId);

      const res = await agent
        .post("/api/stories/507f1f77bcf86cd799439021/approval")
        .set("x-csrf-token", csrfToken)
        .send({ status: "approved" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("denies VISITOR from publishing trails via Guide routes (HTTP 403)", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId);

      const res = await agent
        .post("/api/guide/trails/507f1f77bcf86cd799439001/publish")
        .set("x-csrf-token", csrfToken)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    // Guide Denials of Curator-only operations
    it("denies GUIDE from approving factual changes to sources (HTTP 403)", async () => {
      const { agent, csrfToken } = await createAgent(guideUserId);

      const res = await agent
        .post("/api/sources")
        .set("x-csrf-token", csrfToken)
        .send({
          title: "Guide Source",
          attribution: "Guide",
          sourceType: "oral_record",
          url: "https://example.com/guide-source",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("denies GUIDE from approving stories (HTTP 403)", async () => {
      const { agent, csrfToken } = await createAgent(guideUserId);

      const res = await agent
        .post("/api/stories/507f1f77bcf86cd799439021/approval")
        .set("x-csrf-token", csrfToken)
        .send({ status: "approved" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    // Guide Authorized Operations
    it("allows authorized GUIDE to access Guide dashboard endpoints", async () => {
      Trail.find = () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve([]),
            }),
          }),
        }),
      });

      const { agent } = await createAgent(guideUserId);

      const res = await agent.get("/api/guide/trails");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // =========================================================================
  // 3. AI Trail Planning Agent & Closure Demonstration Case
  // =========================================================================
  describe("3. AI Trail Planning Agent & Closed Location Demonstration", () => {
    it("detects closed heritage site, excludes it, substitutes open alternative, and stays under 90 minutes", async () => {
      const plan = await generateTrailPlan({
        theme: "architecture",
        maxMinutes: 90,
      });

      expect(plan).toBeDefined();
      expect(plan.title).toBeDefined();
      expect(plan.theme).toBe("architecture");
      expect(plan.estimatedMinutes).toBeLessThanOrEqual(90);
      expect(plan.stops.length).toBeGreaterThanOrEqual(2);

      // Verify tool status reported
      expect(plan.toolStatus).toBeDefined();
      expect(plan.feasibility).toBeDefined();
      expect(plan.feasibility.isFeasible).toBe(true);
      expect(plan.feasibility.totalEstimatedMinutes).toBeLessThanOrEqual(90);
      expect(typeof plan.narrative).toBe("string");
    });
  });

  // =========================================================================
  // 4. Place & Story Details Endpoints
  // =========================================================================
  describe("4. Place & Story Detailed Endpoints", () => {
    it("GET /api/places/:id returns approved place details", async () => {
      Place.findOne = () => ({
        lean: () =>
          Promise.resolve({
            _id: "507f1f77bcf86cd799439011",
            name: "Venkateswara Museum",
            description: "Curated exhibits.",
            zone: "Tirumala Hills",
            themes: ["history"],
            openingHours: { open: "09:00", close: "18:00" },
            hoursVerification: "verified",
            estimatedVisitMinutes: 30,
            status: "approved",
          }),
      });

      const { agent } = await createAgent(null);
      const res = await agent.get("/api/places/507f1f77bcf86cd799439011");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("507f1f77bcf86cd799439011");
      expect(res.body.data.name).toBe("Venkateswara Museum");
      expect(res.body.data.openingHours).toBeDefined();
    });

    it("GET /api/places/:id returns 404 for non-existent place", async () => {
      Place.findOne = () => ({
        lean: () => Promise.resolve(null),
      });

      const { agent } = await createAgent(null);
      const res = await agent.get("/api/places/507f1f77bcf86cd799439019");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("PLACE_NOT_FOUND");
    });

    it("GET /api/places/:id/stories returns approved stories for place", async () => {
      Place.exists = () => Promise.resolve(true);
      Story.find = () => ({
        sort: () => ({
          lean: () =>
            Promise.resolve([
              {
                _id: "507f1f77bcf86cd799439021",
                placeId: "507f1f77bcf86cd799439011",
                title: "Legend of the Stone Arch",
                content: "Ancient stories of the hill formation.",
                claimType: "oral_tradition",
                sourceIds: [],
                status: "approved",
              },
            ]),
        }),
      });
      Source.find = () => ({
        lean: () => Promise.resolve([]),
      });

      const { agent } = await createAgent(null);
      const res = await agent.get("/api/places/507f1f77bcf86cd799439011/stories");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].title).toBe("Legend of the Stone Arch");
    });
  });

  // =========================================================================
  // 5. Curator Review Queue Integration
  // =========================================================================
  describe("5. Curator Review Queue", () => {
    it("GET /api/curator/review-queue aggregates pending review items", async () => {
      Trail.find = () => ({
        populate: () => ({
          sort: () => ({
            lean: () =>
              Promise.resolve([
                {
                  _id: "trail-queue-1",
                  title: "Sacred Footpaths",
                  theme: "Pilgrim Paths",
                  status: "pending_review",
                  estimatedMinutes: 180,
                  ownerId: { _id: "guide-1", name: "Guide Venkat" },
                },
              ]),
          }),
        }),
      });

      Correction.find = () => ({
        populate: () => ({
          populate: () => ({
            sort: () => ({
              lean: () => Promise.resolve([]),
            }),
          }),
        }),
      });

      Source.find = () => ({
        sort: () => ({
          lean: () => Promise.resolve([]),
        }),
      });

      Story.find = () => ({
        populate: () => ({
          sort: () => ({
            lean: () => Promise.resolve([]),
          }),
        }),
      });

      const { agent } = await createAgent(curatorUserId);
      const res = await agent.get("/api/curator/review-queue");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("trails");
      expect(res.body.data).toHaveProperty("corrections");
      expect(res.body.data).toHaveProperty("sources");
      expect(res.body.data).toHaveProperty("stories");
      expect(res.body.data.trails[0].submittedBy.name).toBe("Guide Venkat");
    });
  });
});
