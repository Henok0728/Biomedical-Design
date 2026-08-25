import { StyleSheet, View, Text } from "react-native";
import { colors } from "../theme/colors";

export interface DataPoint {
  at: number;
  value: number;
}

interface Props {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  maxPoints?: number;
  showLabels?: boolean;
}

/**
 * Lightweight, zero-native-dependency Sparkline / Trend curve
 * Renders cleanly in React Native and Web for low-end device resilience.
 */
export function Sparkline({
  data,
  height = 48,
  color = colors.white,
  maxPoints = 30,
  showLabels = false,
}: Props) {
  if (!data || data.length < 2) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={[styles.placeholder, { color }]}>
          Collecting trend data...
        </Text>
      </View>
    );
  }

  const slice = data.slice(-maxPoints);
  const values = slice.map((d) => d.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 500); // Scale up to at least 500 mL
  const range = max - min || 1;

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.barsRow}>
        {slice.map((pt, idx) => {
          const normalized = Math.max(0.08, (pt.value - min) / range);
          const barHeight = Math.max(4, normalized * (height - 12));
          const isLast = idx === slice.length - 1;

          return (
            <View key={pt.at + "-" + idx} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: color,
                    opacity: isLast ? 1 : 0.45 + (idx / slice.length) * 0.45,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      {showLabels ? (
        <View style={styles.labelsRow}>
          <Text style={[styles.label, { color }]}>0 min</Text>
          <Text style={[styles.label, { color }]}>Peak: {Math.round(max)} mL</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "flex-end",
    paddingVertical: 4,
  },
  placeholder: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.7,
    textAlign: "center",
    marginVertical: "auto",
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flex: 1,
    gap: 3,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    minWidth: 4,
    borderRadius: 2,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.85,
  },
});
