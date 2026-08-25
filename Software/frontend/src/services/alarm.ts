import type { AlertState } from "../clinical/types";

export interface LoggedEvent {
  id: string;
  type: "state_change" | "mute" | "unmute" | "checklist_toggle" | "disconnect";
  state: AlertState;
  timestamp: number;
  details?: string;
}

export interface AlarmHardwareAdapter {
  vibrate: (pattern: number | number[], repeat?: boolean) => void;
  cancelVibration: () => void;
  keepAwake: (tag: string) => void;
  releaseKeepAwake: (tag: string) => void;
  playTone?: (frequency: number, durationMs: number) => void;
}

// Default dynamic adapter that safely checks platform at runtime
const defaultAdapter: AlarmHardwareAdapter = {
  vibrate: (pattern, repeat) => {
    try {
      const { Vibration } = require("react-native");
      if (Vibration && typeof Vibration.vibrate === "function") {
        Vibration.vibrate(pattern, repeat);
      }
    } catch {}
  },
  cancelVibration: () => {
    try {
      const { Vibration } = require("react-native");
      if (Vibration && typeof Vibration.cancel === "function") {
        Vibration.cancel();
      }
    } catch {}
  },
  keepAwake: (tag) => {
    try {
      const keepAwakePkg = require("expo-keep-awake");
      if (keepAwakePkg && typeof keepAwakePkg.activateKeepAwakeAsync === "function") {
        keepAwakePkg.activateKeepAwakeAsync(tag);
      }
    } catch {}
  },
  releaseKeepAwake: (tag) => {
    try {
      const keepAwakePkg = require("expo-keep-awake");
      if (keepAwakePkg && typeof keepAwakePkg.deactivateKeepAwake === "function") {
        keepAwakePkg.deactivateKeepAwake(tag);
      }
    } catch {}
  },
};

export class AlarmManager {
  private mutedUntil = 0;
  private currentInterval: any = null;
  private currentState: AlertState = "normal";
  private eventLog: LoggedEvent[] = [];
  private listeners = new Set<() => void>();
  private adapter: AlarmHardwareAdapter;
  private audioContext: any = null;

  constructor(adapter: AlarmHardwareAdapter = defaultAdapter) {
    this.adapter = adapter;
    this.initWebAudio();
  }

  private initWebAudio() {
    if (typeof window !== "undefined") {
      try {
        const AudioCtx =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      } catch {}
    }
  }

  private playWebTone(frequency: number, durationMs: number) {
    if (this.adapter.playTone) {
      this.adapter.playTone(frequency, durationMs);
      return;
    }
    if (!this.audioContext) return;
    try {
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + durationMs / 1000,
      );
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start();
      osc.stop(this.audioContext.currentTime + durationMs / 1000);
    } catch {}
  }

  public isMuted(): boolean {
    return Date.now() < this.mutedUntil;
  }

  public getRemainingMuteSeconds(): number {
    if (!this.isMuted()) return 0;
    return Math.max(0, Math.ceil((this.mutedUntil - Date.now()) / 1000));
  }

  public mute(durationMs = 5 * 60 * 1000) {
    this.mutedUntil = Date.now() + durationMs;
    this.stopSoundAndVibration();
    this.logEvent("mute", `Muted for ${Math.round(durationMs / 60000)} minutes`);
    this.notify();
  }

  public unmute() {
    this.mutedUntil = 0;
    this.logEvent("unmute", "Alarm unmuted manually");
    this.applyAlarmForState(this.currentState);
    this.notify();
  }

  public setAlertState(state: AlertState) {
    if (this.currentState !== state) {
      const prev = this.currentState;
      this.currentState = state;
      this.logEvent("state_change", `Transitioned from ${prev} to ${state}`);
      this.applyAlarmForState(state);
      this.notify();
    }
  }

  public getCurrentState(): AlertState {
    return this.currentState;
  }

  public logEvent(
    type: LoggedEvent["type"],
    details?: string,
    state?: AlertState,
  ) {
    const event: LoggedEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      state: state || this.currentState,
      timestamp: Date.now(),
      details,
    };
    this.eventLog.push(event);
    return event;
  }

  public getEvents(): LoggedEvent[] {
    return [...this.eventLog];
  }

  public clearEvents() {
    this.eventLog = [];
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private applyAlarmForState(state: AlertState) {
    this.stopSoundAndVibration();

    if (state === "critical" || state === "sensor_fail") {
      this.adapter.keepAwake("pph-alarm-tag");

      if (!this.isMuted()) {
        // Red alert: continuous urgent pulse
        this.adapter.vibrate([0, 500, 250, 500], true);
        this.playWebTone(880, 400);

        this.currentInterval = setInterval(() => {
          if (!this.isMuted()) {
            this.playWebTone(880, 400);
          } else {
            this.stopSoundAndVibration();
          }
        }, 800);
      }
    } else if (state === "monitor") {
      this.adapter.keepAwake("pph-alarm-tag");

      if (!this.isMuted()) {
        // Yellow alert: warning pulse
        this.adapter.vibrate(300);
        this.playWebTone(587, 300);
      }
    } else {
      // Normal
      this.adapter.releaseKeepAwake("pph-alarm-tag");
    }
  }

  public stopSoundAndVibration() {
    if (this.currentInterval) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }
    this.adapter.cancelVibration();
  }

  public cleanup() {
    this.stopSoundAndVibration();
    this.adapter.releaseKeepAwake("pph-alarm-tag");
  }
}

export const alarmManager = new AlarmManager();
