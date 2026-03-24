import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import chatRoutes from "./routes/ChatRoutes.js";
import voiceRoutes from "./routes/VoiceRoutes.js";
import screenRoutes from "./routes/ScreenRoutes.js";
import userRoutes from "./routes/UserRoutes.js";
import blockerRoutes from "./routes/BlockerRoutes.js"; // ← NEW

dotenv.config();
const app = express();

const corsOptions = {
  origin: "http://localhost:8080",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors(corsOptions));

connectDB();

// Routes
app.use("/api/user",    userRoutes);
app.use("/api/chat",    chatRoutes);
app.use("/api/voice",   voiceRoutes);
app.use("/api/screen",  screenRoutes);
app.use("/api/blocker", blockerRoutes); // ← NEW

app.get("/", (req, res) => {
  res.send("Mindscope API is running...");
});

app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ message: "Something broke!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
