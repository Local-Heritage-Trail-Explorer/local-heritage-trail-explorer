import { Router } from "express";
import rateLimit from "express-rate-limit";
import { generateChatAnswer } from "../services/generate-chat-answer.service.js";
import { Conversation } from "../models/conversation.model.js";
import { Chunk } from "../models/chunk.model.js";
import { requireAuth, requireVerifiedEmail } from "../middlewares/auth.middleware.js";
import ollamaConfig from "../config/ollama.js";

const router = Router();

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many chat messages from this IP. Please try again after 15 minutes.",
    },
  },
});

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

  // In test environment without a configured retriever, immediately signal retriever unreadiness
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  // 1. Try semantic vector search over approved historical chunks
  try {
    const { searchSemanticStories } = await import("../services/semanticSearch.service.js");
    if (typeof searchSemanticStories === "function") {
      const results = await searchSemanticStories({ query: question, limit: 5 });
      if (Array.isArray(results) && results.length > 0) {
        return results.map((r, i) => ({
          id: r.storyId || `chunk-${i}`,
          title: r.title || "Approved Historical Document",
          text: r.content,
          sourceUrl: r.sourceUrl,
        }));
      }
    }
  } catch {
    // Vector search unavailable or index building
  }

  // 2. Fallback to approved chunks directly from database if available
  try {
    const chunks = await Chunk.find({ approvalStatus: "approved" }).limit(5).lean();
    if (Array.isArray(chunks) && chunks.length > 0) {
      return chunks.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        text: c.content,
        sourceUrl: c.sourceUrl,
      }));
    }
  } catch {
    // Continue
  }

  // 3. If explicitly enabled via environment variable for local browser testing (non-test mode)
  if (
    process.env.DEV_FALLBACK_RETRIEVER === "true" &&
    process.env.NODE_ENV !== "test"
  ) {
    return DEV_ARCHIVE_PASSAGES;
  }

  return null;
}

/**
 * Shared chat request handler
 */
export async function handleChatMessage(req, res, next) {
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

    if (question.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: "INVALID_QUESTION",
          message: "Question must not exceed 1000 characters.",
        },
      });
    }

    // 2. Validate history structure and bounds
    if (history !== undefined) {
      if (!Array.isArray(history)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            code: "INVALID_HISTORY",
            message: "History must be an array.",
          },
        });
      }

      if (history.length > 20) {
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            code: "INVALID_HISTORY",
            message: "History must not exceed 20 messages.",
          },
        });
      }
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

    // 5. Save conversation history for authenticated member
    const userId = req.user?._id || req.session?.userId;
    if (userId) {
      try {
        await Conversation.create({
          userId,
          messages: [
            {
              role: "user",
              content: question.trim(),
              timestamp: new Date().toISOString(),
            },
            {
              role: "assistant",
              content: result.answer,
              citations: result.citations,
              insufficientEvidence: result.insufficientEvidence,
              timestamp: new Date().toISOString(),
            },
          ],
        });
      } catch (err) {
        // Non-blocking log if conversation persistence fails
        console.error("[Conversation Save Notice]", err.message);
      }
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
 * GET /api/chat/history
 * Retrieve persisted conversation history for authenticated session
 */
router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user._id || req.session?.userId;
    const history = await Conversation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      data: history.map((c) => ({
        id: c._id.toString(),
        messages: c.messages,
        createdAt: c.createdAt,
      })),
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/chat
 * Generates a source-grounded answer to a historical question.
 */
router.post("/", chatLimiter, handleChatMessage);

/**
 * Specialized router for /api/heritage-chat (Strictly requiring verified member authentication)
 */
export const heritageChatRouter = Router();
heritageChatRouter.post("/", chatLimiter, requireAuth, requireVerifiedEmail, handleChatMessage);
heritageChatRouter.get("/history", requireAuth, requireVerifiedEmail, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const history = await Conversation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      data: history.map((c) => ({
        id: c._id.toString(),
        messages: c.messages,
        createdAt: c.createdAt,
      })),
      error: null,
    });
  } catch (error) {
    next(error);
  }
});
heritageChatRouter.get("/status", async (req, res) => {
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

export { router as chatRouter };
export default router;
