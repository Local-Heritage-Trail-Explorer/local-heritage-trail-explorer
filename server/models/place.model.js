import { Schema, model } from "mongoose";

const placeSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    zone: {
      type: String,
      required: [true, "Zone is required"],
    },
    themes: {
      type: [String],
      required: [true, "Themes are required"],
    },
    openingHours: {
      type: Schema.Types.Mixed,
      default: {},
    },
    hoursVerification: {
      type: String,
      required: [true, "Hours verification is required"],
    },
    estimatedVisitMinutes: {
      type: Number,
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

// Index {status: 1, themes: 1}
placeSchema.index({ status: 1, themes: 1 });

export const Place = model("Place", placeSchema);
export default Place;
