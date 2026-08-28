import {
  displaySeverity,
  evaluateState,
  shockIndex,
} from "../clinical/evaluateState";
import type { AlertState, DeviceReading } from "../clinical/types";

export type SimulatorSnapshot = DeviceReading & {
  state: AlertState;
  severity: ReturnType<typeof displaySeverity>;
  startedAt: number | null;
  history: { at: number; volumeMl: number }[];
};

type Listener = (snap: SimulatorSnapshot) => void;

class PphSimulator {
  private volumeMl = 80;
  private hrBpm: number | null = 78;
  private sbpMmhg: number | null = 118;
  private sensorFail = false;
  private batteryPct = 92;
  private seq = 0;
  private startedAt: number | null = null;
  private volumeHistory: { at: number; volumeMl: number }[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<Listener>();
  private lastSnap: SimulatorSnapshot;
  private remoteRateMl: number | null = null;
  source: "demo" | "wifi" = "demo";

  constructor() {
    this.lastSnap = this.buildSnapshot();
  }

  startSession(source: "demo" | "wifi" = "demo") {
    this.source = source;
    this.remoteRateMl = null;
    this.sensorFail = false;
    this.seq = 0;
    const now = Date.now();
    this.startedAt = now;
    if (source === "wifi") {
      this.volumeMl = 0;
      this.hrBpm = null;
      this.sbpMmhg = null;
      this.volumeHistory = [{ at: now, volumeMl: 0 }];
    } else {
      this.volumeMl = 100;
      this.hrBpm = 78;
      this.sbpMmhg = 118;
      this.volumeHistory = [
        { at: now - 30000, volumeMl: 50 },
        { at: now - 20000, volumeMl: 75 },
        { at: now - 10000, volumeMl: 90 },
        { at: now, volumeMl: 100 },
      ];
    }
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

  applyRemoteReading(reading: DeviceReading) {
    this.volumeMl = reading.volumeMl;
    this.hrBpm = reading.hrBpm;
    this.sbpMmhg = reading.sbpMmhg;
    this.sensorFail = reading.sensorFail;
    this.batteryPct = reading.batteryPct;
    this.seq = reading.seq;
    this.remoteRateMl = reading.volumeRateMlPer15min;
    this.volumeHistory.push({ at: Date.now(), volumeMl: this.volumeMl });
    if (this.volumeHistory.length > 120) {
      this.volumeHistory.shift();
    }
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
    };
  }

  private ratePer15Min(): number {
    if (this.remoteRateMl != null) {
      return this.remoteRateMl;
    }
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
