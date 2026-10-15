import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate, validateParams } from "../middlewares/validate.middleware.js";
import { idParamSchema } from "../validators/common.schema.js";
import { submitCorrectionSchema } from "../validators/correction.schema.js";
import correctionService from "../services/correction.service.js";

const router = Router();

/**
 * POST /api/corrections
 * Submit a user correction for a heritage place
 */
router.post("/", requireAuth, validate(submitCorrectionSchema), async (req, res, next) => {
  try {
    const { placeId, description } = req.body;
    const correction = await correctionService.submitCorrection({
      placeId,
      description,
      userId: req.user._id,
    });

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
 * GET /api/corrections/mine
 * List corrections submitted by the authenticated user
 */
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const corrections = await correctionService.getUserCorrections({
      userId: req.user._id,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      data: corrections,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/corrections/:id
 * Retrieve a single correction submitted by the authenticated user
 */
router.get("/:id", requireAuth, validateParams(idParamSchema), async (req, res, next) => {
  try {
    const correction = await correctionService.getUserCorrectionById({
      correctionId: req.params.id,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      data: correction,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
