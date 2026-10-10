import session from "express-session";
import MongoStore from "connect-mongo";

export const configureSession = (customStore) => {
  const isProd = process.env.NODE_ENV === "production";
  const sessionSecret = process.env.SESSION_SECRET || "dev_heritage_trail_session_secret_key_2026";
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/heritage_trail_db";

  let store;
  if (customStore) {
    store = customStore;
  } else if (process.env.NODE_ENV === "test" && !process.env.MONGODB_URI) {
    // MemoryStore for isolated unit/integration testing if Mongo URI not provided
    store = new session.MemoryStore();
  } else {
    store = MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60, // 7 days in seconds
    });
  }

  return session({
    name: "heritage.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    },
  });
};

export default configureSession;
