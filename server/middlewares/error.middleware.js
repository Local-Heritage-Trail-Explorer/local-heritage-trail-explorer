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
  console.error(`[Global Error Handler] ${err.stack || err.message || err}`);

  // Handle MongoDB duplicate key error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      success: false,
      data: null,
      error: {
        code: "DUPLICATE_ENTRY",
        message: `An account or record with this ${field} already exists.`,
      },
    });
  }

  // Check if error is caused by MongoDB being disconnected or unreachable
  const isDbUnavailableError =
    err.name === "MongoNetworkError" ||
    err.name === "MongooseServerSelectionError" ||
    (err.name === "MongooseError" && typeof err.message === "string" && err.message.includes("buffering timed out"));

  const statusCode = isDbUnavailableError ? 503 : err.statusCode || err.status || 500;
  const errorCode = isDbUnavailableError
    ? "DATABASE_UNAVAILABLE"
    : err.code || (statusCode === 404 ? "NOT_FOUND" : statusCode === 400 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR");

  const message = isDbUnavailableError
    ? "Database connection is unavailable."
    : err.message || "An unexpected internal server error occurred.";

  res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code: errorCode,
      message,
    },
  });
};

export default errorHandler;
