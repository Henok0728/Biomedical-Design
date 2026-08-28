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
                     └───────────────────┘

REAL HARDWARE PATH:
Load Cell (HX711) ──┐
MAX30102 ───────────┤
TCS34725 ───────────┤
MPU6050 ────────────┤→ ESP32 (Wi-Fi) ──► Node.js Backend ──► React Native App
```

The system seamlessly supports **TWO sensor sources**:
1. **Source A — Real ESP32 Hardware**: Physical sensors connected via Wi-Fi.
2. **Source B — Web Simulator**: Browser control console for live competition scenario presentations.

The backend normalizes both sources into the exact same unified `sensor_data` protocol format so the mobile app requires zero changes when toggling sources.

---

## 2. Hardware Pinout (KiCad Schematic Mapping)

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

## 3. Quick Start & Execution Commands

### Prerequisites
- Node.js (v18+ or v20+)
- PlatformIO (for ESP32 firmware)
- Expo CLI / React Native environment

### Step A: Start Node.js Backend
```bash
cd Software/backend
npm install
npm run dev
```
* Backend API: `http://localhost:3000`
* WebSocket: `ws://localhost:3000/ws`

### Step B: Launch Web Simulator
Open `pph-monitor/simulator/index.html` directly in any web browser, or serve using:
```bash
npx serve pph-monitor/simulator -p 8080
```
Or via Docker:
```bash
docker-compose up --build
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

## 4. Competition Demonstration Workflow

1. **Launch Systems**: Start Node Backend, Web Simulator, and Android App.
2. **Verify Connection**:
   - Android App displays `● BACKEND CONNECTED` and `SOURCE: SIMULATOR`.
3. **Trigger Scenarios on Web Simulator**:
   - **`NORMAL`**: Stable 100g mass, HR 75 bpm, normal trend.
   - **`INCREASING BLEEDING`**: Mass and fluid rate increase progressively (+45 g/min), heart rate rises to 105 bpm. Live graphs update immediately on Android dashboard.
   - **`MOVEMENT`**: High motion score triggers motion warning banner: `⚠️ MOTION: HIGH · MEASUREMENT QUALITY: UNRELIABLE`.
   - **`RESET`**: Resets mass accumulation to zero.
4. **Hardware Switch**:
   - Disconnect simulator or tap `[ ESP32 HARDWARE ]` on Web Simulator.
   - ESP32 connects over Wi-Fi and streams live physical sensor data to backend. Android app updates seamlessly without needing restart.

---

## 5. Engineering & Safety Notice

> **Biomedical Engineering Competition Prototype**: Not clinically validated. All simulated thresholds are marked with `DEMO SIMULATION THRESHOLD` labels in compliance with biomedical engineering standards.