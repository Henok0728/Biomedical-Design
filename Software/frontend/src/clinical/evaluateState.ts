import type { AlertState, ClinicalInput, Severity } from "./types";

/** WHO-aligned PPH volume threshold (mL). */
export const VOLUME_MONITOR_ML = 300;
export const VOLUME_CRITICAL_ML = 500;
export const RATE_CRITICAL_ML_PER_15MIN = 300;
export const SI_MONITOR = 0.7;
export const SI_CRITICAL = 0.9;
/** Blood density used to convert load-cell grams to millilitres. */
export const BLOOD_DENSITY_G_PER_ML = 1.06;

export function gramsToMl(grams: number): number {
  return grams / BLOOD_DENSITY_G_PER_ML;
}

export function shockIndex(
  hrBpm: number | null,
  sbpMmhg: number | null,
): number | null {
  if (hrBpm == null || sbpMmhg == null || sbpMmhg <= 0) {
    return null;
  }
  return hrBpm / sbpMmhg;
}

/**
 * Single source of truth for mat + phone alerts.
 * sensor_fail always wins (fail-safe red on the device UI).
 */
export function evaluateState(input: ClinicalInput): AlertState {
  if (input.sensorFail) {
    return "sensor_fail";
  }

  const si = input.shockIndex;
  const siCritical = si != null && si >= SI_CRITICAL;
  const siMonitor = si != null && si >= SI_MONITOR;

  if (
    input.volumeMl >= VOLUME_CRITICAL_ML ||
    input.volumeRateMlPer15min >= RATE_CRITICAL_ML_PER_15MIN ||
    siCritical
  ) {
    return "critical";
  }

  if (input.volumeMl >= VOLUME_MONITOR_ML || siMonitor) {
    return "monitor";
  }

  return "normal";
}

export function displaySeverity(state: AlertState): Severity {
  if (state === "normal") {
    return "green";
  }
  if (state === "monitor") {
    return "yellow";
  }
  return "red";
}

export function stateLabelEn(state: AlertState): string {
  switch (state) {
    case "normal":
      return "Normal";
    case "monitor":
      return "Monitor";
    case "critical":
      return "Critical";
    case "sensor_fail":
      return "Sensor fail";
  }
}
