import React, { useState } from "react";
import { StyleSheet, View, Text, LayoutChangeEvent } from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
} from "react-native-svg";
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
 * Calculates smooth SVG path data using Catmull-Rom to Cubic Bezier spline interpolation.
 */
function createSmoothCurve(
  points: { x: number; y: number }[],
  width: number,
  height: number,
): { linePath: string; areaPath: string; lastPoint: { x: number; y: number } } {
  if (points.length === 0) {
    return {
      linePath: `M 0 ${height} L ${width} ${height}`,
      areaPath: `M 0 ${height} L ${width} ${height} Z`,
      lastPoint: { x: width, y: height },
    };
  }

  if (points.length === 1) {
    const p = points[0];
    return {
      linePath: `M 0 ${p.y} L ${width} ${p.y}`,
      areaPath: `M 0 ${p.y} L ${width} ${p.y} L ${width} ${height} L 0 ${height} Z`,
      lastPoint: { x: width, y: p.y },
    };
  }

  let linePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i > 0 ? i - 1 : 0];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  const last = points[points.length - 1];
  const first = points[0];
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`;

  return { linePath, areaPath, lastPoint: last };
}

/**
 * Medical-grade real-time SVG waveform curve with gradient area & threshold lines.
 */
export function Sparkline({
  data = [],
  height = 56,
  color = colors.white,
  maxPoints = 30,
}: Props) {
  const [containerWidth, setContainerWidth] = useState<number>(320);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0 && Math.abs(width - containerWidth) > 1) {
      setContainerWidth(width);
    }
  };

  // Ensure dataset has valid points
  const points =
    data.length > 0
      ? data.slice(-maxPoints)
      : [
          { at: Date.now() - 20000, value: 80 },
          { at: Date.now() - 10000, value: 90 },
          { at: Date.now(), value: 100 },
        ];

  const values = points.map((d) => d.value);
  const minVal = 0;
  const maxVal = Math.max(...values, 550); // Scale up to 550 mL for visual headroom
  const valRange = maxVal - minVal || 1;

  const topPadding = 8;
  const bottomPadding = 8;
  const drawHeight = Math.max(20, height - topPadding - bottomPadding);
  const drawWidth = Math.max(50, containerWidth - 20);

  // Map data coordinates to SVG space
  const svgPoints = points.map((pt, idx) => {
    const x = 10 + (idx / Math.max(1, points.length - 1)) * drawWidth;
    const norm = Math.min(1, Math.max(0, (pt.value - minVal) / valRange));
    const y = topPadding + (1 - norm) * drawHeight;
    return { x, y };
  });

  const { linePath, areaPath, lastPoint } = createSmoothCurve(
    svgPoints,
    containerWidth,
    height,
  );

  // 300 mL (Monitor threshold) & 500 mL (Critical threshold) guide lines
  const y300 = topPadding + (1 - (300 - minVal) / valRange) * drawHeight;
  const y500 = topPadding + (1 - (500 - minVal) / valRange) * drawHeight;

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <View style={[styles.chartContainer, { height }]}>
        <Svg width={containerWidth} height={height}>
          <Defs>
            <LinearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <Stop offset="80%" stopColor={color} stopOpacity="0.08" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* 500 mL Critical Threshold Guideline (dashed) */}
          <Line
            x1="10"
            y1={y500}
            x2={containerWidth - 10}
            y2={y500}
            stroke="rgba(255, 80, 80, 0.45)"
            strokeWidth="1"
            strokeDasharray="4, 3"
          />

          {/* 300 mL Monitor Threshold Guideline (dashed) */}
          <Line
            x1="10"
            y1={y300}
            x2={containerWidth - 10}
            y2={y300}
            stroke="rgba(255, 215, 0, 0.45)"
            strokeWidth="1"
            strokeDasharray="4, 3"
          />

          {/* Area Fill */}
          <Path d={areaPath} fill="url(#waveGradient)" />

          {/* Main Smooth Waveform Curve */}
          <Path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Live Pulse Point on latest value */}
          <Circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="4.5"
            fill={color}
            opacity="0.95"
          />
          <Circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="7.5"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            opacity="0.45"
          />
        </Svg>
      </View>

      {/* Waveform Reference Legend */}
      <View style={styles.legendRow}>
        <Text style={[styles.legendText, { color }]}>0 mL</Text>
        <Text style={[styles.legendText, { color }]}>
          📈 Real-time Blood Loss Trajectory
        </Text>
        <Text style={[styles.legendText, { color }]}>500 mL ⚠️</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginVertical: 4,
  },
  chartContainer: {
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    marginTop: 3,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "700",
    opacity: 0.85,
  },
});
