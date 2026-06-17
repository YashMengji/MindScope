import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  RefreshControl, // <-- Add this
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { getChat } from "../services/chatInferenceService";
import ToxicityChart from "../components/ToxicityChart";
import VoiceToxicityChart from '../components/VoiceToxicityChart';
import DateSelector from "../components/DateSelector";

const AnalyticsScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  const [chats, setChats] = useState([]);
  const [toxicityData, setToxicityData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const screenWidth = Dimensions.get('window').width;

  // Process chat data for chart
  const processChatData = (chatData) => {
    if (!chatData || chatData.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [0],
          color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
          strokeWidth: 2,
        }],
      };
    }

    // Sort chats by timestamp
    const sortedChats = [...chatData].sort((a, b) => a.startTimestamp - b.startTimestamp);

    // If we have few entries (less than 8), show all
    if (sortedChats.length <= 8) {
      const labels = sortedChats.map(chat => {
        const date = new Date(chat.startTimestamp);
        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      });

      const data = sortedChats.map(chat => chat.toxicityScore);

      return {
        labels,
        datasets: [{
          data,
          color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
          strokeWidth: 2,
        }],
      };
    }

    // For more entries, group by hour and average the scores
    const hourlyData = {};

    sortedChats.forEach(chat => {
      const date = new Date(chat.startTimestamp);
      const hourKey = `${date.getHours()}:00`;

      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = {
          total: 0,
          count: 0,
        };
      }

      hourlyData[hourKey].total += chat.toxicityScore;
      hourlyData[hourKey].count += 1;
    });

    // Convert to arrays for chart
    const labels = Object.keys(hourlyData);
    const data = Object.values(hourlyData).map(hour => hour.total / hour.count);

    return {
      labels,
      datasets: [{
        data,
        color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  };

  // Fetch chat data on mount
  const fetchChatData = async (selectedDate) => {
    try {
      console.log("Fetching chat data for user:", user?._id);
      const response = await getChat(selectedDate);
      console.log("Chat data response:", response);

      if (response && response.chats) {
        setChats(response.chats);
        const processedData = processChatData(response.chats);
        setToxicityData(processedData);
      }
    } catch (error) {
      console.error("Error fetching chat data:", error);
      // Set fallback data
      setToxicityData(processChatData([]));
    }
  };
  useEffect(() => {

    // if (user?._id) {
    //   console.log("User ID available, fetching chat data.");
    //   fetchChatData();
    // }
    fetchChatData(selectedDate);
  }, [selectedDate]);

  // --- ADD THESE LINES ---
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChatData(selectedDate); // Refresh data for the currently selected date
    setRefreshing(false);
  }, [selectedDate]);
  // -----------------------

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
    propsForLabels: {
      fontSize: 10,
    },
  };

  // Calculate statistics
  const totalChats = chats.length;
  const avgToxicity = totalChats > 0
    ? (chats.reduce((sum, chat) => sum + chat.toxicityScore, 0) / totalChats).toFixed(3)
    : "0.000";
  const safeChats = chats.filter(chat => chat.toxicityScore < 0.3).length;
  const safeChatsPercentage = totalChats > 0
    ? ((safeChats / totalChats) * 100).toFixed(1)
    : "0.0";

  const defaultToxicityData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: [0.2, 0.4, 0.3, 0.1, 0.5, 0.2, 0.3],
      color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  // Feedback messages for each data point
  const feedbackMessages = [
    "You could have controlled your anger. Try taking a deep breath before responding.",
    "Your response showed improvement in managing frustration.",
    "Consider using more positive language to express your concerns.",
    "Good job managing your tone! Keep up the constructive communication.",
    "Some responses were harsh. Try framing feedback more gently.",
    "You handled the difficult conversation well.",
    "Be mindful of sarcasm - it can sometimes escalate tensions."
  ];

  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const totalRecords = defaultToxicityData.datasets[0].data.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* --- Header --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Hi {user ? user.name : "Default"}!
          </Text>
          <Text style={styles.headerSubtitle}>Your Analytics Overview</Text>
        </View>
        <Image
          source={require("../assets/default.png")}
          style={styles.avatar}
        />
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        // --- ADD THIS PROP ---
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0A2E5B"]} // Android spinner color
            tintColor={"#0A2E5B"} // iOS spinner color
          />
        }
      // ---------------------
      >
        {/* Date Selector — fetch fires only when "Done" is pressed */}
        <DateSelector
          selectedDate={selectedDate}
          onConfirm={(date) => setSelectedDate(date)}
        />

        {/* Toxicity Trend Chart */}
        <ToxicityChart title="Chat text toxicity" data={chats} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />

        {/* Statistics Overview */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Conversation Analytics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalChats}</Text>
              <Text style={styles.statLabel}>Total Conversations</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{avgToxicity}</Text>
              <Text style={styles.statLabel}>Average Toxicity</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{safeChats}</Text>
              <Text style={styles.statLabel}>Safe Conversations</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{safeChatsPercentage}%</Text>
              <Text style={styles.statLabel}>Positive Rate</Text>
            </View>
          </View>
        </View>

        {/* Toxicity Levels Breakdown */}
        <View style={styles.breakdownContainer}>
          <Text style={styles.breakdownTitle}>Toxicity Level Distribution</Text>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLabel}>
              <View style={[styles.colorIndicator, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.breakdownText}>Safe (0.0 - 0.3)</Text>
            </View>
            <Text style={styles.breakdownCount}>{safeChats}</Text>
          </View>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLabel}>
              <View style={[styles.colorIndicator, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.breakdownText}>Moderate (0.3 - 0.7)</Text>
            </View>
            <Text style={styles.breakdownCount}>
              {chats.filter(chat => chat.toxicityScore >= 0.3 && chat.toxicityScore < 0.7).length}
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLabel}>
              <View style={[styles.colorIndicator, { backgroundColor: '#F44336' }]} />
              <Text style={styles.breakdownText}>High (0.7 - 1.0)</Text>
            </View>
            <Text style={styles.breakdownCount}>
              {chats.filter(chat => chat.toxicityScore >= 0.7).length}
            </Text>
          </View>
        </View>

        {/* Bottom Spacing */}
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
    paddingBottom: 20,
  },
  chartSection: {
    marginTop: 20,
  },
  chartTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0A2E5B",
    marginBottom: 8,
  },
  chartSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  chartWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: {
    marginTop: 30,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0A2E5B",
    marginBottom: 16,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: '48%',
    alignItems: "center",
    padding: 15,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0A2E5B",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  breakdownContainer: {
    marginTop: 30,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0A2E5B",
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  breakdownLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  breakdownText: {
    fontSize: 14,
    color: "#333",
  },
  breakdownCount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0A2E5B",
  },
  bottomSpacing: {
    height: 20,
  },
});

export default AnalyticsScreen;