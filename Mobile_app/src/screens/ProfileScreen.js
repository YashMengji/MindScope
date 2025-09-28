import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    // Logout logic here
    console.log("User logged out");
    // Redirect to landing page
    navigation.navigate("Landing"); // Replace "Landing" with your actual landing page route name
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* --- Header (exact same as other screens) --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Hi Steve!</Text>
          <Text style={styles.headerSubtitle}>
            manage your profile and settings
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* --- Scrollable Content Area --- */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Image Section */}
        <View style={styles.profileSection}>
          <Image 
            source={require("../assets/default.png")} 
            style={styles.profileImage} 
          />
          <Text style={styles.profileName}>Steve Rogers</Text>
          <Text style={styles.profileEmail}>steve.rogers@example.com</Text>
        </View>

        {/* App Usage Time Container */}
        <View style={styles.usageContainer}>
          <Text style={styles.usageTitle}>App Usage Time</Text>
          <Text style={styles.usageTime}>12 hours 45 minutes</Text>
          <Text style={styles.usageSubtitle}>this week</Text>
        </View>

        {/* Additional profile content can be added here */}
        <View style={styles.additionalContent}>
          <Text style={styles.text}>Profile Settings</Text>
          {/* Add more profile options here */}
        </View>
      </ScrollView>
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
    paddingVertical: 10, // Exact same as other screens
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
    paddingBottom: 20,
  },
  profileSection: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
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
  usageContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
  },
  usageTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0A2E5B",
    marginBottom: 10,
  },
  usageTime: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4A90E2",
    marginBottom: 5,
  },
  usageSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  additionalContent: {
    alignItems: "center",
    paddingVertical: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
});

export default ProfileScreen;