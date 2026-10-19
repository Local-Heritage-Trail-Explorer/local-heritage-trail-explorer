import { Router } from "express";
import {
  getApprovedPlaces,
  getApprovedPlaceById,
  getApprovedPlaceStories,
  submitPlaceCorrection,
  updatePlaceFactual,
} from "../services/place.service.js";
import { validateQuery, validateParams, validate } from "../middlewares/validate.middleware.js";
import { requireAuth, requireVerifiedEmail } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { placeQuerySchema } from "../validators/place.schema.js";
import { idParamSchema } from "../validators/common.schema.js";
import { updatePlaceSchema } from "../validators/curator.schema.js";
import { placeCorrectionSchema } from "../validators/correction.schema.js";

const router = Router();

/**
 * GET /api/places
 * Return published/approved Tirumala heritage places for public browsing.
 */
router.get("/", validateQuery(placeQuerySchema), async (req, res, next) => {
  try {
    const { theme, page, limit } = req.query;
    const places = await getApprovedPlaces({ theme, page, limit });

    return res.status(200).json({
      success: true,
      data: places,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/places/:id
 * Return approved place details for public browsing.
 */
router.get("/:id", validateParams(idParamSchema), async (req, res, next) => {
  try {
    const place = await getApprovedPlaceById(req.params.id);

    return res.status(200).json({
      success: true,
      data: place,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/places/:id/stories
 * Return approved stories associated with this place.
 */
router.get("/:id/stories", validateParams(idParamSchema), async (req, res, next) => {
  try {
    const stories = await getApprovedPlaceStories(req.params.id);

    return res.status(200).json({
      success: true,
      data: stories,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/places/:id/corrections
 * Submit a factual correction for curator review (authenticated visitor or member).
 */
router.post(
  "/:id/corrections",
  requireAuth,
  requireVerifiedEmail,
  validateParams(idParamSchema),
  validate(placeCorrectionSchema),
  async (req, res, next) => {
  try {
    const correction = await submitPlaceCorrection(
      req.params.id,
      req.body,
      req.user._id
    );

    return res.status(201).json({
      success: true,
      data: correction,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/places/:id
 * Edit factual location records (curator only).
 */
router.patch(
  "/:id",
  requireAuth,
  requireRole("CURATOR"),
  validateParams(idParamSchema),
  validate(updatePlaceSchema),
  async (req, res, next) => {
    try {
      const updated = await updatePlaceFactual(
        req.params.id,
        req.body,
        req.user._id
      );

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

export default router;
