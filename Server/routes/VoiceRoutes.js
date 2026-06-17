import express from "express";
import { saveVoiceInference } from "../controllers/VoiceController.js";
import { checkVoiceInference } from "../controllers/VoiceController.js";
import VoiceInference from "../models/VoiceInference.js";
import { fetchVoiceInferencePerUser } from "../controllers/VoiceController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, saveVoiceInference);
router.post("/fileName", authMiddleware, checkVoiceInference);
router.get("/date/:selectedDate", authMiddleware, fetchVoiceInferencePerUser);
router.get("/", async (req, res) => {
  const inferences = await VoiceInference.find({});
  res.json(inferences);
});

export default router;
