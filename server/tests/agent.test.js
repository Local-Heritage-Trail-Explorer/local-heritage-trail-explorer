import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import session from "express-session";
import { createApp } from "../server.js";
import { generateTrailPlan } from "../services/trail-agent.service.js";

describe("Trail Agent Service & API Tests", () => {
  let app;

  beforeAll(() => {
    const memoryStore = new session.MemoryStore();
    app = createApp(memoryStore);
  });

  it("should pass agent suite placeholder", () => {
    expect(true).toBe(true);
  });

  it("GET /api/trail-agent/status returns operational status", async () => {
    const res = await request(app).get("/api/trail-agent/status");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe("trail-agent");
    expect(res.body.data.status).toBe("operational");
  });

  it("POST /api/trail-agent/generate rejects unauthenticated requests with 401", async () => {
    // First get a CSRF token
    const tokenRes = await request(app).get("/api/csrf-token");
    const setCookies = tokenRes.headers["set-cookie"] || [];
    const xsrfCookie = setCookies.find((c) => c.startsWith("XSRF-TOKEN=")) || "";
    const token = tokenRes.body?.data?.csrfToken || xsrfCookie.split(";")[0].split("=")[1];

    const res = await request(app)
      .post("/api/trail-agent/generate")
      .set("Cookie", setCookies)
      .set("x-csrf-token", token)
      .send({ theme: "Ancient Temples", maxMinutes: 180 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("generateTrailPlan should create a structured trail plan with stops and narrative", async () => {
    const plan = await generateTrailPlan({
      theme: "Sacred Water Bodies",
      maxMinutes: 120,
    });

    expect(plan).toBeDefined();
    expect(plan).toHaveProperty("title");
    expect(plan).toHaveProperty("theme", "Sacred Water Bodies");
    expect(plan).toHaveProperty("estimatedMinutes");
    expect(plan.estimatedMinutes).toBeGreaterThan(0);
    expect(Array.isArray(plan.stops)).toBe(true);
    expect(plan.stops.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(plan.stopDetails)).toBe(true);
    expect(plan).toHaveProperty("narrative");
    expect(typeof plan.narrative).toBe("string");
  });
});
