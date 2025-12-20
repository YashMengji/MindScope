import api from "../api/axiosConfig";
import axios from "axios";
import { getToken } from "./tokenService";
import FormData from "form-data";

export const analyzeVoiceRecording = async (recordingFile) => {
  try {
    const token = await getToken();
    console.log("Token retrieved in service:", token);

    const formData = new FormData();
    formData.append("file", {
      uri: recordingFile.uri,
      name: recordingFile.name || "recording.wav",
      type: recordingFile.type || "audio/wav",
    });

    const response = await axios.post("http://localhost:3000/api/voice/analyze", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("Voice recording analyzed successfully (Service):", response.data);
    return response.data;
  } catch (error) {
    console.error("Error analyzing voice recording:", error);
    throw error;
  }
};