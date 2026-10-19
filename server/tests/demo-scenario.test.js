import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { generateTrailPlan } from "../services/trail-agent.service.js";
import { createTrail, requestTrailPublication } from "../services/trail.service.js";
import { publishApprovedRoute } from "../services/guide.service.js";
import { Trail } from "../models/trail.model.js";
import { EditorialReview } from "../models/editorial-review.model.js";
import connectDB, { disconnectDB } from "../config/database.js";
import mongoose from "mongoose";

describe("Required Demonstration Scenario: 90-Minute Architecture Trail with Closed Building", () => {
  const visitorId = new mongoose.Types.ObjectId("660c00000000000000000088");
  const guideId = new mongoose.Types.ObjectId("660c00000000000000000089");
  let testTrailId = null;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    if (testTrailId) {
      await Trail.deleteOne({ _id: testTrailId });
      await EditorialReview.deleteMany({ resourceId: testTrailId });
    }
    await disconnectDB();
  });

  // Friday, October 23, 2026 - Chandragiri Fort is closed on Fridays
  const testFriday = new Date("2026-10-23T10:00:00Z");

  it("identifies closed building, selects open alternative, respects 90-min limit, and completes guide review flow", async () => {
    // 1. Visitor requests a 90-minute architecture trail on a Friday
    const plan = await generateTrailPlan({
      theme: "architecture",
      maxMinutes: 90,
      date: testFriday,
      userPrompt: "Explore historic Dravidian temple architecture within a 90-minute walk",
    });

    // 2. The agent identifies the closed building (Chandragiri Fort)
    expect(plan.substitutions).toBeDefined();
    expect(plan.substitutions.length).toBeGreaterThan(0);

    const closedStop = plan.substitutions.find(
      (s) => s.closedStop?.name?.includes("Chandragiri")
    );
    expect(closedStop).toBeDefined();
    expect(closedStop.closedStop.reason).toMatch(/friday/i);

    // 3. It chooses a feasible alternative that is open
    expect(closedStop.substituteStop).toBeDefined();
    expect(closedStop.substituteStop.name).not.toBe(closedStop.closedStop.name);

    expect(closedStop.explanation).toMatch(/Chandragiri Fort (and|&) Palaces is closed on this date/);
    expect(closedStop.explanation).toContain("Selected open alternative");
    expect(plan.estimatedMinutes).toBeLessThanOrEqual(90);

    // 5. Route feasibility and stops verification
    expect(plan.stops.length).toBeGreaterThanOrEqual(2);
    expect(plan.feasibility.isFeasible).toBe(true);
    expect(plan.feasibility.totalEstimatedMinutes).toBeLessThanOrEqual(90);

    // 6. Visitor can save the proposed trail as a draft
    const savedTrail = await createTrail({
      title: plan.title,
      theme: plan.theme,
      stops: plan.stops,
      estimatedMinutes: plan.estimatedMinutes,
      userId: visitorId,
    });

    expect(savedTrail.id).toBeDefined();
    testTrailId = savedTrail.id;
    expect(savedTrail.visibility).toBe("private");
    expect(savedTrail.status).toBe("active");

    // 7. Visitor submits trail for publication review
    const submitted = await requestTrailPublication(savedTrail.id, visitorId);
    expect(submitted.status).toBe("pending_review");

    // 8. Guide reviews and publishes the eligible route
    const published = await publishApprovedRoute(savedTrail.id, guideId);
    expect(published.trail.status).toBe("published");
    expect(published.trail.visibility).toBe("public");
    expect(published.review.decision).toBe("published");
  });
});
