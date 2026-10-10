import { Schema, model } from "mongoose";

const pathSchema = new Schema(
  {
    fromPlaceId: {
      type: Schema.Types.ObjectId,
      ref: "Place",
      required: [true, "Origin place reference is required"],
    },
    toPlaceId: {
      type: Schema.Types.ObjectId,
      ref: "Place",
      required: [true, "Destination place reference is required"],
    },
    walkingMinutes: {
      type: Number,
      required: [true, "Walking minutes is required"],
    },
    verificationStatus: {
      type: String,
      required: [true, "Verification status is required"],
    },
    bidirectional: {
      type: Boolean,
      required: [true, "Bidirectional status is required"],
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index place pair
pathSchema.index({ fromPlaceId: 1, toPlaceId: 1 });

export const Path = model("Path", pathSchema);
export default Path;
