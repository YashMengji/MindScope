import ChatInference from "../models/chatinference.js";
import mongoose from "mongoose";

export const saveChatInference = async (req, res) => {
  try {
    console.log("Request body received in controller:", req.body);
    const sessionId = req.body.session_id;
    const startTimestamp = req.body.analysis[0].startTimestamp;
    const endTimestamp = req.body.analysis[0].endTimestamp;
    const feedback = req.body.analysis[0].feedback;
    const toxicityScore = req.body.analysis[0].toxicity_inference.toxicity_score;
    const userId = new mongoose.Types.ObjectId("6903301b93ef8bdb5a368a28");

    const chat = new ChatInference({
      sessionId,
      startTimestamp,
      endTimestamp,
      feedback,
      toxicityScore,
      userId,
    });

    await chat.save();
    res.status(201).json({ message: "Chat inference saved (Controller)" });
  } catch (error) {
    console.error("Error saving chat inference (Controller):", error);
    res.status(500).json({ message: error.message });
  }
};

export const getChatByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("Is user id null (controller):", userId);
    console.log("User ID received in (controller):", userId);
    // Get the start and end of the current day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0); // Set time to 00:00:00.000

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999); // Set time to 23:59:59.999

    console.log("Start of Day:", startOfDay);
    console.log("End of Day:", endOfDay);

    // Query to find chats within today's range
    const chats = await ChatInference.find({
      userId: userId,
      startTimestamp: { $gte: startOfDay },
      endTimestamp: { $lt: endOfDay },
    }).sort({ startTimestamp: 1 }); // 1 for ascending order
    res.status(200).json({ chats });
  } catch (error) {
    console.error("Error retrieving chat data (Controller):", error);
    res.status(500).json({ message: error.message });
  }
};
