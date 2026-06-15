import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Strip time so two dates can be compared by calendar day only
const stripTime = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * A self-contained date picker.
 * Shows the currently selected date as a pill; tapping it opens a calendar
 * modal. The chosen date is only emitted (via onConfirm) when the user taps
 * "Done" — tapping "Cancel" or outside discards the tentative selection.
 *
 * Props:
 *  - selectedDate: Date currently in effect
 *  - onConfirm: (date: Date) => void, called only when "Done" is pressed
 *  - label: optional heading shown above the pill
 */
export default function DateSelector({ selectedDate, onConfirm, label = "Showing data for" }) {
  const today = stripTime(new Date());
  const [visible, setVisible] = useState(false);
  // The day tentatively highlighted inside the modal (not yet confirmed)
  const [tempDate, setTempDate] = useState(stripTime(selectedDate || today));
  // The month currently shown in the calendar grid
  const [viewDate, setViewDate] = useState(stripTime(selectedDate || today));

  const openPicker = () => {
    const base = stripTime(selectedDate || today);
    setTempDate(base);
    setViewDate(base);
    setVisible(true);
  };

  const handleDone = () => {
    setVisible(false);
    onConfirm(tempDate);
  };

  const handleCancel = () => {
    setVisible(false);
  };

  const goToMonth = (offset) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + offset);
    setViewDate(stripTime(next));
  };

  // Build the grid of days (with leading blanks) for the viewed month
  const buildDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(year, month, day));
    }
    return cells;
  };

  const formatLong = (date) =>
    `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

  const cells = buildDays();
  const effectiveDate = stripTime(selectedDate || today);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.pill} onPress={openPicker} activeOpacity={0.7}>
        <Text style={styles.pillIcon}>📅</Text>
        <Text style={styles.pillText}>{formatLong(effectiveDate)}</Text>
        <Text style={styles.pillChevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleCancel}
        >
          <TouchableOpacity activeOpacity={1} style={styles.card}>
            {/* Month navigation */}
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={() => goToMonth(-1)} style={styles.navBtn}>
                <Text style={styles.navBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => goToMonth(1)} style={styles.navBtn}>
                <Text style={styles.navBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Weekday labels */}
            <View style={styles.weekRow}>
              {WEEK_DAYS.map((d) => (
                <Text key={d} style={styles.weekDay}>{d}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.grid}>
              {cells.map((cell, idx) => {
                if (!cell) {
                  return <View key={`blank-${idx}`} style={styles.dayCell} />;
                }
                const isSelected = isSameDay(cell, tempDate);
                const isFuture = stripTime(cell) > today;
                return (
                  <TouchableOpacity
                    key={cell.toISOString()}
                    style={[styles.dayCell, isSelected && styles.daySelected]}
                    disabled={isFuture}
                    onPress={() => setTempDate(stripTime(cell))}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isFuture && styles.dayTextDisabled,
                      ]}
                    >
                      {cell.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
  },
  label: {
    fontSize: 12,
    color: "#8898AA",
    marginBottom: 6,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pillIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  pillText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0A2E5B",
  },
  pillChevron: {
    fontSize: 14,
    color: "#0A2E5B",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F4F8",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnText: {
    fontSize: 22,
    color: "#0A2E5B",
    fontWeight: "bold",
    lineHeight: 24,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0A2E5B",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#8898AA",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  daySelected: {
    backgroundColor: "#0A2E5B",
    borderRadius: 999,
  },
  dayText: {
    fontSize: 14,
    color: "#32325D",
  },
  dayTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  dayTextDisabled: {
    color: "#CBD3DC",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F4F8",
    paddingTop: 14,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 8,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8898AA",
  },
  doneBtn: {
    backgroundColor: "#0A2E5B",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
