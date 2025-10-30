import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { getChat } from "../services/chatInferenceService";

// --- Main HomeScreen Component ---
const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const emojiScale = useRef(new Animated.Value(1)).current;
  const emojiBounce = useRef(new Animated.Value(0)).current;
  const { user } = useContext(AuthContext);
  const [chats, setChats] = useState([]);

  // Emoji animation
  useEffect(() => {
    const animateEmoji = () => {
      Animated.sequence([
        Animated.timing(emojiScale, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(emojiScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(emojiBounce, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(emojiBounce, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(animateEmoji, 2000);
      });
    };

    animateEmoji();
  }, []);

  useEffect( () => {
    
    console.log("Fetching chat data for user:", user);
    const fetchData = async () => {
      return await getChat(user._id);
    }
    const response = fetchData();
    console.log("Chat data response:", response.chats);
    setChats(response.chats);
  }, []);

  const animatedStyle = {
    transform: [{ scale: emojiScale }, { translateY: emojiBounce }],
  };



  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 0,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#ff3b30',
    },
  };

  const toxicityData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [0.2, 0.4, 0.3, 0.1, 0.5, 0.2, 0.1], // toxicity scores (0-1 scale)
        color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`, // Red color for toxicity
        strokeWidth: 2,
      },
    ],
  };
  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* --- Header (exact copy from FeaturesScreen) --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Hi {user ? user.name : "Default"}!
          </Text>
          <Text style={styles.headerSubtitle}>
            here's your mental health checkup for today
          </Text>
        </View>
        <Image
          source={require("../assets/default.png")}
          style={styles.avatar}
        />
      </View>

      {/* --- Scrollable Content Area --- */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mood Section */}
        <View style={styles.moodSection}>
          <Animated.Text style={[styles.emoji, animatedStyle]}>
            😊
          </Animated.Text>
          <Text style={styles.moodTitle}>You're very happy</Text>
          <Text style={styles.moodSubtitle}>
            Keep spreading positivity! Maybe share your joy with a loved one.
          </Text>
        </View>

        {/* Progress Status Section - Container Only */}
        <View style={styles.progressSection}>
          <Text style={styles.progressTitle}>Progress Status</Text>
          {/* Empty Chart Container */}
          <View style={styles.chartWrapper}>
            <LineChart
              data={toxicityData}
              width={screenWidth - 80} // Adjust based on your padding
              height={200}
              chartConfig={chartConfig}
              bezier
              style={{
                borderRadius: 16,
                paddingRight: 0,
              }}
            />
          </View>
        </View>

        {/* Spacing at the bottom */}
        <View style={styles.bottomSpacing} />
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20, // Space above tab bar
  },
  moodSection: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 20,
  },
  emoji: {
    fontSize: 120,
    marginBottom: 10,
  },
  moodTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0A2E5B",
  },
  moodSubtitle: {
    fontSize: 16,
    color: "#667",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  progressSection: {
    marginTop: 20,
  },
  progressTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0A2E5B",
    marginBottom: 16,
  },
  chartWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  placeholderText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  bottomSpacing: {
    height: 10, // Additional space after the progress container
  },
});

export default HomeScreen;
