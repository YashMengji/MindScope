import mongoose from "mongoose";

const chatInferenceSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  feedback: { type: String, required: true },
  toxicityScore: { type: Number, required: true },
  startTimestamp: { type: Number, required: true },
  endTimestamp: { type: Number, required: true },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
}, { timestamps: true });

export default mongoose.model("ChatInference", chatInferenceSchema);
