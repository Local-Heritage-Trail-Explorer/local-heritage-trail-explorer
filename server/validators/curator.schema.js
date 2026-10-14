import { z } from "zod";
import { objectIdSchema } from "./common.schema.js";

/**
 * Zod schema for curator creating a new Place
 */
export const createPlaceSchema = z.object({
  name: z.string({ required_error: "Name is required" }).trim().min(1, "Name cannot be empty"),
  description: z.string({ required_error: "Description is required" }).trim().min(1, "Description cannot be empty"),
  zone: z.string({ required_error: "Zone is required" }).trim().min(1, "Zone cannot be empty"),
  themes: z.array(z.string().trim().min(1, "Theme cannot be empty"), { required_error: "Themes are required" }).min(1, "At least one theme is required"),
  openingHours: z.record(z.any()).optional().default({}),
  hoursVerification: z.string({ required_error: "Hours verification is required" }).trim().min(1, "Hours verification is required"),
  estimatedVisitMinutes: z.number().int().positive().optional(),
  status: z.enum(["draft", "pending", "approved", "rejected"]).optional().default("pending"),
});

/**
 * Zod schema for curator updating an existing Place
 */
export const updatePlaceSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").optional(),
  description: z.string().trim().min(1, "Description cannot be empty").optional(),
  zone: z.string().trim().min(1, "Zone cannot be empty").optional(),
  themes: z.array(z.string().trim().min(1)).min(1, "At least one theme is required").optional(),
  openingHours: z.record(z.any()).optional(),
  hoursVerification: z.string().trim().min(1).optional(),
  estimatedVisitMinutes: z.number().int().positive().optional(),
  status: z.enum(["draft", "pending", "approved", "rejected"]).optional(),
});

/**
 * Zod schema for curator creating a new Source
 */
export const createSourceSchema = z
  .object({
    title: z.string({ required_error: "Title is required" }).trim().min(1, "Title cannot be empty"),
    attribution: z.string({ required_error: "Attribution is required" }).trim().min(1, "Attribution cannot be empty"),
    sourceType: z.string({ required_error: "Source type is required" }).trim().min(1, "Source type is required"),
    url: z.string().trim().url("Invalid URL format").optional().or(z.literal("")),
    filePath: z.string().trim().optional(),
    status: z.enum(["draft", "pending", "approved", "rejected"]).optional().default("pending"),
  })
  .refine(
    (data) => (data.url && data.url.length > 0) || (data.filePath && data.filePath.length > 0),
    {
      message: "Either URL or filePath must be provided",
      path: ["url"],
    }
  );

/**
 * Zod schema for curator updating an existing Source
 */
export const updateSourceSchema = z.object({
  title: z.string().trim().min(1).optional(),
  attribution: z.string().trim().min(1).optional(),
  sourceType: z.string().trim().min(1).optional(),
  url: z.string().trim().url("Invalid URL format").optional().or(z.literal("")),
  filePath: z.string().trim().optional(),
  status: z.enum(["draft", "pending", "approved", "rejected"]).optional(),
});

/**
 * Zod schema for curator creating a new Story
 */
export const createStorySchema = z.object({
  placeId: objectIdSchema,
  title: z.string({ required_error: "Title is required" }).trim().min(1, "Title cannot be empty"),
  content: z.string({ required_error: "Content is required" }).trim().min(1, "Content cannot be empty"),
  sourceIds: z
    .array(objectIdSchema, { required_error: "Source references are required" })
    .min(1, "At least one source reference is required"),
  claimType: z.string({ required_error: "Claim type is required" }).trim().min(1, "Claim type is required"),
  status: z.enum(["draft", "pending", "approved", "rejected"]).optional().default("pending"),
});

/**
 * Zod schema for curator updating an existing Story
 */
export const updateStorySchema = z.object({
  placeId: objectIdSchema.optional(),
  title: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).optional(),
  sourceIds: z.array(objectIdSchema).min(1).optional(),
  claimType: z.string().trim().min(1).optional(),
  status: z.enum(["draft", "pending", "approved", "rejected"]).optional(),
});

/**
 * Zod schema for curator review decisions (approve / reject)
 */
export const reviewDecisionSchema = z.object({
  status: z.enum(["approved", "rejected"], {
    required_error: "Decision status must be either 'approved' or 'rejected'",
  }),
  notes: z.string().trim().optional(),
});

/**
 * Zod schema for curator listing query parameters
 */
export const curatorListQuerySchema = z.object({
  status: z.string().trim().optional(),
  placeId: objectIdSchema.optional(),
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

export default {
  createPlaceSchema,
  updatePlaceSchema,
  createSourceSchema,
  updateSourceSchema,
  createStorySchema,
  updateStorySchema,
  reviewDecisionSchema,
  curatorListQuerySchema,
};
