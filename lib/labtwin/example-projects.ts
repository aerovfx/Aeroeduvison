// Example projects matching Wokwi diagram.json format
import { DiagramJSON, EditorFile } from './types';

export const ESP32_HTTP_SERVER: {
  diagram: DiagramJSON;
  files: EditorFile[];
} = {
  diagram: {
    version: 1,
    author: "Labtwin Demo",
    editor: "labtwin",
    parts: [
      { type: "board-esp32-devkit-c-v4", id: "esp", top: 20, left: 280, attrs: {} },
      { type: "wokwi-resistor", id: "r1", top: 180, left: 80, attrs: { value: "1000" } },
      { type: "wokwi-resistor", id: "r2", top: 210, left: 80, attrs: { value: "1000" } },
      { type: "wokwi-led", id: "led1", top: 40, left: 30, attrs: { color: "blue" } },
      { type: "wokwi-led", id: "led2", top: 40, left: 130, attrs: { color: "green" } },
    ],
    connections: [
      ["esp:TX", "$serialMonitor:RX", "", []],
      ["esp:RX", "$serialMonitor:TX", "", []],
      ["r1:1", "led1:A", "#22c55e", []],
      ["r2:1", "led2:A", "#22c55e", []],
      ["esp:GND.1", "led2:C", "#333333", []],
      ["esp:GND.1", "led1:C", "#333333", []],
      ["esp:26", "r1:2", "#22c55e", []],
      ["r2:2", "esp:27", "#22c55e", []],
    ],
    dependencies: {},
  },
  files: [
    {
      name: "esp32-http-server.ino",
      language: "cpp",
      content: `/* ESP32 HTTP IoT Server - Labtwin Demo
   Based on Wokwi ESP32 HTTP Server example
*/

#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <uri/UriBraces.h>

#define WIFI_SSID "Wokwi-GUEST"
#define WIFI_PASSWORD ""
#define WIFI_CHANNEL 6

WebServer server(80);

const int LED1 = 26;
const int LED2 = 27;

bool led1State = false;
bool led2State = false;

void sendHtml() {
  String response = R"(
    <!DOCTYPE html><html>
      <head>
        <title>ESP32 Web Server Demo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          html { font-family: sans-serif; text-align: center; }
          body { display: inline-flex; flex-direction: column; }
          h1 { margin-bottom: 1.2em; }
          h2 { margin: 0; }
          div { display: grid; grid-template-columns: 1fr 1fr; grid-gap: 1em; }
          .btn { background-color: #5B5; border: none; color: #fff;
                 padding: 0.5em 1em; font-size: 2em; text-decoration: none }
          .btn.OFF { background-color: #333; }
        </style>
      </head>
      <body>
        <h1>ESP32 Web Server</h1>
        <div>
          <h2>LED 1</h2>
          <a href="/toggle/1" class="btn LED1_TEXT">LED1_TEXT</a>
          <h2>LED 2</h2>
          <a href="/toggle/2" class="btn LED2_TEXT">LED2_TEXT</a>
        </div>
      </body>
    </html>
  )";
  response.replace("LED1_TEXT", led1State ? "ON" : "OFF");
  response.replace("LED2_TEXT", led2State ? "ON" : "OFF");
  server.send(200, "text/html", response);
}

void setup(void) {
  Serial.begin(115200);
  pinMode(LED1, OUTPUT);
  pinMode(LED2, OUTPUT);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, WIFI_CHANNEL);
  Serial.print("Connecting to WiFi ");
  Serial.print(WIFI_SSID);
  while (WiFi.status() != WL_CONNECTED) {
    delay(100);
    Serial.print(".");
  }
  Serial.println(" Connected!");

  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  server.on("/", sendHtml);
  server.on(UriBraces("/toggle/{}"), []() {
    String led = server.pathArg(0);
    Serial.print("Toggle LED #");
    Serial.println(led);
    if (led == "1") {
      led1State = !led1State;
      digitalWrite(LED1, led1State);
    } else if (led == "2") {
      led2State = !led2State;
      digitalWrite(LED2, led2State);
    }
    sendHtml();
  });

  server.begin();
  Serial.println("HTTP server started (port 80)");
}

void loop(void) {
  server.handleClient();
  delay(2);
}`,
    },
    {
      name: "diagram.json",
      language: "json",
      content: JSON.stringify({
        version: 1,
        author: "Labtwin Demo",
        editor: "labtwin",
        parts: [
          { type: "board-esp32-devkit-c-v4", id: "esp", top: 20, left: 280, attrs: {} },
          { type: "wokwi-resistor", id: "r1", top: 180, left: 80, attrs: { value: "1000" } },
          { type: "wokwi-resistor", id: "r2", top: 210, left: 80, attrs: { value: "1000" } },
          { type: "wokwi-led", id: "led1", top: 40, left: 30, attrs: { color: "blue" } },
          { type: "wokwi-led", id: "led2", top: 40, left: 130, attrs: { color: "green" } },
        ],
        connections: [
          ["esp:26", "r1:2", "#22c55e", []],
          ["r1:1", "led1:A", "#22c55e", []],
          ["r2:2", "esp:27", "#22c55e", []],
          ["r2:1", "led2:A", "#22c55e", []],
          ["esp:GND.1", "led1:C", "#333333", []],
          ["esp:GND.1", "led2:C", "#333333", []],
        ],
        dependencies: {},
      }, null, 2),
    },
  ],
};

export const BLINK_LED: {
  diagram: DiagramJSON;
  files: EditorFile[];
} = {
  diagram: {
    version: 1,
    author: "Labtwin Demo",
    editor: "labtwin",
    parts: [
      { type: "board-esp32-devkit-c-v4", id: "esp", top: 20, left: 220, attrs: {} },
      { type: "wokwi-led", id: "led1", top: 60, left: 60, attrs: { color: "red" } },
      { type: "wokwi-resistor", id: "r1", top: 190, left: 60, attrs: { value: "220" } },
    ],
    connections: [
      ["esp:26", "r1:2", "#22c55e", []],
      ["r1:1", "led1:A", "#22c55e", []],
      ["esp:GND.1", "led1:C", "#333333", []],
    ],
    dependencies: {},
  },
  files: [
    {
      name: "blink.ino",
      language: "cpp",
      content: `// Blink LED - Labtwin Demo
const int LED_PIN = 26;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("Blink LED started!");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("LED ON");
  delay(1000);

  digitalWrite(LED_PIN, LOW);
  Serial.println("LED OFF");
  delay(1000);
}`,
    },
  ],
};

export const TRAFFIC_LIGHT: {
  diagram: DiagramJSON;
  files: EditorFile[];
} = {
  diagram: {
    version: 1,
    author: "Labtwin Demo",
    editor: "labtwin",
    parts: [
      { type: "board-esp32-devkit-c-v4", id: "esp", top: 20, left: 320, attrs: {} },
      { type: "wokwi-led", id: "red", top: 40, left: 30, attrs: { color: "red" } },
      { type: "wokwi-led", id: "yellow", top: 40, left: 110, attrs: { color: "yellow" } },
      { type: "wokwi-led", id: "green", top: 40, left: 190, attrs: { color: "green" } },
      { type: "wokwi-resistor", id: "r1", top: 190, left: 30, attrs: { value: "220" } },
      { type: "wokwi-resistor", id: "r2", top: 220, left: 30, attrs: { value: "220" } },
      { type: "wokwi-resistor", id: "r3", top: 250, left: 30, attrs: { value: "220" } },
    ],
    connections: [
      ["esp:25", "r1:2", "#ef4444", []],
      ["r1:1", "red:A", "#ef4444", []],
      ["esp:26", "r2:2", "#eab308", []],
      ["r2:1", "yellow:A", "#eab308", []],
      ["esp:27", "r3:2", "#22c55e", []],
      ["r3:1", "green:A", "#22c55e", []],
      ["esp:GND.1", "red:C", "#333333", []],
      ["esp:GND.1", "yellow:C", "#333333", []],
      ["esp:GND.1", "green:C", "#333333", []],
    ],
    dependencies: {},
  },
  files: [
    {
      name: "traffic-light.ino",
      language: "cpp",
      content: `// Traffic Light - Labtwin Demo
const int RED = 25;
const int YELLOW = 26;
const int GREEN = 27;

void setup() {
  Serial.begin(115200);
  pinMode(RED, OUTPUT);
  pinMode(YELLOW, OUTPUT);
  pinMode(GREEN, OUTPUT);
  Serial.println("Traffic light simulation started!");
}

void loop() {
  // Red
  digitalWrite(RED, HIGH);
  digitalWrite(YELLOW, LOW);
  digitalWrite(GREEN, LOW);
  Serial.println("RED - Stop!");
  delay(5000);

  // Green
  digitalWrite(RED, LOW);
  digitalWrite(GREEN, HIGH);
  Serial.println("GREEN - Go!");
  delay(4000);

  // Yellow
  digitalWrite(GREEN, LOW);
  digitalWrite(YELLOW, HIGH);
  Serial.println("YELLOW - Caution!");
  delay(2000);
}`,
    },
  ],
};

export const EXAMPLE_PROJECTS = [
  { id: 'esp32-http', name: 'ESP32 HTTP Server', description: '2 LED + WiFi Web Server', data: ESP32_HTTP_SERVER },
  { id: 'blink', name: 'Blink LED', description: 'LED nhấp nháy cơ bản', data: BLINK_LED },
  { id: 'traffic', name: 'Đèn Giao Thông', description: '3 LED mô phỏng đèn giao thông', data: TRAFFIC_LIGHT },
];
