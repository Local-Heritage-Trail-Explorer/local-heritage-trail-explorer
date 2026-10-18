import { Router } from "express";
import { User } from "../models/user.model.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate, validateQuery, validateParams } from "../middlewares/validate.middleware.js";
import { idParamSchema } from "../validators/common.schema.js";
import {
  createTrailSchema,
  trailQuerySchema,
  updateProgressSchema,
  submitFeedbackSchema,
  updateFeedbackSchema,
  trailAndFeedbackParamsSchema,
} from "../validators/trail.schema.js";
import trailService from "../services/trail.service.js";

const router = Router();

/**
 * Optional authentication helper to populate req.user if a session exists
 * without rejecting unauthenticated requests immediately.
 */
const optionalAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId).select(
        "-passwordHash -verificationTokenHash -resetPasswordTokenHash"
      );
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/trails
 * Retrieve approved published trails for public browsing
 */
router.get("/", optionalAuth, validateQuery(trailQuerySchema), async (req, res, next) => {
  try {
    const { theme, page, limit } = req.query;
    const trails = await trailService.getPublishedTrails({
      theme,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: trails,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/trails
 * Create and save a new private trail for the authenticated user
 */
router.post("/", requireAuth, validate(createTrailSchema), async (req, res, next) => {
  try {
    const { title, theme, stops, estimatedMinutes } = req.body;
    const trail = await trailService.createTrail({
      title,
      theme,
      stops,
      estimatedMinutes,
      userId: req.user._id,
    });

    return res.status(201).json({
      success: true,
      data: trail,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/trails/mine
 * List trails belonging to the authenticated user
 */
const handleGetUserTrails = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const trails = await trailService.getUserTrails({
      userId: req.user._id,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: trails,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

router.get("/mine", requireAuth, validateQuery(trailQuerySchema), handleGetUserTrails);
router.get("/my", requireAuth, validateQuery(trailQuerySchema), handleGetUserTrails);

/**
 * GET /api/trails/:id
 * Retrieve a trail by ID with ownership checks for private trails
 */
router.get("/:id", optionalAuth, validateParams(idParamSchema), async (req, res, next) => {
  try {
    const trail = await trailService.getTrailById({
      trailId: req.params.id,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      data: trail,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/trails/:id/progress
 * Track progress and visits on a trail
 */
router.patch(
  "/:id/progress",
  requireAuth,
  validateParams(idParamSchema),
  validate(updateProgressSchema),
  async (req, res, next) => {
    try {
      const { placeId } = req.body;
      const progress = await trailService.updateTrailProgress({
        trailId: req.params.id,
        userId: req.user._id,
        placeId,
      });

      return res.status(200).json({
        success: true,
        data: progress,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/trails/:id/feedback
 * Submit feedback for a trail
 */
router.post(
  "/:id/feedback",
  requireAuth,
  validateParams(idParamSchema),
  validate(submitFeedbackSchema),
  async (req, res, next) => {
    try {
      const { description } = req.body;
      const feedback = await trailService.submitTrailFeedback({
        trailId: req.params.id,
        userId: req.user._id,
        user: req.user,
        description,
      });

      return res.status(201).json({
        success: true,
        data: feedback,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/trails/:id/feedback
 * Retrieve feedback for a trail
 */
router.get(
  "/:id/feedback",
  optionalAuth,
  validateParams(idParamSchema),
  validateQuery(trailQuerySchema),
  async (req, res, next) => {
    try {
      const { page, limit } = req.query;
      const feedbackList = await trailService.getTrailFeedback({
        trailId: req.params.id,
        user: req.user,
        page,
        limit,
      });

      return res.status(200).json({
        success: true,
        data: feedbackList,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/trails/:id/feedback/:feedbackId
 * Update feedback submitted by the authenticated user
 */
router.patch(
  "/:id/feedback/:feedbackId",
  requireAuth,
  validateParams(trailAndFeedbackParamsSchema),
  validate(updateFeedbackSchema),
  async (req, res, next) => {
    try {
      const { description } = req.body;
      const updated = await trailService.updateTrailFeedback({
        trailId: req.params.id,
        feedbackId: req.params.feedbackId,
        userId: req.user._id,
        description,
      });

      return res.status(200).json({
        success: true,
        data: updated,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/trails/:id/publish-request
 * Submit a publication review request for an owned trail
 */
const handleRequestTrailPublication = async (req, res, next) => {
  try {
    const trail = await trailService.requestTrailPublication({
      trailId: req.params.id,
      userId: req.user._id,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      data: trail,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

router.post("/:id/publish-request", requireAuth, validateParams(idParamSchema), handleRequestTrailPublication);
router.post("/:id/publication-request", requireAuth, validateParams(idParamSchema), handleRequestTrailPublication);

/**
 * POST /api/trails/:id/share-request
 * Submit a sharing / publication review request for an owned trail
 */
router.post(
  "/:id/share-request",
  requireAuth,
  validateParams(idParamSchema),
  async (req, res, next) => {
    try {
      const trail = await trailService.requestTrailSharing({
        trailId: req.params.id,
        userId: req.user._id,
        user: req.user,
      });

      return res.status(200).json({
        success: true,
        data: trail,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
