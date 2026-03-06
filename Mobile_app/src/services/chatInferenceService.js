import api from "../api/axiosConfig";
import { getToken } from "./tokenService";

export const sendChatInference = async (chatInferenceData) => {
  try {
    const token = await getToken();
    console.log("Token retrieved in service:", token);
    const response = await api.post("/chat", chatInferenceData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Chat inference data sent successfully (Service):", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending chat inference data:", error);
    throw error;
  }
};

export const getChat = async (userId) => {
  try {
    const token = await getToken();
    console.log("Token retrieved in service:", token);
    const response = await api.get(`http://localhost:3000/api/chat/${userId}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Chat data retrieved successfully (Service):", response.data);
    return response.data;
  } catch (error) {
    console.error("Error retrieving chat data:", error);
    throw error;
  }
};