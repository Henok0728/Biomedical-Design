import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState, useEffect } from "react";
import { Alert, StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { BigButton } from "../components/ui";
import { t } from "../i18n/copy";
import type { RootStackParamList } from "../navigation/types";
import { bleScanner } from "../services/bleScanner";
import { colors } from "../theme/colors";
import type { Device } from 'react-native-ble-plx';

type Nav = NativeStackNavigationProp<RootStackParamList, "Connect">;
type R = RouteProp<RootStackParamList, "Connect">;

export function ConnectScreen() {
  const navigation = useNavigation<Nav>();
  const { language, deviceId } = useRoute<R>().params;
  const copy = t(language);
  
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      bleScanner.stopScan();
    };
  }, []);

  const handleStartScan = () => {
    setIsScanning(true);
    setDevices([]);
    
    bleScanner.startScan(
      (device) => {
        setDevices((prev) => {
          if (!prev.find(d => d.id === device.id)) {
            return [...prev, device];
          }
          return prev;
        });
      },
      (error) => {
        setIsScanning(false);
        Alert.alert("BLE Scan Error", error.message);
      }
    );

    // Stop scanning after 10 seconds
    setTimeout(() => {
      bleScanner.stopScan();
      setIsScanning(false);
    }, 10000);
  };

  const handleConnect = async (device: Device) => {
    try {
      bleScanner.stopScan();
      setIsScanning(false);
      setConnectingTo(device.id);

      await bleScanner.connectToDevice(device.id);
      
      // Navigate to new session with real hardware
      navigation.navigate("NewSession", { 
        language, 
        deviceId: device.name || device.id, 
        demo: false 
      });
      
    } catch (error: any) {
      Alert.alert("Connection Failed", error.message);
    } finally {
      setConnectingTo(null);
    }
  };

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

      <View style={styles.divider} />

      <Text style={styles.scanTitle}>Hardware Integration</Text>
      <BigButton
        title={isScanning ? "Scanning..." : "Scan for ESP32 Mat"}
        variant="ghost"
        onPress={handleStartScan}
        disabled={isScanning || connectingTo !== null}
      />

      {isScanning && <ActivityIndicator size="small" color={colors.navy} style={{ marginTop: 10 }} />}

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        style={styles.deviceList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.deviceCard}
            onPress={() => handleConnect(item)}
            disabled={connectingTo !== null}
          >
            <Text style={styles.deviceName}>{item.name || "Unknown Device"}</Text>
            <Text style={styles.deviceId}>{item.id}</Text>
            {connectingTo === item.id && (
              <Text style={styles.connectingText}>Connecting...</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 20,
    paddingTop: 60,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink },
  device: { fontSize: 22, fontWeight: "700", color: colors.navy, marginTop: 8 },
  hint: { fontSize: 16, color: colors.muted, marginTop: 12, marginBottom: 20 },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 24,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 12,
  },
  deviceList: {
    marginTop: 16,
    flex: 1,
  },
  deviceCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },
  deviceId: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  connectingText: {
    fontSize: 14,
    color: colors.crimson,
    fontWeight: "600",
    marginTop: 8,
  }
});
