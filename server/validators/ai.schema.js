import { z } from "zod";

export const semanticSearchSchema = z.object({
  query: z
    .string({
      required_error: "Search query is required",
      invalid_type_error: "Search query must be a string",
    })
    .trim()
    .min(1, "Search query cannot be empty")
    .max(500, "Search query cannot exceed 500 characters"),
  limit: z
    .coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(20, "Limit cannot exceed 20")
    .default(5)
    .optional(),
  placeId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid placeId format (must be 24-char hex ObjectId)")
    .optional(),
  minScore: z
    .coerce
    .number()
    .min(0, "minScore cannot be less than 0")
    .max(1, "minScore cannot exceed 1")
    .default(0)
    .optional(),
});

export default {
  semanticSearchSchema,
};
