import { StyleSheet, View, Text } from "react-native";
import { colors } from "../theme/colors";

export interface DataPoint {
  at: number;
  value: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
  color?: string;
  maxPoints?: number;
  showLabels?: boolean;
}

/**
 * High-visibility real-time Sparkline Trend Bar
 * Works seamlessly across low-end Android screens without heavy SVG dependencies.
 */
export function Sparkline({
  data = [],
  height = 36,
  color = colors.white,
  maxPoints = 24,
  showLabels = false,
}: Props) {
  // Ensure we always have sample points to render the waveform
  const points =
    data.length > 0
      ? data.slice(-maxPoints)
      : [{ at: Date.now(), value: 100 }];

  const values = points.map((d) => d.value);
  const min = 0;
  const max = Math.max(...values, 500); // Scale up to 500 mL critical threshold
  const range = max - min || 1;

  return (
    <View style={[styles.container, { height }]}>
      {/* Background Track */}
      <View style={styles.trackContainer}>
        {points.map((pt, idx) => {
          const ratio = Math.min(1, Math.max(0.12, (pt.value - min) / range));
          const barHeight = Math.round(ratio * (height - 10));
          const isLatest = idx === points.length - 1;

          return (
            <View key={pt.at + "-" + idx} style={styles.barSlot}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: color,
                    opacity: isLatest ? 1 : 0.35 + (idx / points.length) * 0.55,
                  },
                ]}
              />
              {isLatest ? (
                <View style={[styles.pulseDot, { backgroundColor: color }]} />
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Threshold reference label */}
      <View style={styles.labelsRow}>
        <Text style={[styles.refLabel, { color }]}>
          📈 Blood Loss Trend (0 → 500+ mL)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
    paddingVertical: 2,
    marginVertical: 4,
  },
  trackContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flex: 1,
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 2,
    borderRadius: 8,
  },
  barSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  bar: {
    width: "100%",
    minWidth: 4,
    borderRadius: 2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: "absolute",
    top: 2,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    paddingHorizontal: 2,
  },
  refLabel: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.85,
    textAlign: "center",
    width: "100%",
  },
});
