# Postpartum Hemorrhage (PPH) Monitoring & Control System

Biomedical Engineering Competition Prototype for Real-Time Postpartum Hemorrhage Detection and Simulation.

---

## 1. System Architecture Overview

```text
                     ┌───────────────────┐
                     │   Web Simulator   │
                     │  Control Panel    │
                     │  (Browser GUI)    │
                     └─────────┬─────────┘
                               │
                               │ WebSocket
                               ▼
                     ┌───────────────────┐
                     │  Node.js Backend  │
                     │                   │
                     │ Single Source of  │
                     │ Truth / Router    │
                     └─────────┬─────────┘
                               │
                               │ WebSocket
                               ▼
                     ┌───────────────────┐
                     │ React Native App  │
                     │ (Android / Expo)  │
                     └─────────┬─────────┘

HARDWARE SENSORS (PHYSICAL ESP32 OR PYTHON HARDWARE SIMULATOR):
Load Cell (HX711) ──┐
MAX30102 ───────────┤
TCS34725 ───────────┤
MPU6050 ────────────┤→ ESP32 (Wi-Fi) / Python Simulator ──► Node.js Backend ──► Mobile App
```

The system seamlessly supports **TWO sensor sources**:
1. **Source A — ESP32 Hardware (Physical PCB or Python Simulator)**: Physical ESP32 hardware or lightweight Python ESP32 simulator (`Hardware/hardware_simulator.py`).
2. **Source B — Web Simulator**: Browser control console for live competition scenario presentations.

The backend normalizes both sources into the exact same unified `sensor_data` protocol format so the mobile app requires zero changes when toggling sources.

---

## 2. Python ESP32 Hardware Simulator (`hardware_simulator.py`)

If physical hardware PCB is unavailable, run the Python Hardware Simulator:
```bash
python Hardware/hardware_simulator.py ws://localhost:3000/ws
```
This script:
- Connects directly to the backend over WebSocket as `source = "ESP32"`.
- Streams 1 Hz realistic sensor updates (Mass, Rate, Pulse Oximeter HR/SpO2, TCS34725 RGB, MPU6050 Motion Score).
- Serves an embedded **Web Control Panel** at `http://localhost:5000` (accessible from laptop or phone).
- Provides an **Interactive Terminal CLI** menu for instant scenario triggers.

---

## 3. Hardware Pinout (KiCad Schematic Mapping)

| Component | Function / Pin | ESP32 GPIO |
|-----------|----------------|------------|
| **Load Cell + HX711** | DOUT (Data) | **GPIO 32** |
| | SCK (Clock) | **GPIO 33** |
| **I²C Bus (Shared)** | SDA (Serial Data) | **GPIO 21** |
| | SCL (Serial Clock) | **GPIO 22** |
| **MAX30102** | Pulse Oximeter & HR | Shared I²C (GPIO 21 / GPIO 22) |
| **TCS34725** | Optical RGB Characterization | Shared I²C (GPIO 21 / GPIO 22) |
| **MPU6050** | Motion & Accelerometer | Shared I²C (GPIO 21 / GPIO 22) |

---

## 4. Quick Start & Execution Commands

### Step A: Start Node.js Backend
```bash
cd Software/backend
npm install
npm run dev
```
* Backend API: `http://localhost:3000`
* WebSocket: `ws://localhost:3000/ws`

### Step B: Run Python Hardware Simulator OR Web Simulator
```bash
# Option 1: Python ESP32 Hardware Simulator (Web console at http://localhost:5000)
python Hardware/hardware_simulator.py ws://localhost:3000/ws

# Option 2: Web Simulator Console (Browser panel at http://localhost:8080)
npx serve pph-monitor/simulator -p 8080
```

### Step C: Launch React Native Android App
```bash
cd Software/frontend
npm install
npm run android
```
In the app:
1. Open **Connect Screen**.
2. Set Backend WS URL to your laptop's local Wi-Fi IP (e.g. `ws://192.168.1.100:3000/ws`).
3. Tap **Save & Connect** -> **Start Live Monitoring Session**.

---

## 5. Competition Demonstration Workflow

1. **Launch Systems**: Start Node Backend, Python Simulator, and Android App.
2. **Verify Connection**:
   - Android App displays `● BACKEND CONNECTED` and `SOURCE: ESP32`.
3. **Trigger Scenarios via Web UI (`http://localhost:5000`) or Terminal CLI**:
   - **`1` (NORMAL)**: Stable 100g mass, HR 75 bpm, normal trend.
   - **`3` (INCREASING BLEEDING)**: Mass and fluid rate increase progressively (+45 g/min), heart rate rises to 105 bpm. Live graphs update immediately on Android dashboard.
   - **`5` (MOVEMENT)**: High motion score triggers motion warning banner: `⚠️ MOTION: HIGH · MEASUREMENT QUALITY: UNRELIABLE`.
   - **`7` (RESET)**: Resets mass accumulation to zero.

---

## 6. Engineering & Safety Notice

> **Biomedical Engineering Competition Prototype**: Not clinically validated. All simulated thresholds are marked with `DEMO SIMULATION THRESHOLD` labels in compliance with biomedical engineering standards.