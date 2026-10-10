import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
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
      assert.equal(filter._id, "507f1f77bcf86cd799439031");
      assert.equal(filter.status, "approved");
      return {
        lean: async () => mockApprovedSource,
      };
    };

    const res = await request(app).get("/api/sources/507f1f77bcf86cd799439031");

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
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
    assert.equal(res.body.data.filePath, undefined);
    assert.equal(res.body.data.uploadedBy, undefined);
    assert.equal(res.body.data._id, undefined);
    assert.equal(res.body.data.__v, undefined);
  });

  it("should return HTTP 400 for malformed source ID", async () => {
    const res = await request(app).get("/api/sources/xyz123");

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "INVALID_ID");
  });

  it("should return HTTP 404 when source does not exist or is not approved", async () => {
    Source.findOne = () => ({
      lean: async () => null,
    });

    const res = await request(app).get("/api/sources/507f1f77bcf86cd799439099");

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "SOURCE_NOT_FOUND");
  });

  it("should handle unexpected database errors safely with HTTP 500", async () => {
    Source.findOne = () => ({
      lean: async () => {
        throw new Error("Database query failed");
      },
    });

    const res = await request(app).get("/api/sources/507f1f77bcf86cd799439031");

    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "INTERNAL_SERVER_ERROR");
  });
});
