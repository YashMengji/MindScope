import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  isChatInferenceEnabled: {
    type: Boolean,
    default: false,
  },
  isVoiceInferenceEnabled: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model("User", userSchema);
