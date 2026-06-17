import React, { useContext, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import CustomTabBar from "./CustomTabBar";

import LandingScreen from "../screens/LandingScreen";
import LoginScreen from "../screens/LoginScreen";
import SignUpScreen from "../screens/SignUpScreen";
import HomeScreen from "../screens/HomeScreen";
import FeaturesScreen from "../screens/FeaturesScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import VoiceAnalysisScreen from "../screens/VoiceAnalysisScreen";
import AppSelectorScreen from "../screens/AppSelectorScreen";
import ScreenTimeSettingsScreen from "../screens/ScreenTimeSettingsScreen";
import SectionBlockerScreen from "../screens/SectionBlockerScreen";
import { AuthContext } from "../context/AuthContext";

// NOTE: No JS overlay here. The blocker overlay is drawn entirely
// by AccessibilityBlockerService.java using TYPE_APPLICATION_OVERLAY
// (native WindowManager), which works on MIUI and all Android phones.

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainAppTabs() {
  const [selectedDirectory, setSelectedDirectory] = useState(null);

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />

      {/* 3. Pass the state and the setter as props using children pattern or initialParams */}
      <Tab.Screen name="Features">
        {(props) => (
          <FeaturesScreen
            {...props}
            selectedDirectory={selectedDirectory}
            setSelectedDirectory={setSelectedDirectory}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Chat Analytics" component={AnalyticsScreen} />

      <Tab.Screen name="Voice Analytics">
        {(props) => (
          <VoiceAnalysisScreen
            {...props}
            selectedDirectory={selectedDirectory}
            setSelectedDirectory={setSelectedDirectory}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Screens shown only when the user is authenticated.
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainApp" component={MainAppTabs} />
      <Stack.Screen name="SectionBlocker" component={SectionBlockerScreen} />
      <Stack.Screen name="AppSelectorScreen" component={AppSelectorScreen} />
      <Stack.Screen
        name="ScreenTimeSettingsScreen"
        component={ScreenTimeSettingsScreen}
      />
    </Stack.Navigator>
  );
}

// Screens shown only when the user is NOT authenticated.
function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);

  // While we check for a stored token / load the profile, show a spinner.
  if (loading) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
