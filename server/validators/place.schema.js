import { z } from "zod";
import { idParamSchema } from "./common.schema.js";

export const placeQuerySchema = z.object({
  theme: z.string().trim().min(1, "Theme cannot be empty").optional(),
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

export { idParamSchema };
export default {
  placeQuerySchema,
  idParamSchema,
};
