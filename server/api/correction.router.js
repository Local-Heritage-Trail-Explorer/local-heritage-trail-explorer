import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
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

export default router;
