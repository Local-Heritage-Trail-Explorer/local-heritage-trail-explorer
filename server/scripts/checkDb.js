import dotenv from "dotenv";
import connectDB, { disconnectDB } from "../config/database.js";
import mongoose from "mongoose";

dotenv.config();

const run = async () => {
  try {
    console.log("[CheckDB] Connecting to MongoDB...");
    const conn = await connectDB();
    if (!conn) {
      console.error("[CheckDB] Connection failed.");
      process.exit(1);
    }

    const db = mongoose.connection.db;
    console.log(`\n================ MongoDB Status ================`);
    console.log(`Database Name : ${db.databaseName}`);
    console.log(`Host          : ${conn.connection.host}`);
    console.log(`Ready State   : ${mongoose.connection.readyState === 1 ? "Connected (1)" : mongoose.connection.readyState}`);

    const collections = await db.listCollections().toArray();
    console.log(`\nCollections & Counts:`);
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name.padEnd(20)}: ${count}`);
    }

    // Inspect stories collection
    const storyCount = await db.collection("stories").countDocuments();
    console.log(`\nStories in Database: ${storyCount}`);
    if (storyCount > 0) {
      const sample = await db.collection("stories").find({}, { projection: { title: 1, status: 1, claimType: 1 } }).limit(5).toArray();
      console.log("Sample Stories:");
      sample.forEach((s, idx) => {
        console.log(`  ${idx + 1}. [${s.status}] ${s.title} (${s.claimType})`);
      });
      if (storyCount > 5) {
        console.log(`  ... and ${storyCount - 5} more stories.`);
      }
    }
    console.log(`================================================\n`);

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error("[CheckDB] Error:", err.message);
    process.exit(1);
  }
};

run();
