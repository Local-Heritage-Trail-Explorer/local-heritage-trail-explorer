import { Place } from "../models/place.model.js";

/**
 * Get approved places for public browsing with optional theme filter and pagination
 * @param {Object} options
 * @param {string} [options.theme]
 * @param {number} [options.page=1]
 * @param {number} [options.limit=10]
 * @returns {Promise<Array>}
 */
export const getApprovedPlaces = async ({ theme, page = 1, limit = 10 } = {}) => {
  const filter = { status: "approved" };

  if (theme) {
    filter.themes = theme;
  }

  const skip = (page - 1) * limit;

  const places = await Place.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return places.map((place) => ({
    id: place._id.toString(),
    name: place.name,
    description: place.description,
    zone: place.zone,
    themes: place.themes,
    openingHours: place.openingHours,
    hoursVerification: place.hoursVerification,
    estimatedVisitMinutes: place.estimatedVisitMinutes,
    status: place.status,
  }));
};

export default {
  getApprovedPlaces,
};
