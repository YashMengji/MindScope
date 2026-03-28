import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeTooltip, setActiveTooltip] = useState(null);

  const iconMap = {
    Home: { outline: "home-outline", filled: "home-sharp" },
    Features: { outline: "apps-outline", filled: "apps-sharp" },
    "Chat Analytics": { outline: "analytics-outline", filled: "analytics-sharp" },
    "Voice Analytics": { outline: "pulse-outline", filled: "pulse-sharp" },
    Profile: { outline: "person-outline", filled: "person-sharp" },
  };

  // FIX 1: Compute the bottom safe area padding once and apply it to the
  // container's height instead of only its paddingBottom. Previously the
  // fixed height: 60 stayed the same while paddingBottom just squeezed the
  // icons upward, clipping them on devices with a home indicator.
  const bottomInset = Math.max(insets.bottom, 8);
  const tabBarHeight = 50 + bottomInset;

  return (
    <View
      style={[
        styles.tabBarContainer,
        { height: tabBarHeight, paddingBottom: bottomInset },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onPressIn = () => {
          if (!isFocused) {
            setActiveTooltip(route.name);
          }
        };

        const onPressOut = () => {
          setActiveTooltip(null);
        };

        // FIX 2: Guard against route names that are absent from iconMap.
        // Previously this would throw "Cannot read property 'filled' of
        // undefined" for any unregistered route name.
        const iconEntry = iconMap[route.name] ?? {
          outline: "ellipse-outline",
          filled: "ellipse",
        };
        const iconName = isFocused ? iconEntry.filled : iconEntry.outline;

        return (
          // FIX 3: Add zIndex + overflow: "visible" to tabItemWrapper so the
          // absolutely-positioned tooltip is not clipped by the parent view or
          // rendered behind a neighbouring tab item. Without this the tooltip
          // was hidden on most devices.
          <View key={route.key} style={styles.tabItemWrapper}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={styles.tabButton}
              activeOpacity={0.6}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name={iconName}
                  size={26}
                  color={isFocused ? "#000000" : "#9CA3AF"}
                />
                {isFocused && <View style={styles.activeIndicator} />}
              </View>
            </TouchableOpacity>

            {activeTooltip === route.name && (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>{route.name}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    zIndex: 10,
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
    // height is now set dynamically in the component to include bottomInset
    justifyContent: "space-around",
    alignItems: "center",
    // Allow tooltips to overflow the bar upward
    overflow: "visible",
  },
  tabItemWrapper: {
    position: "relative",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    // FIX 3: ensure tooltip is not clipped by sibling views
    zIndex: 10,
    overflow: "visible",
  },
  tabButton: {
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    paddingHorizontal: 12,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#000000",
  },
  tooltip: {
    position: "absolute",
    bottom: 52,
    backgroundColor: "#1F2937",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
    // Ensure tooltip floats above everything else
    zIndex: 999,
  },
  tooltipText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});

export default CustomTabBar;