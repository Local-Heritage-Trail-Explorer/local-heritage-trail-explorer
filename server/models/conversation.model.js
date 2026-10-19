import { Schema, model } from "mongoose";

const conversationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    messages: {
      type: Array,
      required: [true, "Messages array is required"],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Private; index userId and createdAt for chat history retrieval
conversationSchema.index({ userId: 1, createdAt: -1 });

export const Conversation = model("Conversation", conversationSchema);
export default Conversation;
