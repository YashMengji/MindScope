import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
// 1. Import SVG components for the "perfect center" rendering
import { Circle, G } from 'react-native-svg';

const ToxicityChart = ({ title, data }) => {
  const screenWidth = Dimensions.get('window').width;
  const [selectedPoint, setSelectedPoint] = useState(null);

  // Constants for configuration
  const HALO_RADIUS = 10; // Controls the size of the highlight ring (Diameter = 20)

  // 2. Process Data
  const chartConfigData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        labels: ["No Data"],
        datasets: [{ data: [0], color: () => 'transparent' }],
      };
    }

    // Sort by time (oldest to newest)
    const sortedData = [...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return {
      labels: sortedData.map(item => {
        const date = new Date(item.createdAt);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }),
      datasets: [
        {
          data: sortedData.map(item => item.toxicityScore),
          color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      raw: sortedData,
    };
  }, [data]);

  const handlePointClick = (point) => {
    const selectedRecord = chartConfigData.raw[point.index];
    
    // Toggle selection logic
    if (selectedPoint && selectedPoint._id === selectedRecord._id) {
      setSelectedPoint(null);
    } else {
      setSelectedPoint({
        ...selectedRecord,
        index: point.index, // Save index to match in renderDotContent
        displayValue: point.value,
      });
    }
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(10, 46, 91, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: '#ff3b30',
    },
    propsForBackgroundLines: {
      strokeDasharray: '5, 5',
      stroke: 'rgba(0, 0, 0, 0.05)',
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Tap a node to see detailed AI feedback</Text>
      </View>

      <View style={styles.chartWrapper}>
        <LineChart
          data={chartConfigData}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          fromZero
          onDataPointClick={handlePointClick}
          style={styles.chartStyle}
          segments={5}
          // 3. The "Not Hardcoded" Fix:
          // This prop renders content AT the exact x,y center of the dot.
          renderDotContent={({ x, y, index }) => {
            // Only render the halo for the selected point
            if (selectedPoint && selectedPoint.index === index) {
              return (
                <G key={`halo-${index}`}>
                  <Circle
                    cx={x} // Exact center X provided by chart
                    cy={y} // Exact center Y provided by chart
                    r={HALO_RADIUS}
                    fill="rgba(10, 46, 91, 0.2)" // Transparent fill
                    stroke="#0A2E5B"
                    strokeWidth={2}
                  />
                </G>
              );
            }
            return null;
          }}
        />
      </View>

      {/* Feedback Card Display */}
      {selectedPoint ? (
        <View style={styles.feedbackCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardLabel}>AI ANALYSIS REPORT</Text>
              <Text style={styles.cardTimestamp}>
                {new Date(selectedPoint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{(selectedPoint.toxicityScore * 100).toFixed(0)}%</Text>
              <Text style={styles.scoreSub}>Toxicity</Text>
            </View>
          </View>

          <View style={styles.feedbackList}>
            {selectedPoint.feedback && selectedPoint.feedback.map((item, index) => (
              <View key={index} style={styles.bulletRow}>
                <View style={styles.bullet} />
                <Text style={styles.feedbackText}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={() => setSelectedPoint(null)}
          >
            <Text style={styles.closeBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Select a conversation point to view improvements</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    width: '100%',
  },
  header: {
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0A2E5B',
  },
  subtitle: {
    fontSize: 13,
    color: '#8898AA',
    marginTop: 4,
  },
  chartWrapper: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 15,
    paddingRight: 10,
    // Modern shadow
    shadowColor: '#171717',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  chartStyle: {
    borderRadius: 16,
    marginRight: -10,
  },
  // Removed "selectionIndicator" style as it is no longer needed
  feedbackCard: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0A2E5B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F6F9FC',
    paddingBottom: 12,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5E72E4',
    letterSpacing: 1,
  },
  cardTimestamp: {
    fontSize: 14,
    color: '#32325D',
    fontWeight: '600',
  },
  scoreBadge: {
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 8,
    borderRadius: 12,
    minWidth: 70,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5365C',
  },
  scoreSub: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#F5365C',
    textTransform: 'uppercase',
  },
  feedbackList: {
    marginTop: 5,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5E72E4',
    marginTop: 7,
    marginRight: 12,
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    color: '#525F7F',
    lineHeight: 20,
  },
  closeBtn: {
    alignSelf: 'center',
    marginTop: 10,
    padding: 10,
  },
  closeBtnText: {
    fontSize: 13,
    color: '#ADB5BD',
    fontWeight: '600',
  },
  emptyState: {
    marginTop: 20,
    padding: 30,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8898AA',
    textAlign: 'center',
  },
});

export default ToxicityChart;