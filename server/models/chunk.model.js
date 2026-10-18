import { Schema, model } from "mongoose";

const chunkSchema = new Schema(
  {
    storyId: {
      type: Schema.Types.ObjectId,
      ref: "Story",
      required: [true, "Story reference is required"],
      index: true,
    },
    placeId: {
      type: Schema.Types.ObjectId,
      ref: "Place",
      index: true,
      default: null,
    },
    title: {
      type: String,
      required: [true, "Story title is required"],
      trim: true,
    },
    chunkIndex: {
      type: Number,
      required: [true, "Chunk index is required"],
      min: 0,
    },
    content: {
      type: String,
      required: [true, "Chunk content is required"],
      trim: true,
    },
    embedding: {
      type: [Number],
      required: [true, "Embedding vector is required"],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 768,
        message: "Embedding must be a 768-dimensional array of numbers",
      },
    },
    sourceIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Source",
        },
      ],
      default: [],
    },
    sourceUrl: {
      type: String,
      trim: true,
      default: null,
    },
    approvalStatus: {
      type: String,
      required: [true, "Approval status is required"],
      enum: ["approved", "pending", "rejected"],
      default: "approved",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "chunks",
  }
);

// Prevent duplicate chunks for the same story and chunk index
chunkSchema.index({ storyId: 1, chunkIndex: 1 }, { unique: true });

// Note: Configured for MongoDB Atlas Vector Search index on the `embedding` field
// Index definition name in Atlas: "vector_index" (on collection "chunks")

export const Chunk = model("Chunk", chunkSchema);
export const StoryChunk = Chunk;
export default Chunk;
