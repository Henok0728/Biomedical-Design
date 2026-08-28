import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BigButton } from "../components/ui";
import { t } from "../i18n/copy";
import type { RootStackParamList } from "../navigation/types";
import { BLE_CONFIG } from "../services/bleParser";
import { webSocketService } from "../services/WebSocketService";
import { colors } from "../theme/colors";

type Nav = NativeStackNavigationProp<RootStackParamList, "Connect">;
type R = RouteProp<RootStackParamList, "Connect">;

export function ConnectScreen() {
  const navigation = useNavigation<Nav>();
  const { language, deviceId } = useRoute<R>().params;
  const copy = t(language);
  const [showBleInfo, setShowBleInfo] = useState(false);
  const [ipInput, setIpInput] = useState(webSocketService.getBackendUrl());

  const connState = useSyncExternalStore(
    (onStoreChange) => webSocketService.subscribe(onStoreChange),
    () => webSocketService.getConnectionState(),
    () => webSocketService.getConnectionState()
  );

  const activeSource = useSyncExternalStore(
    (onStoreChange) => webSocketService.subscribe(onStoreChange),
    () => webSocketService.getSource(),
    () => webSocketService.getSource()
  );

  useEffect(() => {
    webSocketService.connect();
  }, []);

  const handleSaveAndConnect = () => {
    webSocketService.setBackendUrl(ipInput);
    Alert.alert("Connecting", `Attempting WebSocket connection to ${ipInput}`);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{copy.connect}</Text>
      <Text style={styles.device}>{deviceId}</Text>

      {/* Backend Connection Control Box */}
      <View style={styles.backendCard}>
        <Text style={styles.backendTitle}>Node.js Backend Connection</Text>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              connState === "CONNECTED"
                ? styles.dotConnected
                : connState === "CONNECTING"
                ? styles.dotConnecting
                : styles.dotDisconnected,
            ]}
          />
          <Text style={styles.statusText}>
            {connState === "CONNECTED"
              ? "CONNECTED TO BACKEND"
              : connState === "CONNECTING"
              ? "CONNECTING..."
              : "DISCONNECTED"}
          </Text>
        </View>

        <View style={styles.sourceRow}>
          <Text style={styles.sourceLabel}>Active Sensor Source:</Text>
          <Text
            style={[
              styles.sourceBadge,
              activeSource === "ESP32" ? styles.bgEsp : styles.bgSim,
            ]}
          >
            {activeSource}
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Backend WS URL:</Text>
          <TextInput
            style={styles.textInput}
            value={ipInput}
            onChangeText={setIpInput}
            placeholder="ws://192.168.1.100:3000/ws"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={styles.connectBtn} onPress={handleSaveAndConnect}>
            <Text style={styles.connectBtnText}>Save & Connect</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.hint}>{copy.demoHint}</Text>

      <BigButton
        title="Start Live Monitoring Session"
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
            <Text style={styles.modalTitle}>ESP32 Protocol Specifications</Text>
            <Text style={styles.modalBody}>
              The software frontend is decoupled and ready for direct hardware
              pairing over WebSocket or BLE Bridge.
            </Text>

            <View style={styles.specBox}>
              <Text style={styles.specLabel}>WebSocket Protocol:</Text>
              <Text style={styles.specCode}>{ipInput}</Text>

              <Text style={[styles.specLabel, { marginTop: 8 }]}>
                BLE Service UUID:
              </Text>
              <Text style={styles.specCode}>{BLE_CONFIG.SERVICE_UUID}</Text>
            </View>

            <BigButton
              title="Launch Session"
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
  device: { fontSize: 22, fontWeight: "700", color: colors.navy, marginTop: 4 },
  hint: { fontSize: 14, color: colors.muted, marginTop: 12, marginBottom: 8 },
  backendCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: "#D8E2EC",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  backendTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotConnected: { backgroundColor: "#10B981" },
  dotConnecting: { backgroundColor: "#F59E0B" },
  dotDisconnected: { backgroundColor: "#EF4444" },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sourceLabel: {
    fontSize: 13,
    color: colors.muted,
    marginRight: 8,
  },
  sourceBadge: {
    fontSize: 12,
    fontWeight: "800",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    overflow: "hidden",
  },
  bgSim: { backgroundColor: "#E0F2FE", color: "#0369A1" },
  bgEsp: { backgroundColor: "#FEF3C7", color: "#B45309" },
  inputGroup: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 8,
  },
  connectBtn: {
    backgroundColor: colors.navy,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  connectBtnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
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
