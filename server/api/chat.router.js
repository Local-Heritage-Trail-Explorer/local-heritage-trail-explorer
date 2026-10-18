import { Router } from "express";
import { generateChatAnswer } from "../services/generate-chat-answer.service.js";
import ollamaConfig from "../config/ollama.js";

const router = Router();

// Pluggable retriever hook for tests and Member 7 integration
let customRetriever = null;

/**
 * Allows injecting or configuring a custom retrieval function (e.g. for testing).
 * @param {Function|null} retrieverFn - Function accepting (question) and returning Promise<Array<Passage>>
 */
export function setCustomRetriever(retrieverFn) {
  customRetriever = retrieverFn;
}

// Curated historical archival passages for development testing when DEV_FALLBACK_RETRIEVER=true
const DEV_ARCHIVE_PASSAGES = [
  {
    id: "ttd-arch-01",
    title: "Epigraphia Tirupati — Vol. IV: Vijayanagara Inscriptions",
    page: 112,
    text: "In the cyclic year Dhatri (1516 CE), Emperor Sri Krishnadevaraya visited the shrine of Lord Venkateswara and consecrated the gilded copper roofing on the Ananda Nilaya vimana, offering several jeweled crowns.",
  },
  {
    id: "ttd-water-03",
    title: "Sacred Water Bodies of Tirumala Hills",
    page: 24,
    text: "Swami Pushkarini is an ancient sacred water tank measuring approximately 1.5 acres situated immediately north of the Sri Venkateswara Temple. Legends hold that Garuda brought it from Vaikuntha for the sport of the Lord.",
  },
  {
    id: "ttd-paths-02",
    title: "Pilgrim Footpaths of Seshachalam",
    page: 55,
    text: "The ancient stone step footpath commences from Alipiri at the base of the Tirupati hills, spanning 3,550 steps across approximately 9 kilometers to reach the summit at Tirumala.",
  },
];

/**
 * Retrieves approved historical passages using server-side retrieval.
 * Strictly ignores any client-supplied passages to prevent prompt injection.
 *
 * @param {string} question
 * @returns {Promise<Array<Object>|null>} Array of passages if retriever is ready, or null if unconfigured
 */
async function getApprovedPassages(question) {
  if (typeof customRetriever === "function") {
    return await customRetriever(question);
  }

  // Inspect Member 7's vector-search service if implemented
  try {
    const vectorModule = await import("../services/vector-search.service.js");
    const retrieverFn =
      vectorModule.searchSimilarPassages ||
      vectorModule.retrievePassages ||
      vectorModule.vectorSearch ||
      vectorModule.default;

    if (typeof retrieverFn === "function") {
      const results = await retrieverFn(question);
      if (Array.isArray(results) && results.length > 0) {
        return results;
      }
    }
  } catch {
    // Retriever service is not ready or throws unconfigured error
  }

  // If explicitly enabled via environment variable for local browser testing (non-test mode)
  if (
    process.env.DEV_FALLBACK_RETRIEVER === "true" &&
    process.env.NODE_ENV !== "test"
  ) {
    return DEV_ARCHIVE_PASSAGES;
  }

  return null;
}

/**
 * GET /api/chat/status
 * Returns operational status of LLM config and retriever integration.
 */
router.get("/status", async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: "heritage-chat",
      model: ollamaConfig.model,
      retrieverReady: customRetriever !== null,
    },
    error: null,
  });
});

/**
 * POST /api/chat
 * Generates a source-grounded answer to a historical question.
 */
router.post("/", async (req, res, next) => {
  try {
    const { question, history } = req.body ?? {};

    // 1. Validate question
    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: "INVALID_QUESTION",
          message: "A non-empty question is required.",
        },
      });
    }

    // 2. Validate history structure
    if (history !== undefined && !Array.isArray(history)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: "INVALID_HISTORY",
          message: "History must be an array.",
        },
      });
    }

    // 3. Retrieve approved historical evidence
    // Security note: We strictly disregard any client-provided passages in req.body.
    const passages = await getApprovedPassages(question.trim());

    if (passages === null) {
      return res.status(503).json({
        success: false,
        data: null,
        error: {
          code: "RETRIEVER_NOT_READY",
          message:
            "Historical document retrieval is not configured yet. Awaiting integration with approved heritage vector search.",
        },
      });
    }

    // 4. Generate answer and validate citations
    const result = await generateChatAnswer({
      question: question.trim(),
      passages,
      history,
    });

    if (result.serviceUnavailable) {
      return res.status(503).json({
        success: false,
        data: null,
        error: {
          code: "LLM_UNAVAILABLE",
          message:
            result.answer ||
            "The local AI service is currently unavailable. Please try again later.",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        answer: result.answer,
        citations: result.citations,
        insufficientEvidence: result.insufficientEvidence,
        suggestedFollowUps: result.suggestedFollowUps || [],
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

export { router as chatRouter };
export default router;
