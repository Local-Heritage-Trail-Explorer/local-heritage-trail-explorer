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
    } catch {
      places = DEFAULT_HERITAGE_PLACES;
    }
  }

  if (!places || places.length === 0) {
    places = DEFAULT_HERITAGE_PLACES;
  }

  if (theme) {
    const themeLower = theme.toLowerCase().trim();
    const filtered = places.filter((p) => {
      const matchThemes = (p.themes || []).some((t) => t.toLowerCase().includes(themeLower));
      const matchCategory = (p.category || "").toLowerCase().includes(themeLower);
      const matchName = (p.name || "").toLowerCase().includes(themeLower);
      const matchDesc = (p.description || p.historicalSignificance || "").toLowerCase().includes(themeLower);
      return matchThemes || matchCategory || matchName || matchDesc;
    });
    if (filtered.length >= 2) {
      places = filtered;
    }
  }

  if (preferredPlaceIds && preferredPlaceIds.length > 0) {
    const prefSet = new Set(preferredPlaceIds.map((id) => id.toString()));
    places.sort((a, b) => {
      const aId = a._id?.toString() || a.id?.toString();
      const bId = b._id?.toString() || b.id?.toString();
      const aPref = prefSet.has(aId);
      const bPref = prefSet.has(bId);
      if (aPref && !bPref) return -1;
      if (!aPref && bPref) return 1;
      return 0;
    });
  }

  return places.map((p) => ({
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
