import React, { useEffect } from "react";
import { NativeEventEmitter, NativeModules } from "react-native";
import axios from "axios";
import AppNavigator from "./src/navigation/AppNavigator";

const { ChatAccessibilityModule } = NativeModules;

export default function App() {
  console.log("This is log from app.js");

  // This useEffect hook will run when the app starts.
  // It sets up your native event listener.
  useEffect(() => {
    // Make sure ChatAccessibilityModule is not null
    if (ChatAccessibilityModule) {
      const eventEmitter = new NativeEventEmitter(ChatAccessibilityModule);
      const subscription = eventEmitter.addListener(
        "ChatSessionEvent",
        async (text) => {
          console.log("Chat text received:", text);
          try {
            // IMPORTANT: See note below about the IP address
            await axios.post("http://192.168.0.101:8000/chat-text-data", {
              chatText: text,
            });
          } catch (error) {
            console.error("Error sending chat text data:", error);
          }
        }
      );

      return () => subscription.remove();
    }
  }, []);

  // The AppNavigator component is returned here, which renders your app's UI.
  return <AppNavigator />;
}
// Note: Replace <YOUR_COMPUTER_IP> with your actual computer's IP address.
// This is necessary because the mobile device (or emulator) needs to know where to send the HTTP requests.
// Using 'localhost' or '127.0.0.1' will not work from the mobile device.