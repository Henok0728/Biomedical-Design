#!/usr/bin/env python3
"""
Python ESP32 Biomedical Hardware Simulator for PPH Monitoring
Simulates physical ESP32 sending real-time sensor packets over WebSocket to the Node.js backend.
Includes both an Interactive Terminal CLI and a Web Control Panel on http://localhost:5000
"""

import asyncio
import json
import math
import os
import sys
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import websockets

BACKEND_WS_URL = os.environ.get("BACKEND_WS_URL", "ws://localhost:3000/ws")
HTTP_PORT = int(os.environ.get("HTTP_PORT", 5000))

# Global Hardware Simulator State
class HardwareState:
    def __init__(self):
        self.mass_g = 100.0
        self.manual_rate_g_min = None
        self.heart_rate = 75
        self.spo2 = 98
        self.accel_x = 0.01
        self.accel_y = 0.02
        self.accel_z = 1.0
        self.motion_level = 0.02
        self.blood_fraction = 0.15
        self.has_load_cell = True
        self.has_max30102 = True
        self.has_tcs34725 = True
        self.has_mpu6050 = True
        self.active_scenario = "NORMAL"
        self.mass_history = []
        self.reset_history()

    def reset_history(self):
        now = time.time()
        self.mass_history = [
            (now - 60, self.mass_g),
            (now, self.mass_g)
        ]

    def set_scenario(self, scenario):
        self.active_scenario = scenario
        self.manual_rate_g_min = None
        if scenario == "NORMAL":
            self.mass_g = 100.0
            self.heart_rate = 75
            self.spo2 = 98
            self.motion_level = 0.02
            self.accel_x = 0.01
            self.accel_y = 0.02
            self.accel_z = 1.0
            self.blood_fraction = 0.15
            self.has_max30102 = True
            self.has_load_cell = True

        elif scenario == "MILD_BLEEDING":
            self.heart_rate = 88
            self.spo2 = 97
            self.motion_level = 0.04
            self.blood_fraction = 0.35

        elif scenario == "INCREASING_BLEEDING":
            self.heart_rate = 105
            self.spo2 = 96
            self.motion_level = 0.05
            self.blood_fraction = 0.60

        elif scenario == "SEVERE_BLEEDING":
            self.heart_rate = 128
            self.spo2 = 92
            self.motion_level = 0.06
            self.blood_fraction = 0.85

        elif scenario == "MOVEMENT":
            self.motion_level = 0.88
            self.accel_x = 0.48
            self.accel_y = -0.36
            self.accel_z = 1.65

        elif scenario == "SENSOR_FAIL":
            self.has_max30102 = False
            self.heart_rate = None
            self.spo2 = None

        elif scenario == "RESET":
            self.active_scenario = "NORMAL"
            self.mass_g = 0.0
            self.heart_rate = 75
            self.spo2 = 98
            self.motion_level = 0.02
            self.blood_fraction = 0.15
            self.has_max30102 = True
            self.has_load_cell = True
            self.reset_history()

    def tick(self, delta_sec=1.0):
        # Bleeding rate progression
        increment = 0.0
        if self.active_scenario == "MILD_BLEEDING":
            increment = 0.25 * delta_sec # ~15 g/min
        elif self.active_scenario == "INCREASING_BLEEDING":
            increment = 0.75 * delta_sec # ~45 g/min
        elif self.active_scenario == "SEVERE_BLEEDING":
            increment = 1.50 * delta_sec # ~90 g/min

        if self.active_scenario == "MOVEMENT":
            import random
            noise = (random.random() - 0.5) * 3.5
            self.mass_g = max(0.0, self.mass_g + noise)
        else:
            self.mass_g += increment

        now = time.time()
        self.mass_history.append((now, self.mass_g))
        # Keep last 60 seconds
        cutoff = now - 60
        self.mass_history = [h for h in self.mass_history if h[0] >= cutoff]

        # Calculate rate (g/min)
        calculated_rate = 0.0
        if len(self.mass_history) >= 2:
            oldest = self.mass_history[0]
            newest = self.mass_history[-1]
            elapsed_min = (newest[0] - oldest[0]) / 60.0
            if elapsed_min > 0.05:
                calculated_rate = max(0.0, (newest[1] - oldest[1]) / elapsed_min)

        fluid_rate = self.manual_rate_g_min if self.manual_rate_g_min is not None else round(calculated_rate, 1)

        # Derived optical RGB
        bf = min(1.0, max(0.0, self.blood_fraction))
        red = int(120 + bf * 135)
        green = int(180 - bf * 130)
        blue = int(160 - bf * 120)
        clear = red + green + blue

        quality = "UNRELIABLE" if self.motion_level > 0.4 else "GOOD"
        if not self.has_load_cell:
            quality = "ERROR"

        return {
            "type": "sensor_data",
            "source": "ESP32",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "data": {
                "mass_g": round(self.mass_g, 1),
                "fluid_rate_g_min": round(fluid_rate, 1),
                "heart_rate": self.heart_rate if self.has_max30102 else None,
                "spo2": self.spo2 if self.has_max30102 else None,
                "red": red,
                "green": green,
                "blue": blue,
                "clear": clear,
                "accel_x": round(self.accel_x, 2),
                "accel_y": round(self.accel_y, 2),
                "accel_z": round(self.accel_z, 2),
                "motion_level": round(self.motion_level, 2),
                "measurement_quality": quality,
                "sensor_health": {
                    "load_cell": self.has_load_cell,
                    "max30102": self.has_max30102,
                    "tcs34725": self.has_tcs34725,
                    "mpu6050": self.has_mpu6050
                },
                "blood_fraction": round(bf, 2)
            }
        }

state = HardwareState()

# Embedded Web UI for Smartphone / Browser Control
HTML_PAGE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ESP32 Python Hardware Simulator</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 16px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { font-size: 20px; color: #38bdf8; margin-bottom: 4px; }
    p { font-size: 13px; color: #94a3b8; margin-top: 0; }
    .btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    button { background: #1e293b; border: 1px solid #334155; color: #fff; padding: 14px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; text-align: left; }
    button:active { background: #38bdf8; color: #000; }
    .btn-norm { border-left: 4px solid #10b981; }
    .btn-mild { border-left: 4px solid #f59e0b; }
    .btn-inc { border-left: 4px solid #f97316; }
    .btn-sev { border-left: 4px solid #ef4444; }
    .btn-mov { border-left: 4px solid #a855f7; }
    .btn-reset { border-left: 4px solid #64748b; }
    .slider-card { background: #1e293b; padding: 14px; border-radius: 12px; margin-bottom: 12px; border: 1px solid #334155; }
    label { font-size: 12px; color: #94a3b8; display: block; margin-bottom: 6px; }
    input[type=range] { width: 100%; }
    .val { color: #38bdf8; font-weight: bold; float: right; }
    .readout { background: #0284c7; padding: 12px; border-radius: 10px; font-family: monospace; font-size: 13px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📡 ESP32 Hardware Simulator</h1>
    <p>Simulating real physical ESP32 sensor output streaming live to phone & backend.</p>

    <div class="btn-grid">
      <button class="btn-norm" onclick="sendCmd('NORMAL')">🟢 NORMAL<br><small>100g, HR 75</small></button>
      <button class="btn-mild" onclick="sendCmd('MILD_BLEEDING')">🟡 MILD BLEEDING<br><small>+15 g/min</small></button>
      <button class="btn-inc" onclick="sendCmd('INCREASING_BLEEDING')">🟠 INCREASING BLEEDING<br><small>+45 g/min</small></button>
      <button class="btn-sev" onclick="sendCmd('SEVERE_BLEEDING')">🔴 SEVERE BLEEDING<br><small>+90 g/min, HR 128</small></button>
      <button class="btn-mov" onclick="sendCmd('MOVEMENT')">⚠️ PATIENT MOVEMENT<br><small>High motion score</small></button>
      <button class="btn-reset" onclick="sendCmd('RESET')">🔄 RESET<br><small>Zero mass</small></button>
    </div>

    <div class="slider-card">
      <label>Mass: <span class="val" id="massLabel">100 g</span></label>
      <input type="range" id="massSlider" min="0" max="2000" step="5" value="100" oninput="updateSliders()">
    </div>

    <div class="slider-card">
      <label>Heart Rate: <span class="val" id="hrLabel">75 bpm</span></label>
      <input type="range" id="hrSlider" min="40" max="180" value="75" oninput="updateSliders()">
    </div>

    <div class="slider-card">
      <label>SpO₂: <span class="val" id="spo2Label">98 %</span></label>
      <input type="range" id="spo2Slider" min="70" max="100" value="98" oninput="updateSliders()">
    </div>

    <div class="readout" id="readout">Streaming ESP32 sensor data...</div>
  </div>

  <script>
    function sendCmd(cmd) {
      fetch('/api/scenario?cmd=' + cmd, { method: 'POST' });
    }
    function updateSliders() {
      const mass = document.getElementById('massSlider').value;
      const hr = document.getElementById('hrSlider').value;
      const spo2 = document.getElementById('spo2Slider').value;
      document.getElementById('massLabel').textContent = mass + ' g';
      document.getElementById('hrLabel').textContent = hr + ' bpm';
      document.getElementById('spo2Label').textContent = spo2 + ' %';
      fetch('/api/update?mass=' + mass + '&hr=' + hr + '&spo2=' + spo2, { method: 'POST' });
    }
    setInterval(async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        document.getElementById('readout').textContent = 'Mass: ' + data.mass_g + 'g | HR: ' + (data.heart_rate||'--') + ' | SpO2: ' + (data.spo2||'--') + '% | Quality: ' + data.measurement_quality;
      } catch(e){}
    }, 1000);
  </script>
</body>
</html>
"""

class WebHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return # Suppress HTTP logs in console

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(HTML_PAGE.encode('utf-8'))
        elif self.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            packet = state.tick(0)
            self.wfile.write(json.dumps(packet["data"]).encode('utf-8'))
        else:
            self.send_error(404)

    def do_POST(self):
        if "/api/scenario" in self.path:
            cmd = self.path.split("cmd=")[-1] if "cmd=" in self.path else "NORMAL"
            state.set_scenario(cmd)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"success":true}')
        elif "/api/update" in self.path:
            try:
                params = self.path.split("?")[-1].split("&")
                for p in params:
                    k, v = p.split("=")
                    if k == "mass": state.mass_g = float(v)
                    if k == "hr": state.heart_rate = int(v)
                    if k == "spo2": state.spo2 = int(v)
            except Exception:
                pass
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"success":true}')
        else:
            self.send_error(404)

def start_http_server():
    server = HTTPServer(('0.0.0.0', HTTP_PORT), WebHandler)
    print(f"🌐 ESP32 Python Control Console running at: http://localhost:{HTTP_PORT}")
    server.serve_forever()

async def ws_loop():
    url = sys.argv[1] if len(sys.argv) > 1 else BACKEND_WS_URL
    print(f"📡 Connecting Python ESP32 Simulator to Backend: {url}")
    while True:
        try:
            async with websockets.connect(url) as ws:
                print("✅ Connected to Backend WebSocket! Registering source as ESP32...")
                # Automatically switch backend active source to ESP32
                await ws.send(json.dumps({"type": "set_source", "source": "ESP32"}))

                while True:
                    packet = state.tick(1.0)
                    await ws.send(json.dumps(packet))
                    print(f"  [ESP32 -> Backend] Mass: {packet['data']['mass_g']}g | Rate: {packet['data']['fluid_rate_g_min']}g/min | HR: {packet['data']['heart_rate']} | SpO2: {packet['data']['spo2']} | Quality: {packet['data']['measurement_quality']}")
                    await asyncio.sleep(1.0)
        except Exception as e:
            print(f"⚠️ Connection lost ({e}). Reconnecting in 3s...")
            await asyncio.sleep(3.0)

def terminal_cli():
    time.sleep(1.5)
    print("\n=======================================================")
    print("      PPH PYTHON ESP32 HARDWARE SIMULATOR CLI          ")
    print("=======================================================")
    print("  1: Set NORMAL scenario")
    print("  2: Set MILD BLEEDING (+15 g/min)")
    print("  3: Set INCREASING BLEEDING (+45 g/min)")
    print("  4: Set SEVERE BLEEDING (+90 g/min)")
    print("  5: Set PATIENT MOVEMENT / HIGH MOTION")
    print("  6: Set SENSOR FAILURE (MAX30102 disconnect)")
    print("  7: RESET to 0g mass")
    print("  q: Quit")
    print("=======================================================\n")
    while True:
        try:
            choice = input("Enter choice (1-7): ").strip()
            if choice == "1": state.set_scenario("NORMAL")
            elif choice == "2": state.set_scenario("MILD_BLEEDING")
            elif choice == "3": state.set_scenario("INCREASING_BLEEDING")
            elif choice == "4": state.set_scenario("SEVERE_BLEEDING")
            elif choice == "5": state.set_scenario("MOVEMENT")
            elif choice == "6": state.set_scenario("SENSOR_FAIL")
            elif choice == "7": state.set_scenario("RESET")
            elif choice.lower() == "q": sys.exit(0)
        except Exception:
            break

if __name__ == "__main__":
    t_http = threading.Thread(target=start_http_server, daemon=True)
    t_http.start()

    t_cli = threading.Thread(target=terminal_cli, daemon=True)
    t_cli.start()

    try:
        asyncio.run(ws_loop())
    except KeyboardInterrupt:
        print("\nExiting ESP32 Simulator.")
