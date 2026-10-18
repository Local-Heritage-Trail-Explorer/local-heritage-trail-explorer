import { ChatOllama } from "@langchain/ollama";
import ollamaConfig from "../config/ollama.js";

let activeChatModel = null;

/**
 * Creates an instance of the ChatOllama model with project configuration.
 * @param {Object} [overrides={}]
 * @returns {ChatOllama}
 */
export function createChatModel(overrides = {}) {
  const baseUrl = overrides.baseUrl || ollamaConfig.baseUrl;
  const model = overrides.model || ollamaConfig.model;
  const timeout = overrides.timeoutMs || ollamaConfig.timeoutMs;

  return new ChatOllama({
    baseUrl,
    model,
    temperature: overrides.temperature ?? 0,
    requestTimeout: timeout,
    ...overrides,
  });
}

/**
 * Retrieves the current default ChatOllama instance, initializing if needed.
 * @returns {ChatOllama}
 */
export function getChatModel() {
  if (!activeChatModel) {
    activeChatModel = createChatModel();
  }
  return activeChatModel;
}

/**
 * Injects a mock or custom LLM model instance (useful for unit tests).
 * @param {Object|null} modelInstance
 */
export function setChatModel(modelInstance) {
  activeChatModel = modelInstance;
}

/**
 * Invokes Ollama through LangChain's JavaScript ChatOllama integration.
 *
 * @param {string} prompt - The prompt text to send to the model.
 * @param {Object} [options={}] - Optional overrides or custom model instance.
 * @returns {Promise<string>} The trimmed text response from the model.
 */
export async function generateWithOllama(prompt, options = {}) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    const error = new Error("Prompt must be a non-empty string.");
    error.code = "INVALID_PROMPT";
    error.status = 400;
    throw error;
  }

  const model = options.model || getChatModel();

  try {
    const response = await model.invoke(prompt);

    let content = "";
    if (typeof response?.content === "string") {
      content = response.content;
    } else if (Array.isArray(response?.content)) {
      content = response.content
        .map((part) => (typeof part === "string" ? part : part?.text || ""))
        .join("");
    } else if (response?.content != null) {
      content = String(response.content);
    }

    if (!content.trim()) {
      const error = new Error("The local AI model returned an empty response.");
      error.code = "LLM_EMPTY_RESPONSE";
      error.status = 502;
      throw error;
    }

    return content.trim();
  } catch (err) {
    // If it's already a categorized error with status 400 or 502, rethrow
    if (err.status && err.code) {
      throw err;
    }

    const message = err.message || "";
    const isTimeout =
      err.name === "AbortError" ||
      err.name === "TimeoutError" ||
      message.toLowerCase().includes("timeout") ||
      message.toLowerCase().includes("timed out");

    const isConnectionError =
      message.includes("ECONNREFUSED") ||
      message.includes("fetch failed") ||
      message.includes("ENOTFOUND") ||
      message.includes("Failed to fetch") ||
      message.includes("ConnectTimeoutError");

    const error = new Error();

    if (isTimeout) {
      error.message = "The local AI service timed out while generating a response.";
      error.code = "LLM_TIMEOUT";
      error.status = 504;
    } else if (isConnectionError) {
      error.message = "The local AI service (Ollama) is unavailable or not running.";
      error.code = "LLM_UNAVAILABLE";
      error.status = 503;
    } else {
      error.message = "An error occurred while communicating with the local AI service.";
      error.code = "LLM_ERROR";
      error.status = 502;
    }

    throw error;
  }
}
