import { Story } from "../models/story.model.js";
import { Place } from "../models/place.model.js";
import { Source } from "../models/source.model.js";
import { EditorialReview } from "../models/editorial-review.model.js";
import { ApiError } from "../middlewares/error.middleware.js";
import { syncStoryChunks } from "./curator.service.js";

/**
 * Get an approved story by ID with related place (including opening hours and visit duration) and approved sources
 * @param {string} id - Story ID
 * @returns {Promise<Object>} Formatted story document
 */
export const getApprovedStoryById = async (id) => {
  const story = await Story.findOne({ _id: id, status: "approved" }).lean();
  if (!story) {
    throw new ApiError(404, "STORY_NOT_FOUND", "Story not found or not approved for public display.");
  }

  let place = null;
  if (story.placeId) {
    const placeDoc = await Place.findById(story.placeId).lean();
    if (placeDoc) {
      place = {
        id: placeDoc._id.toString(),
        name: placeDoc.name,
      };
      if (placeDoc.openingHours && Object.keys(placeDoc.openingHours).length > 0) {
        place.openingHours = placeDoc.openingHours;
      }
      if (placeDoc.estimatedVisitMinutes !== undefined) {
        place.estimatedVisitMinutes = placeDoc.estimatedVisitMinutes;
      }
    }
  }

  let sources = [];
  if (story.sourceIds && story.sourceIds.length > 0) {
    const sourceDocs = await Source.find({
      _id: { $in: story.sourceIds },
      status: "approved",
    }).lean();

    sources = sourceDocs.map((s) => ({
      id: s._id.toString(),
      title: s.title,
      attribution: s.attribution,
      sourceType: s.sourceType,
      url: s.url || null,
    }));
  }

  const result = {
    id: story._id.toString(),
    title: story.title,
    content: story.content,
    claimType: story.claimType,
    place,
    sources,
    status: story.status,
  };

  if (story.uncertaintyNotes) {
    result.uncertaintyNotes = story.uncertaintyNotes;
  }

  return result;
};

/**
 * Get all approved stories with pagination
 */
export const getApprovedStories = async ({ page = 1, limit = 50 } = {}) => {
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 50);
  const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * parsedLimit;
  const stories = await Story.find({ status: "approved" })
    .populate("placeId", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parsedLimit)
    .lean();

  return stories.map((s) => ({
    _id: s._id.toString(),
    id: s._id.toString(),
    title: s.title,
    content: s.content,
    claimType: s.claimType,
    uncertaintyNotes: s.uncertaintyNotes || null,
    placeName: s.placeId?.name || null,
    status: s.status,
  }));
};

/**
 * Approve or reject a story (Curator only)
 * @param {string} id
 * @param {Object} param1
 * @param {string} curatorId
 * @returns {Promise<Object>}
 */
export const reviewStoryApproval = async (id, { status, decision, notes } = {}, curatorId) => {
  const story = await Story.findById(id);
  if (!story) {
    throw new ApiError(404, "STORY_NOT_FOUND", "Story not found.");
  }

  const reviewDecision = status || decision;
  if (!reviewDecision || !["approved", "rejected"].includes(reviewDecision)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Decision status must be either 'approved' or 'rejected'.");
  }

  story.status = reviewDecision;
  await story.save();

  await syncStoryChunks(story, reviewDecision);

  const review = await EditorialReview.create({
    resourceId: story._id,
    resourceType: "Story",
    reviewedBy: curatorId,
    decision: reviewDecision,
    notes: notes || undefined,
  });

  return {
    story: {
      id: story._id.toString(),
      title: story.title,
      status: story.status,
    },
    review: {
      id: review._id.toString(),
      decision: review.decision,
      reviewedBy: curatorId.toString(),
      createdAt: review.createdAt,
    },
  };
};

export default {
  getApprovedStoryById,
  getApprovedStories,
  reviewStoryApproval,
};
