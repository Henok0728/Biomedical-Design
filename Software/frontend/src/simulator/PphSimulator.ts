import {
  displaySeverity,
  evaluateState,
  shockIndex,
} from "../clinical/evaluateState";
import type { AlertState, DeviceReading } from "../clinical/types";

export type SensorSource = "SIMULATOR" | "ESP32";
export type QualityLevel = "GOOD" | "UNRELIABLE" | "ERROR";

export interface SensorHealth {
  load_cell: boolean;
  max30102: boolean;
  tcs34725: boolean;
  mpu6050: boolean;
}

export type SimulatorSnapshot = DeviceReading & {
  state: AlertState;
  severity: ReturnType<typeof displaySeverity>;
  startedAt: number | null;
  history: { at: number; volumeMl: number }[];
  source: SensorSource;
  measurementQuality: QualityLevel;
  sensorHealth: SensorHealth;
  motionLevel: number;
  lastPacketAt: number | null;
};

type Listener = (snap: SimulatorSnapshot) => void;

class PphSimulator {
  private volumeMl = 100;
  private hrBpm: number | null = 75;
  private sbpMmhg: number | null = 118;
  private sensorFail = false;
  private batteryPct = 95;
  private seq = 0;
  private startedAt: number | null = null;
  private volumeHistory: { at: number; volumeMl: number }[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<Listener>();
  private lastSnap: SimulatorSnapshot;

  private source: SensorSource = "SIMULATOR";
  private measurementQuality: QualityLevel = "GOOD";
  private motionLevel = 0.02;
  private lastPacketAt: number | null = null;
  private sensorHealth: SensorHealth = {
    load_cell: true,
    max30102: true,
    tcs34725: true,
    mpu6050: true,
  };

  constructor() {
    this.lastSnap = this.buildSnapshot();
  }

  startSession() {
    this.volumeMl = 100;
    this.hrBpm = 75;
    this.sbpMmhg = 118;
    this.sensorFail = false;
    this.seq = 0;
    const now = Date.now();
    this.startedAt = now;
    this.volumeHistory = [
      { at: now - 30000, volumeMl: 50 },
      { at: now - 20000, volumeMl: 75 },
      { at: now - 10000, volumeMl: 90 },
      { at: now, volumeMl: 100 },
    ];
    this.ensureTick();
    this.emit();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  updateFromBackendPacket(packet: {
    source: SensorSource;
    timestamp: string;
    data: {
      mass_g: number;
      fluid_rate_g_min: number;
      heart_rate: number | null;
      spo2: number | null;
      motion_level: number;
      measurement_quality: QualityLevel;
      sensor_health: SensorHealth;
    };
  }) {
    this.source = packet.source;
    this.volumeMl = packet.data.mass_g;
    this.hrBpm = packet.data.heart_rate;
    this.motionLevel = packet.data.motion_level;
    this.measurementQuality = packet.data.measurement_quality;
    this.sensorHealth = packet.data.sensor_health;
    this.sensorFail =
      packet.data.measurement_quality === "ERROR" ||
      !packet.data.sensor_health.load_cell;
    this.lastPacketAt = Date.now();

    this.volumeHistory.push({ at: Date.now(), volumeMl: this.volumeMl });
    if (this.volumeHistory.length > 120) {
      this.volumeHistory.shift();
    }

    this.emit();
  }

  addVolume(ml: number) {
    this.volumeMl = Math.max(0, this.volumeMl + ml);
    this.volumeHistory.push({ at: Date.now(), volumeMl: this.volumeMl });
    this.emit();
  }

  setHemodynamics(hrBpm: number, sbpMmhg: number) {
    this.hrBpm = hrBpm;
    this.sbpMmhg = sbpMmhg;
    this.emit();
  }

  raiseShockIndex() {
    this.hrBpm = 120;
    this.sbpMmhg = 100;
    this.emit();
  }

  setSensorFail(fail: boolean) {
    this.sensorFail = fail;
    this.emit();
  }

  snapshot(): SimulatorSnapshot {
    return this.lastSnap;
  }

  private buildSnapshot(): SimulatorSnapshot {
    const si = shockIndex(this.hrBpm, this.sbpMmhg);
    const reading: DeviceReading = {
      volumeMl: this.volumeMl,
      volumeRateMlPer15min: this.ratePer15Min(),
      shockIndex: si,
      sensorFail: this.sensorFail,
      hrBpm: this.hrBpm,
      sbpMmhg: this.sbpMmhg,
      batteryPct: this.batteryPct,
      seq: this.seq,
      at: Date.now(),
    };
    const state = evaluateState(reading);
    return {
      ...reading,
      state,
      severity: displaySeverity(state),
      startedAt: this.startedAt,
      history: [...this.volumeHistory],
      source: this.source,
      measurementQuality: this.measurementQuality,
      sensorHealth: this.sensorHealth,
      motionLevel: this.motionLevel,
      lastPacketAt: this.lastPacketAt,
    };
  }

  private ratePer15Min(): number {
    const cutoff = Date.now() - 15 * 60 * 1000;
    const window = this.volumeHistory.filter((p) => p.at >= cutoff);
    if (window.length < 2) {
      const first = window[0]?.volumeMl ?? this.volumeMl;
      return Math.max(0, this.volumeMl - first);
    }
    return Math.max(0, this.volumeMl - window[0].volumeMl);
  }

  private ensureTick() {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      this.seq += 1;
      this.volumeHistory.push({ at: Date.now(), volumeMl: this.volumeMl });
      if (this.volumeHistory.length > 120) {
        this.volumeHistory.shift();
      }
      this.emit();
    }, 1000);
  }

  private emit() {
    this.lastSnap = this.buildSnapshot();
    this.listeners.forEach((l) => l(this.lastSnap));
  }
}

export const simulator = new PphSimulator();
