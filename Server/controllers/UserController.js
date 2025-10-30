import userModel from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const profile = async (req, res) => {
  res.json({
    name: req.user.name,
    email: req.user.email,
  });
};

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log("Signup request received : ", req.body);
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

    const payload = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
    };
    const token = jwt.sign(payload, "secret");

    res.status(200).header("Authorization", `Bearer ${token}`).json({
      status: true,
      message: "User registered successfully",
      user: newUser,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: `error : ${err}` });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
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
    
    const payload = {
      id: registeredUser._id,
      name: registeredUser.name,
      email: registeredUser.email,
    };
    const token = jwt.sign(payload, "secret");

    res.status(200).header("Authorization", `Bearer ${token}`).json({
      status: true,
      message: "User logged in successfully",
      user: registeredUser,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: `error : ${err}` });
  }
};
