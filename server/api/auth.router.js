import { Router } from "express";
import rateLimit from "express-rate-limit";
import authService from "../services/auth.service.js";
import validate from "../middlewares/validate.middleware.js";
import requireAuth from "../middlewares/auth.middleware.js";
import {
  signupSchema,
  verifyEmailSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.schema.js";

export const authRouter = Router();

const isTest = process.env.NODE_ENV === "test";

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many login attempts from this IP. Please try again after 15 minutes.",
    },
  },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many accounts created from this IP. Please try again later.",
    },
  },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many password reset requests from this IP. Please try again later.",
    },
  },
});

// 1. POST /api/auth/signup
authRouter.post("/signup", signupLimiter, validate(signupSchema), async (req, res, next) => {
  try {
    const result = await authService.signup(req.body);
    res.status(201).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// 2. POST /api/auth/verify-email
authRouter.post("/verify-email", validate(verifyEmailSchema), async (req, res, next) => {
  try {
    const result = await authService.verifyEmail(req.body);
    res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// 3. POST /api/auth/login
authRouter.post("/login", loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login({ ...req.body, req });
    res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// 4. POST /api/auth/logout
authRouter.post("/logout", async (req, res, next) => {
  try {
    const result = await authService.logout({ req, res });
    res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// 5. POST /api/auth/forgot-password
authRouter.post("/forgot-password", forgotPasswordLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body);
    res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// 6. POST /api/auth/reset-password
authRouter.post("/reset-password", validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const sessionStore = req.sessionStore;
    const result = await authService.resetPassword({ ...req.body, sessionStore });
    res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

// 7. GET /api/auth/me
authRouter.get("/me", requireAuth, (req, res, next) => {
  try {
    const result = authService.getMe(req.user);
    res.status(200).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

export default authRouter;
