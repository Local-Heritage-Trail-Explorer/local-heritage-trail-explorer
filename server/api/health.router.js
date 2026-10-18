import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

/**
 * GET /api/health
 * Purpose: Verify backend and database connectivity without authentication.
 */
router.get("/", (req, res) => {
  // Mongoose connection ready states:
  // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    return res.status(200).json({
      success: true,
      data: {
        status: "healthy",
        database: "connected",
      },
      error: null,
    });
  }

  return res.status(503).json({
    success: false,
    data: {
      status: "unhealthy",
      database: "disconnected",
    },
    error: {
      code: "DATABASE_UNAVAILABLE",
      message: "Database connection is unavailable.",
    },
  });
});

export default router;
