import { z } from "zod";
import { objectIdSchema } from "./common.schema.js";

/**
 * Zod schema for user submitting a correction for a heritage place
 */
export const submitCorrectionSchema = z.object({
  placeId: objectIdSchema,
  description: z
    .string({ required_error: "Description is required" })
    .trim()
    .min(5, "Description must be at least 5 characters")
    .max(2000, "Description cannot exceed 2000 characters"),
});

export default {
  submitCorrectionSchema,
};
