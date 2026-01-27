import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native"
import { LineChart } from "react-native-chart-kit"
import { useState } from "react";

export default function ToxicityChart({ title, data }) {
    const screenWidth = Dimensions.get('window').width;

    const [selectedPoint, setSelectedPoint] = useState({
        index: -1,
        value: 0,
        feedback: "",
        day: "",
        x: 0,
        y: 0
    });

    const defaultToxicityData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            data: [0.2, 0.4, 0.3, 0.1, 0.5, 0.2, 0.3],
            color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
            strokeWidth: 2,
        }],
    };

    // Feedback messages for each data point
    const feedbackMessages = [
        "You could have controlled your anger. Try taking a deep breath before responding.",
        "Your response showed improvement in managing frustration.",
        "Consider using more positive language to express your concerns.",
        "Good job managing your tone! Keep up the constructive communication.",
        "Some responses were harsh. Try framing feedback more gently.",
        "You handled the difficult conversation well.",
        "Be mindful of sarcasm - it can sometimes escalate tensions."
    ];

    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const totalRecords = defaultToxicityData.datasets[0].data.length;

    const chartConfig = {
        backgroundColor: '#ffffff',
        backgroundGradientFrom: '#ffffff',
        backgroundGradientTo: '#ffffff',
        decimalPlaces: 2,
        color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        style: {
            borderRadius: 0,
        },
        propsForDots: {
            r: '6',
            strokeWidth: '3',
            stroke: '#ff3b30',
        },
        propsForLabels: {
            fontSize: 10,
        },
        propsForBackgroundLines: {
            strokeDasharray: "", // solid lines
        },
    };

    const handleDataPointClick = (data) => {
        // If clicking the same point, deselect it
        if (selectedPoint.index === data.index) {
            setSelectedPoint({
                index: -1,
                value: 0,
                feedback: "",
                day: "",
                x: 0,
                y: 0
            });
            return;
        }

        setSelectedPoint({
            index: data.index,
            value: data.value,
            feedback: feedbackMessages[data.index] || "No feedback available for this point.",
            day: dayLabels[data.index] || `Day ${data.index + 1}`,
            x: data.x, // Use the x coordinate from the click event
            y: data.y  // Use the y coordinate from the click event
        });
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
                {/* Selected point indicator - positioned absolutely over the chart */}
                {selectedPoint.index >= 0 && (
                    <View
                        style={[
                            styles.selectedPoint,
                            {
                                left: selectedPoint.x - 12, // Center the indicator (12 = half of width)
                                top: selectedPoint.y + 12,  // Center the indicator (12 = half of height)
                            }
                        ]}
                    />
                )}

                <LineChart
                    data={defaultToxicityData}
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
                    onDataPointClick={handleDataPointClick}
                />
            </View>

            {/* Feedback Box - Only shown when a point is selected */}
            {selectedPoint.index >= 0 ? (
                <View style={styles.feedbackContainer}>
                    <View style={styles.feedbackHeader}>
                        <Text style={styles.feedbackTitle}>
                            Feedback for {selectedPoint.day}
                        </Text>
                        <Text style={styles.feedbackScore}>
                            Score: {(selectedPoint.value * 100).toFixed(0)}%
                        </Text>
                    </View>
                    <Text style={styles.feedbackText}>
                        {selectedPoint.feedback}
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
    feedbackContainer: {
        backgroundColor: "#F0F8FF",
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: "#0A2E5B",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 1,
    },
    feedbackHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#0A2E5B",
        paddingBottom: 8,
    },
    feedbackTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#0A2E5B",
    },
    feedbackScore: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#FF3B30",
        backgroundColor: "#FFEBE9",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    feedbackText: {
        fontSize: 14,
        color: "#333",
        lineHeight: 20,
        marginBottom: 12,
    },
    deselectButton: {
        backgroundColor: "#0A2E5B",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: "flex-end",
    },
    deselectButtonText: {
        color: "#FFF",
        fontSize: 14,
        fontWeight: "600",
    },
    placeholderContainer: {
        backgroundColor: "#F8F9FA",
        borderRadius: 12,
        padding: 20,
        marginTop: 16,
        borderWidth: 1,
        borderColor: "#DDD",
        alignItems: "center",
        justifyContent: "center",
    },
    placeholderText: {
        fontSize: 14,
        color: "#666",
        fontStyle: "italic",
        textAlign: "center",
    },
});