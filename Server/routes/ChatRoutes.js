import express from "express";
import { saveChatInference } from "../controllers/ChatController.js";
import { getChatByUserId } from "../controllers/ChatController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, saveChatInference);
router.get("/:selectedDate", authMiddleware, getChatByUserId);

export default router;
