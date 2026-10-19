import { Router } from "express";
import {
  getApprovedStoryById,
  getApprovedStories,
  reviewStoryApproval,
} from "../services/story.service.js";
import { validateParams, validate } from "../middlewares/validate.middleware.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { idParamSchema } from "../validators/common.schema.js";
import { reviewDecisionSchema } from "../validators/curator.schema.js";

const router = Router();

/**
 * GET /api/stories
 * Return approved historical stories with pagination.
 */
router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const stories = await getApprovedStories({ page, limit: parseInt(limit, 10) || 50 });

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

const handleStoryApproval = async (req, res, next) => {
  try {
    const result = await reviewStoryApproval(req.params.id, req.body, req.user._id);

    return res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/stories/:id/approval and aliases
 * Approve or reject stories (Curator only).
 */
router.post(
  "/:id/approval",
  requireAuth,
  requireRole("CURATOR"),
  validateParams(idParamSchema),
  validate(reviewDecisionSchema),
  handleStoryApproval
);

router.patch(
  "/:id/approval",
  requireAuth,
  requireRole("CURATOR"),
  validateParams(idParamSchema),
  validate(reviewDecisionSchema),
  handleStoryApproval
);

router.post(
  "/:id/review",
  requireAuth,
  requireRole("CURATOR"),
  validateParams(idParamSchema),
  validate(reviewDecisionSchema),
  handleStoryApproval
);

router.patch(
  "/:id/review",
  requireAuth,
  requireRole("CURATOR"),
  validateParams(idParamSchema),
  validate(reviewDecisionSchema),
  handleStoryApproval
);

export default router;
