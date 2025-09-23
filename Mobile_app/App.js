import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { useEffect } from "react";
import { NativeEventEmitter, NativeModules } from "react-native";
import axios from "axios";

const { ChatAccessibilityModule } = NativeModules;

export default function App() {
  console.log("This is log from app.js");
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

  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
