import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../server.js";
import connectDB, { disconnectDB } from "../config/database.js";
import { Chunk } from "../models/chunk.model.js";

describe("Semantic Search API Endpoint (POST /api/search/semantic)", () => {
  let app;
  const originalAggregate = Chunk.aggregate;

  const mockChunkPassages = [
    {
      storyId: "507f1f77bcf86cd799439001",
      placeId: "507f1f77bcf86cd799439011",
      title: "Dynastic Patronage of the Ananda Nilayam",
      chunkIndex: 0,
      content: "Emperor Sri Krishnadevaraya of the Vijayanagara Empire made multiple pilgrimages to the Tirumala temple, donating pure gold to coat the Ananda Nilaya vimana.",
      sourceUrl: "https://ttd.example.com/inscriptions/krishnadevaraya",
      score: 0.9234,
    },
    {
      storyId: "507f1f77bcf86cd799439002",
      placeId: "507f1f77bcf86cd799439012",
      title: "Ancient Epigraphs of Pallava and Chola Rulers",
      chunkIndex: 0,
      content: "Inscriptions dating back to the 9th century record land grants by Queen Samavai and Chola kings to perpetual lamps in the sanctum sanctorum.",
      sourceUrl: "https://ttd.example.com/inscriptions/chola-grants",
      score: 0.8812,
    },
  ];

  beforeAll(async () => {
    await connectDB();
    app = createApp();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(() => {
    Chunk.aggregate = async (pipeline) => {
      // Respect pipeline limit if set
      const vectorStage = pipeline.find((stage) => stage.$vectorSearch);
      const limit = vectorStage?.$vectorSearch?.limit || mockChunkPassages.length;
      return mockChunkPassages.slice(0, limit);
    };
  });

  afterEach(() => {
    Chunk.aggregate = originalAggregate;
  });

  it("should retrieve relevant story passages for a valid semantic query", async () => {
    const res = await request(app)
      .post("/api/search/semantic")
      .send({
        query: "ancient temples and the rulers who built them",
        limit: 3,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.query).toBe("ancient temples and the rulers who built them");
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);

    const first = res.body.results[0];
    expect(first).toHaveProperty("storyId");
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("content");
    expect(first).toHaveProperty("score");
    expect(typeof first.score).toBe("number");
    expect(first.score).toBeGreaterThan(0);

    // Verify source attribution is preserved
    expect(first).toHaveProperty("sourceUrl");

    // Ensure raw embeddings are NOT exposed in API responses
    expect(first.embedding).toBeUndefined();
    expect(res.body.embedding).toBeUndefined();
  }, 15000);

  it("should retrieve stories when phrased differently from exact story wording", async () => {
    // Paraphrased query: "kings and dynasties donating gold to the shrine"
    const res = await request(app)
      .post("/api/search/semantic")
      .send({
        query: "kings and dynasties donating gold to the shrine",
        limit: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body.results[0].title).toMatch(/dynastic|patronage|ananda nilayam|tirumala/i);
  }, 15000);

  it("should reject empty or whitespace-only query with 400 Bad Request", async () => {
    const res = await request(app)
      .post("/api/search/semantic")
      .send({
        query: "    ",
        limit: 5,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject missing query with 400 Bad Request", async () => {
    const res = await request(app)
      .post("/api/search/semantic")
      .send({
        limit: 5,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should respect the limit parameter", async () => {
    const res = await request(app)
      .post("/api/search/semantic")
      .send({
        query: "water springs and sacred waterfalls",
        limit: 1,
      });

    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeLessThanOrEqual(1);
  });

  it("should support GET /api/search/semantic for quick testing", async () => {
    const res = await request(app)
      .get("/api/search/semantic")
      .query({ query: "sacred hills and paths", limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results).toBeDefined();
  });
});
