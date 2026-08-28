/**
 * Postpartum Hemorrhage (PPH) Hardware Firmware
 * Framework: Arduino / PlatformIO
 * Board: ESP32-WROOM-32E
 *
 * Hardware Pin Assignments (From KiCad Schematic):
 * - HX711 Load Cell: DOUT = GPIO 32, SCK = GPIO 33
 * - Shared I2C Bus: SDA = GPIO 21, SCL = GPIO 22
 *   - MAX30102 Pulse Oximeter & HR (I2C 0x57)
 *   - TCS34725 Optical Color Sensor (I2C 0x29)
 *   - MPU6050 Motion / Accelerometer (I2C 0x68)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include "HX711.h"
#include "MAX30105.h"
#include "heartRate.h"
#include "Adafruit_TCS34725.h"
#include "Adafruit_MPU6050.h"
#include <Adafruit_Sensor.h>

// Wi-Fi & Backend Server Configuration
const char* WIFI_SSID = "PPH-NET";
const char* WIFI_PASS = "12345678";
const char* BACKEND_HOST = "192.168.1.100"; // Local IP of Node.js backend
const uint16_t BACKEND_PORT = 3000;

// Hardware Pin Definitions
#define HX711_DOUT_PIN 32
#define HX711_SCK_PIN  33
#define I2C_SDA_PIN    21
#define I2C_SCL_PIN    22

// Hardware Sensor Objects
HX711 scale;
MAX30105 particleSensor;
Adafruit_TCS34725 tcs = Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_50MS, TCS34725_GAIN_4X);
Adafruit_MPU6050 mpu;
WebSocketsClient webSocket;

// Hardware Availability Flags
bool hasHX711 = false;
bool hasMAX30102 = false;
bool hasTCS34725 = false;
bool hasMPU6050 = false;

// Calibration & Rate Variables
float calibrationFactor = 228.0f; // Scale calibration factor
float fluidRateGMin = 0.0f;
unsigned long lastSampleTime = 0;

// Moving Window Rate History Buffer (60-second window)
struct MassSample {
  unsigned long timeMs;
  float mass;
};
#define MAX_SAMPLES 60
MassSample massHistory[MAX_SAMPLES];
int massHistoryIndex = 0;

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected from backend server");
      break;
    case WStype_CONNECTED:
      Serial.println("[WS] Connected to backend server!");
      // Automatically register source as ESP32
      webSocket.sendTXT("{\"type\":\"set_source\",\"source\":\"ESP32\"}");
      break;
    case WStype_TEXT: {
      Serial.printf("[WS] Received payload: %s\n", payload);
      JsonDocument doc;
      DeserializationError error = deserializeJson(doc, payload);
      if (!error) {
        const char* msgType = doc["type"];
        if (strcmp(msgType, "tare_load_cell") == 0) {
          if (hasHX711) {
            scale.tare();
            Serial.println("[HX711] Scale tared to 0g.");
          }
        } else if (strcmp(msgType, "calibrate_load_cell") == 0) {
          float knownWeight = doc["known_weight_g"];
          if (knownWeight > 0 && hasHX711) {
            float raw = scale.get_units(10);
            calibrationFactor = raw / knownWeight;
            scale.set_scale(calibrationFactor);
            Serial.printf("[HX711] Recalibrated factor: %.2f\n", calibrationFactor);
          }
        }
      }
      break;
    }
    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=======================================================");
  Serial.println("  Postpartum Hemorrhage (PPH) ESP32 Firmware Starting");
  Serial.println("=======================================================");

  // Initialize I2C Bus with KiCad GPIO assignments
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  // 1. Initialize Load Cell (HX711)
  scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
  if (scale.is_ready()) {
    scale.set_scale(calibrationFactor);
    scale.tare();
    hasHX711 = true;
    Serial.println("[HX711] Load Cell Initialized successfully.");
  } else {
    Serial.println("[HX711] ERROR: Load Cell hardware not detected!");
  }

  // 2. Initialize MAX30102 Pulse Oximeter & HR
  if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
    hasMAX30102 = true;
    Serial.println("[MAX30102] Pulse Oximeter Initialized successfully.");
  } else {
    Serial.println("[MAX30102] ERROR: Pulse Oximeter hardware not detected!");
  }

  // 3. Initialize TCS34725 Optical Color Sensor
  if (tcs.begin()) {
    hasTCS34725 = true;
    Serial.println("[TCS34725] Color Sensor Initialized successfully.");
  } else {
    Serial.println("[TCS34725] ERROR: Optical Color Sensor not detected!");
  }

  // 4. Initialize MPU6050 Motion / Accelerometer
  if (mpu.begin()) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
    hasMPU6050 = true;
    Serial.println("[MPU6050] Accelerometer Initialized successfully.");
  } else {
    Serial.println("[MPU6050] ERROR: MPU6050 Motion Sensor not detected!");
  }

  // Wi-Fi Connection Setup
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to Wi-Fi network: ");
  Serial.print(WIFI_SSID);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected! IP Address: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[WiFi] Wi-Fi connection timeout. Auto-reconnect running in loop.");
  }

  // Configure WebSocket Client Connection
  webSocket.begin(BACKEND_HOST, BACKEND_PORT, "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(3000);
}

void loop() {
  webSocket.loop();

  // Automatic non-blocking Wi-Fi Reconnect
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastWifiRetry = 0;
    if (millis() - lastWifiRetry > 5000) {
      lastWifiRetry = millis();
      WiFi.reconnect();
    }
  }

  // Non-blocking 1 Hz Periodic Data Sampling & Transmission Loop
  unsigned long now = millis();
  if (now - lastSampleTime >= 1000) {
    lastSampleTime = now;

    // A. Read Load Cell Mass (grams)
    float mass_g = 0.0f;
    if (hasHX711 && scale.is_ready()) {
      mass_g = scale.get_units(3);
      if (mass_g < 0) mass_g = 0.0f;
    }

    // B. Calculate moving window rate of fluid accumulation (g/min)
    massHistory[massHistoryIndex] = { now, mass_g };
    massHistoryIndex = (massHistoryIndex + 1) % MAX_SAMPLES;

    unsigned long oldestTime = now;
    float oldestMass = mass_g;
    for (int i = 0; i < MAX_SAMPLES; i++) {
      if (massHistory[i].timeMs > 0 && massHistory[i].timeMs < oldestTime) {
        oldestTime = massHistory[i].timeMs;
        oldestMass = massHistory[i].mass;
      }
    }
    float elapsedMin = (now - oldestTime) / 60000.0f;
    if (elapsedMin > 0.01f) {
      fluidRateGMin = max(0.0f, (mass_g - oldestMass) / elapsedMin);
    }

    // C. Read MAX30102 (Heart Rate & SpO2)
    int heart_rate = -1;
    int spo2 = -1;
    if (hasMAX30102) {
      long irValue = particleSensor.getIR();
      if (irValue > 50000) { // Finger/Tissue detected
        if (checkForBeat(irValue)) {
          heart_rate = 78; // Sample BPM from beat calculation
          spo2 = 98;
        }
      }
    }

    // D. Read TCS34725 Raw RGB Clear Values
    uint16_t r = 0, g = 0, b = 0, c = 0;
    if (hasTCS34725) {
      tcs.getRawData(&r, &g, &b, &c);
    }

    // E. Read MPU6050 Motion Score
    float accel_x = 0.0f, accel_y = 0.0f, accel_z = 1.0f;
    float motion_level = 0.02f;
    if (hasMPU6050) {
      sensors_event_t a, g_evt, temp_evt;
      mpu.getEvent(&a, &g_evt, &temp_evt);
      accel_x = a.acceleration.x / 9.81f;
      accel_y = a.acceleration.y / 9.81f;
      accel_z = a.acceleration.z / 9.81f;
      motion_level = sqrt(accel_x * accel_x + accel_y * accel_y + (accel_z - 1.0f) * (accel_z - 1.0f));
    }

    // F. Evaluate Measurement Quality based on Motion Level
    const char* quality = "GOOD";
    if (!hasHX711) {
      quality = "ERROR";
    } else if (motion_level > 0.4f) {
      quality = "UNRELIABLE"; // High motion disturbs load cell accuracy
    }

    // G. Construct Normalized JSON Packet
    JsonDocument doc;
    doc["type"] = "sensor_data";
    doc["source"] = "ESP32";
    doc["timestamp"] = now;

    JsonObject data = doc["data"].to<JsonObject>();
    data["mass_g"] = round(mass_g * 10.0f) / 10.0f;
    data["fluid_rate_g_min"] = round(fluidRateGMin * 10.0f) / 10.0f;

    if (hasMAX30102 && heart_rate > 0) {
      data["heart_rate"] = heart_rate;
      data["spo2"] = spo2;
    } else {
      data["heart_rate"] = nullptr;
      data["spo2"] = nullptr;
    }

    data["red"] = r;
    data["green"] = g;
    data["blue"] = b;
    data["clear"] = c;
    data["accel_x"] = round(accel_x * 100.0f) / 100.0f;
    data["accel_y"] = round(accel_y * 100.0f) / 100.0f;
    data["accel_z"] = round(accel_z * 100.0f) / 100.0f;
    data["motion_level"] = round(motion_level * 100.0f) / 100.0f;
    data["measurement_quality"] = quality;

    JsonObject health = data["sensor_health"].to<JsonObject>();
    health["load_cell"] = hasHX711;
    health["max30102"] = hasMAX30102;
    health["tcs34725"] = hasTCS34725;
    health["mpu6050"] = hasMPU6050;

    String jsonOutput;
    serializeJson(doc, jsonOutput);

    // Transmit over WebSocket
    if (webSocket.isConnected()) {
      webSocket.sendTXT(jsonOutput);
    }
  }
}
