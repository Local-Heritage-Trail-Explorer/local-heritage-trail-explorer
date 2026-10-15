import { z } from "zod";

/**
 * MongoDB ObjectId validator (24 hex characters)
 */
export const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = z
  .string({ required_error: "ID is required" })
  .trim()
  .regex(objectIdRegex, "Invalid ID format. Must be a 24-character hexadecimal string.");

export const idParamSchema = z.object({
  id: objectIdSchema,
});
