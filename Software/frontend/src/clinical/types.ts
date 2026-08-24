export type AlertState = "normal" | "monitor" | "critical" | "sensor_fail";
export type Severity = "green" | "yellow" | "red";
export type Language = "en" | "am";

export type ClinicalInput = {
  volumeMl: number;
  volumeRateMlPer15min: number;
  shockIndex: number | null;
  sensorFail: boolean;
};

export type DeviceReading = ClinicalInput & {
  hrBpm: number | null;
  sbpMmhg: number | null;
  batteryPct: number;
  seq: number;
  at: number;
};

export type ClinicalEventType =
  "state_change" | "mute" | "disconnect" | "reconnect";

export type ClinicalEvent = {
  type: ClinicalEventType;
  at: number;
  note?: string;
  state?: AlertState;
};

export type Session = {
  sessionId: string;
  deviceId: string;
  motherId?: string;
  startedAt: number;
  endedAt?: number;
  events: ClinicalEvent[];
};
