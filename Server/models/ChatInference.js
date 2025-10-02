import mongoose from "mongoose";

const chatInferenceSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  messages: [{ type: String, required: true }],
  startTimestamp: { type: Number, required: true },
  endTimestamp: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model("ChatInference", chatInferenceSchema);
