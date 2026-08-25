import { displaySeverity, evaluateState } from "../clinical/evaluateState";
import type { AlertState, DeviceReading } from "../clinical/types";

/**
 * Agreed ESP32 BLE Specifications:
 * Service UUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
 * Notify Characteristic UUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8"
 *
 * Payload formats supported:
 * 1. JSON string:
 *    {"vol_ml": 340, "rate_15": 120, "hr": 84, "sbp": 110, "si": 0.76, "state": "monitor", "batt": 88, "seq": 142}
 *
 * 2. CSV string (compact ~1 Hz notify):
 *    "vol_ml,rate_15,hr,sbp,si,state,batt,seq"
 *    e.g. "340.5,120.0,84,110,0.76,monitor,88,142"
 */

export const BLE_CONFIG = {
  SERVICE_UUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
  CHARACTERISTIC_UUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
  DEVICE_NAME_PREFIX: "PPH-MAT",
};

export interface BlePacket {
  vol_ml: number;
  rate_15: number;
  hr: number | null;
  sbp: number | null;
  si: number | null;
  state?: string;
  batt: number;
  seq: number;
  sensor_fail?: boolean;
}

export interface ParsedBleReading {
  reading: DeviceReading;
  appEvaluatedState: AlertState;
  firmwareState?: string;
  hasStateMismatch: boolean;
}

/**
 * Parse raw string notification from ESP32 BLE characteristic
 */
export function parseBlePayload(raw: string): ParsedBleReading | null {
  if (!raw || typeof raw !== "string") return null;

  const trimmed = raw.trim();
  let packet: Partial<BlePacket> = {};

  try {
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      packet = JSON.parse(trimmed);
    } else {
      // CSV parse: vol_ml, rate_15, hr, sbp, si, state, batt, seq
      const parts = trimmed.split(",").map((p) => p.trim());
      if (parts.length >= 8) {
        packet = {
          vol_ml: parseFloat(parts[0]) || 0,
          rate_15: parseFloat(parts[1]) || 0,
          hr: parts[2] !== "" && parts[2] !== "null" ? parseInt(parts[2], 10) : null,
          sbp: parts[3] !== "" && parts[3] !== "null" ? parseInt(parts[3], 10) : null,
          si: parts[4] !== "" && parts[4] !== "null" ? parseFloat(parts[4]) : null,
          state: parts[5],
          batt: parseInt(parts[6], 10) || 100,
          seq: parseInt(parts[7], 10) || 0,
          sensor_fail: parts[8] === "1" || parts[8] === "true",
        };
      } else {
        return null;
      }
    }

    const volumeMl = packet.vol_ml ?? 0;
    const volumeRateMlPer15min = packet.rate_15 ?? 0;
    const hrBpm = packet.hr ?? null;
    const sbpMmhg = packet.sbp ?? null;
    const si = packet.si ?? (hrBpm && sbpMmhg && sbpMmhg > 0 ? hrBpm / sbpMmhg : null);
    const sensorFail = !!packet.sensor_fail;

    const reading: DeviceReading = {
      volumeMl,
      volumeRateMlPer15min,
      shockIndex: si,
      sensorFail,
      hrBpm,
      sbpMmhg,
      batteryPct: packet.batt ?? 100,
      seq: packet.seq ?? 0,
      at: Date.now(),
    };

    const appEvaluatedState = evaluateState(reading);
    const firmwareState = packet.state;

    // Check if firmware alerted with a different state than app calculated
    const hasStateMismatch =
      firmwareState != null &&
      firmwareState.toLowerCase() !== appEvaluatedState.toLowerCase();

    return {
      reading,
      appEvaluatedState,
      firmwareState,
      hasStateMismatch,
    };
  } catch {
    return null;
  }
}
