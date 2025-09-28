import mongoose from "mongoose";

const voiceInferenceSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  transcript: [{ type: String }],
  duration: { type: Number },
  metadata: { type: Object },
}, { timestamps: true });

export default mongoose.model("VoiceInference", voiceInferenceSchema);
