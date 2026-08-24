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

  constructor() {
    this.lastSnap = this.buildSnapshot();
  }

  startSession() {
    this.volumeMl = 80;
    this.hrBpm = 78;
    this.sbpMmhg = 118;
    this.sensorFail = false;
    this.seq = 0;
    this.startedAt = Date.now();
    this.volumeHistory = [{ at: Date.now(), volumeMl: this.volumeMl }];
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
      this.emit();
    }, 1000);
  }

  private emit() {
    this.lastSnap = this.buildSnapshot();
    this.listeners.forEach((l) => l(this.lastSnap));
  }
}

export const simulator = new PphSimulator();
