import { Router } from "express";
import {
  getApprovedSourceById,
  getApprovedSources,
  createCuratorSource,
} from "../services/source.service.js";
import { validateParams, validate } from "../middlewares/validate.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { idParamSchema } from "../validators/common.schema.js";
import { createSourceSchema } from "../validators/curator.schema.js";

const router = Router();

/**
 * GET /api/sources
 * Return approved source metadata with pagination.
 */
router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const sources = await getApprovedSources({ page, limit });

    return res.status(200).json({
      success: true,
      data: sources,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sources/:id
 * Return approved source metadata for a historical reference.
 */
router.get("/:id", validateParams(idParamSchema), async (req, res, next) => {
  try {
    const source = await getApprovedSourceById(req.params.id);

    return res.status(200).json({
      success: true,
      data: source,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sources
 * Create or upload permitted source material (Curator only).
 */
router.post(
  "/",
  requireAuth,
  requireRole("CURATOR"),
  validate(createSourceSchema),
  async (req, res, next) => {
    try {
      const source = await createCuratorSource(req.body, req.user._id);

      return res.status(201).json({
        success: true,
        data: source,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
