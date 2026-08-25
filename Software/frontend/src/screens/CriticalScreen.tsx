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

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Emergency Beacon Tag */}
        <View style={styles.beaconHeader}>
          <Text style={styles.beaconText}>🚨 EMERGENCY PPH ALERT 🚨</Text>
        </View>

        <Text style={styles.title}>{copy.criticalTitle}</Text>
        <Text style={styles.body}>{copy.criticalBody}</Text>

        {/* Big Volume & SI Callout */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>{copy.volume}</Text>
            <Text style={styles.statValue}>{Math.round(snap.volumeMl)} mL</Text>
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
          {snap.sensorFail ? " (SENSOR FAIL-SAFE)" : ""}
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
                  {isChecked ? <Text style={styles.checkMark}>✓</Text> : null}
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
          <Text style={styles.silenceButtonText}>
            {isMuted ? `🔔 ${copy.unmute}` : `🔕 ${copy.mute}`}
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
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "center",
    marginBottom: 12,
  },
  beaconText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
  title: {
    color: colors.white,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
  },
  body: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "600",
    marginTop: 6,
    opacity: 0.95,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
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
    fontSize: 32,
    fontWeight: "900",
    marginTop: 2,
  },
  metaState: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    opacity: 0.9,
  },
  checklistHeader: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
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
  checkMark: {
    color: colors.red,
    fontWeight: "900",
    fontSize: 18,
  },
  checkLabel: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  checkLabelCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.8,
  },
  silenceButton: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    marginBottom: 8,
  },
  silenceButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "800",
  },
});
