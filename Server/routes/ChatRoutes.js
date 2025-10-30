import express from "express";
import { saveChatInference } from "../controllers/ChatController.js";
import { getChatByUserId } from "../controllers/ChatController.js";

const router = express.Router();

router.post("/", saveChatInference);
router.get("/:userId", getChatByUserId);

export default router;
