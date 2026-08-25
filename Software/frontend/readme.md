# Smart PPH — Facility Companion App

Offline-first clinical viewer and logger for the **Smart PPH (Postpartum Hemorrhage) Detection Mat** designed for Primary Health Care Units (PHCUs) in Ethiopia.

The ESP32 smart mat owns autonomous green/yellow/red alarms even if the phone is dead. This app acts as the midwife's large-screen companion, session logger, emergency checklist guide, and offline-first DHIS2 facility sync bridge.

---

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run automated clinical & storage test suites
npm test

# Launch the app on Expo (Android / Web)
npm start
```

---

## 90-Second Judge Rehearsal Script (Demo Mode)

1. **Language Choice**: Tap **አማርኛ (Amharic)** or **English** on the entry screen.
2. **Ward View**: Select a delivery bed (e.g. `PPH-MAT-04 Delivery 1`).
3. **Connect**: Tap **Demo mode** $\rightarrow$ **Start monitoring** (Zero hardware flakiness).
4. **Live Monitoring (Arm's-Length Visibility)**:
   - Point out the **giant 98pt volume counter** and live **Shock Index** ($\text{HR} / \text{SBP}$).
   - Tap **`+100 mL`** twice $\rightarrow$ reaches $\ge 300\text{ mL} \rightarrow$ Screen turns **Yellow (Monitor closely / Prepare uterotonics)**.
5. **Critical Alert & Emergency Checklist**:
   - Tap **`+100 mL`** again or tap **`Raise SI (1.20)`** $\rightarrow$ Reaches critical thresholds.
   - Screen turns **Vibrant Red** and displays the **First-Line PPH Response Bundle**:
     - *Give uterotonic (Oxytocin / Misoprostol)*
     - *Uterine massage immediately*
     - *Call for emergency help*
     - *Establish large-bore IV access*
   - Tap checklist items to log actions.
6. **5-Minute Audio Mute**:
   - Tap **Mute 5 min** $\rightarrow$ Audio/vibration is silenced while the visual red alert stays active with a countdown timer.
7. **Fail-Safe Disconnect**:
   - Tap **Fail sensor** $\rightarrow$ App immediately triggers fail-safe red alert.
8. **Offline Logging & DHIS2 Sync**:
   - Tap **End session** $\rightarrow$ Session summary saves to local persistent storage.
   - Tap **View Sync Queue** $\rightarrow$ Show the queued records $\rightarrow$ Tap **Sync All to DHIS2** to simulate facility EMR upload.

---

## Hardware BLE Bridge Contract (For ESP32 Team)

When the hardware team powers on the load cell & ESP32 BLE transmitter:
- **Service UUID**: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **Characteristic UUID**: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- **1 Hz Stream Format**: `vol_ml, rate_15, hr, sbp, si, state, batt, seq, sensor_fail`
- **Parser**: Handled automatically by `src/services/bleParser.ts`.

---

## Test Suite Status

Run `npm test` to execute all 25 automated tests:
- `evaluateState.test.ts`: WHO PPH volume thresholds, Shock Index, and fail-safe triggers.
- `alarm.test.ts`: 5-minute mute logic, keep-awake lifecycle, and sound/vibration cadences.
- `sessionStore.test.ts`: Offline persistence, crash recovery, and DHIS2 sync queue.
- `bleParser.test.ts`: ESP32 JSON/CSV parsing and firmware mismatch detection.
