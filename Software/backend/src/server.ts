import http from "http";
import express, { Request, Response } from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import {
  IncomingBackendMessage,
  NormalizedSensorMessage,
  ScenarioType,
  SensorDataPayload,
  SensorSource,
  SystemStatusMessage
} from "./protocol.js";
import { SimulatorEngine } from "./simulatorEngine.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const simulator = new SimulatorEngine();

let currentSource: SensorSource = "SIMULATOR";
let esp32Data: SensorDataPayload | null = null;
let lastEsp32Seen = 0;
let calibrationFactor = 1.0;

// Returns current normalized sensor data based on selected source
function getLatestNormalizedData(): SensorDataPayload {
  if (currentSource === "ESP32" && esp32Data && (Date.now() - lastEsp32Seen < 10000)) {
    return esp32Data;
  }
  // Fall back to simulator if ESP32 source selected but no recent data
  return simulator.tick(1.0);
}

// Broadcast message to all connected WebSocket clients
function broadcast(msg: NormalizedSensorMessage | SystemStatusMessage): void {
  const json = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

// 1 Hz Periodic Broadcast Loop
setInterval(() => {
  const data = getLatestNormalizedData();
  const packet: NormalizedSensorMessage = {
    type: "sensor_data",
    source: currentSource,
    timestamp: new Date().toISOString(),
    data
  };
  broadcast(packet);
}, 1000);

// WebSocket Handler
wss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
  console.log(`[WS] Client connected from ${req.socket.remoteAddress}`);

  // Send initial system status & current data upon connection
  const statusMsg: SystemStatusMessage = {
    type: "system_status",
    source: currentSource,
    activeScenario: simulator.getActiveScenario(),
    connectedClients: wss.clients.size,
    calibrationFactor
  };
  ws.send(JSON.stringify(statusMsg));

  const initDataPacket: NormalizedSensorMessage = {
    type: "sensor_data",
    source: currentSource,
    timestamp: new Date().toISOString(),
    data: getLatestNormalizedData()
  };
  ws.send(JSON.stringify(initDataPacket));

  ws.on("message", (raw: string | Buffer) => {
    try {
      const msg: IncomingBackendMessage = JSON.parse(raw.toString());

      if (msg.type === "set_source") {
        currentSource = msg.source;
        console.log(`[WS] Source changed to: ${currentSource}`);
        broadcastStatus();
      } else if (msg.type === "simulation_command") {
        simulator.setScenario(msg.command);
        console.log(`[WS] Scenario changed to: ${msg.command}`);
        broadcastStatus();
      } else if (msg.type === "simulation_update") {
        simulator.updateManualData(msg.data);
      } else if (msg.type === "sensor_data" && msg.source === "ESP32") {
        esp32Data = msg.data;
        lastEsp32Seen = Date.now();
        if (currentSource === "ESP32") {
          // Immediately broadcast hardware updates
          const packet: NormalizedSensorMessage = {
            type: "sensor_data",
            source: "ESP32",
            timestamp: new Date().toISOString(),
            data: msg.data
          };
          broadcast(packet);
        }
      } else if (msg.type === "tare_load_cell") {
        console.log("[WS] Load cell tare requested");
        simulator.resetHistory();
      } else if (msg.type === "calibrate_load_cell") {
        if (msg.known_weight_g > 0) {
          calibrationFactor = msg.known_weight_g / 500;
          console.log(`[WS] Calibrated factor set to ${calibrationFactor}`);
        }
      }
    } catch (err) {
      console.error("[WS] Error parsing client message:", err);
    }
  });

  ws.on("close", () => {
    console.log(`[WS] Client disconnected. Active clients: ${wss.clients.size}`);
  });
});

function broadcastStatus() {
  const statusMsg: SystemStatusMessage = {
    type: "system_status",
    source: currentSource,
    activeScenario: simulator.getActiveScenario(),
    connectedClients: wss.clients.size,
    calibrationFactor
  };
  broadcast(statusMsg);
}

// HTTP REST Endpoints
app.get("/api/status", (_req: Request, res: Response) => {
  res.json({
    status: "OK",
    source: currentSource,
    activeScenario: simulator.getActiveScenario(),
    connectedClients: wss.clients.size,
    calibrationFactor,
    esp32Active: Date.now() - lastEsp32Seen < 10000,
    latestData: getLatestNormalizedData()
  });
});

app.post("/api/source", (req: Request, res: Response) => {
  const { source } = req.body;
  if (source === "SIMULATOR" || source === "ESP32") {
    currentSource = source;
    broadcastStatus();
    res.json({ success: true, source: currentSource });
  } else {
    res.status(400).json({ error: "Invalid source. Must be SIMULATOR or ESP32." });
  }
});

app.post("/api/scenario", (req: Request, res: Response) => {
  const { command } = req.body as { command: ScenarioType };
  const validScenarios: ScenarioType[] = [
    "NORMAL",
    "MILD_BLEEDING",
    "INCREASING_BLEEDING",
    "SEVERE_BLEEDING",
    "MOVEMENT",
    "RESET"
  ];
  if (validScenarios.includes(command)) {
    const data = simulator.setScenario(command);
    broadcastStatus();
    res.json({ success: true, activeScenario: command, data });
  } else {
    res.status(400).json({ error: "Invalid scenario command." });
  }
});

app.post("/api/update", (req: Request, res: Response) => {
  const data = simulator.updateManualData(req.body);
  res.json({ success: true, data });
});

app.post("/api/tare", (_req: Request, res: Response) => {
  simulator.resetHistory();
  res.json({ success: true, message: "Load cell tared" });
});

app.post("/api/calibrate", (req: Request, res: Response) => {
  const { known_weight_g } = req.body;
  if (known_weight_g && known_weight_g > 0) {
    calibrationFactor = known_weight_g / 500;
    res.json({ success: true, calibrationFactor });
  } else {
    res.status(400).json({ error: "Invalid known_weight_g" });
  }
});

// Start Server
server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` PPH Monitoring Backend Server Running`);
  console.log(` HTTP API: http://localhost:${PORT}`);
  console.log(` WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`===================================================`);
});

export { app, server, simulator };
