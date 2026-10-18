import { Trail } from "../models/trail.model.js";
import { Place } from "../models/place.model.js";
import { TrailFeedback } from "../models/trail-feedback.model.js";
import { EditorialReview } from "../models/editorial-review.model.js";
import { ApiError } from "../middlewares/error.middleware.js";

/**
 * Get trails authored or managed by the guide
 */
export const getGuideTrails = async ({ guideId, page = 1, limit = 20 } = {}) => {
  const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * Math.max(1, parseInt(limit, 10) || 20);

  const trails = await Trail.find({ ownerId: guideId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return trails.map((t) => ({
    _id: t._id.toString(),
    id: t._id.toString(),
    title: t.title,
    theme: t.theme,
    stops: t.stops,
    estimatedMinutes: t.estimatedMinutes,
    status: t.status,
    visibility: t.visibility,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
};

/**
 * Review visitor feedback and route condition reports (Guide Moderation)
 */
export const getRouteReports = async ({ status, page = 1, limit = 20 } = {}) => {
  const filter = {};
  if (status) {
    filter.status = status;
  }

  const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * Math.max(1, parseInt(limit, 10) || 20);

  const reports = await TrailFeedback.find(filter)
    .populate("trailId", "title theme")
    .populate("submittedBy", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return reports.map((r) => ({
    _id: r._id.toString(),
    id: r._id.toString(),
    trail: r.trailId
      ? {
          id: r.trailId._id?.toString() || r.trailId.toString(),
          title: r.trailId.title,
          theme: r.trailId.theme,
        }
      : null,
    submittedBy: r.submittedBy
      ? {
          id: r.submittedBy._id?.toString() || r.submittedBy.toString(),
          name: r.submittedBy.name,
        }
      : null,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt,
  }));
};

/**
 * Moderate route report / feedback
 */
export const moderateRouteReport = async (feedbackId, { status, notes }, guideId) => {
  const feedback = await TrailFeedback.findById(feedbackId);
  if (!feedback) {
    throw new ApiError(404, "REPORT_NOT_FOUND", "Route report / feedback not found.");
  }

  feedback.status = status || "reviewed";
  await feedback.save();

  const review = await EditorialReview.create({
    resourceId: feedback._id,
    resourceType: "TrailFeedback",
    reviewedBy: guideId,
    decision: feedback.status,
    notes: notes || undefined,
  });

  return {
    feedback: {
      id: feedback._id.toString(),
      status: feedback.status,
    },
    review: {
      id: review._id.toString(),
      decision: review.decision,
      reviewedBy: guideId.toString(),
      createdAt: review.createdAt,
    },
  };
};

/**
 * Review and publish eligible approved route
 */
export const publishApprovedRoute = async (trailId, guideId) => {
  const trail = await Trail.findById(trailId);
  if (!trail) {
    throw new ApiError(404, "TRAIL_NOT_FOUND", "Trail not found.");
  }

  // Ensure all stops are approved heritage places
  if (!trail.stops || trail.stops.length === 0) {
    throw new ApiError(400, "INELIGIBLE_TRAIL", "Trail must contain at least one stop.");
  }

  const places = await Place.find({ _id: { $in: trail.stops } }).lean();
  const placeMap = new Map(places.map((p) => [p._id.toString(), p]));

  for (const stopId of trail.stops) {
    const p = placeMap.get(stopId.toString());
    if (!p || p.status !== "approved") {
      throw new ApiError(
        400,
        "INELIGIBLE_TRAIL_RESOURCES",
        "Cannot publish trail containing unapproved or ineligible heritage places."
      );
    }
  }

  trail.status = "published";
  trail.visibility = "public";
  await trail.save();

  const review = await EditorialReview.create({
    resourceId: trail._id,
    resourceType: "Trail",
    reviewedBy: guideId,
    decision: "published",
  });

  return {
    trail: {
      id: trail._id.toString(),
      title: trail.title,
      status: trail.status,
      visibility: trail.visibility,
    },
    review: {
      id: review._id.toString(),
      decision: review.decision,
      reviewedBy: guideId.toString(),
      createdAt: review.createdAt,
    },
  };
};

export default {
  getGuideTrails,
  getRouteReports,
  moderateRouteReport,
  publishApprovedRoute,
};
