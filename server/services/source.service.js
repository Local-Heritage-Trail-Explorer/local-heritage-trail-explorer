import { Source } from "../models/source.model.js";
import { ApiError } from "../middlewares/error.middleware.js";

/**
 * Get approved source metadata by ID (public fields only)
 * @param {string} id - Source ID
 * @returns {Promise<Object>} Public source metadata
 */
export const getApprovedSourceById = async (id) => {
  const source = await Source.findOne({ _id: id, status: "approved" }).lean();
  if (!source) {
    throw new ApiError(404, "SOURCE_NOT_FOUND", "Source not found or not approved for public display.");
  }

  // Strictly omit private fields like filePath and uploadedBy
  return {
    id: source._id.toString(),
    title: source.title,
    attribution: source.attribution,
    sourceType: source.sourceType,
    url: source.url || null,
    status: source.status,
  };
};

export default {
  getApprovedSourceById,
};
