import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { validate, validateQuery, validateParams } from "../middlewares/validate.middleware.js";
import { idParamSchema } from "../validators/common.schema.js";
import {
  createPlaceSchema,
  updatePlaceSchema,
  createSourceSchema,
  updateSourceSchema,
  createStorySchema,
  updateStorySchema,
  reviewDecisionSchema,
  curatorListQuerySchema,
} from "../validators/curator.schema.js";
import curatorService from "../services/curator.service.js";
import { uploadSingle } from "../middlewares/multer.middleware.js";
import { extractTextFromBuffer } from "../services/text-extraction.service.js";

const router = Router();

// Apply authentication and CURATOR role enforcement across all curator endpoints
router.use(requireAuth, requireRole("CURATOR"));

// ==========================================
// 1. PLACES
// ==========================================

router.post("/places", validate(createPlaceSchema), async (req, res, next) => {
  try {
    const place = await curatorService.createPlace(req.body);
    return res.status(201).json({
      success: true,
      data: place,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/places", validateQuery(curatorListQuerySchema), async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const places = await curatorService.getCuratorPlaces({ status, page, limit });
    return res.status(200).json({
      success: true,
      data: places,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/places/:id", validateParams(idParamSchema), validate(updatePlaceSchema), async (req, res, next) => {
  try {
    const place = await curatorService.updatePlace(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      data: place,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 2. SOURCES
// ==========================================

router.post("/sources/upload", uploadSingle("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: "MISSING_FILE",
          message: "Please upload a document file.",
        },
      });
    }

    const { text, charCount, wordCount, format } = await extractTextFromBuffer(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    const title = req.body.title || req.file.originalname;
    const attribution = req.body.attribution || "Curator Document Upload";
    const sourceType = req.body.sourceType || (format === "pdf" ? "Archival PDF" : "Historical Document");
    const filePath = `uploads/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const source = await curatorService.createSource(
      {
        title,
        attribution,
        sourceType,
        filePath,
        status: req.body.status || "pending",
      },
      req.user._id
    );

    return res.status(201).json({
      success: true,
      data: {
        source,
        extractedText: text.slice(0, 1000),
        charCount,
        wordCount,
        format,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/sources", validate(createSourceSchema), async (req, res, next) => {
  try {
    const source = await curatorService.createSource(req.body, req.user._id);
    return res.status(201).json({
      success: true,
      data: source,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/sources", validateQuery(curatorListQuerySchema), async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const sources = await curatorService.getCuratorSources({ status, page, limit });
    return res.status(200).json({
      success: true,
      data: sources,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/sources/:id", validateParams(idParamSchema), validate(updateSourceSchema), async (req, res, next) => {
  try {
    const source = await curatorService.updateSource(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      data: source,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/sources/:id/review", validateParams(idParamSchema), validate(reviewDecisionSchema), async (req, res, next) => {
  try {
    const result = await curatorService.reviewSource(req.params.id, req.body, req.user._id);
    return res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 3. STORIES
// ==========================================

router.post("/stories", validate(createStorySchema), async (req, res, next) => {
  try {
    const story = await curatorService.createStory(req.body);
    return res.status(201).json({
      success: true,
      data: story,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/stories", validateQuery(curatorListQuerySchema), async (req, res, next) => {
  try {
    const { status, placeId, page, limit } = req.query;
    const stories = await curatorService.getCuratorStories({ status, placeId, page, limit });
    return res.status(200).json({
      success: true,
      data: stories,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/stories/:id", validateParams(idParamSchema), validate(updateStorySchema), async (req, res, next) => {
  try {
    const story = await curatorService.updateStory(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      data: story,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

const handleReviewStory = async (req, res, next) => {
  try {
    const result = await curatorService.reviewStory(req.params.id, req.body, req.user._id);
    return res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

router.patch("/stories/:id/review", validateParams(idParamSchema), validate(reviewDecisionSchema), handleReviewStory);
router.post("/stories/:id/review", validateParams(idParamSchema), validate(reviewDecisionSchema), handleReviewStory);
router.patch("/stories/:id/approval", validateParams(idParamSchema), validate(reviewDecisionSchema), handleReviewStory);
router.post("/stories/:id/approval", validateParams(idParamSchema), validate(reviewDecisionSchema), handleReviewStory);

// ==========================================
// 4. CORRECTIONS REVIEW
// ==========================================

router.get("/corrections", validateQuery(curatorListQuerySchema), async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const corrections = await curatorService.getCuratorCorrections({ status, page, limit });
    return res.status(200).json({
      success: true,
      data: corrections,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/corrections/:id", validateParams(idParamSchema), async (req, res, next) => {
  try {
    const correction = await curatorService.getCuratorCorrectionById(req.params.id);
    return res.status(200).json({
      success: true,
      data: correction,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

const handleReviewCorrection = async (req, res, next) => {
  try {
    const result = await curatorService.reviewCorrection(req.params.id, req.body, req.user._id);
    return res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

router.patch("/corrections/:id/review", validateParams(idParamSchema), validate(reviewDecisionSchema), handleReviewCorrection);
router.post("/corrections/:id/review", validateParams(idParamSchema), validate(reviewDecisionSchema), handleReviewCorrection);

// ==========================================
// 5. TRAIL FEEDBACK REVIEW
// ==========================================

router.get("/feedback", validateQuery(curatorListQuerySchema), async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const feedbacks = await curatorService.getCuratorFeedback({ status, page, limit });
    return res.status(200).json({
      success: true,
      data: feedbacks,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/feedback/:id/review", validateParams(idParamSchema), validate(reviewDecisionSchema), async (req, res, next) => {
  try {
    const result = await curatorService.reviewFeedback(req.params.id, req.body, req.user._id);
    return res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 6. TRAIL / GUIDE PUBLICATION REVIEW
// ==========================================

const handleGetCuratorTrails = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const trails = await curatorService.getCuratorTrails({ status, page, limit });
    return res.status(200).json({
      success: true,
      data: trails,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

const handleGetCuratorTrailById = async (req, res, next) => {
  try {
    const trail = await curatorService.getCuratorTrailById(req.params.id);
    return res.status(200).json({
      success: true,
      data: trail,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

const handleReviewTrail = async (req, res, next) => {
  try {
    const result = await curatorService.reviewTrail(req.params.id, req.body, req.user._id);
    return res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

router.get("/review-queue", async (req, res, next) => {
  try {
    const queue = await curatorService.getReviewQueue();
    return res.status(200).json({
      success: true,
      data: queue,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/trails", validateQuery(curatorListQuerySchema), handleGetCuratorTrails);
router.get("/guides", validateQuery(curatorListQuerySchema), handleGetCuratorTrails);

router.get("/trails/:id", validateParams(idParamSchema), handleGetCuratorTrailById);
router.get("/guides/:id", validateParams(idParamSchema), handleGetCuratorTrailById);

router.patch("/trails/:id/review", validateParams(idParamSchema), validate(reviewDecisionSchema), handleReviewTrail);
router.post("/trails/:id/review", validateParams(idParamSchema), validate(reviewDecisionSchema), handleReviewTrail);

router.patch("/guides/:id/review", validateParams(idParamSchema), validate(reviewDecisionSchema), handleReviewTrail);
router.post("/guides/:id/review", validateParams(idParamSchema), validate(reviewDecisionSchema), handleReviewTrail);

export default router;
