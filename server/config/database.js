import mongoose from "mongoose";
import dns from "dns";

export const connectDB = async (uri) => {
  const mongoUri = uri || process.env.MONGODB_URI || "mongodb://localhost:27017/heritage_trail_db";
  try {
    // If using an SRV connection string on Windows, configure reliable public DNS servers
    // to avoid querySrv ECONNREFUSED errors from local network resolvers
    if (mongoUri.startsWith("mongodb+srv://")) {
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
      } catch (dnsErr) {
        // Fallback silently if custom DNS setting is restricted
      }
    }

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
