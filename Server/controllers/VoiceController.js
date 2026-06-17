import VoiceInference from "../models/VoiceInference.js";
import mongoose from "mongoose"; // ✅ Add this import

export const saveVoiceInference = async (req, res) => {
  try {
    const { fileName, data } = req.body;
    const { toxicity_score, feedback } = data;
    const userId = req.user.id;

    const voice = new VoiceInference({
      fileName,
      toxicityScore: toxicity_score,
      feedback,
      userId
    });

    await voice.save();
    console.log("Voice inference saved:", voice);
    res.status(201).json({ message: "Voice inference saved", data: voice });
  } catch (error) {
    console.error("Error in saveVoiceInference:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const checkVoiceInference = async (req, res) => {
  try {
    console.log("reached here");
    const {fileName} = req.body;

    console.log("Searching for:", fileName); // Debug log
    const voice = await VoiceInference.findOne({ fileName });
    
    if (voice) {
      res.send(true);
    } else {
      res.send(false);
    }
  } catch (error) {
    console.error("Error in checkVoiceInference:", error.message);
    res.status(500).json({ message: error.message });
  }
}

export const fetchVoiceInferencePerUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { selectedDate } = req.params;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0); // Set time to 00:00:00.000
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999); // Set time to 23:59:59.999
    
    const voiceInferences = await VoiceInference.find({
      userId,
      createdAt: { $gte: startOfDay, $lt: endOfDay }, // Filter by date range
    }).sort({ createdAt: 1 }); // Sort in ascending order of createdAt

    res.status(200).json({ data: voiceInferences });
  } catch (error) {
    console.error("Error in fetchVoiceInferencePerUser:", error.message);
    res.status(500).json({ message: error.message });
  }
}
