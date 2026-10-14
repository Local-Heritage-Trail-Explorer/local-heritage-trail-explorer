import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import session from "express-session";
import { createApp } from "../server.js";
import { User } from "../models/user.model.js";
import { Place } from "../models/place.model.js";
import { Source } from "../models/source.model.js";
import { Story } from "../models/story.model.js";
import { Correction } from "../models/correction.model.js";
import { EditorialReview } from "../models/editorial-review.model.js";

describe("P4 — Curator Management Tests", () => {
  let app;
  let memoryStore;

  const originalUserFindById = User.findById;
  const originalPlaceCreate = Place.create;
  const originalPlaceFind = Place.find;
  const originalPlaceFindById = Place.findById;
  const originalPlaceFindByIdAndUpdate = Place.findByIdAndUpdate;
  const originalPlaceExists = Place.exists;

  const originalSourceCreate = Source.create;
  const originalSourceFind = Source.find;
  const originalSourceFindById = Source.findById;
  const originalSourceFindByIdAndUpdate = Source.findByIdAndUpdate;

  const originalStoryCreate = Story.create;
  const originalStoryFind = Story.find;
  const originalStoryFindById = Story.findById;
  const originalStoryFindByIdAndUpdate = Story.findByIdAndUpdate;

  const originalCorrectionCreate = Correction.create;
  const originalCorrectionFind = Correction.find;
  const originalCorrectionFindById = Correction.findById;

  const originalEditorialReviewCreate = EditorialReview.create;

  const curatorUserId = "507f1f77bcf86cd799439071";
  const visitorUserId = "507f1f77bcf86cd799439072";
  const placeId1 = "507f1f77bcf86cd799439011";
  const sourceId1 = "507f1f77bcf86cd799439021";
  const storyId1 = "507f1f77bcf86cd799439031";
  const correctionId1 = "507f1f77bcf86cd799439051";

  const curatorUserDoc = {
    _id: curatorUserId,
    name: "Head Curator",
    email: "curator@example.com",
    role: "CURATOR",
    isEmailVerified: true,
  };

  const visitorUserDoc = {
    _id: visitorUserId,
    name: "Ordinary Visitor",
    email: "visitor@example.com",
    role: "VISITOR",
    isEmailVerified: true,
  };

  beforeEach(() => {
    memoryStore = new session.MemoryStore();
    app = createApp(memoryStore);

    // Test session helper
    app.post("/test-session", (req, res) => {
      req.session.userId = req.body.userId;
      req.session.save((err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true });
      });
    });

    // Mock User.findById
    User.findById = (id) => ({
      select: () => {
        if (id?.toString() === curatorUserId) return Promise.resolve(curatorUserDoc);
        if (id?.toString() === visitorUserId) return Promise.resolve(visitorUserDoc);
        return Promise.resolve(null);
      },
    });
  });

  afterEach(() => {
    User.findById = originalUserFindById;
    Place.create = originalPlaceCreate;
    Place.find = originalPlaceFind;
    Place.findById = originalPlaceFindById;
    Place.findByIdAndUpdate = originalPlaceFindByIdAndUpdate;
    Place.exists = originalPlaceExists;

    Source.create = originalSourceCreate;
    Source.find = originalSourceFind;
    Source.findById = originalSourceFindById;
    Source.findByIdAndUpdate = originalSourceFindByIdAndUpdate;

    Story.create = originalStoryCreate;
    Story.find = originalStoryFind;
    Story.findById = originalStoryFindById;
    Story.findByIdAndUpdate = originalStoryFindByIdAndUpdate;

    Correction.create = originalCorrectionCreate;
    Correction.find = originalCorrectionFind;
    Correction.findById = originalCorrectionFindById;

    EditorialReview.create = originalEditorialReviewCreate;
  });

  // Helper to create an authenticated supertest agent
  const createAgent = async (userId = curatorUserId) => {
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
  // 1. RBAC & PERMISSION ENFORCEMENT
  // =========================================================================
  describe("1. RBAC & Curator Route Protection", () => {
    it("should reject unauthenticated requests to curator endpoints with HTTP 401", async () => {
      const { agent } = await createAgent(null); // Unauthenticated
      const res = await agent.get("/api/curator/places");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should reject VISITOR account from curator endpoints with HTTP 403", async () => {
      const { agent } = await createAgent(visitorUserId);
      const res = await agent.get("/api/curator/places");

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  // =========================================================================
  // 2. HERITAGE PLACES MANAGEMENT
  // =========================================================================
  describe("2. Heritage Places Curator Management", () => {
    it("should allow a curator to create a new place with HTTP 201", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      Place.create = (doc) =>
        Promise.resolve({
          ...doc,
          _id: placeId1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const res = await agent
        .post("/api/curator/places")
        .set("x-csrf-token", csrfToken)
        .send({
          name: "Japali Hanuman Theertham",
          description: "Ancient shrine situated amidst serene forest hills.",
          zone: "Tirumala Outer Hills",
          themes: ["spiritual", "nature"],
          hoursVerification: "verified",
          estimatedVisitMinutes: 60,
          status: "pending",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Japali Hanuman Theertham");
      expect(res.body.data.status).toBe("pending");
    });

    it("should allow a curator to list all places regardless of status with HTTP 200", async () => {
      const { agent } = await createAgent(curatorUserId);

      const mockPlaces = [
        {
          _id: placeId1,
          name: "Pending Shrine",
          description: "Draft place under curator review",
          zone: "Tirumala Outer",
          themes: ["spiritual"],
          status: "pending",
          hoursVerification: "unverified",
        },
      ];

      Place.find = () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve(mockPlaces),
            }),
          }),
        }),
      });

      const res = await agent.get("/api/curator/places?status=pending");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe("pending");
    });

    it("should allow a curator to update place details with HTTP 200", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      Place.findByIdAndUpdate = () => ({
        lean: () =>
          Promise.resolve({
            _id: placeId1,
            name: "Updated Shrine Name",
            description: "Updated description",
            zone: "Tirumala Up-Hill",
            themes: ["history"],
            hoursVerification: "verified",
            status: "approved",
          }),
      });

      const res = await agent
        .patch(`/api/curator/places/${placeId1}`)
        .set("x-csrf-token", csrfToken)
        .send({
          name: "Updated Shrine Name",
          status: "approved",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Updated Shrine Name");
      expect(res.body.data.status).toBe("approved");
    });

    it("should return HTTP 404 when updating non-existent place", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      Place.findByIdAndUpdate = () => ({
        lean: () => Promise.resolve(null),
      });

      const res = await agent
        .patch(`/api/curator/places/${placeId1}`)
        .set("x-csrf-token", csrfToken)
        .send({ name: "Does Not Exist" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("PLACE_NOT_FOUND");
    });
  });

  // =========================================================================
  // 3. HERITAGE SOURCES MANAGEMENT & EDITORIAL REVIEW
  // =========================================================================
  describe("3. Heritage Sources & Review Decisions", () => {
    it("should create source metadata with HTTP 201", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      Source.create = (doc) =>
        Promise.resolve({
          ...doc,
          _id: sourceId1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const res = await agent
        .post("/api/curator/sources")
        .set("x-csrf-token", csrfToken)
        .send({
          title: "Epigraphia Indica Vol. 12",
          attribution: "Archaeological Survey of India",
          sourceType: "inscription",
          url: "https://asi.gov.in/epigraphia",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Epigraphia Indica Vol. 12");
      expect(res.body.data.status).toBe("pending");
      expect(res.body.data.uploadedBy).toBe(curatorUserId);
    });

    it("should reject source creation without url or filePath with HTTP 400", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      const res = await agent
        .post("/api/curator/sources")
        .set("x-csrf-token", csrfToken)
        .send({
          title: "Source Without Link Or File",
          attribution: "Unknown",
          sourceType: "book",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should record an approval review decision for a source with HTTP 200", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      const mockSource = {
        _id: sourceId1,
        title: "Epigraphia Indica Vol. 12",
        status: "pending",
        save: () => Promise.resolve(),
      };

      Source.findById = () => Promise.resolve(mockSource);
      EditorialReview.create = (doc) =>
        Promise.resolve({
          ...doc,
          _id: "507f1f77bcf86cd799439099",
          createdAt: new Date(),
        });

      const res = await agent
        .patch(`/api/curator/sources/${sourceId1}/review`)
        .set("x-csrf-token", csrfToken)
        .send({
          status: "approved",
          notes: "Verified against archival records.",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.source.status).toBe("approved");
      expect(res.body.data.review.decision).toBe("approved");
    });
  });

  // =========================================================================
  // 4. HERITAGE STORIES MANAGEMENT
  // =========================================================================
  describe("4. Heritage Stories Curator Management", () => {
    it("should allow a curator to create a story referencing valid place and sources", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      Place.exists = () => Promise.resolve(true);
      Source.find = () => ({
        lean: () => Promise.resolve([{ _id: sourceId1 }]),
      });

      Story.create = (doc) =>
        Promise.resolve({
          ...doc,
          _id: storyId1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const res = await agent
        .post("/api/curator/stories")
        .set("x-csrf-token", csrfToken)
        .send({
          placeId: placeId1,
          title: "Story of Ramanuja's Visit",
          content: "Acharya Ramanuja systematized the temple rituals in the 11th century.",
          sourceIds: [sourceId1],
          claimType: "historical",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Story of Ramanuja's Visit");
      expect(res.body.data.status).toBe("pending");
    });

    it("should reject story creation with non-existent place reference with HTTP 400", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      Place.exists = () => Promise.resolve(false); // Place does not exist

      const res = await agent
        .post("/api/curator/stories")
        .set("x-csrf-token", csrfToken)
        .send({
          placeId: placeId1,
          title: "Story referencing missing place",
          content: "Content",
          sourceIds: [sourceId1],
          claimType: "legend",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_PLACE_REFERENCE");
    });

    it("should record a rejection review decision on a story with HTTP 200", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      const mockStory = {
        _id: storyId1,
        title: "Unverified Folk Legend",
        status: "pending",
        save: () => Promise.resolve(),
      };

      Story.findById = () => Promise.resolve(mockStory);
      EditorialReview.create = (doc) =>
        Promise.resolve({
          ...doc,
          _id: "507f1f77bcf86cd799439098",
          createdAt: new Date(),
        });

      const res = await agent
        .patch(`/api/curator/stories/${storyId1}/review`)
        .set("x-csrf-token", csrfToken)
        .send({
          status: "rejected",
          notes: "Insufficient source attribution.",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.story.status).toBe("rejected");
      expect(res.body.data.review.decision).toBe("rejected");
    });
  });

  // =========================================================================
  // 5. USER-SUBMITTED CORRECTIONS WORKFLOW
  // =========================================================================
  describe("5. User-Submitted Corrections Workflow", () => {
    it("should allow an authenticated visitor to submit a correction with HTTP 201", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId);

      Place.exists = () => Promise.resolve(true);
      Correction.create = (doc) =>
        Promise.resolve({
          ...doc,
          _id: correctionId1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const res = await agent
        .post("/api/corrections")
        .set("x-csrf-token", csrfToken)
        .send({
          placeId: placeId1,
          description: "The museum opening hours changed from 9:00 AM to 8:30 AM on weekends.",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.placeId).toBe(placeId1);
      expect(res.body.data.submittedBy).toBe(visitorUserId);
      expect(res.body.data.status).toBe("pending");
    });

    it("should allow a curator to list pending corrections with HTTP 200", async () => {
      const { agent } = await createAgent(curatorUserId);

      const mockCorrections = [
        {
          _id: correctionId1,
          placeId: { _id: placeId1, name: "Museum", zone: "Tirumala" },
          submittedBy: { _id: visitorUserId, name: "Visitor", email: "visitor@example.com" },
          description: "Correction text",
          status: "pending",
        },
      ];

      Correction.find = () => ({
        populate: () => ({
          populate: () => ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  lean: () => Promise.resolve(mockCorrections),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await agent.get("/api/curator/corrections?status=pending");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe("pending");
    });

    it("should allow a curator to review and approve a correction with HTTP 200", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      const mockCorrection = {
        _id: correctionId1,
        description: "Hours update",
        status: "pending",
        reviewedBy: null,
        save: () => Promise.resolve(),
      };

      Correction.findById = () => Promise.resolve(mockCorrection);
      EditorialReview.create = (doc) =>
        Promise.resolve({
          ...doc,
          _id: "507f1f77bcf86cd799439097",
          createdAt: new Date(),
        });

      const res = await agent
        .patch(`/api/curator/corrections/${correctionId1}/review`)
        .set("x-csrf-token", csrfToken)
        .send({
          status: "approved",
          notes: "Confirmed with temple administration.",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.correction.status).toBe("approved");
      expect(res.body.data.correction.reviewedBy).toBe(curatorUserId);
      expect(res.body.data.review.decision).toBe("approved");
    });
  });
});
