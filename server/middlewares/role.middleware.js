export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required before checking permissions.",
        },
      });
    }

    const hasRole = allowedRoles.includes(req.user.role);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Requires one of the following roles: ${allowedRoles.join(", ")}.`,
        },
      });
    }

    next();
  };
};

export default requireRole;
