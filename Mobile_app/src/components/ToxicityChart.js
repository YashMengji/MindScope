import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native"
import { LineChart } from "react-native-chart-kit"
import { useState, useMemo } from "react";
import { Circle, G } from 'react-native-svg';

export default function ToxicityChart({ title, data }) {
    console.log("Chat data (toxicity chart component) : ", data);

    const screenWidth = Dimensions.get('window').width;

    const [selectedPoint, setSelectedPoint] = useState(null);

    // Constants for configuration
    const HALO_RADIUS = 10; // Controls the size of the highlight ring (Diameter = 20)

    const defaultToxicityData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            data: [0.9],
            color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
            strokeWidth: 2,
        }],
        raw: [
            {
                feedback: []
            }
        ]
    };

    const chartConfigData = useMemo(() => {
        if (!data || data.length === 0) {
          return {
            labels: ["No Data"],
            datasets: [{ data: [0], color: () => 'transparent' }],
          };
        }
    
        // Sort by time (oldest to newest)
        const sortedData = [...data].sort((a, b) => new Date(a.endTimestamp) - new Date(b.endTimestamp));
    
        return {
          labels: sortedData.map(item => {
            const date = new Date(item.endTimestamp);
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

    // Feedback messages for each data point
    const totalRecords = chartConfigData.datasets[0].data.length;

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

    // const handleDataPointClick = (data) => {
        
    //     // If clicking the same point, deselect it
    //     if (selectedPoint.index === data.index) {
    //         setSelectedPoint({
    //             index: -1,
    //             value: 0,
    //             feedback: "",
    //             day: "",
    //             x: 0,
    //             y: 0
    //         });
    //         return;
    //     }

    //     setSelectedPoint({
    //         index: data.index,
    //         value: data.value,
    //         feedback: feedbackMessages[data.index] || "No feedback available for this point.",
    //         day: dayLabels[data.index] || `Day ${data.index + 1}`,
    //         x: data.x, // Use the x coordinate from the click event
    //         y: data.y  // Use the y coordinate from the click event
    //     });
    // };

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

    return (
        <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>{title} Score Trend</Text>
            <Text style={styles.chartSubtitle}>
                {totalRecords > 0
                    ? `Based on ${totalRecords} conversation${totalRecords > 1 ? 's' : ''}`
                    : 'No conversation data available'
                }
            </Text>

            {/* Instruction text */}
            <Text style={styles.instructionText}>
                Click on data points above to view feedback
            </Text>

            <View style={styles.chartWrapper}>
                

                <LineChart
                    data={chartConfigData}
                    width={screenWidth - 40}
                    height={220}
                    chartConfig={chartConfig}
                    bezier
                    style={{
                        borderRadius: 16,
                        marginVertical: 8,
                    }}
                    fromZero
                    yAxisLabel=""
                    yAxisSuffix=""
                    segments={5}
                    onDataPointClick={(point) => handlePointClick(point)}
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

            {/* Feedback Box - Only shown when a point is selected */}
            {/* {selectedPoint.index >= 0 ? (
                <View style={styles.feedbackContainer}>
                    <View style={styles.feedbackHeader}>
                        <Text style={styles.feedbackTitle}>
                            Feedback for {new Date(selectedPoint.endTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={styles.feedbackScore}>
                            Score: {(selectedPoint.toxicityScore * 100).toFixed(0)}%
                        </Text>
                    </View>
                    <Text style={styles.feedbackText}>
                        {selectedPoint.feedback && selectedPoint.feedback.map((item, index) => (
                            <View key={index} style={styles.bulletRow}>
                                <View style={styles.bullet} />
                                <Text style={styles.feedbackText}>{item}</Text>
                            </View>
                        ))}
                    </Text>
                    <TouchableOpacity
                        style={styles.deselectButton}
                        onPress={() => setSelectedPoint({
                            index: -1,
                            value: 0,
                            feedback: "",
                            day: "",
                            x: 0,
                            y: 0
                        })}
                    >
                        <Text style={styles.deselectButtonText}>Deselect Point</Text>
                    </TouchableOpacity>
                </View>

                
            ) : (
                // Placeholder when no point is selected
                <View style={styles.placeholderContainer}>
                    <Text style={styles.placeholderText}>
                        Click on any data point above to view feedback
                    </Text>
                </View>
            )}
        </View> */}

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
    )
}

const styles = StyleSheet.create({
    chartSection: {
        marginTop: 20,
    },
    chartTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#0A2E5B",
        marginBottom: 8,
    },
    chartSubtitle: {
        fontSize: 14,
        color: "#666",
        marginBottom: 8,
    },
    instructionText: {
        fontSize: 13,
        color: "#0A2E5B",
        fontStyle: "italic",
        marginBottom: 12,
        textAlign: "center",
    },
    chartWrapper: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 1,
        alignItems: "center",
        justifyContent: "center",
        position: 'relative',
    },
    selectedPoint: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#0A2E5B',
        borderWidth: 3,
        borderColor: '#FFF',
        zIndex: 100,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    // feedbackContainer: {
    //     backgroundColor: "#F0F8FF",
    //     borderRadius: 12,
    //     padding: 16,
    //     marginTop: 16,
    //     borderWidth: 1,
    //     borderColor: "#0A2E5B",
    //     shadowColor: "#000",
    //     shadowOffset: { width: 0, height: 1 },
    //     shadowOpacity: 0.1,
    //     shadowRadius: 3,
    //     elevation: 1,
    // },
    // feedbackHeader: {
    //     flexDirection: "row",
    //     justifyContent: "space-between",
    //     alignItems: "center",
    //     marginBottom: 12,
    //     borderBottomWidth: 1,
    //     borderBottomColor: "#0A2E5B",
    //     paddingBottom: 8,
    // },
    // feedbackTitle: {
    //     fontSize: 16,
    //     fontWeight: "bold",
    //     color: "#0A2E5B",
    // },
    // feedbackScore: {
    //     fontSize: 16,
    //     fontWeight: "bold",
    //     color: "#FF3B30",
    //     backgroundColor: "#FFEBE9",
    //     paddingHorizontal: 10,
    //     paddingVertical: 4,
    //     borderRadius: 12,
    // },
    // bulletRow: {
    //     flexDirection: 'row',
    //     alignItems: 'flex-start',
    //     marginBottom: 10,
    // },
    // bullet: {
    //     width: 6,
    //     height: 6,
    //     borderRadius: 3,
    //     backgroundColor: '#5E72E4',
    //     marginTop: 7,
    //     marginRight: 12,
    // },
    // feedbackText: {
    //     flex: 1,
    //     fontSize: 14,
    //     color: '#525F7F',
    //     lineHeight: 20,
    // },
    // deselectButton: {
    //     backgroundColor: "#0A2E5B",
    //     paddingVertical: 8,
    //     paddingHorizontal: 16,
    //     borderRadius: 8,
    //     alignSelf: "flex-end",
    // },
    // deselectButtonText: {
    //     color: "#FFF",
    //     fontSize: 14,
    //     fontWeight: "600",
    // },
    // placeholderContainer: {
    //     backgroundColor: "#F8F9FA",
    //     borderRadius: 12,
    //     padding: 20,
    //     marginTop: 16,
    //     borderWidth: 1,
    //     borderColor: "#DDD",
    //     alignItems: "center",
    //     justifyContent: "center",
    // },
    // placeholderText: {
    //     fontSize: 14,
    //     color: "#666",
    //     fontStyle: "italic",
    //     textAlign: "center",
    // },



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