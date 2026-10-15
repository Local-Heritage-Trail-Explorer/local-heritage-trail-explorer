import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import session from "express-session";
import { createApp } from "../server.js";
import { User } from "../models/user.model.js";
import { Place } from "../models/place.model.js";
import { Trail } from "../models/trail.model.js";
import { EditorialReview } from "../models/editorial-review.model.js";

describe("P8 — Guide Publication Tests", () => {
  let app;
  let memoryStore;

  const originalUserFindById = User.findById;
  const originalPlaceFind = Place.find;
  const originalTrailCreate = Trail.create;
  const originalTrailFind = Trail.find;
  const originalTrailFindById = Trail.findById;
  const originalEditorialReviewCreate = EditorialReview.create;

  const curatorUserId = "507f1f77bcf86cd799439071";
  const guideUserId = "507f1f77bcf86cd799439072";
  const otherVisitorUserId = "507f1f77bcf86cd799439073";

  const approvedPlaceId1 = "507f1f77bcf86cd799439011";
  const approvedPlaceId2 = "507f1f77bcf86cd799439012";
  const unapprovedPlaceId = "507f1f77bcf86cd799439013";
  const trailId1 = "507f1f77bcf86cd799439041";

  const curatorUserDoc = {
    _id: curatorUserId,
    name: "Head Curator",
    email: "curator@example.com",
    role: "CURATOR",
    isEmailVerified: true,
  };

  const guideUserDoc = {
    _id: guideUserId,
    name: "Tirumala Heritage Guide",
    email: "guide@example.com",
    role: "GUIDE",
    isEmailVerified: true,
  };

  const visitorUserDoc = {
    _id: otherVisitorUserId,
    name: "Regular Visitor",
    email: "visitor@example.com",
    role: "VISITOR",
    isEmailVerified: true,
  };

  const mockApprovedPlaces = [
    {
      _id: approvedPlaceId1,
      name: "Sri Venkateswara Museum",
      zone: "Tirumala Up-Hill",
      estimatedVisitMinutes: 30,
      status: "approved",
    },
    {
      _id: approvedPlaceId2,
      name: "Silathoranam Natural Arch",
      zone: "Tirumala Up-Hill",
      estimatedVisitMinutes: 45,
      status: "approved",
    },
  ];

  beforeEach(() => {
    memoryStore = new session.MemoryStore();
    app = createApp(memoryStore);

    // Test-only session helper to set authenticated session
    app.post("/test-session", (req, res) => {
      req.session.userId = req.body.userId;
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, sessionUserId: req.session.userId });
      });
    });

    // Mock User.findById
    User.findById = (id) => ({
      select: () => {
        const idStr = id?.toString();
        if (idStr === curatorUserId) return Promise.resolve(curatorUserDoc);
        if (idStr === guideUserId) return Promise.resolve(guideUserDoc);
        if (idStr === otherVisitorUserId) return Promise.resolve(visitorUserDoc);
        return Promise.resolve(null);
      },
    });
  });

  afterEach(() => {
    User.findById = originalUserFindById;
    Place.find = originalPlaceFind;
    Trail.create = originalTrailCreate;
    Trail.find = originalTrailFind;
    Trail.findById = originalTrailFindById;
    EditorialReview.create = originalEditorialReviewCreate;
  });

  // Helper to create agent with CSRF token
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
  // 1. GUIDE CREATION & CLIENT CONTROL PREVENTION
  // =========================================================================
  describe("1. Guide Creation & Security Controls", () => {
    it("Requirement 11: Ordinary user cannot directly set publication status or public visibility on creation", async () => {
      const { agent, csrfToken } = await createAgent(guideUserId);

      Place.find = () => ({
        lean: () => Promise.resolve(mockApprovedPlaces),
      });

      let createdDoc = null;
      Trail.create = (doc) => {
        createdDoc = doc;
        return Promise.resolve({
          ...doc,
          _id: trailId1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      };

      // Attacker attempts to inject status: "published" and visibility: "public"
      const res = await agent
        .post("/api/trails")
        .set("x-csrf-token", csrfToken)
        .send({
          title: "Attempted Instant Public Guide",
          theme: "history",
          stops: [approvedPlaceId1, approvedPlaceId2],
          status: "published",
          visibility: "public",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Backend must strictly force status: "active" and visibility: "private"
      expect(createdDoc.status).toBe("active");
      expect(createdDoc.visibility).toBe("private");
      expect(res.body.data.status).toBe("active");
      expect(res.body.data.visibility).toBe("private");
    });
  });

  // =========================================================================
  // 2. SHARING AND PUBLICATION REQUESTS
  // =========================================================================
  describe("2. Sharing and Publication Requests", () => {
    it("Requirement 1: Unauthenticated request to publish or share is rejected with HTTP 401", async () => {
      const { agent, csrfToken } = await createAgent(null);

      const pubRes = await agent
        .post(`/api/trails/${trailId1}/publish-request`)
        .set("x-csrf-token", csrfToken)
        .send({});

      expect(pubRes.status).toBe(401);
      expect(pubRes.body.error.code).toBe("UNAUTHORIZED");

      const shareRes = await agent
        .post(`/api/trails/${trailId1}/share-request`)
        .set("x-csrf-token", csrfToken)
        .send({});

      expect(shareRes.status).toBe(401);
      expect(shareRes.body.error.code).toBe("UNAUTHORIZED");
    });

    it("Requirement 1: Non-owner cannot request publication of another user's trail (HTTP 403)", async () => {
      const { agent, csrfToken } = await createAgent(otherVisitorUserId); // Visitor trying to publish Guide's trail

      const mockTrail = {
        _id: trailId1,
        ownerId: guideUserId, // Owned by Guide
        title: "Guide's Private Trail",
        status: "active",
        visibility: "private",
        stops: [approvedPlaceId1],
      };

      Trail.findById = () => Promise.resolve(mockTrail);

      const res = await agent
        .post(`/api/trails/${trailId1}/publish-request`)
        .set("x-csrf-token", csrfToken)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("Requirement 2: Valid sharing request on owned trail succeeds and keeps trail private pending review", async () => {
      const { agent, csrfToken } = await createAgent(guideUserId);

      const mockTrail = {
        _id: trailId1,
        ownerId: guideUserId,
        title: "Temple Architecture Trail",
        theme: "architecture",
        status: "active",
        visibility: "private",
        stops: [approvedPlaceId1],
        save: () => Promise.resolve(),
      };

      Trail.findById = () => Promise.resolve(mockTrail);
      Place.find = () => ({
        lean: () => Promise.resolve([mockApprovedPlaces[0]]),
      });
      EditorialReview.create = (doc) =>
        Promise.resolve({ ...doc, _id: "507f1f77bcf86cd799439099", createdAt: new Date() });

      const res = await agent
        .post(`/api/trails/${trailId1}/share-request`)
        .set("x-csrf-token", csrfToken)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("pending_review");
      expect(res.body.data.visibility).toBe("private");
      expect(mockTrail.status).toBe("pending_review");
      expect(mockTrail.visibility).toBe("private");
    });

    it("Requirement 3: Publication request eligibility succeeds when all stops are approved", async () => {
      const { agent, csrfToken } = await createAgent(guideUserId);

      const mockTrail = {
        _id: trailId1,
        ownerId: guideUserId,
        title: "Sacred Hills Guide",
        theme: "spiritual",
        status: "active",
        visibility: "private",
        stops: [approvedPlaceId1, approvedPlaceId2],
        save: () => Promise.resolve(),
      };

      Trail.findById = () => Promise.resolve(mockTrail);
      Place.find = () => ({
        lean: () => Promise.resolve(mockApprovedPlaces),
      });

      let loggedReview = null;
      EditorialReview.create = (doc) => {
        loggedReview = doc;
        return Promise.resolve({ ...doc, _id: "507f1f77bcf86cd799439098", createdAt: new Date() });
      };

      const res = await agent
        .post(`/api/trails/${trailId1}/publish-request`)
        .set("x-csrf-token", csrfToken)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("pending_review");
      expect(res.body.data.visibility).toBe("private");
      expect(loggedReview.resourceType).toBe("Trail");
      expect(loggedReview.decision).toBe("pending_review");
    });

    it("Requirement 4: Rejection of trails containing unapproved heritage resources with HTTP 400", async () => {
      const { agent, csrfToken } = await createAgent(guideUserId);

      const mockTrail = {
        _id: trailId1,
        ownerId: guideUserId,
        title: "Trail with Unapproved Stops",
        theme: "nature",
        status: "active",
        visibility: "private",
        stops: [approvedPlaceId1, unapprovedPlaceId],
        save: () => Promise.resolve(),
      };

      Trail.findById = () => Promise.resolve(mockTrail);

      // Return one approved place and one draft/unapproved place
      Place.find = () => ({
        lean: () =>
          Promise.resolve([
            mockApprovedPlaces[0],
            {
              _id: unapprovedPlaceId,
              name: "Unapproved Forest Path",
              status: "draft", // Ineligible!
            },
          ]),
      });

      const res = await agent
        .post(`/api/trails/${trailId1}/publish-request`)
        .set("x-csrf-token", csrfToken)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INELIGIBLE_TRAIL_RESOURCES");
      expect(res.body.error.message).toContain("unapproved or ineligible");
    });

    it("Requirement 7: Duplicate publication requests are rejected with HTTP 400", async () => {
      const { agent, csrfToken } = await createAgent(guideUserId);

      const mockTrail = {
        _id: trailId1,
        ownerId: guideUserId,
        status: "pending_review", // Already pending!
        visibility: "private",
        stops: [approvedPlaceId1],
      };

      Trail.findById = () => Promise.resolve(mockTrail);

      const res = await agent
        .post(`/api/trails/${trailId1}/publish-request`)
        .set("x-csrf-token", csrfToken)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("DUPLICATE_REQUEST");
    });

    it("Requirement 7: Publication request on already published trail is rejected with HTTP 400", async () => {
      const { agent, csrfToken } = await createAgent(guideUserId);

      const mockTrail = {
        _id: trailId1,
        ownerId: guideUserId,
        status: "published", // Already published!
        visibility: "public",
        stops: [approvedPlaceId1],
      };

      Trail.findById = () => Promise.resolve(mockTrail);

      const res = await agent
        .post(`/api/trails/${trailId1}/publish-request`)
        .set("x-csrf-token", csrfToken)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
    });
  });

  // =========================================================================
  // 3. CURATOR PUBLICATION REVIEW
  // =========================================================================
  describe("3. Curator Publication Review", () => {
    it("Requirement 5: Ordinary visitor or guide is blocked from reviewing publication requests (HTTP 403)", async () => {
      // 1. Visitor blocked
      const { agent: visitorAgent, csrfToken: vCsrf } = await createAgent(otherVisitorUserId);
      const vRes = await visitorAgent
        .patch(`/api/curator/trails/${trailId1}/review`)
        .set("x-csrf-token", vCsrf)
        .send({ status: "approved" });

      expect(vRes.status).toBe(403);
      expect(vRes.body.error.code).toBe("FORBIDDEN");

      // 2. Guide blocked
      const { agent: guideAgent, csrfToken: gCsrf } = await createAgent(guideUserId);
      const gRes = await guideAgent
        .patch(`/api/curator/trails/${trailId1}/review`)
        .set("x-csrf-token", gCsrf)
        .send({ status: "approved" });

      expect(gRes.status).toBe(403);
      expect(gRes.body.error.code).toBe("FORBIDDEN");
    });

    it("Requirement 6: Curator approval publishes the trail and makes it public (HTTP 200)", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      const mockTrail = {
        _id: trailId1,
        ownerId: guideUserId,
        title: "Curator Approved Heritage Trail",
        status: "pending_review",
        visibility: "private",
        stops: [approvedPlaceId1, approvedPlaceId2],
        save: () => Promise.resolve(),
      };

      Trail.findById = () => Promise.resolve(mockTrail);
      Place.find = () => ({
        lean: () => Promise.resolve(mockApprovedPlaces),
      });

      let reviewLogged = null;
      EditorialReview.create = (doc) => {
        reviewLogged = doc;
        return Promise.resolve({ ...doc, _id: "507f1f77bcf86cd799439095", createdAt: new Date() });
      };

      const res = await agent
        .patch(`/api/curator/trails/${trailId1}/review`)
        .set("x-csrf-token", csrfToken)
        .send({
          status: "approved",
          notes: "All stops verified with valid historical documentation.",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trail.status).toBe("published");
      expect(res.body.data.trail.visibility).toBe("public");
      expect(mockTrail.status).toBe("published");
      expect(mockTrail.visibility).toBe("public");
      expect(reviewLogged.decision).toBe("approved");
      expect(reviewLogged.reviewedBy).toBe(curatorUserId);
    });

    it("Requirement 6: Curator rejection marks trail rejected and preserves private visibility", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      const mockTrail = {
        _id: trailId1,
        ownerId: guideUserId,
        title: "Trail with Insufficient Stops",
        status: "pending_review",
        visibility: "private",
        stops: [approvedPlaceId1],
        save: () => Promise.resolve(),
      };

      Trail.findById = () => Promise.resolve(mockTrail);
      EditorialReview.create = (doc) =>
        Promise.resolve({ ...doc, _id: "507f1f77bcf86cd799439094", createdAt: new Date() });

      const res = await agent
        .patch(`/api/curator/trails/${trailId1}/review`)
        .set("x-csrf-token", csrfToken)
        .send({
          status: "rejected",
          notes: "Trail path lacks sufficient historical density.",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trail.status).toBe("rejected");
      expect(res.body.data.trail.visibility).toBe("private");
      expect(mockTrail.status).toBe("rejected");
      expect(mockTrail.visibility).toBe("private");
    });

    it("Requirement 7: Curator review on non-pending trail is rejected with HTTP 400", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      const mockTrail = {
        _id: trailId1,
        ownerId: guideUserId,
        status: "active", // Not pending review
        visibility: "private",
      };

      Trail.findById = () => Promise.resolve(mockTrail);

      const res = await agent
        .patch(`/api/curator/trails/${trailId1}/review`)
        .set("x-csrf-token", csrfToken)
        .send({ status: "approved" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
    });
  });

  // =========================================================================
  // 4. SAFE PUBLIC PUBLICATION & PRIVACY ISOLATION
  // =========================================================================
  describe("4. Safe Public Publication & Privacy Isolation", () => {
    it("Requirement 8: Public retrieval of approved published guides succeeds for unauthenticated users", async () => {
      const mockPublishedTrails = [
        {
          _id: trailId1,
          title: "Publicly Published Tirumala Heritage Trail",
          theme: "spiritual",
          stops: [approvedPlaceId1, approvedPlaceId2],
          estimatedMinutes: 75,
          status: "published",
          visibility: "public",
          ownerId: { _id: guideUserId, name: "Tirumala Heritage Guide" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      Trail.find = (filter) => {
        expect(filter.status).toBe("published");
        expect(filter.visibility).toBe("public");
        return {
          populate: () => ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  lean: () => Promise.resolve(mockPublishedTrails),
                }),
              }),
            }),
          }),
        };
      };

      const res = await request(app).get("/api/trails");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(trailId1);
      expect(res.body.data[0].status).toBe("published");
      expect(res.body.data[0].visibility).toBe("public");
      expect(res.body.data[0].author.name).toBe("Tirumala Heritage Guide");
    });

    it("Requirement 9: Private trail isolation prevents unauthorized retrieval", async () => {
      const mockPrivateTrail = {
        _id: trailId1,
        ownerId: guideUserId,
        title: "Strictly Private Guide Draft",
        status: "active",
        visibility: "private",
        stops: [approvedPlaceId1],
      };

      Trail.findById = () => ({
        lean: () => Promise.resolve(mockPrivateTrail),
      });

      // 1. Unauthenticated gets 401
      const unauthRes = await request(app).get(`/api/trails/${trailId1}`);
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe("UNAUTHORIZED");

      // 2. Non-owner gets 403
      const { agent } = await createAgent(otherVisitorUserId);
      const nonOwnerRes = await agent.get(`/api/trails/${trailId1}`);
      expect(nonOwnerRes.status).toBe(403);
      expect(nonOwnerRes.body.error.code).toBe("FORBIDDEN");
    });

    it("Requirement 10: Exclusion of personal visit history and private notes from public responses", async () => {
      const mockPublishedTrail = {
        _id: trailId1,
        ownerId: guideUserId,
        title: "Tirumala Architecture Explorer",
        theme: "architecture",
        stops: [approvedPlaceId1],
        estimatedMinutes: 60,
        status: "published",
        visibility: "public",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      Trail.findById = () => ({
        lean: () => Promise.resolve(mockPublishedTrail),
      });

      Place.find = () => ({
        lean: () => Promise.resolve([mockApprovedPlaces[0]]),
      });

      const res = await request(app).get(`/api/trails/${trailId1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(trailId1);
      expect(res.body.data.stopDetails).toHaveLength(1);

      // Verify strict exclusion of sensitive and personal data
      expect(res.body.data.completedPlaceIds).toBeUndefined();
      expect(res.body.data.visitTimestamps).toBeUndefined();
      expect(res.body.data.notes).toBeUndefined();
      expect(res.body.data.internalReview).toBeUndefined();
    });
  });
});
