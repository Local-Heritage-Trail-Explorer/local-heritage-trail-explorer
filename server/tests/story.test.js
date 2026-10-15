import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { Story } from "../models/story.model.js";
import { Place } from "../models/place.model.js";
import { Source } from "../models/source.model.js";
import app from "../server.js";

describe("P1 - GET /api/stories/:id", () => {
  const originalStoryFindOne = Story.findOne;
  const originalPlaceFindById = Place.findById;
  const originalSourceFind = Source.find;

  afterEach(() => {
    Story.findOne = originalStoryFindOne;
    Place.findById = originalPlaceFindById;
    Source.find = originalSourceFind;
  });

  const mockApprovedStory = {
    _id: "507f1f77bcf86cd799439021",
    placeId: "507f1f77bcf86cd799439011",
    title: "The Legend of Anjanadri",
    content: "Anjanadri hill is revered as the birthplace of Lord Hanuman.",
    sourceIds: ["507f1f77bcf86cd799439031", "507f1f77bcf86cd799439032"],
    claimType: "tradition",
    status: "approved",
  };

  const mockPlace = {
    _id: "507f1f77bcf86cd799439011",
    name: "Anjanadri Hill",
    status: "approved",
  };

  const mockApprovedSource = {
    _id: "507f1f77bcf86cd799439031",
    title: "Tirumala Sthala Purana",
    attribution: "TTD Publications",
    sourceType: "book",
    url: "https://example.com/purana",
    filePath: "/internal/docs/purana.pdf",
    status: "approved",
  };

  it("should return approved story with related place and approved sources", async () => {
    Story.findOne = (filter) => {
      expect(filter._id).toBe("507f1f77bcf86cd799439021");
      expect(filter.status).toBe("approved");
      return {
        lean: async () => mockApprovedStory,
      };
    };

    Place.findById = (id) => {
      expect(id).toBe("507f1f77bcf86cd799439011");
      return {
        lean: async () => mockPlace,
      };
    };

    Source.find = (filter) => {
      expect(filter.status).toBe("approved");
      return {
        lean: async () => [mockApprovedSource],
      };
    };

    const res = await request(app).get("/api/stories/507f1f77bcf86cd799439021");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toEqual({
      id: "507f1f77bcf86cd799439021",
      title: "The Legend of Anjanadri",
      content: "Anjanadri hill is revered as the birthplace of Lord Hanuman.",
      claimType: "tradition",
      place: {
        id: "507f1f77bcf86cd799439011",
        name: "Anjanadri Hill",
      },
      sources: [
        {
          id: "507f1f77bcf86cd799439031",
          title: "Tirumala Sthala Purana",
          attribution: "TTD Publications",
          sourceType: "book",
          url: "https://example.com/purana",
        },
      ],
      status: "approved",
    });
  });

  it("should exclude unapproved or draft sources from story response", async () => {
    Story.findOne = () => ({
      lean: async () => mockApprovedStory,
    });

    Place.findById = () => ({
      lean: async () => mockPlace,
    });

    Source.find = (filter) => {
      // Ensure source query strictly enforces status: "approved"
      expect(filter.status).toBe("approved");
      return {
        lean: async () => [mockApprovedSource],
      };
    };

    const res = await request(app).get("/api/stories/507f1f77bcf86cd799439021");

    expect(res.status).toBe(200);
    expect(res.body.data.sources.length).toBe(1);
    expect(res.body.data.sources[0].id).toBe("507f1f77bcf86cd799439031");
  });

  it("should return HTTP 400 for malformed story ID", async () => {
    const res = await request(app).get("/api/stories/invalid-id-123");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_ID");
  });

  it("should return HTTP 404 when story is not found or not approved", async () => {
    Story.findOne = () => ({
      lean: async () => null,
    });

    const res = await request(app).get("/api/stories/507f1f77bcf86cd799439099");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("STORY_NOT_FOUND");
  });

  it("should handle unexpected database errors safely with HTTP 500", async () => {
    Story.findOne = () => ({
      lean: async () => {
        throw new Error("Database timeout");
      },
    });

    const res = await request(app).get("/api/stories/507f1f77bcf86cd799439021");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
  });
});
