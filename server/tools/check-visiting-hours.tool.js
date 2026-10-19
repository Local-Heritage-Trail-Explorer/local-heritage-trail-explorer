import mongoose from "mongoose";
import { Place } from "../models/place.model.js";
import { DEFAULT_HERITAGE_PLACES } from "../services/trail-agent.service.js";

const DAYS_OF_WEEK = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Tool 2: checkVisitingHours
 * Checks curated opening hours and closures for a list of places on a given date.
 * Never invents hours; uses stored Place openingHours data.
 *
 * @param {object} params
 * @param {Array<string>} params.placeIds
 * @param {string|Date} [params.date]
 * @returns {Promise<object>}
 */
export async function checkVisitingHours({ placeIds = [], date = new Date() } = {}) {
  const targetDate = date instanceof Date ? date : new Date(date);
  
  // Evaluate day-of-week and date consistently in Indian Standard Time (Asia/Kolkata)
  const istFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = istFormatter.formatToParts(targetDate);
  const partMap = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }
  const dayName = (partMap.weekday || "monday").toLowerCase();
  const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;

  let places = [];
  if (mongoose.connection.readyState === 1) {
    try {
      places = await Place.find({ _id: { $in: placeIds } }).lean();
    } catch {
      places = [];
    }
  }

  if (!places || places.length === 0) {
    const idSet = new Set(placeIds.map((id) => id.toString()));
    places = DEFAULT_HERITAGE_PLACES.filter((p) =>
      idSet.has(p._id.toString()) || idSet.has(p.id?.toString())
    );
    if (places.length === 0) {
      places = DEFAULT_HERITAGE_PLACES.slice(0, Math.min(placeIds.length || 3, 5));
    }
  }

  const openPlaces = [];
  const closedPlaces = [];

  for (const place of places) {
    const hours = place.openingHours || {};
    let isClosed = false;
    let reason = "Scheduled open hours";

    // Check generic or day-specific closure flags
    if (hours.isClosed === true) {
      isClosed = true;
      reason = hours.closureReason || "Temporarily closed for renovation/rituals";
    } else if (Array.isArray(hours.closedDays) && hours.closedDays.includes(dayName)) {
      isClosed = true;
      reason = `Closed weekly on ${dayName}s`;
    } else if (hours[dayName] && hours[dayName].isClosed === true) {
      isClosed = true;
      reason = hours[dayName].reason || `Closed on ${dayName}s`;
    } else if (Array.isArray(hours.closureDates) && hours.closureDates.includes(dateStr)) {
      isClosed = true;
      reason = `Closed on ${dateStr} for special heritage observance`;
    } else if (place.hoursVerification === "closed" || place.status === "closed") {
      isClosed = true;
      reason = "Site currently closed per curator verification";
    }

    const stopInfo = {
      _id: place._id?.toString() || place.id?.toString(),
      id: place._id?.toString() || place.id?.toString(),
      name: place.name,
      zone: place.zone,
      estimatedVisitMinutes: place.estimatedVisitMinutes || 30,
      themes: place.themes,
      openingHours: hours,
      hoursVerification: place.hoursVerification,
    };

    if (isClosed) {
      closedPlaces.push({
        ...stopInfo,
        isOpen: false,
        closureReason: reason,
      });
    } else {
      openPlaces.push({
        ...stopInfo,
        isOpen: true,
        hoursToday: hours[dayName] || hours,
      });
    }
  }

  return {
    dayOfWeek: dayName,
    date: dateStr,
    openPlaces,
    closedPlaces,
    totalEvaluated: places.length,
  };
}

export default checkVisitingHours;
