import ChatInference from "../models/ChatInference.js";
import mongoose from "mongoose";

export const saveChatInference = async (req, res) => {
  try {
    console.log("Request body received in controller:", req.body);
    const sessionId = req.body.session_id;
    const startTimestamp = req.body.analysis.startTimestamp;
    const endTimestamp = req.body.analysis.endTimestamp;
    const feedback = req.body.analysis.feedback;
    const toxicityScore = req.body.analysis.toxicityScore;
    const userId = new mongoose.Types.ObjectId(req.user.id);

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
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const selectedDate = req.params.selectedDate;

    console.log("User ID received in (controller):", userId);
    console.log("Selected date received in (controller):", selectedDate);

    // Get the start and end of the selected day
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0); // Set time to 00:00:00.000

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999); // Set time to 23:59:59.999

    console.log("Start of Day:", startOfDay);
    console.log("End of Day:", endOfDay);

    // Query to find chats whose inference was created on the selected day
    const chats = await ChatInference.find({
      userId: userId,
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    }).sort({ startTimestamp: 1 }); // 1 for ascending order
    res.status(200).json({ chats });
  } catch (error) {
    console.error("Error retrieving chat data (Controller):", error);
    res.status(500).json({ message: error.message });
  }
};
