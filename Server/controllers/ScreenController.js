import ScreenUsage from "../models/ScreenUsage.js";

export const saveScreenUsage = async (req, res) => {
  try {
    const { sessionId, appName, usageDuration } = req.body;

    const usage = new ScreenUsage({
      sessionId,
      appName,
      usageDuration,
    });

    await usage.save();
    res.status(201).json({ message: "Screen usage saved", data: usage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
