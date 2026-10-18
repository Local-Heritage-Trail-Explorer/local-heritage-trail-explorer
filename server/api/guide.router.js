import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { validateParams } from "../middlewares/validate.middleware.js";
import { idParamSchema } from "../validators/common.schema.js";
import guideService from "../services/guide.service.js";

const router = Router();

// Apply authentication and GUIDE role enforcement across all guide endpoints
router.use(requireAuth, requireRole("GUIDE"));

/**
 * GET /api/guide/trails
 * Retrieve trails managed by the authorized guide
 */
router.get("/trails", async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const trails = await guideService.getGuideTrails({
      guideId: req.user._id,
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
 * GET /api/guide/feedback or /api/guide/reports
 * Review visitor reports about routes and outdated information
 */
const handleGetRouteReports = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const reports = await guideService.getRouteReports({ status, page, limit });

    return res.status(200).json({
      success: true,
      data: reports,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

router.get("/feedback", handleGetRouteReports);
router.get("/reports", handleGetRouteReports);

/**
 * POST /api/guide/feedback/:id/review or PATCH /api/guide/feedback/:id
 * Moderate visitor feedback / route condition report
 */
const handleModerateReport = async (req, res, next) => {
  try {
    const result = await guideService.moderateRouteReport(
      req.params.id,
      req.body,
      req.user._id
    );

    return res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

router.patch("/feedback/:id", validateParams(idParamSchema), handleModerateReport);
router.post("/feedback/:id/review", validateParams(idParamSchema), handleModerateReport);

/**
 * POST /api/guide/trails/:id/publish
 * Review and publish eligible approved route
 */
router.post("/trails/:id/publish", validateParams(idParamSchema), async (req, res, next) => {
  try {
    const result = await guideService.publishApprovedRoute(req.params.id, req.user._id);

    return res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
