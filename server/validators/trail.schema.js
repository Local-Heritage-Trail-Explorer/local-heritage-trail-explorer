import { z } from "zod";
import { objectIdSchema } from "./common.schema.js";

/**
 * Validation schema for creating a new trail (POST /api/trails)
 */
export const createTrailSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .trim()
    .min(1, "Title cannot be empty")
    .max(200, "Title cannot exceed 200 characters"),
  theme: z
    .string({ required_error: "Theme is required" })
    .trim()
    .min(1, "Theme cannot be empty"),
  stops: z
    .array(objectIdSchema, { required_error: "Stops are required" })
    .min(1, "Trail must contain at least one stop"),
  estimatedMinutes: z
    .number()
    .int("Estimated minutes must be an integer")
    .positive("Estimated minutes must be greater than 0")
    .optional(),
});

/**
 * Validation schema for listing user trails query parameters (GET /api/trails/mine)
 */
export const trailQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: "Page must be a valid number" })
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: "Limit must be a valid number" })
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10),
});

/**
 * Validation schema for updating trail progress (PATCH /api/trails/:id/progress)
 */
export const updateProgressSchema = z.object({
  placeId: objectIdSchema,
});

export default {
  createTrailSchema,
  trailQuerySchema,
  updateProgressSchema,
};
