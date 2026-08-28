# Smart PPH — Facility Companion App

Offline-first clinical viewer and logger for the Smart PPH Detection Mat (Ethiopia PHCUs).

The ESP32 mat still alarms if the phone is dead. This app is the midwife display, session log, and later DHIS2 handoff.

## Quick start

```bash
npm install
npm test
npm start
```

## 90-second judge script (use this today)

**If the ESP32 is not serving Wi-Fi:** Demo mode. Say it: *the mat alarms without the phone; this is the nearby display.*

1. Language → አማርኛ or English.
2. Ward → `PPH-MAT-04`.
3. **Demo mode (no hardware)** → Start monitoring.
4. **+100 mL** twice → yellow (≥300 mL). *Monitor closely. Prepare uterotonics.*
5. **+100 mL** again (or Raise SI) → red + PPH bundle. Mute 5 min: sound off, **red stays**.
6. **Fail sensor** → fail-safe red.
7. End session → summary → sync queue.

Do not tell judges the PCB measures Shock Index. There is no BP cuff. Demo SI is simulated. Hardware alerts are **volume (HX711)**.

**If hardware is flashed** with `firmware/esp32_softap_reading.ino` (or any firmware that answers `GET /reading`):

1. Phone Wi-Fi: **PPH-MAT-04** / **pphmat04** (not campus Wi-Fi).
2. Connect → **Connect Wi-Fi mat** → `192.168.4.1`.
3. Pour / load-cell, or from a laptop on the same AP: `http://192.168.4.1/add?ml=100`.
4. Leave the AP → ~3 missed polls → fail-safe red.

JSON: `vol_ml, rate_15, hr, sbp, si, batt, seq, sensor_fail` (`hr`/`sbp` may be null).

v1 link is **Wi-Fi SoftAP** (one phone, one mat). Many mats = phone hotspot later. BLE is the same ESP32, later.
