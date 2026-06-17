import express from "express";
import {
  login,
  signup,
  profile,
  updateProfile,
} from "../controllers/UserController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/profile", authMiddleware, profile);
router.put("/profile", authMiddleware, updateProfile);
// router.post("/logout", logout);

export default router;
