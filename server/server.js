import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import dotenv from "dotenv";


import connectDB from "./config/database.js";
import configureSession from "./config/session.js";
import csrfProtection from "./middlewares/csrf.middleware.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

import authRouter from "./api/auth.router.js";
import healthRouter from "./api/health.router.js";
import placeRouter from "./api/place.router.js";
import storyRouter from "./api/story.router.js";
import sourceRouter from "./api/source.router.js";
import trailRouter from "./api/trail.router.js";
import curatorRouter from "./api/curator.router.js";
import correctionRouter from "./api/correction.router.js";
import semanticSearchRouter from "./api/semanticSearch.router.js";
import chatRouter from "./api/chat.router.js";


dotenv.config();

export const createApp = (sessionStore) => {
  const app = express();

  // 1. CORS Configuration
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  app.use(
    cors({
      origin: clientOrigin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
    })
  );

  // 2. Parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // 3. Session & CSRF
  app.use(configureSession(sessionStore));
  app.use(csrfProtection);

  // 4. API Routes
  app.use("/api/auth", authRouter);
  app.use("/api/health", healthRouter);
  app.use("/api/places", placeRouter);
  app.use("/api/stories", storyRouter);
  app.use("/api/sources", sourceRouter);
  app.use("/api/trails", trailRouter);
  app.use("/api/curator", curatorRouter);
  app.use("/api/corrections", correctionRouter);
  app.use("/api/search", semanticSearchRouter);
  app.use("/api/chat", chatRouter);


  // CSRF token retrieval endpoint
  app.get("/api/csrf-token", (req, res) => {
    const token = req.csrfToken || req.cookies?.["XSRF-TOKEN"] || "";
    res.status(200).json({
      success: true,
      data: { csrfToken: token },
      error: null,
    });
  });

  // 5. Undefined routes handler
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === "test" && (req.path.startsWith("/api/test-") || req.path.startsWith("/test-"))) {
      return next();
    }
    return notFoundHandler(req, res, next);
  });


  // 6. Global Error Handler
  app.use(errorHandler);

  return app;
};

const app = createApp(process.env.NODE_ENV === "test" ? new session.MemoryStore() : undefined);


const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[Server] Local Heritage Trail Explorer Backend running on port ${PORT}`);
    });
  });
}

export default app;
