import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import { StaffInvitation } from "../models/staff-invitation.model.js";
import { Trail } from "../models/trail.model.js";
import { TrailFeedback } from "../models/trail-feedback.model.js";
import { Chunk } from "../models/chunk.model.js";
import { Place } from "../models/place.model.js";
import { calculateTrail } from "../tools/calculate-trail.tool.js";
import { checkVisitingHours } from "../tools/check-visiting-hours.tool.js";
import { validateVector } from "../config/ollama.js";
import { extractTextFromBuffer } from "../services/text-extraction.service.js";
import { chunkStory } from "../services/chunking.service.js";
import { getTrailProgress } from "../services/trail.service.js";
import { VisitProgress } from "../models/visit-progress.model.js";

describe("TEST-001: Integration Boundaries & Database Schema Integrity", () => {
  // =========================================================================
  // 1. Database Index Definition & Schema Boundaries (DB-001, DB-002)
  // =========================================================================
  describe("Database Indexes & Model Specifications", () => {
    it("DB-001: StaffInvitation defines clean index on email and single unique tokenHash without duplicate warnings", () => {
      const indexes = StaffInvitation.schema.indexes();
      // Look for schema-level indexes
      const emailIndex = indexes.find(([fields]) => fields.email === 1);
      expect(emailIndex).toBeDefined();

      // Ensure exactly ONE index on tokenHash exists across the entire schema (no duplicates)
      const tokenHashIndexes = indexes.filter(
        ([fields]) => fields.tokenHash === 1
      );
      expect(tokenHashIndexes).toHaveLength(1);

      // Field-level unique index on tokenHash
      const tokenHashPath = StaffInvitation.schema.path("tokenHash");
      expect(tokenHashPath.options.unique).toBe(true);
      expect(tokenHashPath.options.required).toBeDefined();
    });

    it("DB-002: Trail model defines compound indexes for owner queries and public browsing", () => {
      const indexes = Trail.schema.indexes();
      
      const ownerIndex = indexes.find(
        ([fields]) => fields.ownerId === 1 && fields.createdAt === -1
      );
      expect(ownerIndex).toBeDefined();

      const publicBrowsingIndex = indexes.find(
        ([fields]) => fields.visibility === 1 && fields.status === 1 && fields.createdAt === -1
      );
      expect(publicBrowsingIndex).toBeDefined();

      const statusIndex = indexes.find(
        ([fields]) => fields.status === 1 && fields.createdAt === -1
      );
      expect(statusIndex).toBeDefined();
    });

    it("DB-002: TrailFeedback model defines foreign key and status indexes for moderation", () => {
      const indexes = TrailFeedback.schema.indexes();

      const trailIndex = indexes.find(
        ([fields]) => fields.trailId === 1 && fields.createdAt === -1
      );
      expect(trailIndex).toBeDefined();

      const statusIndex = indexes.find(
        ([fields]) => fields.status === 1 && fields.createdAt === -1
      );
      expect(statusIndex).toBeDefined();

      const submitterIndex = indexes.find(
        ([fields]) => fields.submittedBy === 1 && fields.createdAt === -1
      );
      expect(submitterIndex).toBeDefined();
    });
  });

  // =========================================================================
  // 2. Vector Search Pipeline & Embedding Boundaries (VEC-001, VEC-002)
  // =========================================================================
  describe("Vector Search & Embedding Verification Boundaries", () => {
    it("validates 768-dimensional normalized vectors strictly for Atlas Vector Search", () => {
      const validVector = new Array(768).fill(0.005);
      expect(validateVector(validVector, 768)).toBe(true);

      // Dimension mismatch
      expect(() => validateVector(new Array(512).fill(0.1), 768)).toThrow(
        /dimension mismatch/i
      );

      // Non-finite or NaN
      const nanVector = new Array(768).fill(0.1);
      nanVector[50] = NaN;
      expect(() => validateVector(nanVector, 768)).toThrow(/invalid numeric value/i);
    });

    it("VEC-001: chunkStory segments text and generates approved chunk payloads with proper metadata", () => {
      const mockStory = {
        _id: new mongoose.Types.ObjectId("660c00000000000000000041"),
        title: "Chola Epigraphs of Tirumala",
        content:
          "In the reign of Rajendra Chola I, multiple endowments were made to maintain perpetual lamps in the sanctum. " +
          "Stone inscriptions on the north base of the vimana enumerate the cattle gifted by local chieftains. " +
          "These records provide primary historical chronology for early medieval temple administration.",
        placeId: new mongoose.Types.ObjectId("660c00000000000000000001"),
      };

      const chunks = chunkStory(mockStory, {
        sourceUrl: "https://ttd.example.com/chola-epigraphs.pdf",
      });

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(0);

      const firstChunk = chunks[0];
      expect(firstChunk).toHaveProperty("storyId", mockStory._id);
      expect(firstChunk).toHaveProperty("title", mockStory.title);
      expect(firstChunk).toHaveProperty("approvalStatus", "approved");
      expect(firstChunk).toHaveProperty("sourceUrl", "https://ttd.example.com/chola-epigraphs.pdf");
      expect(typeof firstChunk.content).toBe("string");
      expect(firstChunk.content.length).toBeGreaterThan(20);
    });
  });

  // =========================================================================
  // 3. Realistic Route Feasibility & Timezone Boundaries (AGENT-003, AGENT-004)
  // =========================================================================
  describe("AI Agent Deterministic Route & Timezone Feasibility", () => {
    it("AGENT-003: calculateTrail enforces 180-min walk penalty for cross-zone stops without direct path", async () => {
      const hillStop = {
        _id: new mongoose.Types.ObjectId("660c00000000000000000001"),
        name: "Sri Venkateswara Temple",
        zone: "Tirumala Hills",
        estimatedVisitMinutes: 30,
      };

      const distantStop = {
        _id: new mongoose.Types.ObjectId("660c00000000000000000005"),
        name: "Chandragiri Fort",
        zone: "Chandragiri",
        estimatedVisitMinutes: 40,
      };

      // Mock Place.find to return our test places
      const originalFind = Place.find;
      Place.find = () => ({
        lean: () => Promise.resolve([hillStop, distantStop]),
      });

      try {
        const result = await calculateTrail({
          placeIds: [hillStop._id.toString(), distantStop._id.toString()],
          maxMinutes: 90, // 90 min budget cannot fit cross-zone walk
        });

        // Chandragiri is in a distant zone without direct path -> gets 180 min penalty -> rejected
        expect(result.feasible).toBe(false);
        expect(result.totalEstimatedMinutes).toBeLessThanOrEqual(90);
        expect(result.rejectedStops.length).toBeGreaterThan(0);
        expect(result.rejectedStops[0].name).toContain("Chandragiri Fort");
      } finally {
        Place.find = originalFind;
      }
    });

    it("AGENT-004: checkVisitingHours evaluates date and weekday consistently in Asia/Kolkata timezone", async () => {
      // Create a timestamp that is 2026-10-19 23:00 UTC (which is 2026-10-20 04:30 AM in IST)
      const dateInUtc = new Date("2026-10-19T23:00:00.000Z");

      const result = await checkVisitingHours({
        placeIds: ["660c00000000000000000001"],
        date: dateInUtc,
      });

      // In IST (UTC+5:30), 23:00 on Oct 19 is 04:30 AM on Tuesday, Oct 20
      expect(result.dayOfWeek).toBe("tuesday");
      expect(result.date).toBe("2026-10-20");
    });
  });

  // =========================================================================
  // 4. Trail Progress Persistence & Trail Isolation (FE-003)
  // =========================================================================
  describe("Trail Progress Persistence & Multi-Trail Isolation", () => {
    it("FE-003: getTrailProgress isolates completed stops per trailId", async () => {
      const trailAId = new mongoose.Types.ObjectId("660c00000000000000000081");
      const trailBId = new mongoose.Types.ObjectId("660c00000000000000000082");
      const userId = new mongoose.Types.ObjectId("660c00000000000000000099");

      const place1 = "660c00000000000000000001";
      const place2 = "660c00000000000000000002";

      const originalTrailFindById = Trail.findById;
      const originalProgressFindOne = VisitProgress.findOne;

      Trail.findById = (id) => ({
        lean: () =>
          Promise.resolve({
            _id: id,
            stops: [place1, place2],
          }),
      });

      VisitProgress.findOne = ({ trailId }) => ({
        lean: () => {
          if (trailId.toString() === trailAId.toString()) {
            return Promise.resolve({
              userId,
              trailId: trailAId,
              completedPlaceIds: [new mongoose.Types.ObjectId(place1)],
              visitTimestamps: [{ placeId: place1, visitedAt: new Date().toISOString() }],
            });
          }
          // Trail B has 0 completed stops
          return Promise.resolve(null);
        },
      });

      try {
        const progressA = await getTrailProgress({ trailId: trailAId, userId });
        const progressB = await getTrailProgress({ trailId: trailBId, userId });

        // Trail A has place1 completed
        expect(progressA.completedPlaceIds).toHaveLength(1);
        expect(progressA.completedPlaceIds[0]).toBe(place1);
        expect(progressA.completedCount).toBe(1);
        expect(progressA.isComplete).toBe(false);

        // Trail B has 0 completed (progress does not leak across trails)
        expect(progressB.completedPlaceIds).toHaveLength(0);
        expect(progressB.completedCount).toBe(0);
        expect(progressB.isComplete).toBe(false);
      } finally {
        Trail.findById = originalTrailFindById;
        VisitProgress.findOne = originalProgressFindOne;
      }
    });
  });

  // =========================================================================
  // 5. Document Upload & Extraction Boundaries (UPLOAD-001)
  // =========================================================================
  describe("UPLOAD-001: Document Text Extraction & Format Handling", () => {
    it("extracts and normalizes text from plain text buffers", async () => {
      const textContent = "Epigraphia Tirupati Volume IV\n\nRecord of grants by Saluva Narasimha in 1475 CE.";
      const buffer = Buffer.from(textContent, "utf-8");

      const result = await extractTextFromBuffer(buffer, "text/plain", "saluva-grants.txt");
      expect(result.format).toBe("text");
      expect(result.text).toContain("Saluva Narasimha in 1475 CE");
      expect(result.wordCount).toBeGreaterThan(5);
      expect(result.charCount).toBe(result.text.length);
    });

    it("extracts text streams from simulated PDF binary buffer", async () => {
      // Minimal PDF buffer with standard BT ... ET text object
      const pdfContent =
        "%PDF-1.4\n" +
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
        "stream\n" +
        "BT\n" +
        "/F1 12 Tf\n" +
        "(Inscriptions of the Temple of Sri Venkateswara) Tj\n" +
        "ET\n" +
        "endstream\n" +
        "%%EOF";

      const buffer = Buffer.from(pdfContent, "latin1");
      const result = await extractTextFromBuffer(buffer, "application/pdf", "inscriptions.pdf");

      expect(result.format).toBe("pdf");
      expect(result.text).toContain("Inscriptions of the Temple of Sri Venkateswara");
      expect(result.wordCount).toBeGreaterThan(3);
    });
  });
});
