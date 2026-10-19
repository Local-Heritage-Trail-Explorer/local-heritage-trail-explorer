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

export const trailAgentGenerateSchema = z.object({
  theme: z.string().trim().max(100, "Theme cannot exceed 100 characters").optional(),
  maxMinutes: z
    .coerce
    .number()
    .int("maxMinutes must be an integer")
    .min(15, "Duration must be at least 15 minutes")
    .max(720, "Duration cannot exceed 720 minutes (12 hours)")
    .default(120)
    .optional(),
  preferredPlaceIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid preferredPlaceId format"))
    .max(20, "Cannot specify more than 20 preferred places")
    .optional(),
  startZone: z.string().trim().max(100, "startZone cannot exceed 100 characters").optional(),
  userPrompt: z.string().trim().max(1000, "userPrompt cannot exceed 1000 characters").optional(),
  saveImmediately: z.boolean().default(false).optional(),
});

export default {
  semanticSearchSchema,
  trailAgentGenerateSchema,
};
