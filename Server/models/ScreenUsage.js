import mongoose from "mongoose";

const screenUsageSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  appName: { type: String, required: true },
  usageDuration: { type: Number },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model("ScreenUsage", screenUsageSchema);
