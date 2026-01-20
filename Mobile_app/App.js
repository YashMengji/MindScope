import React, { useEffect } from "react";
import { NativeEventEmitter, NativeModules } from "react-native";
import axios from "axios";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthContextProvider } from "./src/context/AuthContext";
// import { IP_ADDRESS } from "@env";
const { ChatAccessibilityModule } = NativeModules;
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { sendChatInference } from "./src/services/chatInferenceService";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function App() {
  console.log("This is log from app.js");

  // This useEffect hook will run when the app starts.
  // It sets up your native event listener.
  useEffect(() => {
    console.log("App has opened and initialized."); // Single log when the app opens
    // Mark JS runtime ready whenever the app mounts

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
              `http://localhost:8000/chat-text-data`,
              {
                messages: messages, // Array of messages
                startTimestamp: startTimestamp,
                endTimestamp: endTimestamp,
                sessionId: `${startTimestamp}-${endTimestamp}`, // Unique ID
              },
              { headers: { "Content-Type": "application/json" } }
            );
            console.log(typeof response.data);
            try {
              await sendChatInference(response.data);

            } catch (err) {
              console.error("Error in sendChatInference:", err);
            }
            
            console.log("Data sent successfully to FastAPI");
            console.log(
              "response from fastAPI : ",
              // JSON.stringify(response.data, null, 2)
              response.data
            );
            console.log(response.data.analysis.feedback);
            
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
    // <View style={styles.container}>
    //   <Text>Open up App.js to start working on your app!</Text>
    //   <StatusBar style="auto" />
    // </View>
  );
}


