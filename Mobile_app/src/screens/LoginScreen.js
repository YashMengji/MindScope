import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { login } from "../services/authService";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const LoginScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { loginContext } = useContext(AuthContext);
  // State to track input focus
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Login Failed", "Please enter both email and password.");
      return;
    }

    const credentials = {
      email,
      password,
    };

    // send login creadentials to express server
    const res = await login(credentials);
    console.log("Login successful : ", res);
    await loginContext(res.user);
    navigation.replace("MainApp");
  };

  const renderFloatingLabel = (label, isFocused, hasValue) => (
    <Text
      style={[
        styles.floatingLabel,
        (isFocused || hasValue) && styles.floatingLabelActive,
      ]}
    >
      {label}
    </Text>
  );

  return (
    <LinearGradient
      colors={["#003366", "#007ACC", "#66ADE6", "#CCEDFF"]}
      locations={[0.25, 0.64, 0.79, 1]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image source={require("../assets/logo.png")} style={styles.logo} />
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Login User</Text>

            <View
              style={[
                styles.inputContainer,
                isEmailFocused && styles.inputContainerFocused,
              ]}
            >
              {renderFloatingLabel("Email", isEmailFocused, email)}
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
              />
            </View>

            <View
              style={[
                styles.inputContainer,
                isPasswordFocused && styles.inputContainerFocused,
              ]}
            >
              {renderFloatingLabel("Password", isPasswordFocused, password)}
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>LOGIN</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                <Text style={[styles.footerText, styles.linkText]}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 200,
    height: 80,
    resizeMode: "contain",
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 24,
  },
  inputContainer: {
    backgroundColor: "#FFFfff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DDD",
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  inputContainerFocused: {
    borderColor: "#003366",
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    fontSize: 16,
    color: "#333",
  },
  floatingLabel: {
    position: "absolute",
    left: 16,
    top: 16,
    fontSize: 16,
    color: "#AAA",
    backgroundColor: "#ffffff",
    paddingHorizontal: 4,
  },
  floatingLabelActive: {
    top: -10,
    fontSize: 12,
    color: "#003366",
  },
  eyeButton: {
    paddingHorizontal: 12,
  },
  forgotPasswordText: {
    textAlign: "right",
    color: "#003366",
    fontWeight: "600",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#003366",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 16,
    color: "#666",
  },
  linkText: {
    color: "#003366",
    fontWeight: "bold",
  },
});

export default LoginScreen;
