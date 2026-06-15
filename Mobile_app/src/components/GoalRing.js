// GoalRing.js
// Circular daily screen-time goal indicator with a streak counter.
// Presentational: parent owns the goal value + persistence and passes it in.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// Same preset durations used by the per-app timer screen, in minutes.
const GOAL_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300, 360, 480];

const RING_SIZE = 180;
const STROKE_WIDTH = 16;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const formatMinutes = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
};

const GoalRing = ({ usedMinutes = 0, goalMinutes = 180, streak = 0, onChangeGoal }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const safeGoal = goalMinutes > 0 ? goalMinutes : 1;
  const progress = Math.min(usedMinutes / safeGoal, 1);
  const overGoal = usedMinutes > goalMinutes;
  const ringColor = overGoal ? '#E74C3C' : '#4A90E2';
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const remaining = Math.max(goalMinutes - usedMinutes, 0);

  const handleSelectGoal = (minutes) => {
    setModalVisible(false);
    if (onChangeGoal) onChangeGoal(minutes);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
        style={styles.ringWrapper}
      >
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Track */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke="#E8EDF3"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress arc (rotated so it starts at the top) */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={ringColor}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>

        <View style={styles.ringCenter}>
          <Text style={styles.usedText}>{formatMinutes(usedMinutes)}</Text>
          <Text style={styles.goalText}>of {formatMinutes(goalMinutes)} goal</Text>
          {overGoal ? (
            <Text style={styles.overText}>Over goal</Text>
          ) : (
            <Text style={styles.remainingText}>{formatMinutes(remaining)} left</Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.footerRow}>
        <View style={styles.streakBadge}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>
            {streak} day{streak === 1 ? '' : 's'} under goal
          </Text>
        </View>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.editButton}>
          <Text style={styles.editText}>Edit goal</Text>
        </TouchableOpacity>
      </View>

      {/* Goal-picker modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Daily screen-time goal</Text>
            <Text style={styles.modalSubtitle}>
              Stay under this each day to grow your streak.
            </Text>
            <ScrollView contentContainerStyle={styles.optionsGrid}>
              {GOAL_OPTIONS.map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.option,
                    goalMinutes === minutes && styles.optionSelected,
                  ]}
                  onPress={() => handleSelectGoal(minutes)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      goalMinutes === minutes && styles.optionTextSelected,
                    ]}
                  >
                    {formatMinutes(minutes)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  usedText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2C4A6E',
  },
  goalText: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  remainingText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '600',
    marginTop: 6,
  },
  overText: {
    fontSize: 13,
    color: '#E74C3C',
    fontWeight: '600',
    marginTop: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 18,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  streakText: {
    fontSize: 13,
    color: '#E67E22',
    fontWeight: '600',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A6E',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: '30%',
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  optionText: {
    fontSize: 13,
    color: '#2C4A6E',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
});

export default GoalRing;
