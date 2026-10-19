import { Place } from "../models/place.model.js";
import { Story } from "../models/story.model.js";
import { Source } from "../models/source.model.js";
import { Correction } from "../models/correction.model.js";
import { EditorialReview } from "../models/editorial-review.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { DEFAULT_HERITAGE_PLACES } from "./trail-agent.service.js";

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

/**
 * Get single approved place by ID
 * @param {string} id
 * @returns {Promise<Object>}
 */
export const getApprovedPlaceById = async (id) => {
  let place = null;
  try {
    place = await Place.findOne({ _id: id, status: "approved" }).lean();
  } catch {
    place = null;
  }

  // Gracefully resolve synthetic seed IDs to corresponding database landmark
  if (!place) {
    const defaultCandidate = DEFAULT_HERITAGE_PLACES.find(
      (p) => p._id === id || p.id === id
    );
    if (defaultCandidate) {
      const kw = defaultCandidate.name.split(" ")[0];
      try {
        place = await Place.findOne({
          name: new RegExp(kw, "i"),
          status: "approved",
        }).lean();
      } catch {
        place = null;
      }
      if (!place) {
        place = defaultCandidate;
      }
    }
  }

  if (!place) {
    throw new ApiError(404, "PLACE_NOT_FOUND", "Place not found or not approved for public display.");
  }

  return {
    id: place._id?.toString() || place.id?.toString() || id,
    _id: place._id?.toString() || place.id?.toString() || id,
    name: place.name,
    description: place.description || place.historicalSignificance,
    zone: place.zone,
    themes: place.themes,
    openingHours: place.openingHours,
    hoursVerification: place.hoursVerification,
    estimatedVisitMinutes: place.estimatedVisitMinutes,
    status: place.status,
  };
};

/**
 * Get approved stories associated with a specific place
 * @param {string} placeId
 * @returns {Promise<Array>}
 */
export const getApprovedPlaceStories = async (placeId) => {
  let resolvedId = placeId;
  let placeExists = false;
  try {
    placeExists = await Place.exists({ _id: placeId, status: "approved" });
  } catch {
    placeExists = false;
  }

  if (!placeExists) {
    const defaultCandidate = DEFAULT_HERITAGE_PLACES.find(
      (p) => p._id === placeId || p.id === placeId
    );
    if (defaultCandidate) {
      const kw = defaultCandidate.name.split(" ")[0];
      try {
        const dbPlace = await Place.findOne({
          name: new RegExp(kw, "i"),
          status: "approved",
        }).lean();
        if (dbPlace) {
          resolvedId = dbPlace._id.toString();
          placeExists = true;
        }
      } catch {
        placeExists = false;
      }
    }
  }

  if (!placeExists) {
    return [];
  }

  const stories = await Story.find({ placeId, status: "approved" })
    .sort({ createdAt: -1 })
    .lean();

  const allSourceIds = [
    ...new Set(
      stories.flatMap((s) => (s.sourceIds || []).map((id) => id.toString()))
    ),
  ];

  const sources = await Source.find({
    _id: { $in: allSourceIds },
    status: "approved",
  }).lean();

  const sourceMap = new Map(sources.map((s) => [s._id.toString(), s]));

  return stories.map((s) => ({
    _id: s._id.toString(),
    id: s._id.toString(),
    title: s.title,
    content: s.content,
    claimType: s.claimType,
    status: s.status,
    sources: (s.sourceIds || [])
      .map((id) => sourceMap.get(id.toString()))
      .filter(Boolean)
      .map((src) => ({
        id: src._id.toString(),
        title: src.title,
        attribution: src.attribution,
        sourceType: src.sourceType,
        url: src.url || null,
      })),
  }));
};

/**
 * Submit a correction for a heritage place (Visitor or member)
 * @param {string} placeId
 * @param {Object} param1
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const submitPlaceCorrection = async (
  placeId,
  { description, proposedCorrection, evidence },
  userId
) => {
  let resolvedId = placeId;
  let place = null;
  try {
    place = await Place.findById(placeId);
  } catch {
    place = null;
  }

  if (!place) {
    const defaultCandidate = DEFAULT_HERITAGE_PLACES.find(
      (p) => p._id === placeId || p.id === placeId
    );
    if (defaultCandidate) {
      const kw = defaultCandidate.name.split(" ")[0];
      try {
        place = await Place.findOne({
          name: new RegExp(kw, "i"),
          status: "approved",
        });
        if (place) resolvedId = place._id.toString();
      } catch {
        place = null;
      }
    }
  }

  if (!place) {
    throw new ApiError(404, "PLACE_NOT_FOUND", "Referenced place does not exist.");
  }

  const desc = description || proposedCorrection;
  if (!desc || !desc.trim()) {
    throw new ApiError(400, "VALIDATION_ERROR", "Correction description is required.");
  }

  const fullDescription = evidence
    ? `${desc.trim()}\n\nEvidence/Supporting Citation: ${evidence.trim()}`
    : desc.trim();

  const correction = await Correction.create({
    placeId: resolvedId,
    submittedBy: userId,
    description: fullDescription,
    status: "pending",
  });

  return {
    id: correction._id.toString(),
    placeId: correction.placeId.toString(),
    submittedBy: correction.submittedBy.toString(),
    description: correction.description,
    status: correction.status,
    createdAt: correction.createdAt,
  };
};

/**
 * Update factual place records (Curator only)
 * @param {string} placeId
 * @param {Object} updateData
 * @param {string} curatorId
 * @returns {Promise<Object>}
 */
export const updatePlaceFactual = async (placeId, updateData, curatorId) => {
  const place = await Place.findById(placeId);
  if (!place) {
    throw new ApiError(404, "PLACE_NOT_FOUND", "Place not found.");
  }

  const permitted = [
    "name",
    "description",
    "zone",
    "themes",
    "openingHours",
    "hoursVerification",
    "estimatedVisitMinutes",
    "status",
  ];

  const updateDoc = {};
  for (const key of permitted) {
    if (updateData[key] !== undefined) {
      updateDoc[key] = updateData[key];
    }
  }

  const updated = await Place.findByIdAndUpdate(
    placeId,
    { $set: updateDoc },
    { new: true, runValidators: true }
  ).lean();

  await EditorialReview.create({
    resourceId: place._id,
    resourceType: "Place",
    reviewedBy: curatorId,
    decision: "updated_factual_record",
  });

  return {
    _id: updated._id.toString(),
    id: updated._id.toString(),
    name: updated.name,
    description: updated.description,
    zone: updated.zone,
    themes: updated.themes,
    openingHours: updated.openingHours,
    hoursVerification: updated.hoursVerification,
    estimatedVisitMinutes: updated.estimatedVisitMinutes,
    status: updated.status,
  };
};

export default {
  getApprovedPlaces,
  getApprovedPlaceById,
  getApprovedPlaceStories,
  submitPlaceCorrection,
  updatePlaceFactual,
};
