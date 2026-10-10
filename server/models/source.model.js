import { Schema, model } from "mongoose";

const sourceSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    attribution: {
      type: String,
      required: [true, "Attribution is required"],
    },
    sourceType: {
      type: String,
      required: [true, "Source type is required"],
    },
    url: {
      type: String,
      trim: true,
    },
    filePath: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Either URL or file must be provided
sourceSchema.pre("validate", function (next) {
  if (!this.url && !this.filePath) {
    this.invalidate("url", "Either URL or filePath must be provided");
    this.invalidate("filePath", "Either URL or filePath must be provided");
  }
  next();
});

// Index status
sourceSchema.index({ status: 1 });

export const Source = model("Source", sourceSchema);
export default Source;
