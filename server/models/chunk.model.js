import { Schema, model } from "mongoose";

const chunkSchema = new Schema(
  {
    sourceId: {
      type: Schema.Types.ObjectId,
      ref: "Source",
      required: [true, "Source reference is required"],
    },
    storyId: {
      type: Schema.Types.ObjectId,
      ref: "Story",
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    embedding: {
      type: [Number],
      required: [true, "Embedding vector is required"],
    },
    approvalStatus: {
      type: String,
      required: [true, "Approval status is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Note: Configured for MongoDB Atlas Vector Search index on the `embedding` field

export const Chunk = model("Chunk", chunkSchema);
export default Chunk;
