import { Router } from "express";
import { getApprovedStoryById } from "../services/story.service.js";
import { validateParams } from "../middlewares/validate.middleware.js";
import { idParamSchema } from "../validators/common.schema.js";

const router = Router();

/**
 * GET /api/stories/:id
 * Return one approved historical story, its related place, and its approved source references.
 */
router.get("/:id", validateParams(idParamSchema), async (req, res, next) => {
  try {
    const story = await getApprovedStoryById(req.params.id);

    return res.status(200).json({
      success: true,
      data: story,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
