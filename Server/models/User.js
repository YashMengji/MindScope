import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  chatInferences: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatInference",
  }]
});

export default mongoose.model("User", userSchema);
