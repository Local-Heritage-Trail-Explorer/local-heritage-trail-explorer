import mongoose from "mongoose";
import dns from "dns";

/**
 * Configure DNS servers for SRV resolution when connecting to MongoDB Atlas.
 * - By default on Windows/local networks where SRV lookups return ECONNREFUSED,
 *   falls back to reliable public DNS resolvers (Google 8.8.8.8, Cloudflare 1.1.1.1).
 * - Can be customized via DNS_SERVERS env variable (comma-separated, e.g. "8.8.8.8,1.1.1.1").
 * - Can be disabled completely by setting DNS_OVERRIDE=false.
 */
export const configureDns = () => {
  if (process.env.DNS_OVERRIDE === "false") {
    return;
  }

  try {
    const servers = process.env.DNS_SERVERS
      ? process.env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean)
      : ["8.8.8.8", "1.1.1.1"];

    if (servers.length > 0) {
      dns.setServers(servers);
    }
  } catch (err) {
    console.warn("Notice: Failed to set custom DNS servers:", err.message);
  }
};

/**
 * Safely sanitizes any error message to guarantee credentials are never logged
 */
const sanitizeMessage = (text) => {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/:\/\/([^:]+):([^@]+)@/g, "://$1:***@")
    .replace(/(password|pwd)=([^&]*)/gi, "$1=***");
};

/**
 * Categorizes MongoDB connection errors to help developers fix issues quickly
 */
const diagnoseMongoError = (error) => {
  const message = error.message || "";
  const code = error.code;
  const name = error.name || "";

  // 1. Authentication Failure
  if (
    code === 8000 ||
    message.includes("bad auth") ||
    message.includes("Authentication failed") ||
    message.includes("auth failed")
  ) {
    return {
      category: "AUTHENTICATION_FAILED",
      title: "Authentication Failed (Invalid Credentials)",
      explanation: "MongoDB Atlas rejected the database username or password.",
      suggestion:
        "Verify your username and password in server/.env. If your password contains special characters (e.g. @, :, #, %, $), make sure they are URL-encoded. Also check under 'Database Access' in Atlas that the user exists and has read/write privileges.",
    };
  }

  // 2. DNS / SRV Lookup Failure (including querySrv ECONNREFUSED)
  if (
    code === "ENOTFOUND" ||
    code === "ESERVFAIL" ||
    message.includes("querySrv") ||
    message.includes("getaddrinfo ENOTFOUND")
  ) {
    return {
      category: "DNS_SRV_LOOKUP_FAILED",
      title: "DNS / SRV Resolution Failure",
      explanation: "Node.js could not resolve the Atlas cluster hostname via DNS (" + sanitizeMessage(message) + ").",
      suggestion:
        "Check for typos in your cluster URL in server/.env. Ensure DNS_OVERRIDE is not set to false, or specify valid DNS_SERVERS (e.g. 8.8.8.8,1.1.1.1).",
    };
  }

  // 3. Network Access Denied / IP Whitelist / TLS Alert 80
  if (
    message.includes("alert number 80") ||
    message.includes("alert internal error") ||
    name === "MongooseServerSelectionError" ||
    message.includes("Server selection timed out") ||
    code === "ETIMEDOUT"
  ) {
    return {
      category: "NETWORK_TIMEOUT_OR_IP_NOT_WHITELISTED",
      title: "Network Access / IP Whitelist / TLS Rejection",
      explanation:
        "The backend could not complete connection to the MongoDB Atlas cluster. Atlas often terminates TLS (SSL alert 80) when the connecting IP is not whitelisted.",
      suggestion:
        "In MongoDB Atlas, check 'Network Access'. Ensure your current public IP address (or '0.0.0.0/0' for development) is added and its status is 'Active'. Also verify that an active VPN, firewall, or antivirus is not blocking outbound port 27017.",
    };
  }

  // 4. Connection Refused / Reset
  if (
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    message.includes("connection closed")
  ) {
    return {
      category: "CONNECTION_REFUSED",
      title: "Connection Refused / Closed",
      explanation: "The connection to the MongoDB cluster was actively refused or closed.",
      suggestion: "Verify that outbound connections on port 27017 are permitted on your current network.",
    };
  }

  // 5. Connection String URI Format Error
  if (
    name === "MongoParseError" ||
    message.includes("Invalid connection string") ||
    message.includes("Invalid scheme")
  ) {
    return {
      category: "INVALID_CONNECTION_STRING",
      title: "Invalid Connection String Format",
      explanation: "The MONGODB_URI in server/.env could not be parsed by the MongoDB driver.",
      suggestion: "Ensure the connection string begins with 'mongodb+srv://' and contains no misplaced spaces or invalid characters.",
    };
  }

  // Fallback
  return {
    category: "GENERAL_MONGODB_ERROR",
    title: name || "MongoDB Connection Error",
    explanation: sanitizeMessage(message),
    suggestion: "Review the sanitized error details above to identify the root cause.",
  };
};

/**
 * Connect to MongoDB database using Mongoose
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("Notice: MONGODB_URI is not set in environment variables. Database is disconnected.");
    return;
  }

  // Avoid attempting connection if placeholders have not been replaced yet
  if (uri.includes("<username>") || uri.includes("<password>")) {
    console.warn("Notice: MONGODB_URI contains placeholder values (<username>/<password>). Please update server/.env with your actual credentials.");
    return;
  }

  // Apply custom/fallback DNS servers for reliable SRV record resolution
  configureDns();

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    const diagnosis = diagnoseMongoError(error);

    console.error("\n==================== MongoDB Connection Diagnostics ====================");
    console.error(`Category   : ${diagnosis.category}`);
    console.error(`Title      : ${diagnosis.title}`);
    console.error(`Error Code : ${error.code || "N/A"}`);
    console.error(`Details    : ${diagnosis.explanation}`);
    console.error(`Action     : ${diagnosis.suggestion}`);
    console.error("=========================================================================\n");
  }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export default connectDB;
