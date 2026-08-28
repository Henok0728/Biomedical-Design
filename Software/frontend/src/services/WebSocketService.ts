import AsyncStorage from "@react-native-async-storage/async-storage";
import { simulator } from "../simulator/PphSimulator";

export type ConnectionState = "DISCONNECTED" | "CONNECTING" | "CONNECTED";
export type SensorSource = "SIMULATOR" | "ESP32";
export type QualityLevel = "GOOD" | "UNRELIABLE" | "ERROR";

export interface SensorHealth {
  load_cell: boolean;
  max30102: boolean;
  tcs34725: boolean;
  mpu6050: boolean;
}

export interface BackendSensorData {
  mass_g: number;
  fluid_rate_g_min: number;
  heart_rate: number | null;
  spo2: number | null;
  red: number;
  green: number;
  blue: number;
  clear: number;
  accel_x: number;
  accel_y: number;
  accel_z: number;
  motion_level: number;
  measurement_quality: QualityLevel;
  sensor_health: SensorHealth;
  blood_fraction?: number;
}

export interface NormalizedPacket {
  type: "sensor_data";
  source: SensorSource;
  timestamp: string;
  data: BackendSensorData;
}

type Listener = () => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = "DISCONNECTED";
  private source: SensorSource = "SIMULATOR";
  private lastPacketTimestamp: string | null = null;
  private backendUrl = "ws://192.168.1.100:3000/ws";
  private listeners = new Set<Listener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private latestSensorData: BackendSensorData | null = null;

  constructor() {
    this.loadSavedUrl();
  }

  async loadSavedUrl() {
    try {
      const saved = await AsyncStorage.getItem("pph_backend_url");
      if (saved) {
        this.backendUrl = saved;
      }
    } catch (e) {
      console.warn("Failed to load saved backend URL", e);
    }
  }

  async setBackendUrl(url: string) {
    this.backendUrl = url;
    try {
      await AsyncStorage.setItem("pph_backend_url", url);
    } catch (e) {
      console.warn("Failed to save backend URL", e);
    }
    this.connect();
  }

  getBackendUrl(): string {
    return this.backendUrl;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getSource(): SensorSource {
    return this.source;
  }

  getLastPacketTimestamp(): string | null {
    return this.lastPacketTimestamp;
  }

  getLatestSensorData(): BackendSensorData | null {
    return this.latestSensorData;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  connect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.connectionState = "CONNECTING";
    this.notify();

    try {
      this.ws = new WebSocket(this.backendUrl);

      this.ws.onopen = () => {
        this.connectionState = "CONNECTED";
        this.notify();
        console.log("[App WS] Connected to backend at", this.backendUrl);
      };

      this.ws.onclose = () => {
        this.connectionState = "DISCONNECTED";
        this.notify();
        console.log("[App WS] Disconnected. Reconnecting in 3s...");
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = (err) => {
        console.warn("[App WS] WebSocket Error", err);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "system_status") {
            this.source = msg.source;
            this.notify();
          } else if (msg.type === "sensor_data") {
            const packet = msg as NormalizedPacket;
            this.source = packet.source;
            this.lastPacketTimestamp = packet.timestamp;
            this.latestSensorData = packet.data;

            // Feed directly into PphSimulator so existing screens update transparently
            simulator.updateFromBackendPacket(packet);

            this.notify();
          }
        } catch (e) {
          console.error("Error processing WS packet", e);
        }
      };
    } catch (e) {
      this.connectionState = "DISCONNECTED";
      this.notify();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionState = "DISCONNECTED";
    this.notify();
  }

  sendTare() {
    if (this.ws && this.connectionState === "CONNECTED") {
      this.ws.send(JSON.stringify({ type: "tare_load_cell" }));
    }
  }

  sendCalibrate(knownWeightG: number) {
    if (this.ws && this.connectionState === "CONNECTED") {
      this.ws.send(
        JSON.stringify({
          type: "calibrate_load_cell",
          known_weight_g: knownWeightG,
        })
      );
    }
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const webSocketService = new WebSocketService();
