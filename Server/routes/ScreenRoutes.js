import express from "express";
import { saveScreenUsage } from "../controllers/ScreenController.js";

const router = express.Router();

router.post("/", saveScreenUsage);

export default router;
