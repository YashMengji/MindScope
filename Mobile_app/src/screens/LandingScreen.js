import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LandingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      // Fix the color values - removed invalid hex code
      colors={["#003366", "#007ACC", "#66ADE6", "#CCEDFF"]} // Changed #66ADES to #66ADE6
      locations={[0.25, 0.64, 0.79, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#003366" />
      <View
        style={[
          styles.contentContainer,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Logo Section */}
        <View style={styles.header}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Content and Action Section */}
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to{"\n"}MindScope</Text>
          <Text style={styles.subtitle}>
            Your AI-powered companion for mental health monitoring.
          </Text>

          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => navigation.navigate("SignUp")}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>

          <View style={styles.loginPrompt}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.7}
            >
              <Text style={[styles.loginText, styles.loginLink]}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
  },
  logo: {
    width: 200,
    height: 120,
    marginBottom: 16,
  },
  content: {
    paddingBottom: 40,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 16,
    lineHeight: 42,
    textAlign: "left",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: "#CCE0FF",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 48,
    textAlign: "left",
    fontStyle: "italic",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  getStartedButton: {
    backgroundColor: "#003366",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#00509E",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    marginBottom: 24,
  },
  getStartedButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  loginPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 16,
  },
  loginLink: {
    fontWeight: "bold",
    textDecorationLine: "underline",
    color: "#FFFFFF",
  },
});

export default LandingScreen;
