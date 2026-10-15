import mongoose from "mongoose";
import { Chunk } from "../models/chunk.model.js";
import { generateQueryEmbedding } from "./embedding.service.js";

/**
 * Performs semantic vector retrieval across historical story chunks.
 *
 * @param {object} params
 * @param {string} params.query - The search query text
 * @param {number} [params.limit=5] - Maximum number of results to return (1-20)
 * @param {string} [params.placeId] - Optional place ObjectId to restrict search
 * @param {number} [params.minScore=0.0] - Minimum similarity score threshold (0.0 - 1.0)
 * @returns {Promise<Array<object>>} - Retrieved passages with metadata and similarity scores
 */
export const searchSemanticStories = async ({
  query,
  limit = 5,
  placeId = null,
  minScore = 0.0,
} = {}) => {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    const error = new Error("Search query must be a non-empty string");
    error.statusCode = 400;
    error.code = "INVALID_QUERY";
    throw error;
  }

  const cleanQuery = query.trim();
  const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 5, 20));

  // 1. Generate query embedding using the same model as chunks
  let queryVector;
  try {
    queryVector = await generateQueryEmbedding(cleanQuery);
  } catch (embedError) {
    const error = new Error(`Embedding model error: ${embedError.message}`);
    error.statusCode = 503;
    error.code = "EMBEDDING_SERVICE_UNAVAILABLE";
    throw error;
  }

  // 2. Build Atlas Vector Search stage
  const filterConditions = {
    approvalStatus: { $eq: "approved" },
  };

  if (placeId) {
    try {
      filterConditions.placeId = { $eq: new mongoose.Types.ObjectId(placeId) };
    } catch {
      const error = new Error("Invalid placeId format provided");
      error.statusCode = 400;
      error.code = "INVALID_PLACE_ID";
      throw error;
    }
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector,
        numCandidates: Math.max(parsedLimit * 10, 50),
        limit: parsedLimit,
        filter: filterConditions,
      },
    },
    {
      $project: {
        _id: 0,
        storyId: 1,
        placeId: 1,
        title: 1,
        chunkIndex: 1,
        content: 1,
        sourceUrl: 1,
        sourceIds: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];

  // 3. Execute vector search aggregation on Atlas
  let rawResults;
  try {
    rawResults = await Chunk.aggregate(pipeline);
  } catch (dbError) {
    // Detect if vector index is missing or building
    if (
      dbError.message?.includes("index not found") ||
      dbError.message?.includes("vectorSearch")
    ) {
      const error = new Error(
        "Atlas Vector Search index 'vector_index' is not ready or unavailable. Please verify index configuration."
      );
      error.statusCode = 503;
      error.code = "VECTOR_INDEX_UNAVAILABLE";
      throw error;
    }

    const error = new Error(`Vector search database query failed: ${dbError.message}`);
    error.statusCode = 500;
    error.code = "DATABASE_SEARCH_ERROR";
    throw error;
  }

  // 4. Format and apply score threshold
  const results = rawResults
    .filter((doc) => typeof doc.score === "number" && doc.score >= minScore)
    .map((doc) => ({
      storyId: doc.storyId ? doc.storyId.toString() : null,
      placeId: doc.placeId ? doc.placeId.toString() : null,
      title: doc.title,
      chunkIndex: doc.chunkIndex,
      content: doc.content,
      sourceUrl: doc.sourceUrl || null,
      score: Number(doc.score.toFixed(4)),
    }));

  return results;
};

export default {
  searchSemanticStories,
};
