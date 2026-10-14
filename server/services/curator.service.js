import { Place } from "../models/place.model.js";
import { Source } from "../models/source.model.js";
import { Story } from "../models/story.model.js";
import { Correction } from "../models/correction.model.js";
import { EditorialReview } from "../models/editorial-review.model.js";
import { ApiError } from "../middlewares/error.middleware.js";

// ==========================================
// 1. HERITAGE PLACES MANAGEMENT
// ==========================================

export const createPlace = async (placeData) => {
  const place = await Place.create(placeData);
  return {
    id: place._id.toString(),
    name: place.name,
    description: place.description,
    zone: place.zone,
    themes: place.themes,
    openingHours: place.openingHours,
    hoursVerification: place.hoursVerification,
    estimatedVisitMinutes: place.estimatedVisitMinutes,
    status: place.status,
    createdAt: place.createdAt,
    updatedAt: place.updatedAt,
  };
};

export const getCuratorPlaces = async ({ status, page = 1, limit = 10 } = {}) => {
  const filter = {};
  if (status) {
    filter.status = status;
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
    createdAt: place.createdAt,
    updatedAt: place.updatedAt,
  }));
};

export const updatePlace = async (id, updateData) => {
  const place = await Place.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();

  if (!place) {
    throw new ApiError(404, "PLACE_NOT_FOUND", "Heritage place not found.");
  }

  return {
    id: place._id.toString(),
    name: place.name,
    description: place.description,
    zone: place.zone,
    themes: place.themes,
    openingHours: place.openingHours,
    hoursVerification: place.hoursVerification,
    estimatedVisitMinutes: place.estimatedVisitMinutes,
    status: place.status,
    createdAt: place.createdAt,
    updatedAt: place.updatedAt,
  };
};

// ==========================================
// 2. HERITAGE SOURCES MANAGEMENT
// ==========================================

export const createSource = async (sourceData, userId) => {
  const source = await Source.create({
    ...sourceData,
    uploadedBy: userId,
  });

  return {
    id: source._id.toString(),
    title: source.title,
    attribution: source.attribution,
    sourceType: source.sourceType,
    url: source.url || null,
    filePath: source.filePath || null,
    status: source.status,
    uploadedBy: source.uploadedBy.toString(),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

export const getCuratorSources = async ({ status, page = 1, limit = 10 } = {}) => {
  const filter = {};
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const sources = await Source.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return sources.map((source) => ({
    id: source._id.toString(),
    title: source.title,
    attribution: source.attribution,
    sourceType: source.sourceType,
    url: source.url || null,
    filePath: source.filePath || null,
    status: source.status,
    uploadedBy: source.uploadedBy?.toString() || source.uploadedBy,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }));
};

export const updateSource = async (id, updateData) => {
  const source = await Source.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();

  if (!source) {
    throw new ApiError(404, "SOURCE_NOT_FOUND", "Source not found.");
  }

  return {
    id: source._id.toString(),
    title: source.title,
    attribution: source.attribution,
    sourceType: source.sourceType,
    url: source.url || null,
    filePath: source.filePath || null,
    status: source.status,
    uploadedBy: source.uploadedBy?.toString() || source.uploadedBy,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

export const reviewSource = async (id, { status, notes }, reviewerId) => {
  const source = await Source.findById(id);
  if (!source) {
    throw new ApiError(404, "SOURCE_NOT_FOUND", "Source not found.");
  }

  source.status = status;
  await source.save();

  const review = await EditorialReview.create({
    resourceId: source._id,
    resourceType: "Source",
    reviewedBy: reviewerId,
    decision: status,
  });

  return {
    source: {
      id: source._id.toString(),
      title: source.title,
      status: source.status,
    },
    review: {
      id: review._id.toString(),
      decision: review.decision,
      reviewedBy: reviewerId.toString(),
      createdAt: review.createdAt,
    },
  };
};

// ==========================================
// 3. HERITAGE STORIES MANAGEMENT
// ==========================================

export const createStory = async (storyData) => {
  // Validate referenced place exists
  const placeExists = await Place.exists({ _id: storyData.placeId });
  if (!placeExists) {
    throw new ApiError(400, "INVALID_PLACE_REFERENCE", "Referenced place does not exist.");
  }

  // Validate referenced sources exist
  const existingSources = await Source.find({ _id: { $in: storyData.sourceIds } }).lean();
  if (existingSources.length !== storyData.sourceIds.length) {
    throw new ApiError(400, "INVALID_SOURCE_REFERENCE", "One or more referenced sources do not exist.");
  }

  const story = await Story.create(storyData);

  return {
    id: story._id.toString(),
    placeId: story.placeId.toString(),
    title: story.title,
    content: story.content,
    sourceIds: story.sourceIds.map((s) => s.toString()),
    claimType: story.claimType,
    status: story.status,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  };
};

export const getCuratorStories = async ({ status, placeId, page = 1, limit = 10 } = {}) => {
  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (placeId) {
    filter.placeId = placeId;
  }

  const skip = (page - 1) * limit;
  const stories = await Story.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return stories.map((story) => ({
    id: story._id.toString(),
    placeId: story.placeId?.toString() || story.placeId,
    title: story.title,
    content: story.content,
    sourceIds: (story.sourceIds || []).map((s) => s?.toString() || s),
    claimType: story.claimType,
    status: story.status,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  }));
};

export const updateStory = async (id, updateData) => {
  if (updateData.placeId) {
    const placeExists = await Place.exists({ _id: updateData.placeId });
    if (!placeExists) {
      throw new ApiError(400, "INVALID_PLACE_REFERENCE", "Referenced place does not exist.");
    }
  }

  if (updateData.sourceIds) {
    const existingSources = await Source.find({ _id: { $in: updateData.sourceIds } }).lean();
    if (existingSources.length !== updateData.sourceIds.length) {
      throw new ApiError(400, "INVALID_SOURCE_REFERENCE", "One or more referenced sources do not exist.");
    }
  }

  const story = await Story.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();

  if (!story) {
    throw new ApiError(404, "STORY_NOT_FOUND", "Story not found.");
  }

  return {
    id: story._id.toString(),
    placeId: story.placeId?.toString() || story.placeId,
    title: story.title,
    content: story.content,
    sourceIds: (story.sourceIds || []).map((s) => s?.toString() || s),
    claimType: story.claimType,
    status: story.status,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  };
};

export const reviewStory = async (id, { status, notes }, reviewerId) => {
  const story = await Story.findById(id);
  if (!story) {
    throw new ApiError(404, "STORY_NOT_FOUND", "Story not found.");
  }

  story.status = status;
  await story.save();

  const review = await EditorialReview.create({
    resourceId: story._id,
    resourceType: "Story",
    reviewedBy: reviewerId,
    decision: status,
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
      reviewedBy: reviewerId.toString(),
      createdAt: review.createdAt,
    },
  };
};

// ==========================================
// 4. CORRECTIONS REVIEW MANAGEMENT
// ==========================================

export const getCuratorCorrections = async ({ status = "pending", page = 1, limit = 10 } = {}) => {
  const filter = {};
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const corrections = await Correction.find(filter)
    .populate("placeId", "name zone")
    .populate("submittedBy", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return corrections.map((c) => ({
    id: c._id.toString(),
    place: c.placeId
      ? { id: c.placeId._id?.toString() || c.placeId, name: c.placeId.name, zone: c.placeId.zone }
      : null,
    submittedBy: c.submittedBy
      ? { id: c.submittedBy._id?.toString() || c.submittedBy, name: c.submittedBy.name, email: c.submittedBy.email }
      : null,
    description: c.description,
    status: c.status,
    reviewedBy: c.reviewedBy?.toString() || c.reviewedBy || null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
};

export const getCuratorCorrectionById = async (id) => {
  const correction = await Correction.findById(id)
    .populate("placeId", "name zone description")
    .populate("submittedBy", "name email")
    .lean();

  if (!correction) {
    throw new ApiError(404, "CORRECTION_NOT_FOUND", "Correction submission not found.");
  }

  return {
    id: correction._id.toString(),
    place: correction.placeId
      ? {
          id: correction.placeId._id?.toString() || correction.placeId,
          name: correction.placeId.name,
          zone: correction.placeId.zone,
          description: correction.placeId.description,
        }
      : null,
    submittedBy: correction.submittedBy
      ? {
          id: correction.submittedBy._id?.toString() || correction.submittedBy,
          name: correction.submittedBy.name,
          email: correction.submittedBy.email,
        }
      : null,
    description: correction.description,
    status: correction.status,
    reviewedBy: correction.reviewedBy?.toString() || correction.reviewedBy || null,
    createdAt: correction.createdAt,
    updatedAt: correction.updatedAt,
  };
};

export const reviewCorrection = async (id, { status, notes }, reviewerId) => {
  const correction = await Correction.findById(id);
  if (!correction) {
    throw new ApiError(404, "CORRECTION_NOT_FOUND", "Correction submission not found.");
  }

  correction.status = status;
  correction.reviewedBy = reviewerId;
  await correction.save();

  const review = await EditorialReview.create({
    resourceId: correction._id,
    resourceType: "Correction",
    reviewedBy: reviewerId,
    decision: status,
  });

  return {
    correction: {
      id: correction._id.toString(),
      status: correction.status,
      reviewedBy: reviewerId.toString(),
    },
    review: {
      id: review._id.toString(),
      decision: review.decision,
      reviewedBy: reviewerId.toString(),
      createdAt: review.createdAt,
    },
  };
};

export default {
  createPlace,
  getCuratorPlaces,
  updatePlace,
  createSource,
  getCuratorSources,
  updateSource,
  reviewSource,
  createStory,
  getCuratorStories,
  updateStory,
  reviewStory,
  getCuratorCorrections,
  getCuratorCorrectionById,
  reviewCorrection,
};
