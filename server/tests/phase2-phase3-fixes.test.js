import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { trailAgentGenerateSchema } from "../validators/ai.schema.js";
import { emailService } from "../services/email.service.js";
import { extractTextFromBuffer } from "../services/text-extraction.service.js";
import { calculateTrail } from "../tools/calculate-trail.tool.js";
import { checkVisitingHours } from "../tools/check-visiting-hours.tool.js";
import { syncStoryChunks } from "../services/curator.service.js";
import { Chunk } from "../models/chunk.model.js";
import { Story } from "../models/story.model.js";
import { Source } from "../models/source.model.js";

describe("Phase 2 & Phase 3 Defect Remediation Regression Suite", () => {
  // =========================================================================
  // 1. AGENT-002: Agent Request Validation
  // =========================================================================
  describe("AGENT-002: Trail Agent Request Validation", () => {
    it("rejects generate request with maxMinutes under 15", () => {
      const result = trailAgentGenerateSchema.safeParse({
        maxMinutes: 10, // below minimum 15
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toMatch(/at least 15/i);
    });

    it("rejects generate request with maxMinutes exceeding 720 (12 hours)", () => {
      const result = trailAgentGenerateSchema.safeParse({
        maxMinutes: 800,
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toMatch(/cannot exceed 720/i);
    });

    it("rejects generate request with invalid preferredPlaceIds", () => {
      const result = trailAgentGenerateSchema.safeParse({
        preferredPlaceIds: ["invalid-id-not-24-hex"],
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toMatch(/Invalid preferredPlaceId format/i);
    });

    it("accepts valid trail agent generation options", () => {
      const result = trailAgentGenerateSchema.safeParse({
        theme: "sacred",
        maxMinutes: 120,
        preferredPlaceIds: ["660c00000000000000000001"],
        startZone: "Tirumala Hills",
        userPrompt: "Ancient temples and architecture",
        saveImmediately: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.maxMinutes).toBe(120);
    });
  });

  // =========================================================================
  // 2. OPS-002: Email Service Error Handling in Production
  // =========================================================================
  describe("OPS-002: Production Email Configuration Failure Handling", () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "production";
      emailService.transporter = null;
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("throws 503 ApiError in production when SMTP transporter is unconfigured", async () => {
      await expect(
        emailService.sendVerificationEmail("visitor@example.com", "fake-token")
      ).rejects.toMatchObject({
        status: 503,
        code: "EMAIL_SERVICE_UNAVAILABLE",
      });
    });

    it("throws 503 ApiError on password reset when unconfigured in production", async () => {
      await expect(
        emailService.sendPasswordResetEmail("visitor@example.com", "fake-token")
      ).rejects.toMatchObject({
        status: 503,
        code: "EMAIL_SERVICE_UNAVAILABLE",
      });
    });

    it("throws 503 ApiError on staff invitation when unconfigured in production", async () => {
      await expect(
        emailService.sendStaffInvitationEmail("staff@example.com", "fake-token", "GUIDE")
      ).rejects.toMatchObject({
        status: 503,
        code: "EMAIL_SERVICE_UNAVAILABLE",
      });
    });
  });

  // =========================================================================
  // 3. UPLOAD-001: Text Extraction & Upload Service
  // =========================================================================
  describe("UPLOAD-001: Text Extraction from Documents", () => {
    it("extracts clean text and word counts from UTF-8 text buffer", async () => {
      const sampleText = "The sacred hills of Seshachalam comprise seven majestic peaks.\n\nEach peak represents a divine manifestation.";
      const buffer = Buffer.from(sampleText, "utf-8");

      const result = await extractTextFromBuffer(buffer, "text/plain", "temple_history.txt");

      expect(result.format).toBe("text");
      expect(result.text).toContain("sacred hills of Seshachalam");
      expect(result.wordCount).toBeGreaterThan(10);
      expect(result.charCount).toBe(result.text.length);
    });

    it("extracts text from simulated PDF buffer with BT/ET stream operators", async () => {
      const pdfMock = Buffer.from(
        "%PDF-1.4\n1 0 obj\n<<>>\nstream\nBT\n/F1 12 Tf\n(Inscriptions of Sri Venkateswara Temple) Tj\nET\nendstream\nendobj",
        "latin1"
      );

      const result = await extractTextFromBuffer(pdfMock, "application/pdf", "inscriptions.pdf");

      expect(result.format).toBe("pdf");
      expect(result.text).toContain("Inscriptions of Sri Venkateswara Temple");
    });

    it("handles JSON archival data extraction properly", async () => {
      const data = { era: "Vijayanagara", year: 1517, donor: "Krishnadevaraya" };
      const buffer = Buffer.from(JSON.stringify(data), "utf-8");

      const result = await extractTextFromBuffer(buffer, "application/json", "archive.json");

      expect(result.format).toBe("json");
      expect(result.text).toContain("Krishnadevaraya");
    });
  });

  // =========================================================================
  // 4. AGENT-003: Route Feasibility & Cross-Zone Walking
  // =========================================================================
  describe("AGENT-003: Walking Durations & Cross-Zone Route Feasibility", () => {
    it("rejects walking across distinct zones without a registered path", async () => {
      // Chandragiri (Chandragiri zone) and Sri Venkateswara Temple (Tirumala Hills zone)
      const res = await calculateTrail({
        placeIds: [
          "660c00000000000000000005", // Chandragiri Fort
          "660c00000000000000000001", // Sri Venkateswara Temple
        ],
        maxMinutes: 90,
      });

      // Should identify cross-zone walking as infeasible or reject the stop
      expect(res.rejectedStops.length).toBeGreaterThan(0);
      expect(res.rejectedStops[0].reason).toMatch(/Walking between|transit/i);
    });

    it("computes feasible walking duration between adjacent stops in the same zone", async () => {
      // Sri Venkateswara Temple and Swami Pushkarini both in Tirumala Hills
      const res = await calculateTrail({
        placeIds: [
          "660c00000000000000000001",
          "660c00000000000000000002",
        ],
        maxMinutes: 90,
      });

      expect(res.feasible).toBe(true);
      expect(res.stops.length).toBe(2);
      expect(res.totalEstimatedMinutes).toBeLessThanOrEqual(90);
    });
  });

  // =========================================================================
  // 5. AGENT-004: Timezone Consistency in Visiting Hours
  // =========================================================================
  describe("AGENT-004: Timezone Consistency in Visiting Hours (IST Asia/Kolkata)", () => {
    it("evaluates visiting hours consistently in Indian Standard Time (UTC+5:30)", async () => {
      // Sunday evening 20:00 UTC = Monday morning 01:30 IST
      const dateUtcSundayNight = new Date("2026-10-18T20:00:00.000Z");

      const res = await checkVisitingHours({
        placeIds: ["660c00000000000000000001"],
        date: dateUtcSundayNight,
      });

      // In IST (UTC+5:30), 20:00 on Sunday Oct 18 is 01:30 on Monday Oct 19
      expect(res.dayOfWeek).toBe("monday");
      expect(res.date).toBe("2026-10-19");
      expect(res.openPlaces.length + res.closedPlaces.length).toBe(1);
    });
  });

  // =========================================================================
  // 6. VEC-001: Story Approval Chunk Synchronization
  // =========================================================================
  describe("VEC-001: Story Approval Vector Index Chunk Synchronization", () => {
    it("syncStoryChunks runs cleanly without error on unapproved status", async () => {
      const mockStory = {
        _id: "660c00000000000000000041",
        title: "Test Historical Story",
        content: "Content about ancient Tirumala inscriptions and architecture.",
        status: "rejected",
        sourceIds: [],
      };

      await expect(syncStoryChunks(mockStory, "rejected")).resolves.not.toThrow();
    });
  });
});
