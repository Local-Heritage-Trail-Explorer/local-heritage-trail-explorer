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

router.patch("/stories/:id/review", validateParams(idParamSchema), validate(reviewDecisionSchema), async (req, res, next) => {
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
});

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

router.patch("/corrections/:id/review", validateParams(idParamSchema), validate(reviewDecisionSchema), async (req, res, next) => {
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
});

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

export default router;
