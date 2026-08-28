import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { displaySeverity, stateLabelEn } from "../clinical/evaluateState";
import type { Language } from "../clinical/types";
import { Sparkline } from "../components/Sparkline";
import { BigButton } from "../components/ui";
import { guidance, t } from "../i18n/copy";
import type { RootStackParamList } from "../navigation/types";
import { alarmManager } from "../services/alarm";
import { webSocketService } from "../services/WebSocketService";
import { simulator } from "../simulator/PphSimulator";
import { useSimulatorSnapshot } from "../simulator/SimulatorContext";
import { colors, severityColors } from "../theme/colors";

type Nav = NativeStackNavigationProp<RootStackParamList, "Live">;
type R = RouteProp<RootStackParamList, "Live">;

function formatElapsed(startedAt: number | null) {
  if (!startedAt) {
    return "00:00";
  }
  const s = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function formatMuteRemaining(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTimeOnly(timestamp: number | null) {
  if (!timestamp) return "—";
  const d = new Date(timestamp);
  return d.toTimeString().split(" ")[0];
}

export function LiveMonitoringScreen() {
  const navigation = useNavigation<Nav>();
  const routeParams = useRoute<R>().params;
  const [currentLang, setCurrentLang] = useState<Language>(routeParams.language);
  const { deviceId, sessionId, motherId } = routeParams;

  const copy = t(currentLang);
  const snap = useSimulatorSnapshot();
  const peakRef = useRef(snap.volumeMl);
  const pushedCritical = useRef(false);
  const [, setTick] = useState(0);

  const connState = useSyncExternalStore(
    (onStoreChange) => webSocketService.subscribe(onStoreChange),
    () => webSocketService.getConnectionState(),
    () => webSocketService.getConnectionState()
  );

  // Sync alarm manager state
  useEffect(() => {
    alarmManager.setAlertState(snap.state);
  }, [snap.state]);

  // Clean up alarm when leaving screen
  useEffect(() => {
    return () => {
      alarmManager.cleanup();
    };
  }, []);

  // 1-second interval for elapsed timer & mute countdown
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Track peak blood volume
  useEffect(() => {
    peakRef.current = Math.max(peakRef.current, snap.volumeMl);
  }, [snap.volumeMl]);

  // Navigate to full-screen Critical alarm
  useEffect(() => {
    const isRed = snap.state === "critical" || snap.state === "sensor_fail";
    if (isRed && !pushedCritical.current) {
      pushedCritical.current = true;
      navigation.navigate("Critical", { language: currentLang, sessionId });
    }
    if (!isRed) {
      pushedCritical.current = false;
    }
  }, [currentLang, navigation, sessionId, snap.state]);

  const severity = displaySeverity(snap.state);
  const palette = severityColors[severity];
  const isMuted = alarmManager.isMuted();
  const remainingMuteSec = alarmManager.getRemainingMuteSeconds();

  const toggleLanguage = () => {
    setCurrentLang((prev) => (prev === "en" ? "am" : "en"));
  };

  const endSession = () => {
    alarmManager.cleanup();
    simulator.stop();
    navigation.replace("Summary", {
      language: currentLang,
      sessionId,
      peakVolumeMl: peakRef.current,
      finalState: snap.state,
      startedAt: snap.startedAt ?? Date.now(),
      endedAt: Date.now(),
    });
  };

  const health = snap.sensorHealth || {
    load_cell: true,
    max30102: true,
    tcs34725: true,
    mpu6050: true,
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Connection & Source Status Header Bar */}
        <View style={styles.statusBarRow}>
          <View style={styles.connPill}>
            <View
              style={[
                styles.connDot,
                connState === "CONNECTED"
                  ? styles.dotGreen
                  : styles.dotRed,
              ]}
            />
            <Text style={styles.connText}>
              {connState === "CONNECTED"
                ? "BACKEND CONNECTED"
                : "DISCONNECTED"}
            </Text>
          </View>

          <View style={styles.sourcePill}>
            <Text style={styles.sourceText}>
              SOURCE: {snap.source ?? "SIMULATOR"}
            </Text>
          </View>

          <Text style={styles.timestampText}>
            ⏱ {formatTimeOnly(snap.lastPacketAt ?? snap.at)}
          </Text>
        </View>

        {/* Safety Disclaimer Banner */}
        <View style={styles.safetyBanner}>
          <Text style={styles.safetyText}>
            ⚠️ Biomedical engineering competition prototype. Not clinically validated. DEMO SIMULATION THRESHOLD.
          </Text>
        </View>

        {/* Top Header Bar */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.kicker, { color: palette.text }]}>
              {deviceId}
              {motherId ? ` · ${motherId}` : ""}
            </Text>
            <Text style={[styles.elapsed, { color: palette.text }]}>
              ⏱ {copy.elapsed} {formatElapsed(snap.startedAt)}
            </Text>
          </View>

          {/* Quick Language Toggle */}
          <Pressable onPress={toggleLanguage} style={styles.langBadge}>
            <Text style={styles.langBadgeText}>
              {currentLang === "en" ? "አማርኛ" : "English"}
            </Text>
          </Pressable>
        </View>

        {/* Motion / Quality Alert Banner */}
        {snap.measurementQuality === "UNRELIABLE" ? (
          <View style={styles.unreliableBanner}>
            <Text style={styles.unreliableText}>
              ⚠️ MOTION: HIGH · MEASUREMENT QUALITY: UNRELIABLE
            </Text>
          </View>
        ) : null}

        {/* Mute Status Pill / Banner */}
        {isMuted ? (
          <Pressable
            onPress={() => alarmManager.unmute()}
            style={styles.mutedBanner}
          >
            <Text style={styles.mutedBannerText}>
              🔕 {copy.muteRemaining}: {formatMuteRemaining(remainingMuteSec)} (
              {copy.unmute})
            </Text>
          </Pressable>
        ) : null}

        {/* State Banner */}
        <View style={styles.stateContainer}>
          <Text style={[styles.stateText, { color: palette.text }]}>
            {stateLabelEn(snap.state).toUpperCase()}
          </Text>
          <Text style={[styles.guidanceText, { color: palette.text }]}>
            {guidance(currentLang, snap.state)}
          </Text>
        </View>

        {/* Primary Metric: Huge Mass / Volume */}
        <View style={styles.heroMetric}>
          <Text
            style={[styles.volumeNumber, { color: palette.text }]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {Math.round(snap.volumeMl)}
          </Text>
          <Text style={[styles.volumeUnit, { color: palette.text }]}>
            g · Mass Accumulation
          </Text>
        </View>

        {/* Realtime Trend Sparkline */}
        <View style={styles.sparklineBox}>
          <Sparkline
            data={(snap.history || []).map((h) => ({ at: h.at, value: h.volumeMl }))}
            height={52}
            color={palette.text}
            showLabels={false}
          />
        </View>

        {/* Sensor Health Status Bar */}
        <View style={styles.healthContainer}>
          <Text style={styles.healthTitle}>SENSOR HEALTH DIAGNOSTICS</Text>
          <View style={styles.healthGrid}>
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>LOAD CELL</Text>
              <Text style={health.load_cell ? styles.hOk : styles.hErr}>
                {health.load_cell ? "● OK" : "○ ERR"}
              </Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>MAX30102</Text>
              <Text style={health.max30102 ? styles.hOk : styles.hErr}>
                {health.max30102 ? "● OK" : "○ ERR"}
              </Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>TCS34725</Text>
              <Text style={health.tcs34725 ? styles.hOk : styles.hErr}>
                {health.tcs34725 ? "● OK" : "○ ERR"}
              </Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>MPU6050</Text>
              <Text style={health.mpu6050 ? styles.hOk : styles.hErr}>
                {health.mpu6050 ? "● OK" : "○ ERR"}
              </Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>ESP32</Text>
              <Text style={snap.source === "ESP32" ? styles.hOk : styles.hMuted}>
                {snap.source === "ESP32" ? "● LIVE" : "○ OFF"}
              </Text>
            </View>
          </View>
        </View>

        {/* Metric Cards Grid */}
        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricCardLabel}>{copy.shockIndex}</Text>
            <Text style={styles.metricCardValue}>
              {snap.shockIndex == null ? "—" : snap.shockIndex.toFixed(2)}
            </Text>
            <Text style={styles.metricSub}>
              {snap.shockIndex == null
                ? "Pending"
                : snap.shockIndex >= 0.9
                  ? "CRITICAL"
                  : snap.shockIndex >= 0.7
                    ? "ELEVATED"
                    : "NORMAL"}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricCardLabel}>Fluid Rate</Text>
            <Text style={styles.metricCardValue}>
              {Math.round(snap.volumeRateMlPer15min)}
            </Text>
            <Text style={styles.metricSub}>g / min</Text>
          </View>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricCardLabel}>{copy.heartRate}</Text>
            <Text style={styles.metricCardValue}>
              {snap.hrBpm == null ? "—" : snap.hrBpm}
            </Text>
            <Text style={styles.metricSub}>bpm</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricCardLabel}>{copy.sbp}</Text>
            <Text style={styles.metricCardValue}>
              {snap.sbpMmhg == null ? "—" : snap.sbpMmhg}
            </Text>
            <Text style={styles.metricSub}>mmHg</Text>
          </View>
        </View>

        {/* Alarm & Load Cell Controls */}
        <View style={styles.actionSection}>
          <Pressable
            onPress={() => {
              if (isMuted) {
                alarmManager.unmute();
              } else {
                alarmManager.mute(5 * 60 * 1000);
              }
            }}
            style={styles.muteButton}
          >
            <Text style={styles.muteButtonText}>
              {isMuted ? `🔔 ${copy.unmute}` : `🔕 ${copy.mute}`}
            </Text>
          </Pressable>
        </View>

        {/* Demo Simulator Controls Bar */}
        <View style={styles.demoControlBox}>
          <Text style={styles.demoControlTitle}>DEMO & HARDWARE CONTROLS</Text>
          <View style={styles.demoButtonRow}>
            <Pressable
              style={styles.demoBtn}
              onPress={() => simulator.addVolume(100)}
            >
              <Text style={styles.demoBtnText}>{copy.add100}</Text>
            </Pressable>
            <Pressable
              style={styles.demoBtn}
              onPress={() => simulator.raiseShockIndex()}
            >
              <Text style={styles.demoBtnText}>{copy.raiseSi}</Text>
            </Pressable>
          </View>
          <View style={styles.demoButtonRow}>
            <Pressable
              style={styles.demoBtn}
              onPress={() => webSocketService.sendTare()}
            >
              <Text style={styles.demoBtnText}>Tare Load Cell</Text>
            </Pressable>
            <Pressable
              style={styles.demoBtn}
              onPress={() => simulator.setSensorFail(!snap.sensorFail)}
            >
              <Text style={styles.demoBtnText}>
                {snap.sensorFail ? copy.restoreSensor : copy.failSensor}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* End Session */}
        <Pressable onPress={endSession} style={styles.endButton}>
          <Text style={[styles.endButtonText, { color: palette.text }]}>
            {copy.endSession}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 36,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  statusBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  connPill: {
    flexDirection: "row",
    alignItems: "center",
  },
  connDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotGreen: { backgroundColor: "#10B981" },
  dotRed: { backgroundColor: "#EF4444" },
  connText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 11,
  },
  sourcePill: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  sourceText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 11,
  },
  timestampText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    fontSize: 11,
  },
  safetyBanner: {
    backgroundColor: "rgba(245, 158, 11, 0.25)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  safetyText: {
    color: "#FEF08A",
    fontWeight: "700",
    fontSize: 11,
    textAlign: "center",
  },
  unreliableBanner: {
    backgroundColor: "#DC2626",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  unreliableText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  kicker: {
    fontSize: 18,
    fontWeight: "700",
    opacity: 0.95,
  },
  elapsed: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.85,
    marginTop: 2,
  },
  langBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  langBadgeText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  mutedBanner: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  mutedBannerText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  stateContainer: {
    marginVertical: 4,
  },
  stateText: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  guidanceText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 2,
    opacity: 0.95,
  },
  heroMetric: {
    alignItems: "center",
    marginVertical: 6,
  },
  volumeNumber: {
    fontSize: 98,
    fontWeight: "900",
    lineHeight: 104,
  },
  volumeUnit: {
    fontSize: 20,
    fontWeight: "700",
    opacity: 0.9,
    marginTop: -4,
  },
  sparklineBox: {
    marginBottom: 12,
    paddingHorizontal: 4,
    minHeight: 60,
  },
  healthContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  healthTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  healthGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  healthItem: {
    alignItems: "center",
  },
  healthLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.7)",
  },
  hOk: {
    fontSize: 11,
    fontWeight: "800",
    color: "#34D399",
    marginTop: 2,
  },
  hErr: {
    fontSize: 11,
    fontWeight: "800",
    color: "#F87171",
    marginTop: 2,
  },
  hMuted: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },
  metricGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricCardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  metricCardValue: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 2,
  },
  metricSub: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.navy,
    marginTop: 2,
  },
  actionSection: {
    marginTop: 4,
    marginBottom: 12,
  },
  muteButton: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  muteButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
  },
  demoControlBox: {
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  demoControlTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
    letterSpacing: 1,
  },
  demoButtonRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  demoBtn: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  demoBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  endButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  endButtonText: {
    fontSize: 16,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
