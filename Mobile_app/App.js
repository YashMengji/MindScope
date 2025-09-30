import React, { useEffect } from "react";
import { NativeEventEmitter, NativeModules } from "react-native";
import axios from "axios";
import AppNavigator from "./src/navigation/AppNavigator";
import { LOCAL_IP, API_PORT } from '@env';

const { ChatAccessibilityModule } = NativeModules;

// "test": "npm start && npx react-native run-android && adb logcat | ForEach-Object { if ($_ -like "ChatAccessibilityService") { $_ } }",
export default function App() {
  console.log("This is log from app.js");

  // This useEffect hook will run when the app starts.
  // It sets up your native event listener.
  useEffect(() => {
    const eventEmitter = new NativeEventEmitter(ChatAccessibilityModule);
    const subscription = eventEmitter.addListener(
      "ChatSessionEvent",
      async (sessionData) => {
        console.log("Full session data received:", sessionData);

        // Extract messages array from the session data
        const messages = sessionData.messages;
        const startTimestamp = sessionData.startTimestamp;
        const endTimestamp = sessionData.endTimestamp;

        console.log("Messages extracted:", messages);
        console.log("Session duration:", endTimestamp - startTimestamp, "ms");

        if (messages && messages.length > 0) {
          try {
            // Send the entire session data to FastAPI
            const response = await axios.post(
              `http://${LOCAL_IP}:${API_PORT}/chat-text-data`,
              {
                messages: messages, // Array of messages
                startTimestamp: startTimestamp,
                endTimestamp: endTimestamp,
                sessionId: `${startTimestamp}-${endTimestamp}`, // Unique ID
              }
            );
            // console.log("Response from FastAPI:", response.data);

            console.log("Data sent successfully to FastAPI");
          } catch (error) {
            if (error.response) {
              // The server responded with a status code outside 2xx
              console.error("Error response data:", error.response.data);
              console.error("Error response status:", error.response.status);
              console.error("Error response headers:", error.response.headers);
            } else if (error.request) {
              // The request was made but no response was received
              console.error("No response received. Request details:", error.request);
            } else {
              // Something happened while setting up the request
              console.error("Axios error message:", error.message);
            }
          
            console.error("Full Axios error config:", error.config);
          }
          
        } else {
          console.log("No messages in this session, skipping API call.");
        }
      }
    );

    return () => subscription.remove();
  }, []);

  return <AppNavigator />;
}
