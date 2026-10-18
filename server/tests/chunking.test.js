import { describe, it, expect } from "vitest";
import { splitTextIntoChunks, chunkStory } from "../services/chunking.service.js";

describe("Document Chunking Service", () => {
  it("should return an empty array for empty or whitespace text", () => {
    expect(splitTextIntoChunks("")).toEqual([]);
    expect(splitTextIntoChunks("   \n\t  ")).toEqual([]);
    expect(splitTextIntoChunks(null)).toEqual([]);
    expect(splitTextIntoChunks(undefined)).toEqual([]);
  });

  it("should return a single chunk if text is within chunkSize", () => {
    const text = "Tirumala is located in the Seshachalam Hills.";
    const chunks = splitTextIntoChunks(text, { chunkSize: 200, chunkOverlap: 50 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it("should split long text into overlapping chunks", () => {
    const longText =
      "Sentence one describes the ancient hill shrine. " +
      "Sentence two details the contributions of the Chola empire. " +
      "Sentence three explains the golden plating of Ananda Nilayam. " +
      "Sentence four discusses the modern walking trails and pilgrimage routes.";

    const chunks = splitTextIntoChunks(longText, { chunkSize: 100, chunkOverlap: 30 });
    expect(chunks.length).toBeGreaterThan(1);

    // Verify all chunks are non-empty and trimmed
    chunks.forEach((chunk) => {
      expect(typeof chunk).toBe("string");
      expect(chunk.length).toBeGreaterThan(0);
      expect(chunk).toBe(chunk.trim());
    });
  });

  it("should preserve full metadata when chunking a story document", () => {
    const mockStory = {
      _id: "6acfbc283f9f1331e8890580",
      placeId: "6acfbc273f9f1331e889053b",
      title: "Dynastic Patronage of the Tirumala Temple",
      content:
        "Epigraphical stone inscriptions recorded on the walls of the Sri Venkateswara Swamy Temple document more than a thousand years of continuous dynastic patronage. Endowments came from the Pallavas, Cholas, and Vijayanagara emperors.",
      sourceIds: ["6acfbc273f9f1331e8890529"],
      status: "approved",
    };

    const chunks = chunkStory(mockStory, {
      chunkSize: 100,
      chunkOverlap: 20,
      sourceUrl: "https://www.tirumala.org/",
    });

    expect(chunks.length).toBeGreaterThan(0);
    chunks.forEach((chunk, index) => {
      expect(chunk.storyId).toBe(mockStory._id);
      expect(chunk.placeId).toBe(mockStory.placeId);
      expect(chunk.title).toBe(mockStory.title);
      expect(chunk.chunkIndex).toBe(index);
      expect(chunk.sourceUrl).toBe("https://www.tirumala.org/");
      expect(chunk.sourceIds).toContain("6acfbc273f9f1331e8890529");
      expect(chunk.approvalStatus).toBe("approved");
      expect(chunk.content.length).toBeGreaterThan(0);
    });
  });

  it("should handle stories with missing content gracefully", () => {
    const emptyStory = {
      _id: "6acfbc283f9f1331e8890581",
      title: "Empty Story",
      content: "",
      sourceIds: [],
    };

    const chunks = chunkStory(emptyStory);
    expect(chunks).toEqual([]);
  });
});
