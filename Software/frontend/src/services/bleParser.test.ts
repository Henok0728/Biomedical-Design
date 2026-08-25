import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseBlePayload } from "./bleParser";

describe("BleParser", () => {
  it("correctly parses JSON payload from ESP32", () => {
    const jsonPayload = JSON.stringify({
      vol_ml: 320,
      rate_15: 80,
      hr: 88,
      sbp: 115,
      si: 0.77,
      state: "monitor",
      batt: 94,
      seq: 201,
    });

    const parsed = parseBlePayload(jsonPayload);
    assert.ok(parsed);
    assert.strictEqual(parsed.reading.volumeMl, 320);
    assert.strictEqual(parsed.reading.hrBpm, 88);
    assert.strictEqual(parsed.reading.sbpMmhg, 115);
    assert.strictEqual(parsed.appEvaluatedState, "monitor");
    assert.strictEqual(parsed.hasStateMismatch, false);
  });

  it("correctly parses compact CSV stream from ESP32", () => {
    // vol_ml, rate_15, hr, sbp, si, state, batt, seq
    const csvPayload = "540.0,310.0,110,95,1.16,critical,85,450";

    const parsed = parseBlePayload(csvPayload);
    assert.ok(parsed);
    assert.strictEqual(parsed.reading.volumeMl, 540);
    assert.strictEqual(parsed.appEvaluatedState, "critical");
    assert.strictEqual(parsed.hasStateMismatch, false);
  });

  it("detects and flags firmware vs app state mismatches", () => {
    const jsonPayload = JSON.stringify({
      vol_ml: 520, // Should be critical
      rate_15: 50,
      hr: 80,
      sbp: 120,
      si: 0.67,
      state: "normal", // Firmware sent stale normal
      batt: 90,
      seq: 10,
    });

    const parsed = parseBlePayload(jsonPayload);
    assert.ok(parsed);
    assert.strictEqual(parsed.appEvaluatedState, "critical");
    assert.strictEqual(parsed.firmwareState, "normal");
    assert.strictEqual(parsed.hasStateMismatch, true);
  });

  it("handles sensor disconnection fail-safe flag in payload", () => {
    const csvPayload = "120.0,20.0,75,120,0.63,normal,90,12,1"; // 1 at index 8 means sensor_fail

    const parsed = parseBlePayload(csvPayload);
    assert.ok(parsed);
    assert.strictEqual(parsed.reading.sensorFail, true);
    assert.strictEqual(parsed.appEvaluatedState, "sensor_fail");
  });

  it("returns null on malformed or empty strings safely", () => {
    assert.strictEqual(parseBlePayload(""), null);
    assert.strictEqual(parseBlePayload("invalid,csv"), null);
    assert.strictEqual(parseBlePayload("{broken-json"), null);
  });
});
