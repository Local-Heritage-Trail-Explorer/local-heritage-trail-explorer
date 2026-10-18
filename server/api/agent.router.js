import { Router } from "express";
import { requireAuth, requireVerifiedEmail } from "../middlewares/auth.middleware.js";
import { generateTrailPlan } from "../services/trail-agent.service.js";
import { createTrail } from "../services/trail.service.js";

const router = Router();

/**
 * GET /api/trail-agent/status
 * Public status endpoint to check Trail Agent availability.
 */
router.get("/status", (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      service: "trail-agent",
      status: "operational",
      version: "1.0.0",
    },
    error: null,
  });
});

/**
 * POST /api/trail-agent/generate
 * Generates an intelligent trail itinerary customized for the visitor.
 * Protected by authentication and email verification middleware.
 */
router.post(
  "/generate",
  requireAuth,
  requireVerifiedEmail,
  async (req, res, next) => {
    try {
      const {
        theme,
        maxMinutes,
        preferredPlaceIds,
        startZone,
        userPrompt,
        saveImmediately = false,
      } = req.body ?? {};

      const plan = await generateTrailPlan({
        theme,
        maxMinutes,
        preferredPlaceIds,
        startZone,
        userPrompt,
      });

      // Optionally save as a private user trail immediately
      let savedTrail = null;
      if (saveImmediately && req.user?._id) {
        try {
          savedTrail = await createTrail({
            title: plan.title,
            theme: plan.theme,
            stops: plan.stops,
            estimatedMinutes: plan.estimatedMinutes,
            userId: req.user._id,
          });
        } catch {
          // If direct database persistence fails in restricted environments,
          // continue returning the generated plan safely
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          ...plan,
          savedTrail,
        },
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/trail-agent
 * Alias for POST /api/trail-agent/generate
 */
router.post(
  "/",
  requireAuth,
  requireVerifiedEmail,
  async (req, res, next) => {
    try {
      const {
        theme,
        maxMinutes,
        preferredPlaceIds,
        startZone,
        userPrompt,
        saveImmediately = false,
      } = req.body ?? {};

      const plan = await generateTrailPlan({
        theme,
        maxMinutes,
        preferredPlaceIds,
        startZone,
        userPrompt,
      });

      return res.status(200).json({
        success: true,
        data: plan,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
