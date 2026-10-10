import { Schema, model } from "mongoose";

const storySchema = new Schema(
  {
    placeId: {
      type: Schema.Types.ObjectId,
      ref: "Place",
      required: [true, "Place reference is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    sourceIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Source",
        },
      ],
      required: [true, "Sources references are required"],
    },
    claimType: {
      type: String,
      required: [true, "Claim type is required"],
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

// Index {placeId: 1, status: 1}
storySchema.index({ placeId: 1, status: 1 });

export const Story = model("Story", storySchema);
export default Story;
