import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Add this import

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets(); // Use the hook
  
  const icons = {
    Home: "home-outline",
    Features: "apps-outline",
    Analytics: "stats-chart-outline",
    Profile: "person-outline",
  };

  return (
    <View style={[styles.tabBarContainer, { marginBottom: insets.bottom }]}>
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

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={isFocused ? styles.activeTab : styles.inactiveTab}
          >
            <Ionicons
              name={icons[route.name]}
              size={24}
              color={isFocused ? "#FFFFFF" : "#007ACC"}
            />
            {isFocused && <Text style={styles.tabLabel}>{route.name}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: "#E0EFFF",
    borderRadius: 20,
    height: 70,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    marginHorizontal: 10,
    // marginTop: 10,
  },
  activeTab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  inactiveTab: {
    justifyContent: "center",
    alignItems: "center",
    width: 50,
    height: 50,
  },
  tabLabel: {
    color: "#FFFFFF",
    marginLeft: 8,
    fontWeight: "bold",
    fontSize: 14,
  },
});

export default CustomTabBar;