import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Ionicons } from "@expo/vector-icons";

const ScreenTimeControllerCard = ({ onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Icon name="lock-clock" color="#000" size={34} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Screen Time Controller</Text>
          <Text style={styles.subtitle}>App specific timer</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    // marginHorizontal: 16,
    // marginVertical: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: '#000',
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.05,
    shadowRadius: 2,
    // elevation: 2,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    // marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    // color: '#666666',
    color: '#9CA3AF',
    fontWeight: '400',
  },
});

export default ScreenTimeControllerCard;