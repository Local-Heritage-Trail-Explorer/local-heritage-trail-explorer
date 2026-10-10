import { Schema, model } from "mongoose";

const visitProgressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    trailId: {
      type: Schema.Types.ObjectId,
      ref: "Trail",
      required: [true, "Trail is required"],
    },
    completedPlaceIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Place",
        },
      ],
      required: [true, "Completed place IDs are required"],
    },
    visitTimestamps: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Unique {userId: 1, trailId: 1}
visitProgressSchema.index({ userId: 1, trailId: 1 }, { unique: true });

export const VisitProgress = model("VisitProgress", visitProgressSchema);
export default VisitProgress;
