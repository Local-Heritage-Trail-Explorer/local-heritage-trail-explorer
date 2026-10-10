import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { Place } from "../models/place.model.js";
import app from "../server.js";

describe("P1 - GET /api/places", () => {
  const originalFind = Place.find;

  afterEach(() => {
    Place.find = originalFind;
  });

  const mockPlacesData = [
    {
      _id: "507f1f77bcf86cd799439011",
      name: "Sri Venkateswara Museum",
      description: "A museum featuring heritage-related exhibits.",
      zone: "Tirumala Up-Hill",
      themes: ["art", "architecture"],
      openingHours: { open: "09:00", close: "18:00" },
      hoursVerification: "verified",
      estimatedVisitMinutes: 30,
      status: "approved",
      createdAt: new Date("2026-01-01T10:00:00Z"),
    },
    {
      _id: "507f1f77bcf86cd799439012",
      name: "Silathoranam",
      description: "Natural rock formation of great antiquity.",
      zone: "Tirumala Up-Hill",
      themes: ["geology", "nature"],
      openingHours: { open: "06:00", close: "18:00" },
      hoursVerification: "verified",
      estimatedVisitMinutes: 45,
      status: "approved",
      createdAt: new Date("2026-01-02T10:00:00Z"),
    },
    {
      _id: "507f1f77bcf86cd799439013",
      name: "Draft Temple Site",
      description: "Draft under curation.",
      zone: "Tirumala Up-Hill",
      themes: ["temple"],
      openingHours: {},
      hoursVerification: "unverified",
      estimatedVisitMinutes: 20,
      status: "draft",
      createdAt: new Date("2026-01-03T10:00:00Z"),
    },
    {
      _id: "507f1f77bcf86cd799439014",
      name: "Pending Site",
      description: "Pending verification.",
      zone: "Tirumala Up-Hill",
      themes: ["history"],
      openingHours: {},
      hoursVerification: "unverified",
      estimatedVisitMinutes: 25,
      status: "pending",
      createdAt: new Date("2026-01-04T10:00:00Z"),
    },
    {
      _id: "507f1f77bcf86cd799439015",
      name: "Rejected Site",
      description: "Rejected entry.",
      zone: "Tirumala Up-Hill",
      themes: ["history"],
      openingHours: {},
      hoursVerification: "unverified",
      estimatedVisitMinutes: 15,
      status: "rejected",
      createdAt: new Date("2026-01-05T10:00:00Z"),
    },
  ];

  const setupMockFind = (places = mockPlacesData) => {
    let capturedFilter = null;
    let capturedSkip = 0;
    let capturedLimit = 10;

    Place.find = function (filter) {
      capturedFilter = filter;
      return {
        sort: function () {
          return this;
        },
        skip: function (skipVal) {
          capturedSkip = skipVal;
          return this;
        },
        limit: function (limitVal) {
          capturedLimit = limitVal;
          return this;
        },
        lean: async function () {
          // Emulate MongoDB filtering: filter by status and optional theme
          let results = places.filter((p) => {
            if (capturedFilter.status && p.status !== capturedFilter.status) {
              return false;
            }
            if (capturedFilter.themes && !p.themes.includes(capturedFilter.themes)) {
              return false;
            }
            return true;
          });

          return results.slice(capturedSkip, capturedSkip + capturedLimit);
        },
      };
    };

    return {
      getFilter: () => capturedFilter,
      getSkip: () => capturedSkip,
      getLimit: () => capturedLimit,
    };
  };

  it("should return only approved places and map _id to id", async () => {
    const tracker = setupMockFind();

    const res = await request(app).get("/api/places");

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.error, null);
    assert.equal(Array.isArray(res.body.data), true);
    assert.equal(res.body.data.length, 2);

    // Verify filter explicitly queried status: "approved"
    assert.equal(tracker.getFilter().status, "approved");

    // All returned items must have status "approved" and no _id
    for (const place of res.body.data) {
      assert.equal(place.status, "approved");
      assert.equal(typeof place.id, "string");
      assert.equal(place._id, undefined);
      assert.equal(place.__v, undefined);
    }

    assert.equal(res.body.data[0].name, "Sri Venkateswara Museum");
    assert.equal(res.body.data[1].name, "Silathoranam");
  });

  it("should exclude draft, pending, and rejected records", async () => {
    setupMockFind();

    const res = await request(app).get("/api/places");

    assert.equal(res.status, 200);
    const names = res.body.data.map((p) => p.name);
    assert.equal(names.includes("Draft Temple Site"), false);
    assert.equal(names.includes("Pending Site"), false);
    assert.equal(names.includes("Rejected Site"), false);
  });

  it("should filter places by theme when theme parameter is provided", async () => {
    const tracker = setupMockFind();

    const res = await request(app).get("/api/places?theme=art");

    assert.equal(res.status, 200);
    assert.equal(tracker.getFilter().themes, "art");
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].name, "Sri Venkateswara Museum");
  });

  it("should return an empty array if no approved places match", async () => {
    setupMockFind();

    const res = await request(app).get("/api/places?theme=nonexistent");

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      success: true,
      data: [],
      error: null,
    });
  });

  it("should handle pagination with page and limit", async () => {
    const tracker = setupMockFind();

    const res = await request(app).get("/api/places?page=2&limit=1");

    assert.equal(res.status, 200);
    assert.equal(tracker.getSkip(), 1);
    assert.equal(tracker.getLimit(), 1);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].name, "Silathoranam");
  });

  it("should reject invalid page parameter with HTTP 400", async () => {
    setupMockFind();

    const res = await request(app).get("/api/places?page=0");

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  it("should reject negative or non-numeric limit with HTTP 400", async () => {
    setupMockFind();

    const res = await request(app).get("/api/places?limit=abc");

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  it("should reject limit exceeding maximum (100) with HTTP 400", async () => {
    setupMockFind();

    const res = await request(app).get("/api/places?limit=150");

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  it("should handle database errors gracefully with HTTP 500", async () => {
    Place.find = function () {
      return {
        sort: function () {
          return this;
        },
        skip: function () {
          return this;
        },
        limit: function () {
          return this;
        },
        lean: async function () {
          throw new Error("Simulated database failure");
        },
      };
    };

    const res = await request(app).get("/api/places");

    assert.equal(res.status, 500);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, "INTERNAL_SERVER_ERROR");
    assert.equal(res.body.error.message, "Simulated database failure");
  });
});
