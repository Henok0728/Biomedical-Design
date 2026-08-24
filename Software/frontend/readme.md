# Smart PPH — facility Android app

Offline-first companion for the Smart PPH Detection mat (ESP32). The mat still alarms if the phone is dead. This app is the nearby display, session log, and later DHIS2 handoff.

## Phases in this folder

1. **Shell** — navigation through Language → Ward → Connect → Session → Live → Critical → Summary → Sync → Settings
2. **Clinical brain** — `src/clinical/evaluateState.ts` (volume + Shock Index + fail-safe)
3. **Simulator** — Demo mode streams 1 Hz readings so you can demo without BLE

BLE to the real ESP32 is **Phase 6**. Use **Demo mode**.

## Run

```bash
npm start
```

Then open Android (Expo Go is fine for Demo mode; BLE later needs a dev build).

```bash
npm test
```

Runs the threshold tests (200 mL green, 350 yellow, 500 / SI 1.0 / sensor fail red).

## Demo path

1. Amharic or English
2. Tap a mat → **Demo mode** → **Start monitoring**
3. **Add 100 mL** until yellow (~300) then red (~500), or **Raise SI**
4. Critical full screen → Acknowledge (color stays on Live)
5. **Fail sensor** = fail-safe red
6. End session → sync stub
