import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
    },
    role: {
      type: String,
      enum: ["VISITOR", "CURATOR", "GUIDE"],
      default: "VISITOR",
      required: [true, "Role is required"],
    },
    isEmailVerified: {
      type: Boolean,
      required: [true, "Email verification status is required"],
      default: false,
    },
    verificationTokenHash: {
      type: String,
      default: null,
    },
    verificationTokenExpires: {
      type: Date,
      default: null,
    },
    resetPasswordTokenHash: {
      type: String,
      default: null,
    },
    resetPasswordTokenExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ verificationTokenHash: 1 }, { sparse: true });
userSchema.index({ resetPasswordTokenHash: 1 }, { sparse: true });

export const User = model("User", userSchema);
export default User;
