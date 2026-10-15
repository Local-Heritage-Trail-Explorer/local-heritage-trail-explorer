import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import session from "express-session";
import { createApp } from "../server.js";
import { User } from "../models/user.model.js";
import { Trail } from "../models/trail.model.js";
import { Place } from "../models/place.model.js";
import { VisitProgress } from "../models/visit-progress.model.js";

describe("P3 — Trail Management Tests", () => {
  let app;
  let memoryStore;

  const originalUserFindById = User.findById;
  const originalTrailCreate = Trail.create;
  const originalTrailFind = Trail.find;
  const originalTrailFindById = Trail.findById;
  const originalPlaceFind = Place.find;
  const originalPlaceFindById = Place.findById;
  const originalVisitProgressFindOne = VisitProgress.findOne;
  const originalVisitProgressCreate = VisitProgress.create;

  const testUserId = "507f1f77bcf86cd799439091";
  const otherUserId = "507f1f77bcf86cd799439092";
  const placeId1 = "507f1f77bcf86cd799439011";
  const placeId2 = "507f1f77bcf86cd799439012";
  const nonTrailPlaceId = "507f1f77bcf86cd799439019";
  const trailId1 = "507f1f77bcf86cd799439041";

  const testUserDoc = {
    _id: testUserId,
    name: "Trail Explorer",
    email: "explorer@example.com",
    role: "VISITOR",
    isEmailVerified: true,
  };

  const otherUserDoc = {
    _id: otherUserId,
    name: "Other User",
    email: "other@example.com",
    role: "VISITOR",
    isEmailVerified: true,
  };

  const mockPlaces = [
    {
      _id: placeId1,
      name: "Sri Venkateswara Museum",
      zone: "Tirumala Up-Hill",
      estimatedVisitMinutes: 30,
      status: "approved",
    },
    {
      _id: placeId2,
      name: "Silathoranam",
      zone: "Tirumala Up-Hill",
      estimatedVisitMinutes: 45,
      status: "approved",
    },
  ];

  beforeEach(() => {
    memoryStore = new session.MemoryStore();
    app = createApp(memoryStore);

    // Test-only session helper to simulate authenticated sessions
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
        if (id?.toString() === testUserId) return Promise.resolve(testUserDoc);
        if (id?.toString() === otherUserId) return Promise.resolve(otherUserDoc);
        return Promise.resolve(null);
      },
    });
  });

  afterEach(() => {
    User.findById = originalUserFindById;
    Trail.create = originalTrailCreate;
    Trail.find = originalTrailFind;
    Trail.findById = originalTrailFindById;
    Place.find = originalPlaceFind;
    Place.findById = originalPlaceFindById;
    VisitProgress.findOne = originalVisitProgressFindOne;
    VisitProgress.create = originalVisitProgressCreate;
  });

  // Preserve suite placeholder from main
  it("should pass trail suite placeholder", () => {
    expect(true).toBe(true);
  });

  // Helper to create an authenticated supertest agent
  const createAuthenticatedAgent = async (userId = testUserId) => {
    const agent = request.agent(app);
    const csrfRes = await agent.get("/api/csrf-token");
    const csrfToken = csrfRes.body.data?.csrfToken || "";

    await agent
      .post("/test-session")
      .set("x-csrf-token", csrfToken)
      .send({ userId });

    return { agent, csrfToken };
  };

  // Helper to create an unauthenticated agent with CSRF token
  const createUnauthenticatedAgent = async () => {
    const agent = request.agent(app);
    const csrfRes = await agent.get("/api/csrf-token");
    const csrfToken = csrfRes.body.data?.csrfToken || "";
    return { agent, csrfToken };
  };

  // =========================================================================
  // 1. POST /api/trails (Create Trail)
  // =========================================================================
  describe("1. POST /api/trails", () => {
    it("should successfully create a private trail for an authenticated user", async () => {
      const { agent, csrfToken } = await createAuthenticatedAgent(testUserId);

      Place.find = () => ({
        lean: () => Promise.resolve(mockPlaces),
      });

      Trail.create = (doc) =>
        Promise.resolve({
          ...doc,
          _id: trailId1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const res = await agent
        .post("/api/trails")
        .set("x-csrf-token", csrfToken)
        .send({
          title: "Sacred Hills Heritage Trail",
          theme: "spiritual",
          stops: [placeId1, placeId2],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Sacred Hills Heritage Trail");
      expect(res.body.data.theme).toBe("spiritual");
      expect(res.body.data.visibility).toBe("private");
      expect(res.body.data.status).toBe("active");
      expect(res.body.data.ownerId).toBe(testUserId);
      expect(res.body.data.stops).toHaveLength(2);
      expect(res.body.data.estimatedMinutes).toBe(75); // 30 + 45
    });

    it("should reject unauthenticated trail creation with HTTP 401", async () => {
      const { agent, csrfToken } = await createUnauthenticatedAgent();

      const res = await agent
        .post("/api/trails")
        .set("x-csrf-token", csrfToken)
        .send({
          title: "Unauthorized Trail",
          theme: "history",
          stops: [placeId1],
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should reject invalid body with missing required fields with HTTP 400", async () => {
      const { agent, csrfToken } = await createAuthenticatedAgent(testUserId);

      const res = await agent
        .post("/api/trails")
        .set("x-csrf-token", csrfToken)
        .send({
          title: "",
          // missing theme and stops
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject creation when a referenced place stop does not exist with HTTP 400", async () => {
      const { agent, csrfToken } = await createAuthenticatedAgent(testUserId);

      // Return only placeId1, so placeId2 is missing
      Place.find = () => ({
        lean: () => Promise.resolve([mockPlaces[0]]),
      });

      const res = await agent
        .post("/api/trails")
        .set("x-csrf-token", csrfToken)
        .send({
          title: "Trail with Broken Stops",
          theme: "nature",
          stops: [placeId1, placeId2],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_PLACE_REFERENCE");
    });
  });

  // =========================================================================
  // 2. GET /api/trails/mine (List User Trails)
  // =========================================================================
  describe("2. GET /api/trails/mine", () => {
    it("should return only trails owned by the authenticated user", async () => {
      const { agent } = await createAuthenticatedAgent(testUserId);

      const userTrails = [
        {
          _id: trailId1,
          ownerId: testUserId,
          title: "My Personal Trail",
          theme: "history",
          stops: [placeId1],
          estimatedMinutes: 30,
          status: "active",
          visibility: "private",
          createdAt: new Date(),
        },
      ];

      Trail.find = (filter) => {
        expect(filter.ownerId).toBe(testUserId);
        return {
          sort: () => ({
            skip: () => ({
              limit: () => ({
                lean: () => Promise.resolve(userTrails),
              }),
            }),
          }),
        };
      };

      const res = await agent.get("/api/trails/mine");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(trailId1);
      expect(res.body.data[0].ownerId).toBe(testUserId);
    });

    it("should return empty array when authenticated user has no trails", async () => {
      const { agent } = await createAuthenticatedAgent(testUserId);

      Trail.find = () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve([]),
            }),
          }),
        }),
      });

      const res = await agent.get("/api/trails/mine");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it("should reject unauthenticated request with HTTP 401", async () => {
      const res = await request(app).get("/api/trails/mine");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  // =========================================================================
  // 3. GET /api/trails/:id (Retrieve Trail with Ownership Checks)
  // =========================================================================
  describe("3. GET /api/trails/:id", () => {
    const mockTrail = {
      _id: trailId1,
      ownerId: testUserId,
      title: "Sacred Hills Heritage Trail",
      theme: "spiritual",
      stops: [placeId1, placeId2],
      estimatedMinutes: 75,
      status: "active",
      visibility: "private",
      createdAt: new Date(),
    };

    it("should allow owner to retrieve their private trail with stop details", async () => {
      const { agent } = await createAuthenticatedAgent(testUserId);

      Trail.findById = () => ({
        lean: () => Promise.resolve(mockTrail),
      });

      Place.find = () => ({
        lean: () => Promise.resolve(mockPlaces),
      });

      const res = await agent.get(`/api/trails/${trailId1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(trailId1);
      expect(res.body.data.title).toBe("Sacred Hills Heritage Trail");
      expect(res.body.data.stopDetails).toHaveLength(2);
      expect(res.body.data.stopDetails[0].name).toBe("Sri Venkateswara Museum");
    });

    it("should reject another user from accessing a private trail with HTTP 403", async () => {
      const { agent } = await createAuthenticatedAgent(otherUserId); // Logged in as other user

      Trail.findById = () => ({
        lean: () => Promise.resolve(mockTrail), // owned by testUserId
      });

      const res = await agent.get(`/api/trails/${trailId1}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should reject unauthenticated access to a private trail with HTTP 401", async () => {
      Trail.findById = () => ({
        lean: () => Promise.resolve(mockTrail),
      });

      const res = await request(app).get(`/api/trails/${trailId1}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should return HTTP 404 if trail is not found", async () => {
      Trail.findById = () => ({
        lean: () => Promise.resolve(null),
      });

      const res = await request(app).get(`/api/trails/${trailId1}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("TRAIL_NOT_FOUND");
    });

    it("should return HTTP 400 for malformed trail ID", async () => {
      const res = await request(app).get("/api/trails/invalid-id-123");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_ID");
    });
  });

  // =========================================================================
  // 4. PATCH /api/trails/:id/progress (Track Progress and Visits)
  // =========================================================================
  describe("4. PATCH /api/trails/:id/progress", () => {
    const mockTrail = {
      _id: trailId1,
      ownerId: testUserId,
      title: "Sacred Hills Heritage Trail",
      theme: "spiritual",
      stops: [placeId1, placeId2],
      visibility: "private",
    };

    it("should record a visited stop for the trail owner", async () => {
      const { agent, csrfToken } = await createAuthenticatedAgent(testUserId);

      Trail.findById = () => ({
        lean: () => Promise.resolve(mockTrail),
      });

      // Initially no progress recorded
      VisitProgress.findOne = () => Promise.resolve(null);

      VisitProgress.create = (doc) =>
        Promise.resolve({
          ...doc,
          _id: "507f1f77bcf86cd799439088",
          save: () => Promise.resolve(),
        });

      const res = await agent
        .patch(`/api/trails/${trailId1}/progress`)
        .set("x-csrf-token", csrfToken)
        .send({ placeId: placeId1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.completedPlaceIds).toContain(placeId1);
      expect(res.body.data.completedCount).toBe(1);
      expect(res.body.data.totalStops).toBe(2);
      expect(res.body.data.isComplete).toBe(false);
    });

    it("should reject updating progress on another user's trail with HTTP 403", async () => {
      const { agent, csrfToken } = await createAuthenticatedAgent(otherUserId); // Logged in as other user

      Trail.findById = () => ({
        lean: () => Promise.resolve(mockTrail), // owned by testUserId
      });

      const res = await agent
        .patch(`/api/trails/${trailId1}/progress`)
        .set("x-csrf-token", csrfToken)
        .send({ placeId: placeId1 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("should reject a stop that does not belong to the trail with HTTP 400", async () => {
      const { agent, csrfToken } = await createAuthenticatedAgent(testUserId);

      Trail.findById = () => ({
        lean: () => Promise.resolve(mockTrail),
      });

      const res = await agent
        .patch(`/api/trails/${trailId1}/progress`)
        .set("x-csrf-token", csrfToken)
        .send({ placeId: nonTrailPlaceId });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_STOP");
    });

    it("should handle duplicate visit requests idempotently without duplicate records", async () => {
      const { agent, csrfToken } = await createAuthenticatedAgent(testUserId);

      Trail.findById = () => ({
        lean: () => Promise.resolve(mockTrail),
      });

      // Existing progress already includes placeId1
      const existingProgress = {
        userId: testUserId,
        trailId: trailId1,
        completedPlaceIds: [placeId1],
        visitTimestamps: [{ placeId: placeId1, visitedAt: new Date().toISOString() }],
        save: () => Promise.resolve(),
      };

      VisitProgress.findOne = () => Promise.resolve(existingProgress);

      const res = await agent
        .patch(`/api/trails/${trailId1}/progress`)
        .set("x-csrf-token", csrfToken)
        .send({ placeId: placeId1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.completedPlaceIds).toHaveLength(1);
    });

    it("should reject unauthenticated progress update with HTTP 401", async () => {
      const { agent, csrfToken } = await createUnauthenticatedAgent();

      const res = await agent
        .patch(`/api/trails/${trailId1}/progress`)
        .set("x-csrf-token", csrfToken)
        .send({ placeId: placeId1 });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
