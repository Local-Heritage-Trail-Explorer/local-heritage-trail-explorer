import { Schema, model } from "mongoose";

const trailSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    theme: {
      type: String,
      required: [true, "Theme is required"],
    },
    stops: {
      type: Array,
      required: [true, "Stops are required"],
    },
    estimatedMinutes: {
      type: Number,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
    },
    visibility: {
      type: String,
      required: [true, "Visibility is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Index {ownerId: 1, createdAt: -1}
trailSchema.index({ ownerId: 1, createdAt: -1 });

export const Trail = model("Trail", trailSchema);
export default Trail;
