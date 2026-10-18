import { Schema, model } from "mongoose";

const staffInvitationSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required for staff invitation"],
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["CURATOR", "GUIDE"],
      required: [true, "Staff role must be CURATOR or GUIDE"],
    },
    tokenHash: {
      type: String,
      required: [true, "Token hash is required"],
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    used: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

staffInvitationSchema.index({ tokenHash: 1 });
staffInvitationSchema.index({ email: 1 });

export const StaffInvitation = model("StaffInvitation", staffInvitationSchema);
export default StaffInvitation;
