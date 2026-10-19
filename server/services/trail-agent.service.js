import mongoose from "mongoose";
import { Place } from "../models/place.model.js";
import { Path } from "../models/path.model.js";
import { searchPlaces } from "../tools/search-places.tool.js";
import { checkVisitingHours } from "../tools/check-visiting-hours.tool.js";
import { calculateTrail } from "../tools/calculate-trail.tool.js";
import { generateWithOllama } from "./llm.service.js";

// Curated fallback heritage places for development or test environments
export const DEFAULT_HERITAGE_PLACES = [
  {
    _id: "660c00000000000000000001",
    id: "660c00000000000000000001",
    name: "Sri Venkateswara Temple",
    category: "Temple",
    zone: "Tirumala Hills",
    themes: ["sacred", "architecture", "history"],
    estimatedVisitMinutes: 45,
    historicalSignificance: "Ancient Vaishnavite shrine atop the seven hills of Seshachalam.",
    openingHours: { open: "06:00", close: "21:00" },
    hoursVerification: "verified",
    status: "approved",
  },
  {
    _id: "660c00000000000000000002",
    id: "660c00000000000000000002",
    name: "Swami Pushkarini",
    category: "Sacred Site",
    zone: "Tirumala Hills",
    themes: ["sacred", "nature", "water"],
    estimatedVisitMinutes: 20,
    historicalSignificance: "Holy temple tank adjacent to the main sanctum.",
    openingHours: { open: "06:00", close: "20:00" },
    hoursVerification: "verified",
    status: "approved",
  },
  {
    _id: "660c00000000000000000003",
    id: "660c00000000000000000003",
    name: "Sri Bedi Anjaneyaswami Temple",
    category: "Temple",
    zone: "Tirumala Hills",
    themes: ["sacred", "architecture"],
    estimatedVisitMinutes: 20,
    historicalSignificance: "Historic Hanuman temple facing the Mahadwaram.",
    openingHours: { open: "06:00", close: "20:00" },
    hoursVerification: "verified",
    status: "approved",
  },
  {
    _id: "660c00000000000000000004",
    id: "660c00000000000000000004",
    name: "Kapila Theertham",
    category: "Sacred Site",
    zone: "Tirupati Foothills",
    themes: ["sacred", "nature", "water"],
    estimatedVisitMinutes: 25,
    historicalSignificance: "Only Shiva temple in Tirupati, located at the sacred waterfall.",
    openingHours: { open: "06:00", close: "19:00" },
    hoursVerification: "verified",
    status: "approved",
  },
  {
    _id: "660c00000000000000000005",
    id: "660c00000000000000000005",
    name: "Chandragiri Fort & Palaces",
    category: "Historic Site",
    zone: "Chandragiri",
    themes: ["architecture", "history", "monument"],
    estimatedVisitMinutes: 40,
    historicalSignificance: "11th-century fort and fourth capital of the Vijayanagara Empire.",
    openingHours: { open: "08:00", close: "17:30", closedDays: ["friday"] },
    hoursVerification: "verified",
    status: "approved",
  },
  {
    _id: "660c00000000000000000006",
    id: "660c00000000000000000006",
    name: "Sri Govindaraja Swamy Temple",
    category: "Temple",
    zone: "Tirupati City",
    themes: ["sacred", "architecture", "history"],
    estimatedVisitMinutes: 30,
    historicalSignificance: "Consecrated by Saint Ramanujacharya in 1130 CE.",
    openingHours: { open: "06:00", close: "20:30" },
    hoursVerification: "verified",
    status: "approved",
  },
  {
    _id: "660c00000000000000000007",
    id: "660c00000000000000000007",
    name: "Silathoranam (Natural Rock Arch)",
    category: "Geological Monument",
    zone: "Tirumala Hills",
    themes: ["nature", "geology", "monument"],
    estimatedVisitMinutes: 25,
    historicalSignificance: "Pre-Cambrian natural rock arch of great geological antiquity.",
    openingHours: { open: "06:00", close: "18:00" },
    hoursVerification: "verified",
    status: "approved",
  },
];

/**
 * Retrieves candidate places from database, falling back to curated defaults
 */
export async function getCandidatePlaces(filter = {}) {
  try {
    if (mongoose.connection.readyState === 1) {
      let places = await Place.find({ status: "approved", ...filter }).lean();
      if (places && places.length > 0) {
        return places;
      }
      places = await Place.find({ status: "approved" }).lean();
      if (places && places.length > 0) {
        return places;
      }
      for (const p of DEFAULT_HERITAGE_PLACES) {
        await Place.findByIdAndUpdate(p._id, { $setOnInsert: p }, { upsert: true, new: true });
      }
      const seeded = await Place.find({ status: "approved" }).lean();
      if (seeded && seeded.length > 0) {
        return seeded;
      }
    }
  } catch {
    // Database fallback
  }
  return DEFAULT_HERITAGE_PLACES;
}

/**
 * Generates an intelligent, deterministic heritage trail itinerary.
 *
 * Workflow:
 * 1. searchPlaces(theme, zone) -> retrieve relevant candidates
 * 2. checkVisitingHours(ids, date) -> identify open vs closed places
 * 3. Handle closures deterministically: exclude closed sites, substitute open alternatives
 * 4. calculateTrail(ids, start, duration) -> compute realistic walking + visit schedule
 * 5. Explain substitutions and selections
 * 6. Synthesize AI narrative overview
 *
 * @param {object} options
 * @param {string} [options.theme="Sacred Heritage"]
 * @param {number} [options.maxMinutes=90]
 * @param {Array<string>} [options.preferredPlaceIds=[]]
 * @param {string} [options.startZone=null]
 * @param {string} [options.userPrompt=""]
 * @param {string|Date} [options.date=new Date()]
 * @returns {Promise<object>}
 */
export async function generateTrailPlan({
  theme = "Sacred Heritage",
  maxMinutes = 90,
  preferredPlaceIds = [],
  startZone = null,
  userPrompt = "",
  date = new Date(),
} = {}) {
  const budget = Math.max(30, parseInt(maxMinutes, 10) || 90);
  const targetDate = date ? new Date(date) : new Date();

  const toolStatus = {
    searchPlaces: "pending",
    checkVisitingHours: "pending",
    calculateTrail: "pending",
  };

  // -------------------------------------------------------------
  // Step 1: Tool searchPlaces
  // -------------------------------------------------------------
  let candidatePlaces = [];
  try {
    candidatePlaces = await searchPlaces({
      theme,
      zone: startZone,
      preferredPlaceIds,
      query: userPrompt,
    });
    toolStatus.searchPlaces = "success";
  } catch (err) {
    toolStatus.searchPlaces = "fallback";
    candidatePlaces = DEFAULT_HERITAGE_PLACES;
  }

  if (!candidatePlaces || candidatePlaces.length === 0) {
    candidatePlaces = DEFAULT_HERITAGE_PLACES;
  }

  // -------------------------------------------------------------
  // Step 2: Tool checkVisitingHours
  // -------------------------------------------------------------
  const candidateIds = candidatePlaces.map((p) => p._id?.toString() || p.id?.toString());
  let hoursResult = { openPlaces: [], closedPlaces: [] };

  try {
    hoursResult = await checkVisitingHours({
      placeIds: candidateIds,
      date: targetDate,
    });
    toolStatus.checkVisitingHours = "success";
  } catch (err) {
    toolStatus.checkVisitingHours = "fallback";
    // Check locally from candidate data
    for (const p of candidatePlaces) {
      if (p.openingHours?.isClosed === true || p.hoursVerification === "closed") {
        hoursResult.closedPlaces.push({
          ...p,
          id: p._id?.toString() || p.id?.toString(),
          isOpen: false,
          closureReason: "Scheduled closure / maintenance",
        });
      } else {
        hoursResult.openPlaces.push({
          ...p,
          id: p._id?.toString() || p.id?.toString(),
          isOpen: true,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // Step 3: Handle Closures & Demonstrate Substitution Case
  // -------------------------------------------------------------
  const closedStops = hoursResult.closedPlaces || [];
  const openCandidates = [...(hoursResult.openPlaces || [])];
  const substitutions = [];

  // If a closed stop was detected, exclude it and find an open alternative
  if (closedStops.length > 0) {
    // Find open alternatives not already in openCandidates
    const existingOpenIds = new Set(openCandidates.map((p) => p.id));
    const allApproved = await getCandidatePlaces();

    for (const closedStop of closedStops) {
      // Find suitable open alternative matching zone or theme
      let alternative = allApproved.find((p) => {
        const idStr = p._id?.toString() || p.id?.toString();
        if (idStr === closedStop.id) return false;
        if (existingOpenIds.has(idStr)) return false;

        // Verify alternative is not closed on this target date
        const hours = p.openingHours || {};
        if (hours.isClosed === true || p.hoursVerification === "closed") return false;
        if (Array.isArray(hours.closedDays) && hours.closedDays.includes(hoursResult.dayOfWeek)) return false;
        if (hours[hoursResult.dayOfWeek] && hours[hoursResult.dayOfWeek].isClosed === true) return false;
        if (Array.isArray(hours.closureDates) && hours.closureDates.includes(hoursResult.date)) return false;

        // Same zone preferred or matching theme
        return p.zone === closedStop.zone || (p.themes || []).map((t) => t.toLowerCase()).includes(theme.toLowerCase());
      });

      // If no unselected candidate outside existingOpenIds, select another open approved landmark
      if (!alternative) {
        alternative = allApproved.find((p) => {
          const idStr = p._id?.toString() || p.id?.toString();
          if (idStr === closedStop.id) return false;
          if (existingOpenIds.has(idStr)) return false;

          const hours = p.openingHours || {};
          if (hours.isClosed === true || p.hoursVerification === "closed") return false;
          if (Array.isArray(hours.closedDays) && hours.closedDays.includes(hoursResult.dayOfWeek)) return false;
          if (hours[hoursResult.dayOfWeek] && hours[hoursResult.dayOfWeek].isClosed === true) return false;
          if (Array.isArray(hours.closureDates) && hours.closureDates.includes(hoursResult.date)) return false;

          return true;
        });
      }

      // If all approved places are already in openCandidates, designate the primary open stop as the substitute
      if (!alternative && openCandidates.length > 0) {
        alternative = openCandidates[0];
      }

      if (alternative) {
        const altId = alternative._id?.toString() || alternative.id?.toString();
        existingOpenIds.add(altId);
        if (!openCandidates.some((p) => p.id === altId)) {
          openCandidates.push({
            _id: altId,
            id: altId,
            name: alternative.name,
            zone: alternative.zone,
            estimatedVisitMinutes: alternative.estimatedVisitMinutes || 25,
            themes: alternative.themes,
            openingHours: alternative.openingHours,
          });
        }

        substitutions.push({
          closedStop: {
            id: closedStop.id,
            name: closedStop.name,
            reason: closedStop.closureReason,
          },
          substituteStop: {
            id: altId,
            name: alternative.name,
          },
          explanation: `${closedStop.name} is closed on this date (${closedStop.closureReason}). Selected open alternative ${alternative.name} (${alternative.zone}) to maintain route feasibility within ${budget} minutes.`,
        });
      } else {
        substitutions.push({
          closedStop: {
            id: closedStop.id,
            name: closedStop.name,
            reason: closedStop.closureReason,
          },
          explanation: `${closedStop.name} is closed on this date (${closedStop.closureReason}) and was excluded from the route.`,
        });
      }
    }
  }

  // If insufficient open stops, fallback to default open places
  if (openCandidates.length < 2) {
    for (const defPlace of DEFAULT_HERITAGE_PLACES) {
      const defId = defPlace._id.toString();
      if (!openCandidates.some((p) => p.id === defId)) {
        openCandidates.push({ ...defPlace, id: defId });
      }
      if (openCandidates.length >= 3) break;
    }
  }

  // -------------------------------------------------------------
  // Step 3.5: AI Agent Stop Selection & Sequencing
  // -------------------------------------------------------------
  let candidateIdsForRoute = openCandidates.map((p) => p.id);
  let aiReasoning = null;
  let aiNarrative = null;

  if (process.env.NODE_ENV !== "test" && openCandidates.length >= 2) {
    try {
      const candidateList = openCandidates.slice(0, 8).map((p, idx) =>
        `${idx + 1}. ID: "${p.id}", Name: "${p.name}", Zone: "${p.zone || "Heritage"}", EstVisit: ${p.estimatedVisitMinutes || 30} mins, Themes: ${(p.themes || []).join(", ")}, Highlights: ${(p.description || p.historicalSignificance || "").slice(0, 80)}`
      ).join("\n");

      const agentPrompt = `You are an expert AI Heritage Trail Agent for Tirumala and Tirupati.
Select 2 to 4 stops from the candidates below to construct an optimized walking itinerary for a visitor:
- Theme: ${theme}
- Visitor Interests & Notes: ${userPrompt || "Cultural significance and historical discovery"}
- Max Time Budget: ${budget} minutes
${preferredPlaceIds.length > 0 ? "- Note: Visitor prioritized specific landmarks (prioritize these if open)" : ""}
${substitutions.length > 0 ? `- Substitutions Made: ${substitutions.map((s) => s.explanation).join(" ")}` : ""}

Candidate Sites:
${candidateList}

Instructions:
1. Select 2 to 4 site IDs that best fit the visitor's request and time budget (including ~10 mins walking between consecutive sites).
2. Sequence them in a practical walking order.
3. Respond ONLY with a valid JSON object matching this schema (no markdown formatting, no other text):
{
  "selectedIds": ["id1", "id2"],
  "reasoning": "1-2 sentences on why these specific landmarks match the visitor's request",
  "narrative": "An engaging 2-3 sentence story and overview of the trail"
}`;

      const aiPlanRaw = await generateWithOllama(agentPrompt, { timeoutMs: 15000 });
      if (aiPlanRaw) {
        const jsonMatch = aiPlanRaw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.selectedIds) && parsed.selectedIds.length >= 2) {
            const validSet = new Set(openCandidates.map((p) => p.id));
            const filteredIds = parsed.selectedIds.filter((id) => validSet.has(id));
            if (filteredIds.length >= 2) {
              const remainingIds = openCandidates.map((p) => p.id).filter((id) => !filteredIds.includes(id));
              candidateIdsForRoute = [...filteredIds, ...remainingIds];
              if (parsed.reasoning) aiReasoning = parsed.reasoning;
              if (parsed.narrative) aiNarrative = parsed.narrative;
            }
          }
        }
      }
    } catch {
      // Gracefully retain ranked candidates
    }
  }

  // -------------------------------------------------------------
  // Step 4: Tool calculateTrail (Feasible timing & stored walking paths)
  // -------------------------------------------------------------
  const startPlaceId = preferredPlaceIds[0] || (candidateIdsForRoute[0] || (openCandidates[0] ? openCandidates[0].id : null));

  let trailCalculation = null;
  try {
    trailCalculation = await calculateTrail({
      placeIds: candidateIdsForRoute,
      startPlaceId,
      maxMinutes: budget,
    });
    toolStatus.calculateTrail = "success";
  } catch (err) {
    toolStatus.calculateTrail = "fallback";
    // Deterministic fallback
    let accTime = 0;
    const selected = [];
    for (const p of openCandidates) {
      const visit = p.estimatedVisitMinutes || 25;
      if (accTime + visit <= budget) {
        selected.push({
          id: p.id,
          name: p.name,
          zone: p.zone,
          estimatedVisitMinutes: visit,
          walkingToNext: 10,
        });
        accTime += visit + 10;
      }
      if (selected.length >= 4) break;
    }
    trailCalculation = {
      feasible: selected.length >= 2,
      totalEstimatedMinutes: accTime,
      totalWalkingMinutes: (selected.length - 1) * 10,
      totalVisitMinutes: accTime - (selected.length - 1) * 10,
      stops: selected,
      rejectedStops: [],
    };
  }

  const finalStops = trailCalculation.stops || [];
  const totalMinutes = trailCalculation.totalEstimatedMinutes || budget;

  // -------------------------------------------------------------
  // Step 5: Synthesize AI Narrative Overview
  // -------------------------------------------------------------
  let narrative = aiNarrative;
  if (!narrative) {
    narrative = `Curated ${theme} walking trail spanning ${finalStops.length} heritage landmarks, starting at ${finalStops[0]?.name || "Heritage Precinct"} and concluding at ${finalStops[finalStops.length - 1]?.name || "Heritage Site"}. Total planned duration: ~${totalMinutes} minutes.`;

    if (process.env.NODE_ENV !== "test") {
      try {
        const prompt = `You are an expert heritage trail curator for Tirumala and Tirupati.
Create an engaging 2-3 sentence overview for a heritage walking trail with:
Theme: ${theme}
Stops: ${finalStops.map((s, i) => `${i + 1}. ${s.name} (${s.zone || "Heritage Zone"})`).join("; ")}
Total Duration: ${totalMinutes} minutes
Visitor Notes: ${userPrompt || "Historical discovery and heritage architecture"}
${substitutions.length > 0 ? `Substitutions Made: ${substitutions.map((s) => s.explanation).join(" ")}` : ""}

Provide only the engaging overview.`;

        const aiResponse = await generateWithOllama(prompt, { timeoutMs: 10000 });
        if (aiResponse && aiResponse.trim().length > 20) {
          narrative = aiResponse.trim();
        }
      } catch {
        // Retain deterministic narrative
      }
    }
  }

  const title = `${theme}: ${finalStops[0]?.name || "Heritage"} Trail`;

  return {
    title,
    theme,
    estimatedMinutes: totalMinutes,
    stops: finalStops.map((s) => s.id),
    stopDetails: finalStops.map((s) => ({
      id: s.id,
      name: s.name,
      zone: s.zone,
      estimatedVisitMinutes: s.estimatedVisitMinutes,
      walkingToNext: s.walkingToNext || 0,
    })),
    reasoning: aiReasoning || `Optimized route curated to reflect ${theme} themes, verified opening hours, and feasible walking distances within your ${budget}-minute budget.`,
    toolStatus,
    feasibility: {
      isFeasible: trailCalculation.feasible,
      budgetMinutes: budget,
      totalEstimatedMinutes: totalMinutes,
      totalWalkingMinutes: trailCalculation.totalWalkingMinutes || 0,
      totalVisitMinutes: trailCalculation.totalVisitMinutes || 0,
      rejectedStops: trailCalculation.rejectedStops || [],
    },
    substitutions,
    narrative,
    generatedAt: new Date().toISOString(),
  };
}

export default {
  getCandidatePlaces,
  generateTrailPlan,
};
