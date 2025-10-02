import express from "express";
import { saveChatInference } from "../controllers/ChatController.js";

const router = express.Router();

router.post("/", saveChatInference);

export default router;
