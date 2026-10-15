import { describe, it, expect } from "vitest";
import { validateVector } from "../config/ollama.js";
import {
  generateQueryEmbedding,
  generateChunkEmbedding,
} from "../services/embedding.service.js";

describe("Vector & Embedding Service", () => {
  it("should validate a valid 768-dimensional vector", () => {
    const validVector = new Array(768).fill(0.123);
    expect(() => validateVector(validVector, 768)).not.toThrow();
  });

  it("should reject vectors with incorrect dimensions", () => {
    const invalidShortVector = new Array(512).fill(0.1);
    expect(() => validateVector(invalidShortVector, 768)).toThrow(
      /dimension mismatch/i
    );

    const invalidLongVector = new Array(1536).fill(0.1);
    expect(() => validateVector(invalidLongVector, 768)).toThrow(
      /dimension mismatch/i
    );
  });

  it("should reject non-numeric or non-finite vector components", () => {
    const nanVector = new Array(768).fill(0.1);
    nanVector[10] = NaN;
    expect(() => validateVector(nanVector, 768)).toThrow(/invalid numeric value/i);

    const nullVector = new Array(768).fill(0.1);
    nullVector[5] = null;
    expect(() => validateVector(nullVector, 768)).toThrow(/invalid numeric value/i);

    const infinityVector = new Array(768).fill(0.1);
    infinityVector[2] = Infinity;
    expect(() => validateVector(infinityVector, 768)).toThrow(/invalid numeric value/i);
  });

  it("should generate a 768-dimension vector for search query via Ollama", async () => {
    const vector = await generateQueryEmbedding("Tirumala temple architecture");
    expect(Array.isArray(vector)).toBe(true);
    expect(vector).toHaveLength(768);
    expect(vector.every((val) => typeof val === "number" && Number.isFinite(val))).toBe(true);
  });

  it("should reject empty queries during embedding generation", async () => {
    await expect(generateQueryEmbedding("")).rejects.toThrow(/non-empty/i);
    await expect(generateQueryEmbedding("   ")).rejects.toThrow(/non-empty/i);
    await expect(generateChunkEmbedding(null)).rejects.toThrow(/non-empty/i);
  });
});
