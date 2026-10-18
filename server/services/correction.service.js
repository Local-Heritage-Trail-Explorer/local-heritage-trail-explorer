import { Correction } from "../models/correction.model.js";
import { Place } from "../models/place.model.js";
import { ApiError } from "../middlewares/error.middleware.js";

/**
 * Submit a user correction for a heritage place
 */
export const submitCorrection = async ({ placeId, description, userId }) => {
  const placeExists = await Place.exists({ _id: placeId });
  if (!placeExists) {
    throw new ApiError(400, "INVALID_PLACE_REFERENCE", "Referenced heritage place does not exist.");
  }

  const correction = await Correction.create({
    placeId,
    submittedBy: userId,
    description,
    status: "pending",
  });

  return {
    id: correction._id.toString(),
    placeId: correction.placeId.toString(),
    submittedBy: correction.submittedBy.toString(),
    description: correction.description,
    status: correction.status,
    createdAt: correction.createdAt,
    updatedAt: correction.updatedAt,
  };
};

/**
 * Retrieve corrections submitted by the authenticated user
 */
export const getUserCorrections = async ({ userId, page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;
  const corrections = await Correction.find({ submittedBy: userId })
    .populate("placeId", "name zone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return corrections.map((c) => ({
    id: c._id.toString(),
    placeId: c.placeId?._id?.toString() || c.placeId?.toString() || null,
    place: c.placeId
      ? {
          id: c.placeId._id?.toString() || c.placeId.toString(),
          name: c.placeId.name,
          zone: c.placeId.zone,
        }
      : null,
    description: c.description,
    status: c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
};

/**
 * Retrieve a single correction submitted by the user
 */
export const getUserCorrectionById = async ({ correctionId, userId }) => {
  const correction = await Correction.findById(correctionId)
    .populate("placeId", "name zone description")
    .lean();

  if (!correction) {
    throw new ApiError(404, "CORRECTION_NOT_FOUND", "Correction submission not found.");
  }

  if (correction.submittedBy.toString() !== userId.toString()) {
    throw new ApiError(403, "FORBIDDEN", "Access denied. You do not own this correction.");
  }

  return {
    id: correction._id.toString(),
    placeId: correction.placeId?._id?.toString() || correction.placeId?.toString() || null,
    place: correction.placeId
      ? {
          id: correction.placeId._id?.toString() || correction.placeId.toString(),
          name: correction.placeId.name,
          zone: correction.placeId.zone,
          description: correction.placeId.description,
        }
      : null,
    description: correction.description,
    status: correction.status,
    createdAt: correction.createdAt,
    updatedAt: correction.updatedAt,
  };
};

export default {
  submitCorrection,
  getUserCorrections,
  getUserCorrectionById,
};
