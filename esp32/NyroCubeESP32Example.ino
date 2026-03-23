#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL = "http://YOUR_COMPUTER_IP:4000/api/device/telemetry";
const char* API_KEY = "nyrocube-secure-api-key";

const int irPin = 34;
const int vibrationMotorPin = 27;
const int ledRingPin = 26;

String oledStatus = "Idle";
int userId = 1;

void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void postTelemetry(bool irDetected, bool vibrationActive, const String& ledMode, float focusLevel, bool distraction) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);

  StaticJsonDocument<384> doc;
  doc["userId"] = userId;
  doc["irDetected"] = irDetected;
  doc["ledMode"] = ledMode;
  doc["vibrationActive"] = vibrationActive;
  doc["oledStatus"] = oledStatus;
  doc["focusLevel"] = focusLevel;
  doc["distraction"] = distraction;
  doc["distractionIntensity"] = distraction ? 2 : 0;
  doc["distractionNote"] = distraction ? "IR sensor flagged movement away from study posture" : "Stable focus posture";

  String body;
  serializeJson(doc, body);
  int responseCode = http.POST(body);
  Serial.print("Telemetry response: ");
  Serial.println(responseCode);
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(irPin, INPUT);
  pinMode(vibrationMotorPin, OUTPUT);
  pinMode(ledRingPin, OUTPUT);
  connectWifi();
}

void loop() {
  int irValue = digitalRead(irPin);
  bool distraction = irValue == HIGH;
  bool vibrationActive = distraction;
  String ledMode = distraction ? "alert-ring" : "focus-ring";
  float focusLevel = distraction ? 0.32 : 0.88;

  digitalWrite(vibrationMotorPin, vibrationActive ? HIGH : LOW);
  analogWrite(ledRingPin, distraction ? 80 : 180);
  oledStatus = distraction ? "Refocus" : "Focused";

  postTelemetry(distraction, vibrationActive, ledMode, focusLevel, distraction);
  delay(5000);
}
