import { Trail } from "../models/trail.model.js";
import { Place } from "../models/place.model.js";
import { VisitProgress } from "../models/visit-progress.model.js";
import { TrailFeedback } from "../models/trail-feedback.model.js";
import { ApiError } from "../middlewares/error.middleware.js";

/**
 * Format a trail document for API responses
 */
const formatTrail = (trail) => ({
  id: trail._id.toString(),
  ownerId: trail.ownerId?.toString() || trail.ownerId,
  title: trail.title,
  theme: trail.theme,
  stops: trail.stops,
  estimatedMinutes: trail.estimatedMinutes,
  status: trail.status,
  visibility: trail.visibility,
  createdAt: trail.createdAt,
  updatedAt: trail.updatedAt,
});

/**
 * Create a new private trail for an authenticated user
 */
export const createTrail = async ({ title, theme, stops, estimatedMinutes, userId }) => {
  // 1. Verify that all referenced places exist
  const existingPlaces = await Place.find({ _id: { $in: stops } }).lean();
  const existingIds = new Set(existingPlaces.map((p) => p._id.toString()));
  const missingPlaceIds = stops.filter((stopId) => !existingIds.has(stopId.toString()));

  if (missingPlaceIds.length > 0) {
    throw new ApiError(
      400,
      "INVALID_PLACE_REFERENCE",
      `One or more referenced stops do not exist: ${missingPlaceIds.join(", ")}`
    );
  }

  // 2. Compute estimated minutes if not explicitly provided
  let calculatedMinutes = estimatedMinutes;
  if (!calculatedMinutes) {
    calculatedMinutes = existingPlaces.reduce(
      (sum, p) => sum + (p.estimatedVisitMinutes || 30),
      0
    );
  }

  // 3. Create the trail - private by default, owned by the authenticated user
  const trail = await Trail.create({
    ownerId: userId,
    title,
    theme,
    stops,
    estimatedMinutes: calculatedMinutes,
    status: "active",
    visibility: "private",
  });

  return formatTrail(trail);
};

/**
 * Retrieve all trails owned by the authenticated user with pagination
 */
export const getUserTrails = async ({ userId, page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;

  const trails = await Trail.find({ ownerId: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return trails.map(formatTrail);
};

/**
 * Retrieve a single trail by ID with privacy and ownership checks
 */
export const getTrailById = async ({ trailId, user }) => {
  const trail = await Trail.findById(trailId).lean();
  if (!trail) {
    throw new ApiError(404, "TRAIL_NOT_FOUND", "Trail not found.");
  }

  // Private trail access control
  if (trail.visibility === "private") {
    if (!user) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required to view this private trail.");
    }
    if (trail.ownerId.toString() !== user._id.toString()) {
      throw new ApiError(403, "FORBIDDEN", "Access denied. You do not own this private trail.");
    }
  }

  // Populate stop details
  const places = await Place.find({ _id: { $in: trail.stops } }).lean();
  const placeMap = new Map(places.map((p) => [p._id.toString(), p]));

  const populatedStops = trail.stops.map((stopId) => {
    const p = placeMap.get(stopId.toString());
    if (!p) return { id: stopId.toString() };
    return {
      id: p._id.toString(),
      name: p.name,
      zone: p.zone,
      estimatedVisitMinutes: p.estimatedVisitMinutes,
    };
  });

  return {
    ...formatTrail(trail),
    stopDetails: populatedStops,
  };
};

/**
 * Track progress and visits on a trail
 */
export const updateTrailProgress = async ({ trailId, userId, placeId }) => {
  const trail = await Trail.findById(trailId).lean();
  if (!trail) {
    throw new ApiError(404, "TRAIL_NOT_FOUND", "Trail not found.");
  }

  // Ownership verification
  if (trail.ownerId.toString() !== userId.toString()) {
    throw new ApiError(403, "FORBIDDEN", "You can only update progress on your own trails.");
  }

  // Validate that the place belongs to the trail's stops
  const isStopInTrail = trail.stops.some(
    (stop) => (stop?.toString() || stop?._id?.toString() || stop) === placeId.toString()
  );

  if (!isStopInTrail) {
    throw new ApiError(400, "INVALID_STOP", "The specified place does not belong to this trail.");
  }

  // Upsert visit progress
  let progress = await VisitProgress.findOne({ userId, trailId });

  if (!progress) {
    progress = await VisitProgress.create({
      userId,
      trailId,
      completedPlaceIds: [placeId],
      visitTimestamps: [{ placeId: placeId.toString(), visitedAt: new Date().toISOString() }],
    });
  } else {
    const alreadyCompleted = progress.completedPlaceIds.some(
      (id) => id.toString() === placeId.toString()
    );

    if (!alreadyCompleted) {
      progress.completedPlaceIds.push(placeId);
      progress.visitTimestamps.push({
        placeId: placeId.toString(),
        visitedAt: new Date().toISOString(),
      });
      await progress.save();
    }
  }

  return {
    trailId: trail._id.toString(),
    userId: userId.toString(),
    completedPlaceIds: progress.completedPlaceIds.map((id) => id.toString()),
    visitTimestamps: progress.visitTimestamps,
    totalStops: trail.stops.length,
    completedCount: progress.completedPlaceIds.length,
    isComplete: progress.completedPlaceIds.length >= trail.stops.length,
  };
};

/**
 * Submit feedback on a trail
 */
export const submitTrailFeedback = async ({ trailId, userId, user, description }) => {
  const trail = await Trail.findById(trailId).lean();
  if (!trail) {
    throw new ApiError(404, "TRAIL_NOT_FOUND", "Trail not found.");
  }

  // Private trail access check: only owner can submit feedback on their private trail
  if (trail.visibility === "private") {
    if (!user) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required to access this private trail.");
    }
    if (trail.ownerId.toString() !== user._id.toString()) {
      throw new ApiError(403, "FORBIDDEN", "Access denied. You do not have permission to submit feedback on this private trail.");
    }
  }

  const feedback = await TrailFeedback.create({
    trailId,
    submittedBy: userId,
    description,
    status: "pending",
  });

  return {
    id: feedback._id.toString(),
    trailId: feedback.trailId.toString(),
    submittedBy: feedback.submittedBy.toString(),
    description: feedback.description,
    status: feedback.status,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
  };
};

/**
 * Get feedback for a trail
 */
export const getTrailFeedback = async ({ trailId, user, page = 1, limit = 10 } = {}) => {
  const trail = await Trail.findById(trailId).lean();
  if (!trail) {
    throw new ApiError(404, "TRAIL_NOT_FOUND", "Trail not found.");
  }

  if (trail.visibility === "private") {
    if (!user) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication required to view this private trail.");
    }
    if (trail.ownerId.toString() !== user._id.toString()) {
      throw new ApiError(403, "FORBIDDEN", "Access denied. You do not own this private trail.");
    }
  }

  const skip = (page - 1) * limit;
  const feedbacks = await TrailFeedback.find({ trailId })
    .populate("submittedBy", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return feedbacks.map((f) => ({
    id: f._id.toString(),
    trailId: f.trailId.toString(),
    description: f.description,
    status: f.status,
    submittedBy: f.submittedBy
      ? {
          id: f.submittedBy._id?.toString() || f.submittedBy.toString(),
          name: f.submittedBy.name,
        }
      : null,
    createdAt: f.createdAt,
  }));
};

/**
 * Update feedback by the submitting user
 */
export const updateTrailFeedback = async ({ trailId, feedbackId, userId, description }) => {
  const feedback = await TrailFeedback.findById(feedbackId);
  if (!feedback) {
    throw new ApiError(404, "FEEDBACK_NOT_FOUND", "Trail feedback not found.");
  }

  if (feedback.trailId.toString() !== trailId.toString()) {
    throw new ApiError(400, "INVALID_FEEDBACK_REFERENCE", "Feedback does not belong to the specified trail.");
  }

  if (feedback.submittedBy.toString() !== userId.toString()) {
    throw new ApiError(403, "FORBIDDEN", "You can only modify your own feedback.");
  }

  feedback.description = description;
  await feedback.save();

  return {
    id: feedback._id.toString(),
    trailId: feedback.trailId.toString(),
    submittedBy: feedback.submittedBy.toString(),
    description: feedback.description,
    status: feedback.status,
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt,
  };
};

export default {
  createTrail,
  getUserTrails,
  getTrailById,
  updateTrailProgress,
  submitTrailFeedback,
  getTrailFeedback,
  updateTrailFeedback,
};
