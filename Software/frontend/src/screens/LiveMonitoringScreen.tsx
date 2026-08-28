import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { displaySeverity, stateLabelEn } from "../clinical/evaluateState";
import type { Language } from "../clinical/types";
import { Sparkline } from "../components/Sparkline";
import { BigButton } from "../components/ui";
import { guidance, t } from "../i18n/copy";
import type { RootStackParamList } from "../navigation/types";
import { alarmManager } from "../services/alarm";
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

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.kicker, { color: palette.text }]}>
              {deviceId}
              {motherId ? ` · ${motherId}` : ""}
            </Text>
            <View style={styles.elapsedRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color={palette.text}
                style={{ marginRight: 4, opacity: 0.85 }}
              />
              <Text style={[styles.elapsed, { color: palette.text }]}>
                {copy.elapsed} {formatElapsed(snap.startedAt)}
              </Text>
            </View>
          </View>

          {/* Quick Language Toggle */}
          <Pressable onPress={toggleLanguage} style={styles.langBadge}>
            <Text style={styles.langBadgeText}>
              {currentLang === "en" ? "አማርኛ" : "English"}
            </Text>
          </Pressable>
        </View>

        {/* Mute Status Pill / Banner */}
        {isMuted ? (
          <Pressable
            onPress={() => alarmManager.unmute()}
            style={styles.mutedBanner}
          >
            <Ionicons
              name="volume-mute"
              size={16}
              color={colors.white}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.mutedBannerText}>
              {copy.muteRemaining}: {formatMuteRemaining(remainingMuteSec)} (
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

        {/* Primary Arm's-Length Metric: Huge Volume */}
        <View style={styles.heroMetric}>
          <Text
            style={[styles.volumeNumber, { color: palette.text }]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {Math.round(snap.volumeMl)}
          </Text>
          <Text style={[styles.volumeUnit, { color: palette.text }]}>
            mL · {copy.volume}
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
            <Text style={styles.metricCardLabel}>{copy.rate}</Text>
            <Text style={styles.metricCardValue}>
              {Math.round(snap.volumeRateMlPer15min)}
            </Text>
            <Text style={styles.metricSub}>mL / 15m</Text>
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

        {/* Alarm Controls */}
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
            <Ionicons
              name={isMuted ? "volume-high" : "volume-mute"}
              size={20}
              color={colors.ink}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.muteButtonText}>
              {isMuted ? copy.unmute : copy.mute}
            </Text>
          </Pressable>
        </View>

        {/* Demo Simulator Controls Bar */}
        <View style={styles.demoControlBox}>
          <Text style={styles.demoControlTitle}>DEMO CONTROLS</Text>
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
          <Pressable
            style={[styles.demoBtn, styles.demoBtnFull]}
            onPress={() => simulator.setSensorFail(!snap.sensorFail)}
          >
            <Text style={styles.demoBtnText}>
              {snap.sensorFail ? copy.restoreSensor : copy.failSensor}
            </Text>
          </Pressable>
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
    paddingTop: 44,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
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
  elapsedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  elapsed: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.85,
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
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
  demoBtnFull: {
    flex: undefined,
  },
  demoBtnText: {
    fontSize: 15,
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
