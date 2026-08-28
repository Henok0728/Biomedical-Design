import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BigButton } from "../components/ui";
import { t } from "../i18n/copy";
import type { RootStackParamList } from "../navigation/types";
import { BLE_CONFIG } from "../services/bleParser";
import { colors } from "../theme/colors";

type Nav = NativeStackNavigationProp<RootStackParamList, "Connect">;
type R = RouteProp<RootStackParamList, "Connect">;

export function ConnectScreen() {
  const navigation = useNavigation<Nav>();
  const { language, deviceId } = useRoute<R>().params;
  const copy = t(language);
  const [showBleInfo, setShowBleInfo] = useState(false);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{copy.connect}</Text>
      <Text style={styles.device}>{deviceId}</Text>
      <Text style={styles.hint}>{copy.demoHint}</Text>

      <BigButton
        title={copy.demoMode}
        onPress={() =>
          navigation.navigate("NewSession", { language, deviceId, demo: true })
        }
      />

      <BigButton
        title={copy.scanBle}
        variant="ghost"
        onPress={() => setShowBleInfo(true)}
      />

      {/* Hardware Interface Info Modal */}
      <Modal
        visible={showBleInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBleInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ESP32 BLE Bridge Protocol</Text>
            <Text style={styles.modalBody}>
              The software frontend is decoupled and ready for direct hardware
              pairing.
            </Text>

            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Service UUID:</Text>
              <Text style={styles.specCode}>{BLE_CONFIG.SERVICE_UUID}</Text>

              <Text style={[styles.specLabel, { marginTop: 8 }]}>
                Characteristic UUID:
              </Text>
              <Text style={styles.specCode}>
                {BLE_CONFIG.CHARACTERISTIC_UUID}
              </Text>

              <Text style={[styles.specLabel, { marginTop: 8 }]}>
                1 Hz Notify Payload:
              </Text>
              <Text style={styles.specCode}>
                vol_ml, rate_15, hr, sbp, si, state, batt, seq
              </Text>
            </View>

            <View style={styles.noteRow}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.navy}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.modalNote}>
                For rehearsals & judge presentations in Expo Go, tap Demo Mode
                below.
              </Text>
            </View>

            <BigButton
              title="Launch in Demo Mode"
              onPress={() => {
                setShowBleInfo(false);
                navigation.navigate("NewSession", {
                  language,
                  deviceId,
                  demo: true,
                });
              }}
            />

            <Pressable
              onPress={() => setShowBleInfo(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 20,
    justifyContent: "center",
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink },
  device: { fontSize: 22, fontWeight: "700", color: colors.navy, marginTop: 8 },
  hint: { fontSize: 16, color: colors.muted, marginTop: 12, marginBottom: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 12,
    lineHeight: 20,
  },
  specBox: {
    backgroundColor: "#F0F4F8",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D8E2EC",
    marginBottom: 12,
  },
  specLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.navy,
  },
  specCode: {
    fontFamily: "monospace",
    fontSize: 11,
    color: colors.ink,
    marginTop: 2,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  modalNote: {
    fontSize: 13,
    color: colors.muted,
    flex: 1,
  },
  closeBtn: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 4,
  },
  closeBtnText: {
    color: colors.navy,
    fontWeight: "700",
    fontSize: 15,
  },
});
