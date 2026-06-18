import userModel from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Build a JWT for a given user document
const signToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

// Strip sensitive fields before sending a user back to the client
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username || "",
  email: user.email,
  isChatInferenceEnabled: user.isChatInferenceEnabled,
  isVoiceInferenceEnabled: user.isVoiceInferenceEnabled,
});

export const profile = async (req, res) => {
  try {
    // req.user.id comes from the verified JWT (see authMiddleware)
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }
    res.json(sanitizeUser(user));
  } catch (err) {
    res.status(500).json({ status: false, message: `error : ${err}` });
  }
};

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log("Signup request received : ", req.body);

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ status: false, message: "name, email and password are required" });
    }

    const user = await userModel.findOne({ email });

    // check if user already exists or not
    if (user) {
      return res
        .status(400)
        .json({ status: false, message: "user already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new userModel({
      name,
      email,
      password: hashedPassword,
    });
    await newUser.save();

    const token = signToken(newUser);

    res.status(200).header("Authorization", `Bearer ${token}`).json({
      status: true,
      message: "User registered successfully",
      token,
      user: sanitizeUser(newUser),
    });
  } catch (err) {
    res.status(500).json({ status: false, message: `error : ${err}` });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ status: false, message: "email and password are required" });
    }

    const registeredUser = await userModel.findOne({ email });

    if (!registeredUser) {
      return res
        .status(400)
        .json({ status: false, message: "invalid credentials" });
    }

    const result = await bcrypt.compare(password, registeredUser.password);
    if (!result) {
      return res
        .status(400)
        .json({ status: false, message: "invalid credentials" });
    }

    const token = signToken(registeredUser);

    res.status(200).header("Authorization", `Bearer ${token}`).json({
      status: true,
      message: "User logged in successfully",
      token,
      user: sanitizeUser(registeredUser),
    });
  } catch (err) {
    res.status(500).json({ status: false, message: `error : ${err}` });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // If the email is changing, make sure it is not taken by someone else
    if (email && email !== user.email) {
      const existing = await userModel.findOne({ email });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res
          .status(400)
          .json({ status: false, message: "Email already in use" });
      }
      user.email = email;
    }

    if (typeof name === "string" && name.trim()) user.name = name.trim();
    if (typeof username === "string") user.username = username.trim();
    if (password) user.password = await bcrypt.hash(password, 10);

    await user.save();

    res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      user: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ status: false, message: `error : ${err}` });
  }
};
