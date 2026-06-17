import api from "../api/axiosConfig";
import { saveToken } from "./tokenService";

export const getProfile = async () => {
  // The request interceptor in axiosConfig attaches the Bearer token,
  // and the backend resolves the user from that JWT.
  const response = await api.get("/user/profile");
  return response.data;
};

export const updateUserProfile = async (updates) => {
  const response = await api.put("/user/profile", updates);
  return response.data;
};

export const signup = async (userData) => {
  const response = await api.post("/user/signup", userData);
  // Prefer the token from the JSON body, fall back to the Authorization header.
  const token =
    response.data?.token ||
    response.headers["authorization"]?.replace("Bearer ", "");

  if (token) {
    console.log("token received ✅");
    await saveToken(token);
  } else {
    console.log("token was not received from express ❌");
  }

  return response.data;
};

export const login = async (credentials) => {
  const response = await api.post("/user/login", credentials);
  const token =
    response.data?.token ||
    response.headers["authorization"]?.replace("Bearer ", "");

  if (token) {
    console.log("token received ✅");
    await saveToken(token);
    console.log("token saved !");
  } else {
    console.log("token was not received from express ❌");
  }

  return response.data;
};
