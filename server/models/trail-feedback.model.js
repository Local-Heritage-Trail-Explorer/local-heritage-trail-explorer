import { Schema, model } from "mongoose";

const trailFeedbackSchema = new Schema(
  {
    trailId: {
      type: Schema.Types.ObjectId,
      ref: "Trail",
      required: [true, "Trail reference is required"],
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
  },
  {
    timestamps: true,
  }
);

// Foreign key and status indexes for moderation and feedback queries
trailFeedbackSchema.index({ trailId: 1, createdAt: -1 });
trailFeedbackSchema.index({ status: 1, createdAt: -1 });
trailFeedbackSchema.index({ submittedBy: 1, createdAt: -1 });

export const TrailFeedback = model("TrailFeedback", trailFeedbackSchema);
export default TrailFeedback;
