import mongoose from "mongoose";
import { Place } from "../models/place.model.js";
import { Trail } from "../models/trail.model.js";
import { generateWithOllama } from "./llm.service.js";

// Curated fallback heritage places for development or test environments
const DEFAULT_HERITAGE_PLACES = [
  {
    _id: "660c00000000000000000001",
    name: "Sri Venkateswara Temple",
    category: "Temple",
    zone: "Tirumala Hills",
    estimatedVisitMinutes: 90,
    historicalSignificance: "Ancient Vaishnavite shrine atop the seven hills of Seshachalam.",
    status: "approved",
  },
  {
    _id: "660c00000000000000000002",
    name: "Swami Pushkarini",
    category: "Sacred Site",
    zone: "Tirumala Hills",
    estimatedVisitMinutes: 30,
    historicalSignificance: "Holy temple tank adjacent to the main sanctum.",
    status: "approved",
  },
  {
    _id: "660c00000000000000000003",
    name: "Sri Bedi Anjaneyaswami Temple",
    category: "Temple",
    zone: "Tirumala Hills",
    estimatedVisitMinutes: 30,
    historicalSignificance: "Historic Hanuman temple facing the Mahadwaram.",
    status: "approved",
  },
  {
    _id: "660c00000000000000000004",
    name: "Kapila Theertham",
    category: "Sacred Site",
    zone: "Tirupati Foothills",
    estimatedVisitMinutes: 45,
    historicalSignificance: "Only Shiva temple in Tirupati, located at the sacred waterfall.",
    status: "approved",
  },
  {
    _id: "660c00000000000000000005",
    name: "Chandragiri Fort & Palaces",
    category: "Historic Site",
    zone: "Chandragiri",
    estimatedVisitMinutes: 90,
    historicalSignificance: "11th-century fort and fourth capital of the Vijayanagara Empire.",
    status: "approved",
  },
  {
    _id: "660c00000000000000000006",
    name: "Sri Govindaraja Swamy Temple",
    category: "Temple",
    zone: "Tirupati City",
    estimatedVisitMinutes: 60,
    historicalSignificance: "Consecrated by Saint Ramanujacharya in 1130 CE.",
    status: "approved",
  },
];

/**
 * Retrieves candidate places for trail planning from MongoDB,
 * falling back to curated defaults if the database is unpopulated.
 */
export async function getCandidatePlaces(filter = {}) {
  // If not connected to a live database, immediately return curated defaults
  if (mongoose.connection.readyState !== 1) {
    return DEFAULT_HERITAGE_PLACES;
  }

  try {
    const query = { status: "approved", ...filter };
    const places = await Place.find(query).lean();
    if (places && places.length > 0) {
      return places;
    }
  } catch {
    // Database query failed; use curated in-memory places
  }
  return DEFAULT_HERITAGE_PLACES;
}

/**
 * Generates an intelligent, optimized heritage trail itinerary based on user preferences.
 *
 * @param {object} options
 * @param {string} [options.theme="Sacred Heritage"] - Desired trail theme
 * @param {number} [options.maxMinutes=240] - Maximum total time budget
 * @param {Array<string>} [options.preferredPlaceIds=[]] - Specific places to prioritize
 * @param {string} [options.startZone] - Preferred starting zone
 * @param {string} [options.userPrompt] - Freeform visitor interests or requests
 * @returns {Promise<object>} The generated trail itinerary
 */
export async function generateTrailPlan({
  theme = "Sacred Heritage",
  maxMinutes = 240,
  preferredPlaceIds = [],
  startZone = null,
  userPrompt = "",
} = {}) {
  const allPlaces = await getCandidatePlaces();

  // 1. Prioritize preferred places
  const preferredSet = new Set(preferredPlaceIds.map((id) => id?.toString()));
  const prioritized = [];
  const others = [];

  for (const place of allPlaces) {
    const idStr = place._id?.toString() || place.id?.toString();
    if (preferredSet.has(idStr)) {
      prioritized.push(place);
    } else {
      others.push(place);
    }
  }

  // 2. Filter others by theme or zone relevance if specified
  const themeLower = (theme || "").toLowerCase();
  const sortedOthers = others.sort((a, b) => {
    // Score matches
    const aMatch = (a.category || "").toLowerCase().includes(themeLower) ||
      (a.historicalSignificance || "").toLowerCase().includes(themeLower);
    const bMatch = (b.category || "").toLowerCase().includes(themeLower) ||
      (b.historicalSignificance || "").toLowerCase().includes(themeLower);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  const candidates = [...prioritized, ...sortedOthers];

  // 3. Accumulate stops within the time budget
  const selectedStops = [];
  let accumulatedMinutes = 0;
  const budget = Math.max(60, parseInt(maxMinutes, 10) || 240);

  for (const place of candidates) {
    const visitTime = place.estimatedVisitMinutes || 45;
    if (accumulatedMinutes + visitTime <= budget || selectedStops.length < 2) {
      selectedStops.push(place);
      accumulatedMinutes += visitTime;
    }
    if (selectedStops.length >= 6) break;
  }

  // 4. Synthesize AI trail narrative if Ollama is available
  let narrative = `Experience the ${theme} trail across ${selectedStops.length} historic landmarks, connecting ${selectedStops[0]?.name} to ${selectedStops[selectedStops.length - 1]?.name}. Total estimated time: ${accumulatedMinutes} minutes.`;

  if (process.env.NODE_ENV !== "test") {
    try {
      const prompt = `You are a heritage trail curator for historic Tirumala and Tirupati.
Create an engaging 2-3 sentence overview for a heritage trail with the following details:
Theme: ${theme}
Stops: ${selectedStops.map((s, i) => `${i + 1}. ${s.name} (${s.zone || "Heritage Zone"})`).join("; ")}
Estimated Duration: ${accumulatedMinutes} minutes
Visitor Interests: ${userPrompt || "Historical discovery and heritage architecture"}

Respond with just the descriptive trail overview.`;

      const aiResponse = await generateWithOllama(prompt, { timeoutMs: 5000 });
      if (aiResponse && aiResponse.trim().length > 20) {
        narrative = aiResponse.trim();
      }
    } catch {
      // Fallback narrative remains active
    }
  }

  const title = `${theme}: ${selectedStops[0]?.name || "Heritage"} Circuit`;

  return {
    title,
    theme,
    estimatedMinutes: accumulatedMinutes,
    stops: selectedStops.map((s) => s._id?.toString() || s.id?.toString()),
    stopDetails: selectedStops.map((s) => ({
      id: s._id?.toString() || s.id?.toString(),
      name: s.name,
      category: s.category,
      zone: s.zone,
      estimatedVisitMinutes: s.estimatedVisitMinutes || 45,
      historicalSignificance: s.historicalSignificance,
    })),
    narrative,
    generatedAt: new Date().toISOString(),
  };
}

export default {
  getCandidatePlaces,
  generateTrailPlan,
};
