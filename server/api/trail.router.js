import { Router } from "express";
import { User } from "../models/user.model.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate, validateQuery, validateParams } from "../middlewares/validate.middleware.js";
import { idParamSchema } from "../validators/common.schema.js";
import {
  createTrailSchema,
  trailQuerySchema,
  updateProgressSchema,
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
router.get("/mine", requireAuth, validateQuery(trailQuerySchema), async (req, res, next) => {
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
});

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

export default router;
