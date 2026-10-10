import mongoose from "mongoose";

export const connectDB = async (uri) => {
  const mongoUri = uri || process.env.MONGODB_URI || "mongodb://localhost:27017/heritage_trail_db";
  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`[Database] Connected to MongoDB: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
};

export default connectDB;
