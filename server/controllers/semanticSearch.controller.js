import { searchSemanticStories } from "../services/semanticSearch.service.js";

/**
 * Controller for semantic story search.
 * Handles POST /api/search/semantic and returns relevant source-attributed historical chunks.
 */
export const handleSemanticSearch = async (req, res, next) => {
  try {
    const { query, limit, placeId, minScore } = req.body;

    const results = await searchSemanticStories({
      query,
      limit,
      placeId,
      minScore,
    });

    return res.status(200).json({
      success: true,
      query,
      results,
      data: {
        query,
        results,
        count: results.length,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  handleSemanticSearch,
};
