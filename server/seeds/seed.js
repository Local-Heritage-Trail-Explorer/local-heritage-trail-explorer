import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

import { User } from "../models/user.model.js";
import { Place } from "../models/place.model.js";
import { Path } from "../models/path.model.js";
import { Source } from "../models/source.model.js";
import { Story } from "../models/story.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server root
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function seedDatabase() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/local-heritage-trail-explorer";

  console.log("Connecting to MongoDB for idempotent seeding...");
  await mongoose.connect(uri);

  try {
    // 1. Ensure a verified system curator exists for source attribution
    const curatorEmail = "curator@tirumalaheritage.org";
    let curator = await User.findOne({ email: curatorEmail });
    if (!curator) {
      const defaultPasswordHash = await bcrypt.hash("CuratorHeritage2026!", 12);
      curator = await User.create({
        name: "Head Curator",
        email: curatorEmail,
        passwordHash: defaultPasswordHash,
        role: "CURATOR",
        isEmailVerified: true,
      });
      console.log(`Created default system curator user: ${curatorEmail}`);
    }

    // 2. Seed Places
    const placesData = JSON.parse(fs.readFileSync(path.join(__dirname, "places.json"), "utf-8"));
    for (const place of placesData) {
      await Place.findByIdAndUpdate(place._id, { $set: place }, { upsert: true, new: true });
    }
    console.log(`Idempotently seeded ${placesData.length} heritage places.`);

    // 3. Seed Sources
    const sourcesData = JSON.parse(fs.readFileSync(path.join(__dirname, "sources.json"), "utf-8"));
    for (const source of sourcesData) {
      const payload = {
        ...source,
        uploadedBy: curator._id,
      };
      await Source.findByIdAndUpdate(source._id, { $set: payload }, { upsert: true, new: true });
    }
    console.log(`Idempotently seeded ${sourcesData.length} heritage sources.`);

    // 4. Seed Paths
    const pathsData = JSON.parse(fs.readFileSync(path.join(__dirname, "paths.json"), "utf-8"));
    for (const p of pathsData) {
      await Path.findByIdAndUpdate(p._id, { $set: p }, { upsert: true, new: true });
    }
    console.log(`Idempotently seeded ${pathsData.length} walkable trail paths.`);

    // 5. Seed Stories
    const storiesData = JSON.parse(fs.readFileSync(path.join(__dirname, "stories.json"), "utf-8"));
    for (const story of storiesData) {
      await Story.findByIdAndUpdate(story._id, { $set: story }, { upsert: true, new: true });
    }
    console.log(`Idempotently seeded ${storiesData.length} approved historical stories.`);

    console.log("\nDatabase seeding completed successfully without any destructive drops.");
  } catch (error) {
    console.error("Seeding failed with error:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase();
}

export default seedDatabase;
