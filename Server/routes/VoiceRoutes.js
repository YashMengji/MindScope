import express from "express";
import { saveVoiceInference } from "../controllers/VoiceController.js";
import { checkVoiceInference } from "../controllers/VoiceController.js";
import VoiceInference from "../models/VoiceInference.js";
import { fetchVoiceInferencePerUser } from "../controllers/VoiceController.js";

const router = express.Router();

router.post("/", saveVoiceInference);
router.post("/fileName", checkVoiceInference);
router.get("/:userId/:selectedDate", fetchVoiceInferencePerUser);
router.get("/", async (req, res) => {
  const inferences = await VoiceInference.find({});
  res.json(inferences);
});

export default router;
