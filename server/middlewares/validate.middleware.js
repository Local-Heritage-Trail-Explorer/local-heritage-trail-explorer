/**
 * Middleware factory to validate query parameters with a Zod schema
 */
export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const message = result.error.errors.map((e) => `${e.path.join(".") || "query"}: ${e.message}`).join("; ");
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message,
      },
    });
  }
  req.query = result.data;
  next();
};

/**
 * Middleware factory to validate path parameters with a Zod schema
 */
export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    const isIdError = result.error.errors.some((e) => e.path.includes("id"));
    const message = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: isIdError ? "INVALID_ID" : "VALIDATION_ERROR",
        message,
      },
    });
  }
  req.params = result.data;
  next();
};

export default {
  validateQuery,
  validateParams,
};
