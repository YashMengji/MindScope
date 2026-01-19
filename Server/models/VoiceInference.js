import mongoose from "mongoose";

const voiceInferenceSchema = new mongoose.Schema({  
  fileName: { 
    type: String, 
    required: true 
  },

  // ✅ CRITICAL FOR CHART: Explicit number field (0.0 - 1.0)
  // This allows you to easily query: "Select toxicityScore, createdAt"
  toxicityScore: { 
    type: Number, 
    required: true,
    min: 0,
    max: 1 
  },

  // ✅ FOR FEEDBACK VIEW: Array of strings to list the 2-3 feedback lines
  feedback: [{ 
    type: String 
  }],

  // Optional: Link to the user if you have multiple users
  userId: {
    type: String
  }

}, { 
  timestamps: true // ✅ CRITICAL: Provides 'createdAt' for the X-Axis (Date/Time)
});

export default mongoose.model("VoiceInference", voiceInferenceSchema);