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
    const eventEmitter = new NativeEventEmitter(ChatAccessibilityModule);
    const subscription = eventEmitter.addListener(
      "ChatSessionEvent",
      async (text) => {
        console.log("Chat text received:", text);
        await axios.post("http://127.0.0.1:8000/chat-text-data", {
          chatText: text,
        });
      }
    );

      return () => subscription.remove();
  }, []);

  return <AppNavigator />;
}