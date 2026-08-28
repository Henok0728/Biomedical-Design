import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import WebSocket from "ws";
import { server } from "./server.js";

const PORT = 3000;
const WS_URL = `ws://localhost:${PORT}/ws`;

describe("PPH Backend Server & Protocol Tests", () => {
  let ws: WebSocket;

  before((done) => {
    // Wait for server to start if needed
    setTimeout(() => {
      ws = new WebSocket(WS_URL);
      ws.on("open", () => done());
    }, 500);
  });

  after(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    server.close();
  });

  it("should receive initial system status and sensor_data on connection", (done) => {
    let receivedStatus = false;
    let receivedSensorData = false;

    const messageHandler = (data: Buffer) => {
      const parsed = JSON.parse(data.toString());

      if (parsed.type === "system_status") {
        receivedStatus = true;
        assert.equal(typeof parsed.source, "string");
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
        assert.ok("temperature" in parsed.data);
        assert.ok("measurement_quality" in parsed.data);
        assert.ok("sensor_health" in parsed.data);
      }

      if (receivedStatus && receivedSensorData) {
        ws.off("message", messageHandler);
        done();
      }
    };

    ws.on("message", messageHandler);
  });

  it("should change source when set_source command is sent", (done) => {
    const handler = (data: Buffer) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === "system_status" && parsed.source === "ESP32") {
        ws.off("message", handler);
        // Switch back to SIMULATOR
        ws.send(JSON.stringify({ type: "set_source", source: "SIMULATOR" }));
        done();
      }
    };

    ws.on("message", handler);
    ws.send(JSON.stringify({ type: "set_source", source: "ESP32" }));
  });

  it("should respond to simulation scenario command INCREASING_BLEEDING", (done) => {
    const handler = (data: Buffer) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === "sensor_data") {
        ws.off("message", handler);
        assert.equal(parsed.data.heart_rate, 105);
        assert.equal(parsed.data.spo2, 96);
        done();
      }
    };

    ws.on("message", handler);
    ws.send(JSON.stringify({ type: "simulation_command", command: "INCREASING_BLEEDING" }));
  });

  it("should respond to MOVEMENT command with UNRELIABLE quality score", (done) => {
    const handler = (data: Buffer) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === "sensor_data") {
        ws.off("message", handler);
        assert.equal(parsed.data.measurement_quality, "UNRELIABLE");
        done();
      }
    };

    ws.on("message", handler);
    ws.send(JSON.stringify({ type: "simulation_command", command: "MOVEMENT" }));
  });

  it("should reset parameters when RESET command is sent", (done) => {
    const handler = (data: Buffer) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === "sensor_data") {
        ws.off("message", handler);
        assert.equal(parsed.data.mass_g, 0);
        assert.equal(parsed.data.heart_rate, 75);
        assert.equal(parsed.data.measurement_quality, "GOOD");
        done();
      }
    };

    ws.on("message", handler);
    ws.send(JSON.stringify({ type: "simulation_command", command: "RESET" }));
  });
});
