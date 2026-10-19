import mongoose from "mongoose";
import { Place } from "../models/place.model.js";
import { DEFAULT_HERITAGE_PLACES } from "../services/trail-agent.service.js";

/**
 * Tool 1: searchPlaces
 * Retrieves approved candidate places matching theme, zone, or preferred IDs.
 * Server-side enforced: strictly queries approved places only.
 *
 * @param {object} params
 * @param {string} [params.theme]
 * @param {string} [params.zone]
 * @param {Array<string>} [params.preferredPlaceIds]
 * @param {string} [params.query]
 * @returns {Promise<Array<object>>}
 */
export async function searchPlaces({ theme, zone, preferredPlaceIds = [], query } = {}) {
  let places = [];

  if (mongoose.connection.readyState === 1) {
    try {
      const filter = { status: "approved" };
      if (zone) {
        filter.zone = new RegExp(zone, "i");
      }
      places = await Place.find(filter).lean();
      if (!places || places.length === 0) {
        places = await Place.find({ status: "approved" }).lean();
      }
      if (!places || places.length === 0) {
        for (const p of DEFAULT_HERITAGE_PLACES) {
          await Place.findByIdAndUpdate(p._id, { $setOnInsert: p }, { upsert: true, new: true });
        }
        places = await Place.find({ status: "approved" }).lean();
      }
    } catch {
      places = DEFAULT_HERITAGE_PLACES;
    }
  }

  if (!places || places.length === 0) {
    places = DEFAULT_HERITAGE_PLACES;
  }

  // Score and rank candidates by relevance to query, theme, and preferred places
  const scoredPlaces = places.map((p) => {
    let score = 0;
    const pName = (p.name || "").toLowerCase();
    const pCat = (p.category || "").toLowerCase();
    const pDesc = (p.description || p.historicalSignificance || "").toLowerCase();
    const pThemes = (p.themes || []).map((t) => t.toLowerCase());
    const pZone = (p.zone || "").toLowerCase();

    // 1. Theme relevance
    if (theme) {
      const themeLower = theme.toLowerCase().trim();
      if (pThemes.some((t) => t.includes(themeLower))) score += 20;
      if (pCat.includes(themeLower)) score += 15;
      if (pName.includes(themeLower)) score += 10;
      if (pDesc.includes(themeLower)) score += 8;
    }

    // 2. User Prompt (query) keyword relevance
    if (query && typeof query === "string" && query.trim().length > 0) {
      const stopWords = new Set(["and", "the", "with", "for", "from", "want", "like", "visit", "see", "are", "have"]);
      const keywords = query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));

      for (const kw of keywords) {
        if (pName.includes(kw)) score += 15;
        if (pThemes.some((t) => t.includes(kw))) score += 12;
        if (pCat.includes(kw)) score += 10;
        if (pZone.includes(kw)) score += 8;
        if (pDesc.includes(kw)) score += 6;
      }
    }

    // 3. User preferred place priority
    const pId = p._id?.toString() || p.id?.toString();
    if (preferredPlaceIds && preferredPlaceIds.some((id) => id.toString() === pId)) {
      score += 50;
    }

    return { place: p, score };
  });

  // Sort candidates by highest score
  scoredPlaces.sort((a, b) => b.score - a.score);

  return scoredPlaces.map(({ place: p }) => ({
    _id: p._id?.toString() || p.id?.toString(),
    id: p._id?.toString() || p.id?.toString(),
    name: p.name,
    zone: p.zone,
    themes: p.themes || [theme || "heritage"],
    openingHours: p.openingHours || {},
    hoursVerification: p.hoursVerification || "verified",
    estimatedVisitMinutes: p.estimatedVisitMinutes || 30,
    description: p.description || p.historicalSignificance || "",
  }));
}

export default searchPlaces;
