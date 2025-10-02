import ChatInference from "../models/chatinference.js";

export const saveChatInference = async (req, res) => {
  try {
    const { sessionId, messages, startTimestamp, endTimestamp } = req.body;

    const chat = new ChatInference({
      sessionId,
      messages,
      startTimestamp,
      endTimestamp,
    });

    await chat.save();
    res.status(201).json({ message: "Chat inference saved", data: chat });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
