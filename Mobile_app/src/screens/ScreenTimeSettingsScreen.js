// ScreenUsageController.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ScreenTimeSettingsScreen = ({ navigation }) => {
  // UI only - no logic
  const handleBackPress = () => {
    // Navigation handled by parent
    if (navigation) {
      navigation.goBack();
    }
  };

  // Placeholder data structure for UI
  const screenUsageControllerSubFeature = {
    dailyLimit: { enabled: false, time: null },
    sessionLimit: { enabled: false, time: null },
    cooldown: { enabled: false, time: null }
  };

  // Placeholder functions for UI
  const updateScreenUsageControllerFeature = (feature, value, time) => {
    // UI only - no logic
    console.log(`${feature} toggled: ${value}`);
  };

  const SubFeatureCard = ({ title, value, onValueChange, timeValue, onTimeChange, showTime }) => {
    return (
      <View style={styles.subFeatureCard}>
        <View style={styles.subFeatureHeader}>
          <Text style={styles.subFeatureTitle}>{title}</Text>
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: '#E5E5E5', true: '#34C759' }}
            thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
            ios_backgroundColor="#E5E5E5"
          />
        </View>
        
        {showTime && value && (
          <TouchableOpacity 
            style={styles.timeSelector}
            onPress={() => onTimeChange && onTimeChange('')}
          >
            <Text style={styles.timeSelectorText}>
              {timeValue ? `${timeValue} minutes` : 'Set time limit'}
            </Text>
            <Icon name="chevron-right" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Screen Usage Controller</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <SubFeatureCard
          title="Daily limit"
          value={screenUsageControllerSubFeature.dailyLimit.enabled}
          onValueChange={(val) => updateScreenUsageControllerFeature('dailyLimit', val)}
          timeValue={screenUsageControllerSubFeature.dailyLimit.time}
          onTimeChange={(time) => updateScreenUsageControllerFeature('dailyLimit', true, time)}
          showTime={true}
        />
        
        <SubFeatureCard
          title="Session limit"
          value={screenUsageControllerSubFeature.sessionLimit.enabled}
          onValueChange={(val) => updateScreenUsageControllerFeature('sessionLimit', val)}
          timeValue={screenUsageControllerSubFeature.sessionLimit.time}
          onTimeChange={(time) => updateScreenUsageControllerFeature('sessionLimit', true, time)}
          showTime={true}
        />
        
        <SubFeatureCard
          title="Cooldown period"
          value={screenUsageControllerSubFeature.cooldown.enabled}
          onValueChange={(val) => updateScreenUsageControllerFeature('cooldown', val)}
          timeValue={screenUsageControllerSubFeature.cooldown.time}
          onTimeChange={(time) => updateScreenUsageControllerFeature('cooldown', true, time)}
          showTime={true}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  subFeatureCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  subFeatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subFeatureTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0A2E5B',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  timeSelectorText: {
    fontSize: 14,
    color: '#007AFF',
  },
});

export default ScreenTimeSettingsScreen;