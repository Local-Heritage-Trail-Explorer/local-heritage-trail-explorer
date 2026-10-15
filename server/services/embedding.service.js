import ollamaClient, {
  OLLAMA_CONFIG,
  validateVector,
} from "../config/ollama.js";

/**
 * Generates an embedding vector for a search query.
 * Ensures the exact same model and preprocessing are applied as stored document chunks.
 *
 * @param {string} query - Search query text
 * @returns {Promise<Array<number>>} - 768-dimensional vector
 */
export const generateQueryEmbedding = async (query) => {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    throw new Error("Search query must be a non-empty string");
  }

  // Preprocess query text consistently: trim and normalize whitespace
  const normalizedQuery = query.trim().replace(/\s+/g, " ");

  const vector = await ollamaClient.generateSingleEmbedding(normalizedQuery);
  validateVector(vector, OLLAMA_CONFIG.embeddingDimension);
  return vector;
};

/**
 * Generates an embedding vector for a single document chunk.
 *
 * @param {string} text - Chunk text
 * @returns {Promise<Array<number>>} - 768-dimensional vector
 */
export const generateChunkEmbedding = async (text) => {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Chunk text must be a non-empty string");
  }

  const normalized = text.trim();
  const vector = await ollamaClient.generateSingleEmbedding(normalized);
  validateVector(vector, OLLAMA_CONFIG.embeddingDimension);
  return vector;
};

/**
 * Embeds an array of chunk objects produced by chunkStory.
 * Processes chunks in batches to optimize network roundtrips and avoid memory spikes.
 *
 * @param {Array<object>} chunks - Array of chunk metadata objects ({ storyId, content, ... })
 * @param {object} [options]
 * @param {number} [options.batchSize=10] - Number of chunks to embed per request
 * @returns {Promise<Array<object>>} - Chunks with embedding vectors attached
 */
export const embedStoryChunks = async (chunks, { batchSize = 10 } = {}) => {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const results = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchTexts = batch.map((c) => c.content);

    try {
      const embeddings = await ollamaClient.generateBatchEmbeddings(batchTexts);

      for (let j = 0; j < batch.length; j++) {
        const chunkObj = batch[j];
        const embedding = embeddings[j];

        validateVector(embedding, OLLAMA_CONFIG.embeddingDimension);

        results.push({
          ...chunkObj,
          embedding,
        });
      }
    } catch (batchErr) {
      console.error(
        `[EmbeddingService] Batch failed at chunk offset ${i}: ${batchErr.message}. Retrying individually...`
      );

      // Fallback: embed individually if a batch fails
      for (const chunkObj of batch) {
        const singleVec = await generateChunkEmbedding(chunkObj.content);
        results.push({
          ...chunkObj,
          embedding: singleVec,
        });
      }
    }
  }

  return results;
};

export default {
  generateQueryEmbedding,
  generateChunkEmbedding,
  embedStoryChunks,
  OLLAMA_CONFIG,
};
