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

export const getChat = async (userId, selectedDate) => {
  try {
    const token = await getToken();
    console.log("Token retrieved in service:", token);
    // Normalize to a local YYYY-MM-DD so the URL matches the picked calendar day
    // (toISOString() would shift the day in timezones ahead of UTC).
    const dateParam =
      selectedDate instanceof Date
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
        : selectedDate;
    const response = await api.get(`/chat/${userId}/${dateParam}`, {
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