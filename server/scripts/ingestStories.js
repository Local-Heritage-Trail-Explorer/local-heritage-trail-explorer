import dotenv from "dotenv";
import connectDB, { disconnectDB } from "../config/database.js";
import { Story } from "../models/story.model.js";
import { Source } from "../models/source.model.js";
import { Chunk } from "../models/chunk.model.js";
import { chunkStory } from "../services/chunking.service.js";
import { embedStoryChunks } from "../services/embedding.service.js";
import { checkOllamaHealth, OLLAMA_CONFIG } from "../config/ollama.js";

dotenv.config();

/**
 * Ingests and synchronizes all approved stories into the vector chunk collection.
 *
 * @param {object} options
 * @param {boolean} [options.force=false] - If true, regenerates embeddings even if unchanged
 * @param {number} [options.batchSize=10] - Batch size for embedding calls
 * @returns {Promise<object>} Summary statistics
 */
export const ingestStories = async ({ force = false, batchSize = 10 } = {}) => {
  console.log("=================================================");
  console.log("   LOCAL HERITAGE TRAIL EXPLORER - INGESTION     ");
  console.log("=================================================");

  // 1. Verify Ollama Health
  console.log(`[1/5] Checking Ollama service at ${OLLAMA_CONFIG.baseUrl}...`);
  const health = await checkOllamaHealth();
  if (!health.healthy) {
    throw new Error("Ollama service is unreachable. Ensure 'ollama serve' is active.");
  }
  console.log(`      ✓ Ollama active. Model '${OLLAMA_CONFIG.embedModel}' verified.`);

  // 2. Fetch approved stories from MongoDB
  console.log("[2/5] Fetching approved historical stories from MongoDB...");
  const stories = await Story.find({ status: "approved" }).lean();
  console.log(`      ✓ Found ${stories.length} approved stories eligible for ingestion.`);

  if (stories.length === 0) {
    console.log("[Notice] No approved stories found in database to ingest.");
    return { totalStories: 0, processed: 0, skipped: 0, totalChunks: 0 };
  }

  // Pre-fetch sources for attribution URL lookup
  const sources = await Source.find({}).lean();
  const sourceMap = new Map();
  for (const s of sources) {
    sourceMap.set(s._id.toString(), s);
  }

  // 3. Process each story safely
  console.log("[3/5] Chunking and generating embeddings...");
  let storiesProcessed = 0;
  let storiesSkipped = 0;
  let chunksCreated = 0;

  for (let idx = 0; idx < stories.length; idx++) {
    const story = stories[idx];
    const storyIdStr = story._id.toString();

    // Determine primary source URL for attribution
    let sourceUrl = null;
    if (Array.isArray(story.sourceIds) && story.sourceIds.length > 0) {
      const firstSourceId = story.sourceIds[0].toString();
      const matchedSource = sourceMap.get(firstSourceId);
      if (matchedSource?.url) {
        sourceUrl = matchedSource.url;
      }
    }

    // Split story into overlapping chunks
    const preparedChunks = chunkStory(story, { sourceUrl });

    if (preparedChunks.length === 0) {
      console.log(`      [${idx + 1}/${stories.length}] Skipping story '${story.title}' (empty content)`);
      continue;
    }

    // Check if chunks already exist in DB for this story
    const existingChunks = await Chunk.find({ storyId: story._id }).lean();

    // Check if existing chunks match without changes
    const isIdentical =
      !force &&
      existingChunks.length === preparedChunks.length &&
      existingChunks.every(
        (ec, i) =>
          ec.chunkIndex === preparedChunks[i].chunkIndex &&
          ec.content === preparedChunks[i].content &&
          ec.embedding &&
          ec.embedding.length === OLLAMA_CONFIG.embeddingDimension
      );

    if (isIdentical) {
      storiesSkipped++;
      continue;
    }

    console.log(
      `      [${idx + 1}/${stories.length}] Processing: "${story.title}" -> ${preparedChunks.length} chunk(s)`
    );

    // Generate embeddings for the chunks using Ollama
    const embeddedChunks = await embedStoryChunks(preparedChunks, { batchSize });

    // Safely update MongoDB: Remove obsolete chunks for this story, then insert new ones
    await Chunk.deleteMany({ storyId: story._id });
    await Chunk.insertMany(embeddedChunks);

    storiesProcessed++;
    chunksCreated += embeddedChunks.length;
  }

  // 4. Remove orphaned chunks whose stories no longer exist or are no longer approved
  console.log("[4/5] Checking for orphaned chunks from deleted/unapproved stories...");
  const validStoryIds = stories.map((s) => s._id);
  const orphanResult = await Chunk.deleteMany({ storyId: { $nin: validStoryIds } });
  if (orphanResult.deletedCount > 0) {
    console.log(`      Cleaned up ${orphanResult.deletedCount} orphaned chunk(s).`);
  } else {
    console.log("      ✓ No orphaned chunks found.");
  }

  // 5. Final verification
  const totalChunksInDb = await Chunk.countDocuments();
  console.log("[5/5] Ingestion Complete Summary:");
  console.log(`      • Total approved stories scanned: ${stories.length}`);
  console.log(`      • Stories newly embedded / updated: ${storiesProcessed}`);
  console.log(`      • Stories unchanged (skipped):     ${storiesSkipped}`);
  console.log(`      • Total active chunks in database: ${totalChunksInDb}`);
  console.log(`      • Vector dimensions:               ${OLLAMA_CONFIG.embeddingDimension}`);
  console.log("=================================================\n");

  return {
    totalStories: stories.length,
    processed: storiesProcessed,
    skipped: storiesSkipped,
    totalChunks: totalChunksInDb,
  };
};

// Execute directly if run as a script
if (process.argv[1]?.endsWith("ingestStories.js")) {
  const forceFlag = process.argv.includes("--force");
  connectDB()
    .then(async () => {
      await ingestStories({ force: forceFlag });
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("[Fatal Error during Ingestion]", error.message);
      await disconnectDB().catch(() => {});
      process.exit(1);
    });
}

export default ingestStories;
