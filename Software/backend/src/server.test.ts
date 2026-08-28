import { describe, it, after } from "node:test";
import assert from "node:assert";
import WebSocket from "ws";
import { server, wss } from "./server.js";

const PORT = 3000;
const WS_URL = `ws://localhost:${PORT}/ws`;

describe("PPH Backend Server & Protocol Tests", () => {
  after(async () => {
    wss.clients.forEach((client) => client.close());
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("should receive initial system status and sensor_data on connection", async () => {
    const ws = new WebSocket(WS_URL);
    await new Promise<void>((resolve) => ws.on("open", resolve));

    let receivedStatus = false;
    let receivedSensorData = false;

    await new Promise<void>((resolve) => {
      ws.on("message", (data: Buffer) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === "system_status") {
          receivedStatus = true;
        }
        if (parsed.type === "sensor_data") {
          receivedSensorData = true;
          assert.equal(parsed.type, "sensor_data");
          assert.ok("mass_g" in parsed.data);
          assert.ok("fluid_rate_g_min" in parsed.data);
          assert.ok("heart_rate" in parsed.data);
          assert.ok("spo2" in parsed.data);
          assert.ok("red" in parsed.data);
          assert.ok("green" in parsed.data);
          assert.ok("blue" in parsed.data);
          assert.ok("clear" in parsed.data);
          assert.ok("accel_x" in parsed.data);
          assert.ok("accel_y" in parsed.data);
          assert.ok("accel_z" in parsed.data);
          assert.ok("motion_level" in parsed.data);
          assert.ok("measurement_quality" in parsed.data);
          assert.ok("sensor_health" in parsed.data);
        }
        if (receivedStatus && receivedSensorData) {
          ws.close();
          resolve();
        }
      });
    });
  });

  it("should change source when set_source command is sent", async () => {
    const ws = new WebSocket(WS_URL);
    await new Promise<void>((resolve) => ws.on("open", resolve));

    ws.send(JSON.stringify({ type: "set_source", source: "ESP32" }));

    await new Promise<void>((resolve) => {
      ws.on("message", (data: Buffer) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === "system_status" && parsed.source === "ESP32") {
          ws.send(JSON.stringify({ type: "set_source", source: "SIMULATOR" }));
          ws.close();
          resolve();
        }
      });
    });
  });

  it("should respond to simulation scenario command INCREASING_BLEEDING", async () => {
    const ws = new WebSocket(WS_URL);
    await new Promise<void>((resolve) => ws.on("open", resolve));

    ws.send(JSON.stringify({ type: "simulation_command", command: "INCREASING_BLEEDING" }));

    await new Promise<void>((resolve) => {
      ws.on("message", (data: Buffer) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === "sensor_data" && parsed.data.heart_rate === 105) {
          assert.equal(parsed.data.spo2, 96);
          ws.close();
          resolve();
        }
      });
    });
  });

  it("should respond to MOVEMENT command with UNRELIABLE quality score", async () => {
    const ws = new WebSocket(WS_URL);
    await new Promise<void>((resolve) => ws.on("open", resolve));

    ws.send(JSON.stringify({ type: "simulation_command", command: "MOVEMENT" }));

    await new Promise<void>((resolve) => {
      ws.on("message", (data: Buffer) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === "sensor_data" && parsed.data.measurement_quality === "UNRELIABLE") {
          ws.close();
          resolve();
        }
      });
    });
  });

  it("should reset parameters when RESET command is sent", async () => {
    const ws = new WebSocket(WS_URL);
    await new Promise<void>((resolve) => ws.on("open", resolve));

    ws.send(JSON.stringify({ type: "simulation_command", command: "RESET" }));

    await new Promise<void>((resolve) => {
      ws.on("message", (data: Buffer) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === "sensor_data" && parsed.data.mass_g === 0) {
          assert.equal(parsed.data.heart_rate, 75);
          assert.equal(parsed.data.measurement_quality, "GOOD");
          ws.close();
          resolve();
        }
      });
    });
  });
});
