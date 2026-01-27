import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, LayoutGrid, MessageSquareText, Mic, UserRound } from 'lucide-react-native';

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.outerContainer, { paddingBottom: insets.bottom || 15 }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Icon Mapping with dynamic color and size
          const iconColor = isFocused ? '#0A2E5B' : '#94A3B8'; // Active blue vs Inactive slate
          const iconSize = 20; // Slightly smaller icons for a modern feel

          let IconComponent;
          switch (route.name) {
            case 'Home': IconComponent = Home; break;
            case 'Features': IconComponent = LayoutGrid; break;
            case 'Chat Analytics': IconComponent = MessageSquareText; break;
            case 'Voice Analytics': IconComponent = Mic; break;
            case 'Profile': IconComponent = UserRound; break;
            default: IconComponent = Home;
          }

          return (
            <TouchableOpacity
              key={index}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.6}
            >
              <View style={[styles.iconWrapper, isFocused && styles.activeIconWrapper]}>
                <IconComponent 
                  size={iconSize} 
                  color={iconColor} 
                  strokeWidth={isFocused ? 2.5 : 2} 
                />
              </View>
              
              <Text style={[
                styles.tabLabel, 
                { color: iconColor, fontWeight: isFocused ? '700' : '500' }
              ]}>
                {/* Shortening labels for smaller UI */}
                {route.name.split(' ')[0]}
              </Text>

              {/* Minimalist dot indicator below active tab */}
              {isFocused && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF', // Clean White Background
    width: '92%',
    height: 70,
    borderRadius: 25,
    justifyContent: 'space-around',
    alignItems: 'center',
    // Ultra-soft modern shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minWidth: 60,
  },
  iconWrapper: {
    marginBottom: 4,
    padding: 4,
    borderRadius: 12,
  },
  activeIconWrapper: {
    backgroundColor: '#F0F7FF', // Very subtle blue tint for the icon background
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0A2E5B',
    position: 'absolute',
    bottom: 8,
  }
});

export default CustomTabBar;