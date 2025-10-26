import ChatInference from "../models/chatinference.js";

export const saveChatInference = async (req, res) => {
  try {
    console.log("Request body received in controller:", req.body);
    const {
      sessionId,
      startTimestamp,
      endTimestamp,
      feedback,
      toxicityScore,
      userId,
    } = req.body;

    const chat = new ChatInference({
      sessionId,
      startTimestamp,
      endTimestamp,
      feedback,
      toxicityScore,
      userId,
    });

    await chat.save();
    res.status(201).json({ message: "Chat inference saved (Controller) " });
  } catch (error) {
    console.error("Error saving chat inference (Controller):", error);
    res.status(500).json({ message: error.message });
  }
};
