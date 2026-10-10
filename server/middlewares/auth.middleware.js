import User from "../models/user.model.js";

export const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required. Please log in.",
        },
      });
    }

    const user = await User.findById(req.session.userId).select("-passwordHash -verificationTokenHash -resetPasswordTokenHash");

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "User session is no longer valid.",
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireVerifiedEmail = (req, res, next) => {
  if (!req.user || !req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      data: null,
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Email verification is required to access this feature.",
      },
    });
  }
  next();
};

export default requireAuth;
