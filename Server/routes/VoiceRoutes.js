import express from "express";
import { saveVoiceInference } from "../controllers/VoiceController.js";

const router = express.Router();

router.post("/", saveVoiceInference);

export default router;
