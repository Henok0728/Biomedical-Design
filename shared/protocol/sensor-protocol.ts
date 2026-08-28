/**
 * Shared Postpartum Hemorrhage (PPH) Sensor Protocol
 * Normalizing real hardware (ESP32) and web simulation data.
 */

export type SensorSource = "SIMULATOR" | "ESP32";
export type QualityLevel = "GOOD" | "UNRELIABLE" | "ERROR";

export interface SensorHealth {
  load_cell: boolean;
  max30102: boolean;
  tcs34725: boolean;
  mpu6050: boolean;
  temp: boolean;
}

export interface SensorDataPayload {
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
  temperature: number;
  measurement_quality: QualityLevel;
  sensor_health: SensorHealth;
  blood_fraction?: number;
}

export interface NormalizedSensorMessage {
  type: "sensor_data";
  source: SensorSource;
  timestamp: string;
  data: SensorDataPayload;
}

export type ScenarioType =
  | "NORMAL"
  | "MILD_BLEEDING"
  | "INCREASING_BLEEDING"
  | "SEVERE_BLEEDING"
  | "MOVEMENT"
  | "RESET";

export interface SimulationCommandMessage {
  type: "simulation_command";
  command: ScenarioType;
}

export interface SimulationUpdateMessage {
  type: "simulation_update";
  data: Partial<SensorDataPayload>;
}

export interface SetSourceMessage {
  type: "set_source";
  source: SensorSource;
}

export interface TareLoadCellMessage {
  type: "tare_load_cell";
}

export interface CalibrateLoadCellMessage {
  type: "calibrate_load_cell";
  known_weight_g: number;
}

export interface SystemStatusMessage {
  type: "system_status";
  source: SensorSource;
  activeScenario?: ScenarioType;
  connectedClients: number;
  calibrationFactor?: number;
}

export type IncomingBackendMessage =
  | SimulationCommandMessage
  | SimulationUpdateMessage
  | SetSourceMessage
  | TareLoadCellMessage
  | CalibrateLoadCellMessage
  | NormalizedSensorMessage;

export type OutgoingBackendMessage =
  | NormalizedSensorMessage
  | SystemStatusMessage;
