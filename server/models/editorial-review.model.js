import { Schema, model } from "mongoose";

const editorialReviewSchema = new Schema(
  {
    resourceId: {
      type: Schema.Types.ObjectId,
      required: [true, "Resource reference is required"],
      refPath: "resourceType",
    },
    resourceType: {
      type: String,
      required: [true, "Resource type is required"],
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Curator reference is required"],
    },
    decision: {
      type: String,
      required: [true, "Decision is required"],
    },
  },
  {
    timestamps: true,
  }
);

export const EditorialReview = model("EditorialReview", editorialReviewSchema);
export default EditorialReview;
