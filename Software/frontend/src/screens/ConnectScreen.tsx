import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BigButton } from "../components/ui";
import { t } from "../i18n/copy";
import type { RootStackParamList } from "../navigation/types";
import {
  WIFI_DEFAULT_HOST,
  WIFI_PASSWORD,
  WIFI_SSID,
  fetchMatReading,
} from "../services/wifiClient";
import { colors } from "../theme/colors";

type Nav = NativeStackNavigationProp<RootStackParamList, "Connect">;
type R = RouteProp<RootStackParamList, "Connect">;

export function ConnectScreen() {
  const navigation = useNavigation<Nav>();
  const { language, deviceId } = useRoute<R>().params;
  const copy = t(language);
  const [host, setHost] = useState(WIFI_DEFAULT_HOST);
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "fail">(
    "idle",
  );

  const goDemo = () =>
    navigation.navigate("NewSession", { language, deviceId, demo: true });

  const testWifi = async () => {
    setStatus("testing");
    const parsed = await fetchMatReading(host);
    setStatus(parsed ? "ok" : "fail");
    if (parsed) {
      navigation.navigate("NewSession", {
        language,
        deviceId,
        demo: false,
        wifiHost: host.trim(),
      });
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{copy.connect}</Text>
      <Text style={styles.device}>{deviceId}</Text>
      <Text style={styles.hint}>{copy.demoHint}</Text>

      <BigButton title={copy.demoMode} onPress={goDemo} />

      <Text style={styles.section}>{copy.wifiConnect}</Text>
      <Text style={styles.meta}>
        SSID {WIFI_SSID} · {WIFI_PASSWORD}
      </Text>
      <TextInput
        value={host}
        onChangeText={(v) => {
          setHost(v);
          setStatus("idle");
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        placeholder={copy.wifiHostLabel}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      {status === "testing" ? (
        <ActivityIndicator color={colors.navy} style={{ marginTop: 12 }} />
      ) : null}
      {status === "ok" ? (
        <Text style={styles.ok}>{copy.wifiOk}</Text>
      ) : null}
      {status === "fail" ? (
        <Text style={styles.fail}>{copy.wifiFail}</Text>
      ) : null}
      <BigButton
        title={status === "testing" ? copy.wifiTesting : copy.wifiConnect}
        variant="ghost"
        onPress={testWifi}
      />

      <Pressable onPress={goDemo} style={styles.later}>
        <Ionicons name="bluetooth-outline" size={16} color={colors.muted} />
        <Text style={styles.laterText}>{copy.scanBle}</Text>
      </Pressable>
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
  section: {
    marginTop: 28,
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
  },
  meta: { fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: 8 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    fontSize: 18,
    color: colors.ink,
  },
  ok: { color: colors.green, marginTop: 8, fontWeight: "700" },
  fail: { color: colors.red, marginTop: 8, fontWeight: "600" },
  later: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    justifyContent: "center",
  },
  laterText: { color: colors.muted, fontWeight: "600" },
});
