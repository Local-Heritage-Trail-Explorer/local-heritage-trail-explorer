import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { Source } from "../models/source.model.js";
import app from "../server.js";

describe("P1 - GET /api/sources/:id", () => {
  const originalSourceFindOne = Source.findOne;

  afterEach(() => {
    Source.findOne = originalSourceFindOne;
  });

  const mockApprovedSource = {
    _id: "507f1f77bcf86cd799439031",
    title: "Tirumala Sthala Purana",
    attribution: "TTD Publications",
    sourceType: "book",
    url: "https://example.com/sthala-purana",
    filePath: "/private/uploads/secret-file.pdf",
    status: "approved",
    uploadedBy: "507f1f77bcf86cd799439099",
    __v: 0,
  };

  it("should return approved source public metadata and omit sensitive internal fields", async () => {
    Source.findOne = (filter) => {
      expect(filter._id).toBe("507f1f77bcf86cd799439031");
      expect(filter.status).toBe("approved");
      return {
        lean: async () => mockApprovedSource,
      };
    };

    const res = await request(app).get("/api/sources/507f1f77bcf86cd799439031");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        id: "507f1f77bcf86cd799439031",
        title: "Tirumala Sthala Purana",
        attribution: "TTD Publications",
        sourceType: "book",
        url: "https://example.com/sthala-purana",
        status: "approved",
      },
      error: null,
    });

    // Ensure filePath, uploadedBy, _id, __v are strictly never exposed
    expect(res.body.data.filePath).toBeUndefined();
    expect(res.body.data.uploadedBy).toBeUndefined();
    expect(res.body.data._id).toBeUndefined();
    expect(res.body.data.__v).toBeUndefined();
  });

  it("should return HTTP 400 for malformed source ID", async () => {
    const res = await request(app).get("/api/sources/xyz123");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_ID");
  });

  it("should return HTTP 404 when source does not exist or is not approved", async () => {
    Source.findOne = () => ({
      lean: async () => null,
    });

    const res = await request(app).get("/api/sources/507f1f77bcf86cd799439099");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("SOURCE_NOT_FOUND");
  });

  it("should handle unexpected database errors safely with HTTP 500", async () => {
    Source.findOne = () => ({
      lean: async () => {
        throw new Error("Database query failed");
      },
    });

    const res = await request(app).get("/api/sources/507f1f77bcf86cd799439031");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
  });
});
