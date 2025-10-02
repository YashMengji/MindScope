import VoiceInference from "../models/VoiceInference.js";

export const saveVoiceInference = async (req, res) => {
  try {
    const { sessionId, transcript, duration, metadata } = req.body;

    const voice = new VoiceInference({
      sessionId,
      transcript,
      duration,
      metadata,
    });

    await voice.save();
    res.status(201).json({ message: "Voice inference saved", data: voice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
