export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error.name === "ZodError") {
        const issueMessages = error.errors.map((e) => e.message).join("; ");
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: issueMessages || "Invalid input data provided",
          },
        });
      }
      next(error);
    }
  };
};

export default validate;
