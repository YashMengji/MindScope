import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthContext } from "../context/AuthContext";
import { updateUserProfile } from "../services/authService";

// "Yash Mengji" -> "Yash"; falls back gracefully when name is missing.
const getFirstName = (fullName) => {
  if (!fullName || typeof fullName !== "string") return "there";
  return fullName.trim().split(/\s+/)[0] || "there";
};

const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { logout, user, updateUser } = useContext(AuthContext);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate the form from the current user whenever it changes.
  useEffect(() => {
    setName(user?.name || "");
    setUsername(user?.username || "");
    setEmail(user?.email || "");
    setPassword("");
  }, [user]);

  const handleLogout = async () => {
    await logout();
    console.log("User logged out");
    // No manual navigation: clearing the user switches the navigator to the
    // auth (Landing/Login) stack automatically.
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Invalid Name", "Name cannot be empty.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Invalid Email", "Email cannot be empty.");
      return;
    }

    // Only send fields that actually changed (and password only if provided).
    const updates = {};
    if (name.trim() !== (user?.name || "")) updates.name = name.trim();
    if (username.trim() !== (user?.username || ""))
      updates.username = username.trim();
    if (email.trim() !== (user?.email || "")) updates.email = email.trim();
    if (password) updates.password = password;

    if (Object.keys(updates).length === 0) {
      Alert.alert("No Changes", "You haven't changed anything yet.");
      return;
    }

    try {
      setSaving(true);
      const res = await updateUserProfile(updates);
      updateUser(res.user); // reflect changes in the app immediately
      setPassword("");
      Alert.alert("Success", "Your profile has been updated.");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Could not update your profile. Please try again.";
      Alert.alert("Update Failed", message);
      console.error("Profile update error:", err?.response?.data || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* --- Header --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Hi {getFirstName(user?.name)}!</Text>
          <Text style={styles.headerSubtitle}>
            manage your profile and settings
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Image Section */}
          <View style={styles.profileSection}>
            <Image
              source={require("../assets/default.png")}
              style={styles.profileImage}
            />
            <Text style={styles.profileName}>{user?.name || "User"}</Text>
            <Text style={styles.profileEmail}>{user?.email || ""}</Text>
          </View>

          {/* Edit Profile Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Edit Profile</Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#AAA"
            />

            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Choose a username"
              placeholderTextColor="#AAA"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#AAA"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Leave blank to keep current"
                placeholderTextColor="#AAA"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333333",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#333333",
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#0A2E5B",
    marginBottom: 15,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0A2E5B",
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: "#666",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0A2E5B",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#DDD",
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  eyeButton: {
    paddingHorizontal: 12,
  },
  saveButton: {
    backgroundColor: "#003366",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ProfileScreen;
