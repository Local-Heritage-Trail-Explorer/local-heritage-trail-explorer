/**
 * Custom API Error class for operational errors
 */
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
};

/**
 * Centralized error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Check if error is caused by MongoDB being disconnected or unreachable
  const isDbUnavailableError =
    err.name === "MongoNetworkError" ||
    err.name === "MongooseServerSelectionError" ||
    (err.name === "MongooseError" && typeof err.message === "string" && err.message.includes("buffering timed out"));

  const status = isDbUnavailableError ? 503 : err.status || err.statusCode || 500;
  const code = isDbUnavailableError
    ? "DATABASE_UNAVAILABLE"
    : err.code || (status === 404 ? "NOT_FOUND" : status === 400 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR");

  // Safe message that does not expose internal secrets or stack traces
  const message = isDbUnavailableError
    ? "Database connection is unavailable."
    : err.message || "An unexpected error occurred.";

  res.status(status).json({
    success: false,
    data: null,
    error: {
      code,
      message,
    },
  });
};

export default errorHandler;
