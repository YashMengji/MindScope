import api from "../api/axiosConfig";
import axios from "axios";

export const sendChatInference = async (chatInferenceData) => {
  try {

    const response = await axios.post("http://localhost:3000/api/chat", chatInferenceData, {
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