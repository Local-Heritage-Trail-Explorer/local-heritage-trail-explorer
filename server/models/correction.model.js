import { Schema, model } from "mongoose";

const correctionSchema = new Schema(
  {
    placeId: {
      type: Schema.Types.ObjectId,
      ref: "Place",
      required: [true, "Place reference is required"],
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Submitter reference is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    status: {
      type: String,
      required: [true, "Status is required"],
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index {status: 1, createdAt: -1}
correctionSchema.index({ status: 1, createdAt: -1 });

export const Correction = model("Correction", correctionSchema);
export default Correction;
