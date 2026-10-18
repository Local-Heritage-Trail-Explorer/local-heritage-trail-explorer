import dotenv from "dotenv";

dotenv.config();

// Embedding configuration (Member 7 - Semantic Search & Vector Retrieval)
export const OLLAMA_CONFIG = {
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  embedModel: process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text",
  embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION, 10) || 768,
};

// Chatbot LLM configuration (Member 8 - Historical RAG Chatbot)
export const ollamaConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  model: process.env.OLLAMA_MODEL || "llama3.2",
  timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 60000,
};

/**
 * Validates that an embedding vector is numeric, finite, non-empty,
 * and matches the expected dimension.
 *
 * @param {Array<number>} vector
 * @param {number} expectedDim
 * @returns {boolean}
 */
export const validateVector = (vector, expectedDim = OLLAMA_CONFIG.embeddingDimension) => {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Embedding vector must be a non-empty array");
  }
  if (vector.length !== expectedDim) {
    throw new Error(
      `Embedding vector dimension mismatch: expected ${expectedDim}, got ${vector.length}`
    );
  }
  for (let i = 0; i < vector.length; i++) {
    const val = vector[i];
    if (typeof val !== "number" || !Number.isFinite(val)) {
      throw new Error(`Embedding vector contains invalid numeric value at index ${i}: ${val}`);
    }
  }
  return true;
};

/**
 * Check if the Ollama service is reachable and the model is available.
 */
export const checkOllamaHealth = async () => {
  try {
    const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/tags`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Ollama service returned status ${response.status}`);
    }

    const data = await response.json();
    const availableModels = (data.models || []).map((m) => m.name.split(":")[0]);
    const baseRequested = OLLAMA_CONFIG.embedModel.split(":")[0];

    const modelFound = availableModels.some(
      (name) => name === baseRequested || name.startsWith(baseRequested)
    );

    return {
      healthy: true,
      availableModels: (data.models || []).map((m) => m.name),
      modelLoaded: modelFound,
    };
  } catch (error) {
    throw new Error(
      `Ollama health check failed: ${error.message}. Ensure Ollama is running at ${OLLAMA_CONFIG.baseUrl}`
    );
  }
};

/**
 * Generates an embedding vector for a single text using Ollama.
 *
 * @param {string} text - The input text to embed
 * @returns {Promise<Array<number>>} - Normalized 768-dimension vector
 */
export const generateSingleEmbedding = async (text) => {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Text must be a non-empty string to generate an embedding");
  }

  const endpoint = `${OLLAMA_CONFIG.baseUrl}/api/embed`;

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_CONFIG.embedModel,
        input: text.trim(),
      }),
    });
  } catch (netErr) {
    throw new Error(
      `Failed to connect to Ollama at ${endpoint}: ${netErr.message}. Ensure Ollama is running.`
    );
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Ollama embedding request failed [${response.status}]: ${errorBody || response.statusText}`
    );
  }

  const data = await response.json();
  const vector = data.embeddings?.[0];

  if (!vector) {
    throw new Error("Ollama returned an empty or invalid embeddings response");
  }

  validateVector(vector, OLLAMA_CONFIG.embeddingDimension);
  return vector;
};

/**
 * Generates embeddings for an array of text chunks in a batch.
 *
 * @param {Array<string>} texts - Array of string chunks
 * @returns {Promise<Array<Array<number>>>} - Array of vectors
 */
export const generateBatchEmbeddings = async (texts) => {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error("Input must be a non-empty array of strings");
  }

  const cleaned = texts.map((t) => {
    if (!t || typeof t !== "string" || t.trim().length === 0) {
      throw new Error("Batch contains empty or non-string chunk text");
    }
    return t.trim();
  });

  const endpoint = `${OLLAMA_CONFIG.baseUrl}/api/embed`;

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_CONFIG.embedModel,
        input: cleaned,
      }),
    });
  } catch (netErr) {
    throw new Error(
      `Failed to connect to Ollama at ${endpoint}: ${netErr.message}. Ensure Ollama is running.`
    );
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Ollama batch embedding request failed [${response.status}]: ${errorBody || response.statusText}`
    );
  }

  const data = await response.json();
  const embeddings = data.embeddings;

  if (!Array.isArray(embeddings) || embeddings.length !== cleaned.length) {
    throw new Error(
      `Ollama returned ${embeddings?.length || 0} embeddings for ${cleaned.length} input texts`
    );
  }

  for (const vector of embeddings) {
    validateVector(vector, OLLAMA_CONFIG.embeddingDimension);
  }

  return embeddings;
};

// Reconciled unified export object supporting both LLM chatbot and embedding services
const unifiedConfig = {
  ...ollamaConfig,
  ollamaConfig,
  OLLAMA_CONFIG,
  validateVector,
  checkOllamaHealth,
  generateSingleEmbedding,
  generateBatchEmbeddings,
};

export default unifiedConfig;
