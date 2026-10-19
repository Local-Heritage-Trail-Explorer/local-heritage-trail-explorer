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

/**
 * Zod schema for visitor submitting a correction for a heritage place via /api/places/:id/corrections
 */
export const placeCorrectionSchema = z
  .object({
    description: z
      .string()
      .trim()
      .min(5, "Description must be at least 5 characters")
      .max(2000, "Description cannot exceed 2000 characters")
      .optional(),
    proposedCorrection: z
      .string()
      .trim()
      .min(5, "Proposed correction must be at least 5 characters")
      .max(2000, "Proposed correction cannot exceed 2000 characters")
      .optional(),
    evidence: z
      .string()
      .trim()
      .max(2000, "Evidence cannot exceed 2000 characters")
      .optional(),
  })
  .refine((data) => data.description || data.proposedCorrection, {
    message: "Either description or proposedCorrection is required.",
    path: ["description"],
  });

export default {
  submitCorrectionSchema,
  placeCorrectionSchema,
};
