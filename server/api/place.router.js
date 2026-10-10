import { Router } from "express";
import { getApprovedPlaces } from "../services/place.service.js";
import { validateQuery } from "../middlewares/validate.middleware.js";
import { placeQuerySchema } from "../validators/place.schema.js";

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

export default router;
