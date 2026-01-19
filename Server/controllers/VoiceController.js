import VoiceInference from "../models/VoiceInference.js";

export const saveVoiceInference = async (req, res) => {
  try {
    const { fileName, data } = req.body;
    const { toxicity_score, feedback } = data;
    const userId = new mongoose.Types.ObjectId("6903301b93ef8bdb5a368a28");

    const voice = new VoiceInference({
      fileName,
      toxicity_score,
      feedback,
      userId
    });

    await voice.save();
    res.status(201).json({ message: "Voice inference saved", data: voice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkVoiceInference = async (req, res) => {
  try {
    console.log("reached here");
    const { fileName } = req.body;
    const voice = await VoiceInference.findOne({ fileName });
    if (voice) {
      res.status(200).json({ message: "Voice inference found", data: voice });
    } else {
      res.status(404).json({ message: "Voice inference not found" });
    }
  } catch (error) {
    console.error("Error in checkVoiceInference:", error);
    res.status(500).json({ message: error.message });
  }
}
