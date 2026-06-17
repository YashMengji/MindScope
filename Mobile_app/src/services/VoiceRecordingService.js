import api from "../api/axiosConfig";
import axios from "axios";
import { getToken } from "./tokenService";
import FormData from "form-data";

// Constants
// NOTE: If using a real device, replace 'localhost' with your machine's IP address 
// or use 'adb reverse tcp:3000 tcp:3000'
const FASTAPI_URL = "http://localhost:8000";
const EXPRESS_URL = "http://localhost:3000/api";

export const analyzeVoiceRecording = async (recordingFile) => {
  try {
    const token = await getToken();
    // console.log("Token retrieved in service:", token);

    const formData = new FormData();
    
    // Ensure we handle the file object correctly for React Native
    formData.append("file", {
      uri: recordingFile.uri,
      name: recordingFile.name || "recording.m4a",
      type: recordingFile.type || "audio/mp4", // Default to mp4 if missing
    });

    const response = await axios.post(`${FASTAPI_URL}/analyze`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        // Add Authorization if your backend requires it
        // "Authorization": `Bearer ${token}` 
      },
    });

    console.log(`Success: ${recordingFile.name} analyzed.`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`Error analyzing ${recordingFile.name}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Uploads a list of recordings sequentially.
 * @param {Array} recordings - Array of file objects { uri, name, type? }
 * @returns {Promise<Array>} - Array of results for each file
 */
export const uploadBatchRecordings = async (recordings) => {
  const results = [];
  console.log(`Starting batch upload for ${recordings.length} files...`);

  for (const file of recordings) {
    try {
      // Determine mime type if not present
      const ext = file.name.split('.').pop().toLowerCase();
      const type = file.type || (ext === 'wav' ? 'audio/wav' : 'audio/mp4');
      
      const fileToUpload = { ...file, type };

      // Upload individually to ensure one failure doesn't stop the rest
      const result = await analyzeVoiceRecording(fileToUpload);
      
      results.push({ 
        fileName: file.name, 
        status: result.success ? 'uploaded' : 'failed',
        data: result.data || result.error
      });
    } catch (err) {
      results.push({ 
        fileName: file.name, 
        status: 'failed', 
        error: err.message 
      });
    }
  }

  return results;
};

export const saveInferenceResult = async (inferenceData) => {
  try {
    const token = await getToken();
    // console.log("Token retrieved in service:", token);

    const response = await api.post(
      "/voice",
      inferenceData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("Inference result saved successfully.");
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error saving inference result:", error.message);
    return { success: false, error: error.message };
  }
}

export const fetchRecordingByName = async (fileName) => {
  try {
    const token = await getToken();
    // console.log("Token retrieved in service:", token);

    const response = await api.post(
      "/voice/fileName",
      { fileName: fileName }, // ✅ FIX 3: Wrap data in an object
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Check if inference result existed.");
    if(response.data === true) {
      console.log(`Recording with filename ${fileName} exists.`);
      return { success: true, data: response.data };
    }
    else{
      console.log(`Recording with filename ${fileName} NOT exists.`);
      return { success: false, data: response.data };
    }
  } catch (error) {
    console.error("Error searching inference result:", error.message);
    return { success: false, error: error.message };
  }
}

export const fetchVoiceInferencePerUser = async (selectedDate) => {
  try {
    const token = await getToken();
    // console.log("Token retrieved in service:", token);

    // userId is resolved on the backend from the JWT (no need to pass it).
    // Normalize to a local YYYY-MM-DD; default to today when no date is provided
    const dateParam =
      selectedDate instanceof Date
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`
        : selectedDate || new Date().toISOString().split("T")[0];
    const response = await api.get(
      `/voice/date/${dateParam}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log(response.data);
    console.log("Fetched all voice inferences per user successfully.");
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error fetching all voice inferences:", error.message);
    return { success: false, error: error.message };
  }
}