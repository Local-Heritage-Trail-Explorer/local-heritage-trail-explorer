import { Story } from "../models/story.model.js";
import { Place } from "../models/place.model.js";
import { Source } from "../models/source.model.js";
import { ApiError } from "../middlewares/error.middleware.js";

/**
 * Get an approved story by ID with related place and approved sources
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

  return {
    id: story._id.toString(),
    title: story.title,
    content: story.content,
    claimType: story.claimType,
    place,
    sources,
    status: story.status,
  };
};

/**
 * Get all approved stories with pagination
 */
export const getApprovedStories = async ({ page = 1, limit = 20 } = {}) => {
  const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * Math.max(1, parseInt(limit, 10) || 20);
  const stories = await Story.find({ status: "approved" })
    .populate("placeId", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return stories.map((s) => ({
    id: s._id.toString(),
    title: s.title,
    content: s.content,
    claimType: s.claimType,
    placeName: s.placeId?.name || null,
    status: s.status,
  }));
};

export default {
  getApprovedStoryById,
  getApprovedStories,
};
