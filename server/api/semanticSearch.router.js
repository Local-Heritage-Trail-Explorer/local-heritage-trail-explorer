import { Router } from "express";
import validate from "../middlewares/validate.middleware.js";
import { semanticSearchSchema } from "../validators/ai.schema.js";
import { handleSemanticSearch } from "../controllers/semanticSearch.controller.js";

export const semanticSearchRouter = Router();

// POST /api/search/semantic
semanticSearchRouter.post(
  "/semantic",
  validate(semanticSearchSchema),
  handleSemanticSearch
);

// GET /api/search/semantic (convenience query-param handler for frontend & testing)
semanticSearchRouter.get("/semantic", (req, res, next) => {
  req.body = {
    query: req.query.query,
    limit: req.query.limit,
    placeId: req.query.placeId,
    minScore: req.query.minScore,
  };
  validate(semanticSearchSchema)(req, res, () => handleSemanticSearch(req, res, next));
});

export default semanticSearchRouter;
