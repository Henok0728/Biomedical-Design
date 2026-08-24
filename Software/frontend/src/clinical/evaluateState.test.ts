import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BLOOD_DENSITY_G_PER_ML,
  displaySeverity,
  evaluateState,
  gramsToMl,
  shockIndex,
} from "./evaluateState";

describe("evaluateState", () => {
  it("is green below 300 mL and SI < 0.7", () => {
    assert.equal(
      evaluateState({
        volumeMl: 200,
        volumeRateMlPer15min: 50,
        shockIndex: 0.6,
        sensorFail: false,
      }),
      "normal",
    );
  });

  it("goes yellow at 350 mL", () => {
    assert.equal(
      evaluateState({
        volumeMl: 350,
        volumeRateMlPer15min: 80,
        shockIndex: 0.55,
        sensorFail: false,
      }),
      "monitor",
    );
  });

  it("goes yellow when SI is 0.7–0.9 even if volume is low", () => {
    assert.equal(
      evaluateState({
        volumeMl: 100,
        volumeRateMlPer15min: 20,
        shockIndex: 0.8,
        sensorFail: false,
      }),
      "monitor",
    );
  });

  it("goes red at 500 mL", () => {
    assert.equal(
      evaluateState({
        volumeMl: 500,
        volumeRateMlPer15min: 100,
        shockIndex: 0.6,
        sensorFail: false,
      }),
      "critical",
    );
  });

  it("goes red when SI is 1.0", () => {
    assert.equal(
      evaluateState({
        volumeMl: 120,
        volumeRateMlPer15min: 40,
        shockIndex: 1.0,
        sensorFail: false,
      }),
      "critical",
    );
  });

  it("goes red at 300 mL in 15 minutes", () => {
    assert.equal(
      evaluateState({
        volumeMl: 280,
        volumeRateMlPer15min: 300,
        shockIndex: 0.5,
        sensorFail: false,
      }),
      "critical",
    );
  });

  it("fail-safe red when the sensor is disconnected", () => {
    assert.equal(
      evaluateState({
        volumeMl: 0,
        volumeRateMlPer15min: 0,
        shockIndex: 0.5,
        sensorFail: true,
      }),
      "sensor_fail",
    );
    assert.equal(displaySeverity("sensor_fail"), "red");
  });

  it("ignores missing Shock Index and uses volume only", () => {
    assert.equal(
      evaluateState({
        volumeMl: 200,
        volumeRateMlPer15min: 10,
        shockIndex: null,
        sensorFail: false,
      }),
      "normal",
    );
  });
});

describe("conversions", () => {
  it("converts grams to mL with blood density 1.06", () => {
    assert.equal(gramsToMl(318), 318 / BLOOD_DENSITY_G_PER_ML);
  });

  it("computes Shock Index as HR / SBP", () => {
    assert.equal(shockIndex(90, 100), 0.9);
    assert.equal(shockIndex(90, 0), null);
    assert.equal(shockIndex(null, 110), null);
  });
});
