import crypto from "crypto";

export const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const csrfProtection = (req, res, next) => {
  let csrfToken = req.cookies?.["XSRF-TOKEN"];
  if (!csrfToken) {
    csrfToken = generateCsrfToken();
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("XSRF-TOKEN", csrfToken, {
      httpOnly: false, // Accessible by client JS to attach to x-csrf-token header
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  req.csrfToken = csrfToken;
  if (req.session) {
    req.session.csrfToken = csrfToken;
  }

  // Safe HTTP methods do not require CSRF header validation
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const clientToken = req.headers["x-csrf-token"] || req.body?._csrf;

  if (
    !clientToken ||
    !csrfToken ||
    clientToken.length !== csrfToken.length ||
    !crypto.timingSafeEqual(Buffer.from(clientToken), Buffer.from(csrfToken))
  ) {
    return res.status(403).json({
      success: false,
      data: null,
      error: {
        code: "EBADCSRFTOKEN",
        message: "Invalid or missing CSRF token. Please refresh the page.",
      },
    });
  }

  next();
};

export default csrfProtection;
