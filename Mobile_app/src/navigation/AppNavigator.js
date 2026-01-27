import React from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
// import { useSafeAreaInsets } from "react-native-safe-area-context"; // No longer needed here

// Import the custom component
import CustomTabBar from "./CustomTabBar";

// Import Screens
import LandingScreen from "../screens/LandingScreen";
import LoginScreen from "../screens/LoginScreen";
import SignUpScreen from "../screens/SignUpScreen";
import HomeScreen from "../screens/HomeScreen";
import FeaturesScreen from "../screens/FeaturesScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import VoiceAnalysisScreen from "../screens/VoiceAnalysisScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Wrapper component for tab navigator
function MainAppTabs() {
  // Removed the wrapping View with padding. 
  // The TabBar is now floating, so screens take full height.
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Features" component={FeaturesScreen} />
      <Tab.Screen name="Chat Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Voice Analytics" component={VoiceAnalysisScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// This navigator handles the initial authentication flow
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainApp"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="MainApp" component={MainAppTabs} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;