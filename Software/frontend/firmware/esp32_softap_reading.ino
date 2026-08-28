/*
 * Minimal ESP32 sketch for today's judge demo (SoftAP + HTTP).
 * Flash this if firmware does not already serve GET /reading as JSON.
 *
 * Phone: join Wi-Fi SSID PPH-MAT-04 / password pphmat04
 * App: Connect → Wi-Fi mat → 192.168.4.1
 *
 * Optional: GET /add?ml=100 to bump simulated volume without a calibrated load cell.
 * Replace vol_ml with HX711 grams / 1.06 when the scale is ready.
 *
 * SBP is omitted on purpose (no cuff on this PCB). Alerts use volume only.
 */

#include <WiFi.h>
#include <WebServer.h>

const char *SSID = "PPH-MAT-04";
const char *PASS = "pphmat04";

WebServer server(80);

float volMl = 80.0f;
float rate15 = 0.0f;
int seq = 0;
int batt = 90;
bool sensorFail = false;

void sendReading() {
  seq++;
  String json = "{";
  json += "\"vol_ml\":" + String(volMl, 1);
  json += ",\"rate_15\":" + String(rate15, 1);
  json += ",\"hr\":null,\"sbp\":null,\"si\":null";
  json += ",\"batt\":" + String(batt);
  json += ",\"seq\":" + String(seq);
  json += ",\"sensor_fail\":";
  json += sensorFail ? "true" : "false";
  json += "}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void handleAdd() {
  if (server.hasArg("ml")) {
    volMl += server.arg("ml").toFloat();
    if (volMl < 0) volMl = 0;
  }
  sendReading();
}

void handleFail() {
  sensorFail = server.hasArg("on") ? server.arg("on") != "0" : !sensorFail;
  sendReading();
}

void setup() {
  Serial.begin(115200);
  WiFi.softAP(SSID, PASS);
  server.on("/reading", sendReading);
  server.on("/add", handleAdd);
  server.on("/fail", handleFail);
  server.begin();
  Serial.print("AP ");
  Serial.print(SSID);
  Serial.print("  http://");
  Serial.println(WiFi.softAPIP());
}

void loop() {
  server.handleClient();
}
