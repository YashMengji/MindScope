import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnalyticsScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* --- Header (same as FeaturesScreen) --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Hi Steve!</Text>
          <Text style={styles.headerSubtitle}>your analytics overview</Text>
        </View>
        <Image
          source={require("../assets/default.png")}
          style={styles.avatar}
        />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.text}>Analytics Screen</Text>
      </View>
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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
  },
});

export default AnalyticsScreen;
