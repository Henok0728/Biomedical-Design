import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AlarmManager, type AlarmHardwareAdapter } from "./alarm";

function createMockAdapter(): AlarmHardwareAdapter & {
  vibrations: any[];
  cancelled: number;
  keeps: string[];
  releases: string[];
  tones: any[];
} {
  return {
    vibrations: [],
    cancelled: 0,
    keeps: [],
    releases: [],
    tones: [],
    vibrate(p, r) {
      this.vibrations.push({ pattern: p, repeat: r });
    },
    cancelVibration() {
      this.cancelled += 1;
    },
    keepAwake(tag) {
      this.keeps.push(tag);
    },
    releaseKeepAwake(tag) {
      this.releases.push(tag);
    },
    playTone(freq, dur) {
      this.tones.push({ freq, dur });
    },
  };
}

describe("AlarmManager", () => {
  it("initializes in unmuted normal state", () => {
    const adapter = createMockAdapter();
    const manager = new AlarmManager(adapter);
    assert.strictEqual(manager.isMuted(), false);
    assert.strictEqual(manager.getRemainingMuteSeconds(), 0);
    assert.strictEqual(manager.getCurrentState(), "normal");
    manager.cleanup();
  });

  it("mutes for 5 minutes and logs mute event", () => {
    const adapter = createMockAdapter();
    const manager = new AlarmManager(adapter);
    manager.mute(5 * 60 * 1000);
    assert.strictEqual(manager.isMuted(), true);
    assert.ok(manager.getRemainingMuteSeconds() > 290);

    const events = manager.getEvents();
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].type, "mute");
    manager.cleanup();
  });

  it("unmutes manually and triggers alarm if in critical state", () => {
    const adapter = createMockAdapter();
    const manager = new AlarmManager(adapter);
    manager.mute(5 * 60 * 1000);
    manager.setAlertState("critical");

    // While muted, no vibration triggered
    assert.strictEqual(adapter.vibrations.length, 0);

    // Unmute should trigger critical alarm
    manager.unmute();
    assert.strictEqual(manager.isMuted(), false);
    assert.strictEqual(adapter.vibrations.length, 1);
    assert.deepStrictEqual(adapter.vibrations[0].pattern, [0, 500, 250, 500]);
    manager.cleanup();
  });

  it("activates keep awake on yellow and red, releases on normal", () => {
    const adapter = createMockAdapter();
    const manager = new AlarmManager(adapter);

    manager.setAlertState("monitor");
    assert.ok(adapter.keeps.includes("pph-alarm-tag"));

    manager.setAlertState("critical");
    assert.ok(adapter.keeps.length >= 2);

    manager.setAlertState("normal");
    assert.ok(adapter.releases.includes("pph-alarm-tag"));
    manager.cleanup();
  });

  it("fail-safe sensor_fail state triggers red alarm pattern", () => {
    const adapter = createMockAdapter();
    const manager = new AlarmManager(adapter);

    manager.setAlertState("sensor_fail");
    assert.strictEqual(adapter.vibrations.length, 1);
    assert.deepStrictEqual(adapter.vibrations[0].pattern, [0, 500, 250, 500]);
    assert.strictEqual(adapter.vibrations[0].repeat, true);
    manager.cleanup();
  });
});
