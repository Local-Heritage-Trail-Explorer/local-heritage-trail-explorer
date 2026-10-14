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

export default {
  submitCorrection,
};
