import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { stateLabelEn } from "../clinical/evaluateState";
import { BigButton } from "../components/ui";
import { t } from "../i18n/copy";
import type { RootStackParamList } from "../navigation/types";
import { alarmManager } from "../services/alarm";
import { sessionStore, type SessionRecord } from "../services/sessionStore";
import { colors } from "../theme/colors";

type Nav = NativeStackNavigationProp<RootStackParamList, "Summary">;
type R = RouteProp<RootStackParamList, "Summary">;

export function SessionSummaryScreen() {
  const navigation = useNavigation<Nav>();
  const params = useRoute<R>().params;
  const copy = t(params.language);
  const [saved, setSaved] = useState(false);

  const durationMin = Math.max(
    1,
    Math.round((params.endedAt - params.startedAt) / 60000),
  );

  const events = alarmManager.getEvents();

  useEffect(() => {
    const record: SessionRecord = {
      id: params.sessionId,
      deviceId: "PPH-MAT-04",
      startedAt: params.startedAt,
      endedAt: params.endedAt,
      durationMinutes: durationMin,
      peakVolumeMl: params.peakVolumeMl,
      finalVolumeMl: params.peakVolumeMl,
      finalState: params.finalState,
      maxShockIndex: null,
      events,
      syncStatus: "queued",
    };

    sessionStore.saveSession(record).then(() => {
      setSaved(true);
    });
  }, [durationMin, events, params]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{copy.summary}</Text>
        <Text style={styles.sessionId}>{params.sessionId}</Text>

        {/* Highlight Card */}
        <View style={styles.card}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>{copy.peakVolume}</Text>
            <Text style={styles.valuePrimary}>
              {Math.round(params.peakVolumeMl)} mL
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowItem}>
            <Text style={styles.label}>Final Status</Text>
            <Text
              style={[
                styles.valueState,
                params.finalState === "critical" ||
                params.finalState === "sensor_fail"
                  ? styles.redText
                  : params.finalState === "monitor"
                    ? styles.yellowText
                    : styles.greenText,
              ]}
            >
              {stateLabelEn(params.finalState).toUpperCase()}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowItem}>
            <Text style={styles.label}>{copy.duration}</Text>
            <Text style={styles.value}>{durationMin} min</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.rowItem}>
            <Text style={styles.label}>{copy.eventsLogged}</Text>
            <Text style={styles.value}>{events.length} recorded</Text>
          </View>
        </View>

        {/* Offline Saved Indicator */}
        <View style={styles.savedBanner}>
          <Text style={styles.savedBannerText}>
            💾 {saved ? "Session saved to offline device storage" : "Saving..."}
          </Text>
        </View>

        {/* Action Buttons */}
        <BigButton
          title={copy.saveAndSync}
          onPress={() =>
            navigation.navigate("Sync", { language: params.language })
          }
        />

        <BigButton
          title="📤 Share Referral Summary"
          variant="light"
          onPress={async () => {
            const checklistSummary = events
              .filter((e) => e.type === "checklist_toggle")
              .map((e) => `• ${e.details}`)
              .join("\n");

            const shareText = `🏥 SMART PPH CLINICAL HANDOFF REPORT
----------------------------------
Session: ${params.sessionId}
Device: PPH-MAT-04
Peak Blood Volume: ${Math.round(params.peakVolumeMl)} mL
Clinical Status: ${stateLabelEn(params.finalState).toUpperCase()}
Monitoring Duration: ${durationMin} min
Recorded Events: ${events.length}

Response Bundle Actions:
${checklistSummary || "• Standard emergency bundle monitored"}

Generated via Smart PPH Facility System (Ethiopia PHCU)`;

            try {
              const { Share } = require("react-native");
              await Share.share({ message: shareText, title: "PPH Clinical Handoff" });
            } catch {}
          }}
        />

        <BigButton
          title={copy.ward}
          variant="ghost"
          onPress={() =>
            navigation.reset({
              index: 1,
              routes: [
                { name: "Language" },
                { name: "Ward", params: { language: params.language } },
              ],
            })
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingTop: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.ink,
  },
  sessionId: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 16,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 16,
  },
  rowItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  label: {
    fontSize: 16,
    color: colors.muted,
    fontWeight: "600",
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  valuePrimary: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.ink,
  },
  valueState: {
    fontSize: 18,
    fontWeight: "900",
  },
  redText: {
    color: colors.red,
  },
  yellowText: {
    color: colors.yellow,
  },
  greenText: {
    color: colors.green,
  },
  savedBanner: {
    backgroundColor: "#E8F4EC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B7DFCA",
    marginBottom: 16,
    alignItems: "center",
  },
  savedBannerText: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "700",
  },
});
