import mongoose from "mongoose";
import { Path } from "../models/path.model.js";
import { Place } from "../models/place.model.js";
import { DEFAULT_HERITAGE_PLACES } from "../services/trail-agent.service.js";

/**
 * Tool 3: calculateTrail
 * Computes a feasible timed trail route using stored curated walking paths
 * and estimated visit durations.
 *
 * @param {object} params
 * @param {Array<string>} params.placeIds - Candidate place ObjectIds in desired order
 * @param {string} [params.startPlaceId] - Preferred starting place
 * @param {number} [params.maxMinutes=90] - Total time budget in minutes
 * @returns {Promise<object>}
 */
export async function calculateTrail({
  placeIds = [],
  startPlaceId = null,
  maxMinutes = 90,
} = {}) {
  const budget = Math.max(30, parseInt(maxMinutes, 10) || 90);

  if (!placeIds || placeIds.length === 0) {
    return {
      feasible: false,
      reason: "No candidate stops provided to calculate trail.",
      stops: [],
      totalEstimatedMinutes: 0,
      totalWalkingMinutes: 0,
      totalVisitMinutes: 0,
    };
  }

  let places = [];
  let paths = [];

  if (mongoose.connection.readyState === 1) {
    try {
      places = await Place.find({ _id: { $in: placeIds }, status: "approved" }).lean();
      paths = await Path.find({
        $or: [
          { fromPlaceId: { $in: placeIds }, toPlaceId: { $in: placeIds } },
        ],
      }).lean();
    } catch {
      places = [];
      paths = [];
    }
  }

  if (!places || places.length === 0) {
    const idSet = new Set(placeIds.map((id) => id.toString()));
    places = DEFAULT_HERITAGE_PLACES.filter((p) =>
      idSet.has(p._id.toString()) || idSet.has(p.id?.toString())
    );
    if (places.length === 0) {
      places = DEFAULT_HERITAGE_PLACES.slice(0, 3);
    }
  }

  const placeMap = new Map();
  for (const p of places) {
    const id = p._id?.toString() || p.id?.toString();
    placeMap.set(id, p);
  }

  // Order candidate stops: start with startPlaceId if provided
  let orderedIds = placeIds.length > 0 ? [...placeIds] : Array.from(placeMap.keys());
  if (startPlaceId && orderedIds.includes(startPlaceId)) {
    orderedIds = [
      startPlaceId,
      ...orderedIds.filter((id) => id.toString() !== startPlaceId.toString()),
    ];
  }

  const getWalkingMinutes = (fromId, toId) => {
    const fStr = fromId.toString();
    const tStr = toId.toString();
    if (fStr === tStr) return 0;

    const direct = paths.find(
      (p) => p.fromPlaceId?.toString() === fStr && p.toPlaceId?.toString() === tStr
    );
    if (direct) return direct.walkingMinutes;

    const reverse = paths.find(
      (p) =>
        p.fromPlaceId?.toString() === tStr &&
        p.toPlaceId?.toString() === fStr &&
        p.bidirectional === true
    );
    if (reverse) return reverse.walkingMinutes;

    const fromPlace = placeMap.get(fStr);
    const toPlace = placeMap.get(tStr);

    // If both stops belong to the same local precinct / zone, use standard local 10 min walk
    if (
      fromPlace?.zone &&
      toPlace?.zone &&
      fromPlace.zone.toLowerCase().trim() === toPlace.zone.toLowerCase().trim()
    ) {
      return 10;
    }

    // Cross-zone traversal without a registered pedestrian path is realistically infeasible on foot (180+ mins)
    return 180;
  };

  // Deterministically accumulate stops within the time budget
  const selectedStops = [];
  let totalWalking = 0;
  let totalVisit = 0;
  const rejectedStops = [];

  for (let i = 0; i < orderedIds.length; i++) {
    const stopId = orderedIds[i].toString();
    const place = placeMap.get(stopId);
    if (!place) continue;

    const visitDuration = place.estimatedVisitMinutes || 25;
    const walkDuration =
      selectedStops.length > 0
        ? getWalkingMinutes(selectedStops[selectedStops.length - 1].id, stopId)
        : 0;

    // Check cross-zone walking feasibility
    if (selectedStops.length > 0 && walkDuration >= 120) {
      rejectedStops.push({
        id: place._id?.toString() || place.id?.toString(),
        name: place.name,
        reason: `Walking between ${selectedStops[selectedStops.length - 1].zone} and ${place.zone} is not feasible on foot without designated transit (~${walkDuration} mins).`,
      });
      continue;
    }

    // Check if individual stop visit alone exceeds budget
    if (selectedStops.length === 0 && visitDuration > budget) {
      rejectedStops.push({
        id: place._id?.toString() || place.id?.toString(),
        name: place.name,
        reason: `Estimated visit duration (${visitDuration} mins) exceeds total time budget of ${budget} minutes.`,
      });
      continue;
    }

    const newTotal = totalWalking + totalVisit + walkDuration + visitDuration;

    if (newTotal <= budget) {
      if (selectedStops.length > 0) {
        selectedStops[selectedStops.length - 1].walkingToNext = walkDuration;
        totalWalking += walkDuration;
      }
      totalVisit += visitDuration;
      selectedStops.push({
        id: place._id?.toString() || place.id?.toString(),
        name: place.name,
        zone: place.zone,
        estimatedVisitMinutes: visitDuration,
        walkingToNext: 0,
      });
    } else {
      rejectedStops.push({
        id: place._id?.toString() || place.id?.toString(),
        name: place.name,
        reason: `Exceeds available time budget of ${budget} minutes (required additional ~${walkDuration + visitDuration} mins).`,
      });
    }
  }

  const totalTime = totalWalking + totalVisit;

  return {
    feasible: selectedStops.length >= 2 && totalTime <= budget,
    maxBudgetMinutes: budget,
    totalEstimatedMinutes: totalTime,
    totalWalkingMinutes: totalWalking,
    totalVisitMinutes: totalVisit,
    stops: selectedStops,
    rejectedStops,
  };
}

export default calculateTrail;
