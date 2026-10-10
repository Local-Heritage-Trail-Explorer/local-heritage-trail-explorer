import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/database.js";
import healthRouter from "./api/health.router.js";
import placeRouter from "./api/place.router.js";
import storyRouter from "./api/story.router.js";
import sourceRouter from "./api/source.router.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/health", healthRouter);
app.use("/api/places", placeRouter);
app.use("/api/stories", storyRouter);
app.use("/api/sources", sourceRouter);

// Undefined routes handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const isMainModule = () => {
  if (!process.argv[1]) return false;
  try {
    const currentFile = fileURLToPath(import.meta.url);
    return path.resolve(currentFile).toLowerCase() === path.resolve(process.argv[1]).toLowerCase();
  } catch {
    return false;
  }
};

if (isMainModule() && process.env.NODE_ENV !== "test") {
  connectDB();
  app.listen(PORT, () => {
    console.log(`Heritage Trail Explorer Server running on port ${PORT}`);
  });
}

export default app;
