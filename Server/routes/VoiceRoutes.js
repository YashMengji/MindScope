import express from "express";
import { saveVoiceInference } from "../controllers/VoiceController.js";
import { checkVoiceInference } from "../controllers/VoiceController.js";

const router = express.Router();

router.post("/", saveVoiceInference);
router.post("/fileName", checkVoiceInference);

export default router;
