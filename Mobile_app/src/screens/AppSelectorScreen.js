import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AppSelectorScreen = ({navigation}) => {
  const apps = [
    {
      id: 1,
      name: 'YouTube',
      icon: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'
    },
    {
      id: 2,
      name: 'Instagram',
      icon: 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png'
    }
  ];

  const handleInfoPress = () => {
    // Info action - to be implemented later
    console.log('Info pressed');
  };

  const handleSetTimerPress = () => {
    // Set timer action - to be implemented later
    navigation.navigate("ScreenTimeSettingsScreen");
    console.log('Set timer pressed');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Icon style={styles.backArrowIcon} name="arrow-back-ios-new" size={24} color="#717171" onPress={() => navigation.goBack()}/>
  
        <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Screen Time Controller</Text>
            <Text style={styles.headerSubtitle}>App specific timer</Text>
        </View>
      </View>

      {/* Description Row */}
      <View style={styles.descriptionRow}>
        <TouchableOpacity onPress={handleInfoPress} style={styles.infoIcon}>
          <Icon name="info-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.descriptionText}>Select app to apply individual timer</Text>
      </View>

      {/* App List */}
      <ScrollView style={styles.appListContainer}>
        {apps.map((app) => (
          <View key={app.id} style={styles.appItem}>
            <View style={styles.appInfo}>
              <Image 
                source={{ uri: app.icon }} 
                style={styles.appIcon}
              />
              <Text style={styles.appName}>{app.name}</Text>
            </View>
            
            <View style={styles.timerControls}>
              <TouchableOpacity 
                onPress={handleSetTimerPress}
                style={styles.setTimerButton}
              >
                <Text style={styles.setTimerText}>Set timer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    display: "flex",
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backArrowIcon: {
    padding: 6,
    backgroundColor: "#cee4ff",
    borderRadius: 50,
    display: "flex",
    alignContent: "center",
    justifyContent: "center"
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  descriptionText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '400',
  },
  infoIcon: {
    padding: 4,
  },
  appListContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setTimerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  setTimerText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default AppSelectorScreen;