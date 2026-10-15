import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import session from "express-session";
import { createApp } from "../server.js";
import { User } from "../models/user.model.js";
import { Place } from "../models/place.model.js";
import { Trail } from "../models/trail.model.js";
import { Correction } from "../models/correction.model.js";
import { TrailFeedback } from "../models/trail-feedback.model.js";
import { EditorialReview } from "../models/editorial-review.model.js";

describe("P7 — Corrections and Feedback APIs Tests", () => {
  let app;
  let memoryStore;

  const originalUserFindById = User.findById;
  const originalPlaceExists = Place.exists;
  const originalPlaceFindById = Place.findById;
  const originalPlaceFindByIdAndUpdate = Place.findByIdAndUpdate;

  const originalTrailFindById = Trail.findById;
  const originalCorrectionCreate = Correction.create;
  const originalCorrectionFind = Correction.find;
  const originalCorrectionFindById = Correction.findById;

  const originalTrailFeedbackCreate = TrailFeedback.create;
  const originalTrailFeedbackFind = TrailFeedback.find;
  const originalTrailFeedbackFindById = TrailFeedback.findById;

  const originalEditorialReviewCreate = EditorialReview.create;

  const curatorUserId = "507f1f77bcf86cd799439071";
  const visitorUserId1 = "507f1f77bcf86cd799439072";
  const visitorUserId2 = "507f1f77bcf86cd799439073";

  const placeId1 = "507f1f77bcf86cd799439011";
  const trailId1 = "507f1f77bcf86cd799439041";
  const publicTrailId = "507f1f77bcf86cd799439042";
  const correctionId1 = "507f1f77bcf86cd799439051";
  const feedbackId1 = "507f1f77bcf86cd799439061";

  const curatorUserDoc = {
    _id: curatorUserId,
    name: "Head Curator",
    email: "curator@example.com",
    role: "CURATOR",
    isEmailVerified: true,
  };

  const visitor1UserDoc = {
    _id: visitorUserId1,
    name: "Visitor One",
    email: "visitor1@example.com",
    role: "VISITOR",
    isEmailVerified: true,
  };

  const visitor2UserDoc = {
    _id: visitorUserId2,
    name: "Visitor Two",
    email: "visitor2@example.com",
    role: "VISITOR",
    isEmailVerified: true,
  };

  const mockPrivateTrail = {
    _id: trailId1,
    ownerId: visitorUserId1,
    title: "Visitor 1 Private Sacred Trail",
    theme: "spiritual",
    stops: [placeId1],
    estimatedMinutes: 60,
    status: "active",
    visibility: "private",
  };

  const mockPublicTrail = {
    _id: publicTrailId,
    ownerId: curatorUserId,
    title: "Public Tirumala Heritage Trail",
    theme: "heritage",
    stops: [placeId1],
    estimatedMinutes: 90,
    status: "active",
    visibility: "public",
  };

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
        if (idStr === visitorUserId1) return Promise.resolve(visitor1UserDoc);
        if (idStr === visitorUserId2) return Promise.resolve(visitor2UserDoc);
        return Promise.resolve(null);
      },
    });
  });

  afterEach(() => {
    User.findById = originalUserFindById;
    Place.exists = originalPlaceExists;
    Place.findById = originalPlaceFindById;
    Place.findByIdAndUpdate = originalPlaceFindByIdAndUpdate;

    Trail.findById = originalTrailFindById;
    Correction.create = originalCorrectionCreate;
    Correction.find = originalCorrectionFind;
    Correction.findById = originalCorrectionFindById;

    TrailFeedback.create = originalTrailFeedbackCreate;
    TrailFeedback.find = originalTrailFeedbackFind;
    TrailFeedback.findById = originalTrailFeedbackFindById;

    EditorialReview.create = originalEditorialReviewCreate;
  });

  // Helper to create authenticated agent with CSRF token
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
  // 1. CORRECTIONS SUBMISSION & VALIDATION
  // =========================================================================
  describe("1. Correction Submission", () => {
    it("Requirement 1: Unauthenticated correction submission is rejected with HTTP 401", async () => {
      const { agent, csrfToken } = await createAgent(null); // Unauthenticated

      const res = await agent
        .post("/api/corrections")
        .set("x-csrf-token", csrfToken)
        .send({
          placeId: placeId1,
          description: "Museum hours changed from 9:00 AM to 8:30 AM.",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("Requirement 2: Valid authenticated correction submission succeeds with HTTP 201", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId1);

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
      expect(res.body.data.id).toBe(correctionId1);
      expect(res.body.data.placeId).toBe(placeId1);
      expect(res.body.data.submittedBy).toBe(visitorUserId1);
      expect(res.body.data.status).toBe("pending");
      expect(res.body.data.description).toContain("museum opening hours");
    });

    it("Requirement 3: Invalid correction payload is rejected with HTTP 400", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId1);

      // Too short description (< 5 characters)
      const res = await agent
        .post("/api/corrections")
        .set("x-csrf-token", csrfToken)
        .send({
          placeId: placeId1,
          description: "Hi",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("Requirement 4: Missing or invalid target resource is handled correctly with HTTP 400", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId1);

      // Target place does not exist in DB
      Place.exists = () => Promise.resolve(false);

      const res = await agent
        .post("/api/corrections")
        .set("x-csrf-token", csrfToken)
        .send({
          placeId: placeId1,
          description: "Reporting a non-existent heritage place record.",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_PLACE_REFERENCE");

      // Malformed placeId
      const malformedRes = await agent
        .post("/api/corrections")
        .set("x-csrf-token", csrfToken)
        .send({
          placeId: "malformed-id-123",
          description: "Reporting a malformed place ID.",
        });

      expect(malformedRes.status).toBe(400);
      expect(malformedRes.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("Allows authenticated user to retrieve their submitted corrections via GET /api/corrections/mine", async () => {
      const { agent } = await createAgent(visitorUserId1);

      const mockUserCorrections = [
        {
          _id: correctionId1,
          placeId: { _id: placeId1, name: "Museum", zone: "Tirumala Up-Hill" },
          submittedBy: visitorUserId1,
          description: "Hours update",
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      Correction.find = (filter) => {
        expect(filter.submittedBy).toBe(visitorUserId1);
        return {
          populate: () => ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  lean: () => Promise.resolve(mockUserCorrections),
                }),
              }),
            }),
          }),
        };
      };

      const res = await agent.get("/api/corrections/mine");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(correctionId1);
      expect(res.body.data[0].place.name).toBe("Museum");
    });
  });

  // =========================================================================
  // 2. CORRECTIONS REVIEW & APPLICATION
  // =========================================================================
  describe("2. Corrections Review & Application", () => {
    it("Requirement 5: Ordinary users cannot review corrections (HTTP 403)", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId1); // VISITOR role

      const res = await agent
        .patch(`/api/curator/corrections/${correctionId1}/review`)
        .set("x-csrf-token", csrfToken)
        .send({ status: "approved" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("Requirement 6: Authorized curators can review corrections (HTTP 200)", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId); // CURATOR role

      const mockCorrection = {
        _id: correctionId1,
        placeId: placeId1,
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
          notes: "Verified with temple administration.",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.correction.status).toBe("approved");
      expect(res.body.data.correction.reviewedBy).toBe(curatorUserId);
      expect(res.body.data.review.decision).toBe("approved");
    });

    it("Requirement 7: Invalid review decisions are rejected with HTTP 400", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      const res = await agent
        .patch(`/api/curator/corrections/${correctionId1}/review`)
        .set("x-csrf-token", csrfToken)
        .send({ status: "invalid_status" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("Requirement 8: Missing correction IDs return HTTP 404", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      Correction.findById = () => Promise.resolve(null); // Not found

      const res = await agent
        .patch(`/api/curator/corrections/${correctionId1}/review`)
        .set("x-csrf-token", csrfToken)
        .send({ status: "approved" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CORRECTION_NOT_FOUND");
    });

    it("Requirement 9: Approved correction application updates only permitted fields safely", async () => {
      const { agent, csrfToken } = await createAgent(curatorUserId);

      const mockCorrection = {
        _id: correctionId1,
        placeId: placeId1,
        description: "Updated opening hours description",
        status: "pending",
        save: () => Promise.resolve(),
      };

      Correction.findById = () => Promise.resolve(mockCorrection);
      EditorialReview.create = (doc) =>
        Promise.resolve({
          ...doc,
          _id: "507f1f77bcf86cd799439097",
          createdAt: new Date(),
        });

      let capturedUpdate = null;
      Place.findByIdAndUpdate = (id, update) => {
        capturedUpdate = update;
        return {
          lean: () =>
            Promise.resolve({
              _id: placeId1,
              name: "Sri Venkateswara Museum",
              description: "Updated description with new hours",
              zone: "Tirumala Up-Hill",
              themes: ["art"],
              openingHours: { open: "08:30", close: "18:00" },
              hoursVerification: "verified",
              status: "approved",
            }),
        };
      };

      const res = await agent
        .patch(`/api/curator/corrections/${correctionId1}/review`)
        .set("x-csrf-token", csrfToken)
        .send({
          status: "approved",
          notes: "Approved and applying verified changes.",
          appliedPlaceUpdates: {
            description: "Updated description with new hours",
            hoursVerification: "verified",
            openingHours: { open: "08:30", close: "18:00" },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.correction.status).toBe("approved");
      expect(res.body.data.place).toBeDefined();
      expect(res.body.data.place.description).toBe("Updated description with new hours");
      expect(res.body.data.place.hoursVerification).toBe("verified");

      // Verify that update was restricted to permitted fields only
      expect(capturedUpdate.$set).toHaveProperty("description");
      expect(capturedUpdate.$set).toHaveProperty("hoursVerification");
      expect(capturedUpdate.$set).not.toHaveProperty("_id");
      expect(capturedUpdate.$set).not.toHaveProperty("status");
    });
  });

  // =========================================================================
  // 3. TRAIL FEEDBACK SUBMISSION
  // =========================================================================
  describe("3. Trail Feedback Submission", () => {
    it("Requirement 10: Unauthenticated trail feedback submission is rejected with HTTP 401", async () => {
      const { agent, csrfToken } = await createAgent(null); // Unauthenticated

      const res = await agent
        .post(`/api/trails/${publicTrailId}/feedback`)
        .set("x-csrf-token", csrfToken)
        .send({ description: "Great public trail with well marked paths!" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("Requirement 11: Valid feedback submission succeeds with HTTP 201", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId1);

      Trail.findById = () => ({
        lean: () => Promise.resolve(mockPublicTrail),
      });

      TrailFeedback.create = (doc) =>
        Promise.resolve({
          ...doc,
          _id: feedbackId1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      const res = await agent
        .post(`/api/trails/${publicTrailId}/feedback`)
        .set("x-csrf-token", csrfToken)
        .send({
          description: "Informative trail markers and peaceful atmosphere throughout.",
          rating: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(feedbackId1);
      expect(res.body.data.trailId).toBe(publicTrailId);
      expect(res.body.data.submittedBy).toBe(visitorUserId1);
      expect(res.body.data.status).toBe("pending");
      expect(res.body.data.description).toContain("Informative trail markers");
    });

    it("Requirement 12: Invalid feedback payload/rating is rejected with HTTP 400", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId1);

      // Empty description
      const emptyDescRes = await agent
        .post(`/api/trails/${publicTrailId}/feedback`)
        .set("x-csrf-token", csrfToken)
        .send({ description: "" });

      expect(emptyDescRes.status).toBe(400);
      expect(emptyDescRes.body.error.code).toBe("VALIDATION_ERROR");

      // Invalid rating boundary (> 5)
      const invalidRatingRes = await agent
        .post(`/api/trails/${publicTrailId}/feedback`)
        .set("x-csrf-token", csrfToken)
        .send({
          description: "Rating is out of valid range",
          rating: 10,
        });

      expect(invalidRatingRes.status).toBe(400);
      expect(invalidRatingRes.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("Requirement 13: Feedback cannot be submitted against an inaccessible private trail (HTTP 403)", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId2); // Visitor 2 is NOT owner of Visitor 1's trail

      Trail.findById = () => ({
        lean: () => Promise.resolve(mockPrivateTrail), // Owned by visitorUserId1
      });

      const res = await agent
        .post(`/api/trails/${trailId1}/feedback`)
        .set("x-csrf-token", csrfToken)
        .send({ description: "Attempting to submit feedback on someone else's private trail." });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("Requirement 14: Users cannot modify another user's feedback (HTTP 403)", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId2); // Visitor 2

      const mockFeedbackDoc = {
        _id: feedbackId1,
        trailId: trailId1,
        submittedBy: visitorUserId1, // Owned by Visitor 1
        description: "Original feedback by Visitor 1",
        status: "pending",
        save: () => Promise.resolve(),
      };

      TrailFeedback.findById = () => Promise.resolve(mockFeedbackDoc);

      const res = await agent
        .patch(`/api/trails/${trailId1}/feedback/${feedbackId1}`)
        .set("x-csrf-token", csrfToken)
        .send({ description: "Malicious attempt to alter another visitor's feedback." });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("Allows feedback owner to update their own feedback with HTTP 200", async () => {
      const { agent, csrfToken } = await createAgent(visitorUserId1); // Visitor 1 is owner

      const mockFeedbackDoc = {
        _id: feedbackId1,
        trailId: trailId1,
        submittedBy: visitorUserId1,
        description: "Original feedback",
        status: "pending",
        save: () => Promise.resolve(),
      };

      TrailFeedback.findById = () => Promise.resolve(mockFeedbackDoc);

      const res = await agent
        .patch(`/api/trails/${trailId1}/feedback/${feedbackId1}`)
        .set("x-csrf-token", csrfToken)
        .send({ description: "Updated feedback with extra details after second visit." });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toContain("Updated feedback with extra details");
    });
  });

  // =========================================================================
  // 4. TRAIL FEEDBACK REVIEW & PRIVACY
  // =========================================================================
  describe("4. Trail Feedback Moderation & Privacy", () => {
    it("Requirement 15: Feedback review authorization is enforced (HTTP 401 unauthenticated, HTTP 403 visitor)", async () => {
      // 1. Unauthenticated request to curator feedback review
      const { agent: unauthAgent, csrfToken: unauthCsrf } = await createAgent(null);
      const unauthRes = await unauthAgent
        .patch(`/api/curator/feedback/${feedbackId1}/review`)
        .set("x-csrf-token", unauthCsrf)
        .send({ status: "approved" });

      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe("UNAUTHORIZED");

      // 2. Ordinary visitor request to curator feedback review
      const { agent: visitorAgent, csrfToken: visitorCsrf } = await createAgent(visitorUserId1);
      const visitorRes = await visitorAgent
        .patch(`/api/curator/feedback/${feedbackId1}/review`)
        .set("x-csrf-token", visitorCsrf)
        .send({ status: "approved" });

      expect(visitorRes.status).toBe(403);
      expect(visitorRes.body.error.code).toBe("FORBIDDEN");

      // 3. Authorized curator review succeeds
      const { agent: curatorAgent, csrfToken: curatorCsrf } = await createAgent(curatorUserId);
      const mockFeedback = {
        _id: feedbackId1,
        trailId: publicTrailId,
        submittedBy: visitorUserId1,
        description: "Helpful feedback",
        status: "pending",
        save: () => Promise.resolve(),
      };

      TrailFeedback.findById = () => Promise.resolve(mockFeedback);
      EditorialReview.create = (doc) =>
        Promise.resolve({
          ...doc,
          _id: "507f1f77bcf86cd799439096",
          createdAt: new Date(),
        });

      const curatorRes = await curatorAgent
        .patch(`/api/curator/feedback/${feedbackId1}/review`)
        .set("x-csrf-token", curatorCsrf)
        .send({ status: "approved", notes: "Moderated and approved" });

      expect(curatorRes.status).toBe(200);
      expect(curatorRes.body.success).toBe(true);
      expect(curatorRes.body.data.feedback.status).toBe("approved");
      expect(curatorRes.body.data.review.decision).toBe("approved");
    });

    it("Curator can list feedback across trails with HTTP 200", async () => {
      const { agent } = await createAgent(curatorUserId);

      const mockFeedbacks = [
        {
          _id: feedbackId1,
          trailId: { _id: publicTrailId, title: "Tirumala Trail", visibility: "public" },
          submittedBy: { _id: visitorUserId1, name: "Visitor One", email: "visitor1@example.com" },
          description: "Feedback text",
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      TrailFeedback.find = () => ({
        populate: () => ({
          populate: () => ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  lean: () => Promise.resolve(mockFeedbacks),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await agent.get("/api/curator/feedback?status=pending");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].trail.title).toBe("Tirumala Trail");
      expect(res.body.data[0].submittedBy.name).toBe("Visitor One");
    });

    it("Requirement 16: Public responses do not expose private trail history or sensitive user information", async () => {
      const { agent } = await createAgent(visitorUserId1);

      Trail.findById = () => ({
        lean: () => Promise.resolve(mockPublicTrail),
      });

      const mockTrailFeedbacks = [
        {
          _id: feedbackId1,
          trailId: publicTrailId,
          description: "Splendid trail with beautiful historical stops.",
          status: "approved",
          submittedBy: {
            _id: visitorUserId2,
            name: "Visitor Two",
            // Notice: email, passwordHash, tokens, etc. must NOT be in public projection
          },
          createdAt: new Date(),
        },
      ];

      TrailFeedback.find = () => ({
        populate: (field, select) => {
          // Verify that population only selects name
          expect(field).toBe("submittedBy");
          expect(select).toBe("name");
          return {
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  lean: () => Promise.resolve(mockTrailFeedbacks),
                }),
              }),
            }),
          };
        },
      });

      const res = await agent.get(`/api/trails/${publicTrailId}/feedback`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);

      const item = res.body.data[0];
      expect(item.submittedBy).toBeDefined();
      expect(item.submittedBy.name).toBe("Visitor Two");

      // Verify strict privacy guarantees
      expect(item.submittedBy.email).toBeUndefined();
      expect(item.submittedBy.passwordHash).toBeUndefined();
      expect(item.submittedBy.verificationTokenHash).toBeUndefined();
      expect(item.submittedBy.resetPasswordTokenHash).toBeUndefined();
      expect(item.visitTimestamps).toBeUndefined();
      expect(item.completedPlaceIds).toBeUndefined();
    });
  });
});
