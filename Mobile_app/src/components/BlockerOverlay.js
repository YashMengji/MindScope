import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");

// Rotating motivational messages shown on the overlay
const MOTIVATIONAL_MESSAGES = [
  {
    headline: "Your attention is precious.",
    body: "This section was designed to keep you scrolling. You chose differently — that takes strength.",
  },
  {
    headline: "A mindful pause.",
    body: "Every distraction you skip is a moment returned to the life you actually want to live.",
  },
  {
    headline: "You're in control.",
    body: "Breaking the scroll habit is hard. The fact that you set this up means you're already winning.",
  },
  {
    headline: "Protect your focus.",
    body: "Your goals, relationships, and creativity need the time you'd spend here. They're worth it.",
  },
  {
    headline: "This was intentional.",
    body: "You set this boundary for a reason. Trust your past self — they were looking out for you.",
  },
];

const BlockerOverlay = ({ visible, reason, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Pick a consistent message per session (random on each mount)
  const messageRef = useRef(
    MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]
  );

  useEffect(() => {
    if (visible) {
      // Refresh message on each new trigger
      messageRef.current =
        MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 340,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.94,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      slideAnim.setValue(30);
    }
  }, [visible]);

  const message = messageRef.current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="transparent" translucent />

      {/* Full-screen blur base */}
      <BlurView
        style={StyleSheet.absoluteFillObject}
        intensity={85}
        tint="dark"
      />

      {/* Dark tint overlay */}
      <Animated.View style={[styles.darkOverlay, { opacity: fadeAnim }]} />

      {/* Content card */}
      <View style={styles.centeredContainer}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          {/* Shield icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={36} color="#6366F1" />
          </View>

          {/* Blocked label */}
          <View style={styles.blockedBadge}>
            <View style={styles.blockedDot} />
            <Text style={styles.blockedBadgeText}>Section Blocked</Text>
          </View>

          {/* Reason chip */}
          {!!reason && (
            <View style={styles.reasonChip}>
              <Ionicons name="ban-outline" size={13} color="#9CA3AF" />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Motivational message */}
          <Text style={styles.headline}>{message.headline}</Text>
          <Text style={styles.body}>{message.body}</Text>

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.closeButtonText}>I understand, go back</Text>
          </TouchableOpacity>

          {/* Subtle dismiss hint */}
          <Text style={styles.dismissHint}>
            This overlay will reappear each time that section opens.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 8, 22, 0.55)",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  // Glass card
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "rgba(255, 255, 255, 0.13)",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    // Subtle shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.45,
    shadowRadius: 40,
    elevation: 20,
  },

  // Icon
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(99, 102, 241, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  // Blocked badge
  blockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.18)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
    gap: 6,
  },
  blockedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#EF4444",
  },
  blockedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FCA5A5",
    letterSpacing: 0.5,
  },

  // Reason chip
  reasonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  divider: {
    width: "70%",
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginVertical: 20,
  },

  // Message
  headline: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 27,
  },
  body: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.72)",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 4,
  },

  // Close button
  closeButton: {
    width: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  dismissHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.38)",
    textAlign: "center",
    lineHeight: 16,
  },
});

export default BlockerOverlay;
