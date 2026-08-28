import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
} from "react-native";
import { stateLabelEn } from "../clinical/evaluateState";
import { BigButton } from "../components/ui";
import { t } from "../i18n/copy";
import type { RootStackParamList } from "../navigation/types";
import { alarmManager } from "../services/alarm";
import { exportSessionPdf } from "../services/pdfReport";
import { sessionStore, type SessionRecord } from "../services/sessionStore";
import { colors } from "../theme/colors";

type Nav = NativeStackNavigationProp<RootStackParamList, "Summary">;
type R = RouteProp<RootStackParamList, "Summary">;

export function SessionSummaryScreen() {
  const navigation = useNavigation<Nav>();
  const params = useRoute<R>().params;
  const copy = t(params.language);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const savedRecordRef = useRef<SessionRecord | null>(null);

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

    savedRecordRef.current = record;
    sessionStore.saveSession(record).then(() => {
      setSaved(true);
    });
  }, [durationMin, events, params]);

  const handleExportPdf = async () => {
    const record = savedRecordRef.current;
    if (!record) return;
    setExporting(true);
    try {
      await exportSessionPdf(record, events);
    } catch (err) {
      Alert.alert("Export Failed", "Could not generate PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const isSensorFail = params.finalState === "sensor_fail";

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
                params.finalState === "critical" || isSensorFail
                  ? styles.redText
                  : params.finalState === "monitor"
                    ? styles.yellowText
                    : styles.greenText,
              ]}
            >
              {isSensorFail
                ? "SENSOR FAIL"
                : stateLabelEn(params.finalState).toUpperCase()}
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

        {/* Offline Saved Indicator with Vector Icon */}
        <View style={styles.savedBanner}>
          <Ionicons
            name="cloud-done-outline"
            size={18}
            color={colors.greenDark}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.savedBannerText}>
            {saved ? "Session saved to offline device storage" : "Saving..."}
          </Text>
        </View>

        {/* Action Buttons with Proper Spacing */}
        <View style={styles.buttonGroup}>
          <BigButton
            title={copy.saveAndSync}
            onPress={() =>
              navigation.navigate("Sync", { language: params.language })
            }
          />

          <Pressable
            style={[styles.pdfButton, exporting && styles.pdfButtonDisabled]}
            onPress={handleExportPdf}
            disabled={exporting || !saved}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <View style={styles.pdfButtonContent}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.white}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.pdfButtonText}>Export PDF Report</Text>
              </View>
            )}
          </Pressable>

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
        </View>
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
    flexDirection: "row",
    backgroundColor: "#E8F4EC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B7DFCA",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  savedBannerText: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "700",
  },
  buttonGroup: {
    gap: 12,
    marginTop: 4,
  },
  pdfButton: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    shadowColor: colors.navy,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  pdfButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pdfButtonDisabled: {
    opacity: 0.65,
  },
  pdfButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
});
