# PPH System Protocol Specification

This document defines the unified WebSocket communication protocol for the Postpartum Hemorrhage (PPH) monitoring system.

## Architectural Overview

```text
                     ┌───────────────────┐
                     │   Web Simulator   │
                     │  Control Panel    │
                     └─────────┬─────────┘
                               │ WebSocket
                               ▼
                     ┌───────────────────┐
                     │  Node.js Backend  │
                     │                   │
                     │ Sensor Normalizer │
                     └─────────┬─────────┘
                               │ WebSocket
                               ▼
                     ┌───────────────────┐
                     │ React Native App  │
                     │     Android       │
                     └───────────────────┘
```

The Node.js Backend acts as the single source of truth. It manages the active data source (`SIMULATOR` or `ESP32`) and broadcasts a single normalized JSON format to all connected clients.

---

## 1. Normalized Sensor Packet (`sensor_data`)

Broadcasted by backend at ~1 Hz (or whenever sensor state updates).

```json
{
  "type": "sensor_data",
  "source": "SIMULATOR",
  "timestamp": "2026-08-28T12:30:00Z",
  "data": {
    "mass_g": 325.4,
    "fluid_rate_g_min": 42.1,
    "heart_rate": 96,
    "spo2": 97,
    "red": 182,
    "green": 53,
    "blue": 42,
    "clear": 277,
    "accel_x": 0.02,
    "accel_y": 0.01,
    "accel_z": 1.01,
    "motion_level": 0.03,
    "temperature": 36.8,
    "measurement_quality": "GOOD",
    "sensor_health": {
      "load_cell": true,
      "max30102": true,
      "tcs34725": true,
      "mpu6050": true,
      "temp": true
    },
    "blood_fraction": 0.35
  }
}
```

### Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `mass_g` | `number` | Accumulated mass in grams measured by Load Cell + HX711 |
| `fluid_rate_g_min` | `number` | Rate of accumulation (grams / minute) calculated over moving window |
| `heart_rate` | `number \| null` | Maternal heart rate in BPM from MAX30102 |
| `spo2` | `number \| null` | Maternal blood oxygen percentage from MAX30102 |
| `red`, `green`, `blue`, `clear` | `number` | Raw optical readings from TCS34725 |
| `accel_x`, `accel_y`, `accel_z` | `number` | Acceleration in g from MPU6050 |
| `motion_level` | `number` | Calculated movement vector |
| `temperature` | `number` | Temperature reading (°C) |
| `measurement_quality` | `"GOOD" \| "UNRELIABLE" \| "ERROR"` | Quality indicator based on motion and hardware status |
| `sensor_health` | `object` | Health status flags for individual physical sensors |

---

## 2. Simulation Commands (`simulation_command`)

Sent by Web Simulator to backend to trigger preset clinical scenarios.

```json
{
  "type": "simulation_command",
  "command": "INCREASING_BLEEDING"
}
```

Supported Scenarios:
- `NORMAL`: Stable mass (100g), HR 75 bpm, SpO2 98%, low motion.
- `MILD_BLEEDING`: Mass slowly increases (~15 g/min), HR 88 bpm.
- `INCREASING_BLEEDING`: Mass increases (~45 g/min), HR 105 bpm, SpO2 96%.
- `SEVERE_BLEEDING`: Rapid increase (~90 g/min), HR 125 bpm, SpO2 93% (Triggers demo threshold alert).
- `MOVEMENT`: Introduces load-cell disturbances and high motion score (`measurement_quality: "UNRELIABLE"`).
- `RESET`: Resets mass to 0g and restores default normal vital signs.

---

## 3. Source Selection (`set_source`)

Sent by Web Control Panel to switch active backend data source.

```json
{
  "type": "set_source",
  "source": "ESP32"
}
```

Values: `"SIMULATOR"` | `"ESP32"`.

---

## 4. Load Cell Calibration Commands

### Tare (`tare_load_cell`)
```json
{
  "type": "tare_load_cell"
}
```

### Calibrate (`calibrate_load_cell`)
```json
{
  "type": "calibrate_load_cell",
  "known_weight_g": 500
}
```

---

## 5. Engineering Safety Notice

> **Biomedical Engineering Competition Prototype**: Not clinically validated. All simulated thresholds are marked with `DEMO SIMULATION THRESHOLD` label.
