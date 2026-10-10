import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import app from "../server.js";

describe("P0 - GET /api/health", () => {
  const originalReadyState = Object.getOwnPropertyDescriptor(mongoose.connection, "readyState");

  afterEach(() => {
    if (originalReadyState) {
      Object.defineProperty(mongoose.connection, "readyState", originalReadyState);
    }
  });

  it("should return HTTP 200 with healthy status when MongoDB is connected", async () => {
    Object.defineProperty(mongoose.connection, "readyState", {
      value: 1,
      configurable: true,
    });

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        status: "healthy",
        database: "connected",
      },
      error: null,
    });
  });

  it("should return HTTP 503 with unhealthy status when MongoDB is disconnected", async () => {
    Object.defineProperty(mongoose.connection, "readyState", {
      value: 0,
      configurable: true,
    });

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      success: false,
      data: {
        status: "unhealthy",
        database: "disconnected",
      },
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Database connection is unavailable.",
      },
    });
  });

  it("should not expose database credentials, connection strings or sensitive information", async () => {
    Object.defineProperty(mongoose.connection, "readyState", {
      value: 0,
      configurable: true,
    });

    const res = await request(app).get("/api/health");
    const responseText = JSON.stringify(res.body);

    expect(responseText.includes("mongodb")).toBe(false);
    expect(responseText.includes("password")).toBe(false);
    expect(responseText.includes("cluster")).toBe(false);
    expect(responseText.includes("stack")).toBe(false);
  });
});
