import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { stateLabelEn } from "../clinical/evaluateState";
import { BigButton } from "../components/ui";
import { t } from "../i18n/copy";
import type { RootStackParamList } from "../navigation/types";
import { alarmManager } from "../services/alarm";
import { useSimulatorSnapshot } from "../simulator/SimulatorContext";
import { colors } from "../theme/colors";

type Nav = NativeStackNavigationProp<RootStackParamList, "Critical">;
type R = RouteProp<RootStackParamList, "Critical">;

export function CriticalScreen() {
  const navigation = useNavigation<Nav>();
  const { language } = useRoute<R>().params;
  const copy = t(language);
  const snap = useSimulatorSnapshot();

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const checklist = [
    { id: "uterotonic", label: copy.checklistUterotonic },
    { id: "massage", label: copy.checklistMassage },
    { id: "help", label: copy.checklistHelp },
    { id: "iv", label: copy.checklistIv },
  ];

  const toggleCheck = (id: string, label: string) => {
    const nextVal = !checkedItems[id];
    setCheckedItems((prev) => ({ ...prev, [id]: nextVal }));
    alarmManager.logEvent(
      "checklist_toggle",
      `${label}: ${nextVal ? "COMPLETED" : "UNCHECKED"}`,
    );
  };

  const isMuted = alarmManager.isMuted();
  const isSensorFail = snap.sensorFail || snap.state === "sensor_fail";

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Beacon Header with vector icon */}
        <View style={styles.beaconHeader}>
          <Ionicons
            name={isSensorFail ? "hardware-chip-outline" : "warning"}
            size={16}
            color={colors.white}
            style={styles.beaconIcon}
          />
          <Text style={styles.beaconText}>
            {isSensorFail ? copy.sensorFailBeacon : copy.criticalBeacon}
          </Text>
        </View>

        {/* Dynamic Title based on whether it is sensor fail or hemorrhage */}
        <Text style={styles.title}>
          {isSensorFail ? copy.sensorFailTitle : copy.criticalTitle}
        </Text>
        <Text style={styles.body}>
          {isSensorFail ? copy.sensorFailSub : copy.criticalBody}
        </Text>

        {/* Sensor Fail Detailed Guidance Notice */}
        {isSensorFail ? (
          <View style={styles.sensorFailCard}>
            <View style={styles.sensorFailHeader}>
              <Ionicons
                name="alert-circle"
                size={22}
                color="#FFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.sensorFailCardTitle}>
                HARDWARE FAIL-SAFE ACTIVE
              </Text>
            </View>
            <Text style={styles.sensorFailCardBody}>
              {copy.sensorFailGuidance}
            </Text>
          </View>
        ) : null}

        {/* Big Volume & SI Callout */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>{copy.volume}</Text>
            <Text style={styles.statValue}>
              {isSensorFail && snap.volumeMl === 0
                ? "—"
                : `${Math.round(snap.volumeMl)} mL`}
            </Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>{copy.shockIndex}</Text>
            <Text style={styles.statValue}>
              {snap.shockIndex == null ? "—" : snap.shockIndex.toFixed(2)}
            </Text>
          </View>
        </View>

        <Text style={styles.metaState}>
          STATUS: {stateLabelEn(snap.state).toUpperCase()}
          {isSensorFail ? " (SENSOR FAIL-SAFE)" : ""}
        </Text>

        {/* First-Line Response Checklist */}
        <Text style={styles.checklistHeader}>{copy.checklistHeader}</Text>
        <View style={styles.checklistContainer}>
          {checklist.map((item) => {
            const isChecked = !!checkedItems[item.id];
            return (
              <Pressable
                key={item.id}
                onPress={() => toggleCheck(item.id, item.label)}
                style={[
                  styles.checkItem,
                  isChecked && styles.checkItemCompleted,
                ]}
              >
                <View
                  style={[styles.checkbox, isChecked && styles.checkboxChecked]}
                >
                  {isChecked ? (
                    <Ionicons
                      name="checkmark-sharp"
                      size={20}
                      color={colors.red}
                    />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.checkLabel,
                    isChecked && styles.checkLabelCompleted,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Alarm Silence / Mute Action */}
        <Pressable
          onPress={() => {
            if (isMuted) {
              alarmManager.unmute();
            } else {
              alarmManager.mute(5 * 60 * 1000);
            }
          }}
          style={styles.silenceButton}
        >
          <Ionicons
            name={isMuted ? "volume-high-outline" : "volume-mute-outline"}
            size={20}
            color={colors.white}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.silenceButtonText}>
            {isMuted ? copy.unmute : copy.mute}
          </Text>
        </Pressable>

        {/* Return Button */}
        <BigButton
          title={copy.acknowledge}
          variant="light"
          onPress={() => navigation.goBack()}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.red,
    paddingTop: 44,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  beaconHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: "center",
    marginBottom: 12,
  },
  beaconIcon: {
    marginRight: 6,
  },
  beaconText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.8,
  },
  title: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38,
  },
  body: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 6,
    opacity: 0.95,
  },
  sensorFailCard: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  sensorFailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  sensorFailCardTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  sensorFailCardBody: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    marginBottom: 8,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  statValue: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 2,
  },
  metaState: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    opacity: 0.9,
  },
  checklistHeader: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  checklistContainer: {
    gap: 8,
    marginBottom: 16,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  checkItemCompleted: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderColor: colors.white,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.white,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.white,
  },
  checkLabel: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
  },
  checkLabelCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.8,
  },
  silenceButton: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    marginBottom: 10,
  },
  silenceButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
});
