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

  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || (statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR");
  const message = err.message || "An unexpected internal server error occurred.";

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
