import React, { useEffect } from "react";
import { NativeEventEmitter, NativeModules } from "react-native";
import axios from "axios";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthContextProvider } from "./src/context/AuthContext";

const { ChatAccessibilityModule } = NativeModules;

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
              "http://127.0.0.1:8000/chat-text-data",
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
            console.error("Error sending to FastAPI:", error);
          }
        } else {
          console.log("No messages in this session, skipping API call.");
        }
      }
    );

    return () => subscription.remove();
  }, []);

  return (
    <AuthContextProvider>
      <AppNavigator />
    </AuthContextProvider>
  );
}
