import React, { useEffect } from "react";
import { NativeEventEmitter, NativeModules, AppState } from "react-native";
import axios from "axios";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthContextProvider } from "./src/context/AuthContext";
// import { IP_ADDRESS } from "@env";
const { ChatAccessibility } = NativeModules;
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { sendChatInference } from "./src/services/chatInferenceService";
import { FASTAPI_URL } from "./src/config/endpoints";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});  
//test
export default function App() {
  console.log("This is log from app.js");

  // This useEffect hook will run when the app starts.
  // It sets up your native event listener and drains the durable outbox.
  useEffect(() => {
    console.log("App has opened and initialized."); // Single log when the app opens

    let draining = false; // prevent overlapping drains

    // Deliver one captured session: FastAPI analysis -> backend persistence.
    // Throws on any failure so the caller keeps the session queued for retry.
    const deliverSession = async (session) => {
      const { sessionId, messages, startTimestamp, endTimestamp } = session;
      if (!messages || messages.length === 0) {
        return; // nothing to analyze; treat as delivered so it gets removed
      }
      const response = await axios.post(
        `${FASTAPI_URL}/chat-text-data`,
        {
          messages,
          startTimestamp,
          endTimestamp,
          sessionId: sessionId || `${startTimestamp}-${endTimestamp}`,
        },
        { headers: { "Content-Type": "application/json" } }
      );
      await sendChatInference(response.data);
      console.log("Delivered session:", sessionId, response.data?.analysis?.feedback);
    };

    // Drain the durable outbox. Each session is removed only after it is fully
    // delivered; failures stay queued and retry on the next drain. Delivery is
    // at-least-once and the backend dedups on unique sessionId.
    const drainPendingSessions = async () => {
      if (draining) return;
      if (!ChatAccessibility || !ChatAccessibility.getPendingSessions) {
        console.warn("ChatAccessibility native module unavailable; cannot drain outbox.");
        return;
      }
      draining = true;
      try {
        const json = await ChatAccessibility.getPendingSessions();
        let sessions = [];
        try {
          sessions = JSON.parse(json || "[]");
        } catch (e) {
          console.error("Failed to parse pending sessions:", e);
          return;
        }
        console.log(`Draining ${sessions.length} pending session(s)`);
        for (const session of sessions) {
          const id = session.sessionId || `${session.startTimestamp}-${session.endTimestamp}`;
          try {
            await deliverSession(session);
            await ChatAccessibility.removePendingSession(id);
          } catch (err) {
            // Leave queued for the next drain (network/server down, etc.)
            console.error(`Delivery failed for session ${id}, keeping queued:`, err?.message || err);
          }
        }
      } catch (error) {
        console.error("Error draining pending sessions:", error);
      } finally {
        draining = false;
      }
    };

    // (a) Drain on mount.
    drainPendingSessions();

    // (b) Drain whenever the native service signals a new captured session.
    const eventEmitter = new NativeEventEmitter(ChatAccessibility);
    const subscription = eventEmitter.addListener("ChatSessionEvent", () => {
      drainPendingSessions();
    });

    // (c) Drain when the app returns to the foreground (retry on resume).
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") drainPendingSessions();
    });

    return () => {
      subscription.remove();
      appStateSub.remove();
    };
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


