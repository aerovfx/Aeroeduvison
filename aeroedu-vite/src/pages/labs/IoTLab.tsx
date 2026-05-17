/**
 * IoT Lab — Bộ sưu tập mạch Arduino / ESP32 kiểu Wokwi
 *
 * Mỗi circuit bao gồm:
 *   - Board (Arduino UNO / ESP32)
 *   - SVG schematic (board + linh kiện + dây)
 *   - Code .ino (Arduino)
 *   - Simulator giả lập (LED blink, PWM, traffic light…)
 *   - Serial monitor giả lập (ghi output theo timeline)
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, Play, Pause, RotateCcw, Cpu, Zap, Copy, Check,
  CircuitBoard, Radio, Activity, Download, BookOpen,
  Wrench, Sigma, FileCode2, Plug, Upload, AlertTriangle,
} from 'lucide-react'
import CircuitBuilder from './CircuitBuilder'
import CircuitPresets from './CircuitPresets'
import SemiconductorLab from './SemiconductorLab'
import CustomWokwiBoard from './CustomWokwiBoard'

// ───────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────

type Board = 'Arduino UNO' | 'ESP32'

type LedPattern =
  | { kind: 'blink'; pin: number; periodMs: number }              // HIGH/LOW 50/50
  | { kind: 'always'; pin: number; on: boolean }
  | { kind: 'traffic'; redPin: number; yellowPin: number; greenPin: number;
      greenMs: number; yellowMs: number; redMs: number }
  | { kind: 'pwm-breath'; pin: number; periodMs: number }          // sin wave 0..255
  | { kind: 'sequence'; pins: number[]; stepMs: number }           // chaser
  | { kind: 'lcd-clock'; sdaPin: number; sclPin: number }          // LCD 1602 I2C NTP
  | { kind: 'dual-led'; pinA: number; pinB: number; periodMs: number } // 2-LED toggle

interface SerialLine {
  t: number   // seconds from start
  text: string
}

interface Circuit {
  id: string
  name: string
  board: Board
  tags: string[]
  xp: number
  difficulty: 'Dễ' | 'Trung bình' | 'Nâng cao'
  description: string
  components: string[]
  pins: Record<string, string>    // e.g. { 'D13': 'LED anode via 220Ω', GND: 'LED cathode' }
  code: string
  pattern: LedPattern
  serial: SerialLine[]            // repeating timeline
  serialLoopMs: number            // period of serial loop
  objectives: string[]
}

// ───────────────────────────────────────────────────────────────────
// Circuit data (10 circuits)
// ───────────────────────────────────────────────────────────────────

const CIRCUITS: Circuit[] = [
  {
    id: 'blink-uno',
    name: 'Blink LED — Arduino UNO',
    board: 'Arduino UNO',
    tags: ['LED', 'GPIO', 'digitalWrite'],
    xp: 50,
    difficulty: 'Dễ',
    description: 'Mạch Hello World của Arduino: đèn LED nhấp nháy 1 Hz trên chân digital 13.',
    components: ['Arduino UNO R3', 'LED đỏ 5mm', 'Điện trở 220Ω', 'Breadboard + dây'],
    pins: {
      'D13': 'Qua điện trở 220Ω → Anode LED',
      'GND': 'Cathode LED',
    },
    code: `// Blink — Arduino UNO (pin D13)
const int LED_PIN = 13;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("Blink started");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("LED ON");
  delay(500);

  digitalWrite(LED_PIN, LOW);
  Serial.println("LED OFF");
  delay(500);
}`,
    pattern: { kind: 'blink', pin: 13, periodMs: 1000 },
    serial: [
      { t: 0.0, text: 'Blink started' },
      { t: 0.0, text: 'LED ON' },
      { t: 0.5, text: 'LED OFF' },
    ],
    serialLoopMs: 1000,
    objectives: [
      'Hiểu digitalWrite và pinMode',
      'Dùng delay() để timing',
      'Đọc output qua Serial Monitor',
    ],
  },

  {
    id: 'blink-esp32',
    name: 'Blink LED — ESP32',
    board: 'ESP32',
    tags: ['LED', 'GPIO', 'ESP32'],
    xp: 60,
    difficulty: 'Dễ',
    description: 'LED nhấp nháy 500ms trên ESP32 GPIO2 (built-in LED).',
    components: ['ESP32 DevKit v4', 'LED (dùng LED on-board GPIO2 hoặc LED rời)', 'Điện trở 220Ω'],
    pins: {
      'GPIO2': 'Built-in LED / LED rời qua 220Ω',
      'GND': 'Cathode LED',
    },
    code: `// Blink ESP32 — GPIO2 (built-in LED)
const int LED_PIN = 2;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("ESP32 Blink v1.0");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("ON  @ " + String(millis()));
  delay(500);

  digitalWrite(LED_PIN, LOW);
  Serial.println("OFF @ " + String(millis()));
  delay(500);
}`,
    pattern: { kind: 'blink', pin: 2, periodMs: 1000 },
    serial: [
      { t: 0, text: 'ESP32 Blink v1.0' },
      { t: 0, text: 'ON  @ 0' },
      { t: 0.5, text: 'OFF @ 500' },
    ],
    serialLoopMs: 1000,
    objectives: [
      'Làm quen ESP32 GPIO',
      'Hiểu sự khác biệt với Arduino (3.3V logic, baud 115200)',
    ],
  },

  {
    id: 'traffic-light',
    name: 'Đèn giao thông',
    board: 'ESP32',
    tags: ['LED', 'state machine', 'giao thông'],
    xp: 100,
    difficulty: 'Dễ',
    description: '3 LED Đỏ–Vàng–Xanh mô phỏng đèn giao thông với chu kỳ 11 giây.',
    components: ['ESP32', '3× LED (đỏ, vàng, xanh)', '3× điện trở 220Ω'],
    pins: {
      'GPIO25': 'Đỏ (qua 220Ω)',
      'GPIO26': 'Vàng (qua 220Ω)',
      'GPIO27': 'Xanh (qua 220Ω)',
      'GND': 'Cathode chung 3 LED',
    },
    code: `// Traffic Light — ESP32
const int RED = 25, YELLOW = 26, GREEN = 27;

void setup() {
  Serial.begin(115200);
  pinMode(RED, OUTPUT);
  pinMode(YELLOW, OUTPUT);
  pinMode(GREEN, OUTPUT);
}

void loop() {
  digitalWrite(RED, HIGH); digitalWrite(YELLOW, LOW); digitalWrite(GREEN, LOW);
  Serial.println("RED - STOP");
  delay(5000);

  digitalWrite(RED, LOW); digitalWrite(GREEN, HIGH);
  Serial.println("GREEN - GO");
  delay(4000);

  digitalWrite(GREEN, LOW); digitalWrite(YELLOW, HIGH);
  Serial.println("YELLOW - SLOW");
  delay(2000);
}`,
    pattern: { kind: 'traffic', redPin: 25, yellowPin: 26, greenPin: 27,
               redMs: 5000, greenMs: 4000, yellowMs: 2000 },
    serial: [
      { t: 0, text: 'RED - STOP' },
      { t: 5, text: 'GREEN - GO' },
      { t: 9, text: 'YELLOW - SLOW' },
    ],
    serialLoopMs: 11000,
    objectives: [
      'Điều khiển nhiều GPIO cùng lúc',
      'Thiết kế state machine đơn giản',
      'Tính toán chu kỳ',
    ],
  },

  {
    id: 'button-led',
    name: 'Button + LED',
    board: 'Arduino UNO',
    tags: ['button', 'digitalRead', 'pull-up'],
    xp: 80,
    difficulty: 'Dễ',
    description: 'Nhấn nút để bật/tắt LED. Dùng INPUT_PULLUP để không cần điện trở ngoài.',
    components: ['Arduino UNO', 'LED + 220Ω', 'Nút nhấn (push button)'],
    pins: {
      'D2': 'Button → GND (INPUT_PULLUP)',
      'D9': 'LED qua 220Ω',
      'GND': 'Chung',
    },
    code: `// Button Toggle LED
const int BTN = 2;
const int LED = 9;
bool ledState = false;
bool lastReading = HIGH;

void setup() {
  Serial.begin(9600);
  pinMode(BTN, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
}

void loop() {
  bool reading = digitalRead(BTN);
  if (lastReading == HIGH && reading == LOW) {  // falling edge
    ledState = !ledState;
    digitalWrite(LED, ledState);
    Serial.println(ledState ? "LED ON" : "LED OFF");
    delay(50);  // debounce
  }
  lastReading = reading;
}`,
    pattern: { kind: 'blink', pin: 9, periodMs: 2400 },  // demo: auto-toggle every 1.2s
    serial: [
      { t: 0, text: 'LED ON' },
      { t: 1.2, text: 'LED OFF' },
    ],
    serialLoopMs: 2400,
    objectives: [
      'Đọc input digital với INPUT_PULLUP',
      'Xử lý debounce',
      'Phát hiện falling edge',
    ],
  },

  {
    id: 'pwm-dimmer',
    name: 'PWM Dimmer (Potentiometer)',
    board: 'Arduino UNO',
    tags: ['analogRead', 'PWM', 'analogWrite'],
    xp: 120,
    difficulty: 'Trung bình',
    description: 'Biến trở điều chỉnh độ sáng LED qua PWM. Đọc A0 → analogWrite D9.',
    components: ['Arduino UNO', 'LED + 220Ω', 'Biến trở 10kΩ (potentiometer)'],
    pins: {
      'A0': 'Chân giữa biến trở',
      '5V': 'Đầu trên biến trở',
      'GND': 'Đầu dưới biến trở',
      'D9': 'LED anode qua 220Ω (PWM pin)',
    },
    code: `// PWM Dimmer — đọc biến trở → LED sáng tỷ lệ
const int POT = A0;
const int LED = 9;

void setup() {
  Serial.begin(9600);
  pinMode(LED, OUTPUT);
}

void loop() {
  int raw = analogRead(POT);          // 0..1023
  int pwm = map(raw, 0, 1023, 0, 255);
  analogWrite(LED, pwm);
  Serial.print("ADC="); Serial.print(raw);
  Serial.print("  PWM="); Serial.println(pwm);
  delay(50);
}`,
    pattern: { kind: 'pwm-breath', pin: 9, periodMs: 3000 },
    serial: [
      { t: 0.0, text: 'ADC=0    PWM=0' },
      { t: 0.75, text: 'ADC=512  PWM=127' },
      { t: 1.5, text: 'ADC=1023 PWM=255' },
      { t: 2.25, text: 'ADC=512  PWM=127' },
    ],
    serialLoopMs: 3000,
    objectives: [
      'Dùng analogRead (10-bit ADC)',
      'Hàm map() để scale giá trị',
      'Hiểu PWM duty-cycle',
    ],
  },

  {
    id: 'servo-sweep',
    name: 'Servo Sweep',
    board: 'ESP32',
    tags: ['servo', 'PWM', 'motor'],
    xp: 140,
    difficulty: 'Trung bình',
    description: 'Servo SG90 quét từ 0° tới 180° rồi quay về, mô phỏng cánh cửa/cánh tay robot.',
    components: ['ESP32', 'Servo SG90', 'Tụ 100µF (chống dòng đột biến)'],
    pins: {
      'GPIO18': 'Tín hiệu PWM → dây vàng servo',
      '5V (VIN)': 'Đỏ servo',
      'GND': 'Nâu servo + tụ',
    },
    code: `// Servo Sweep — ESP32 (cần ESP32Servo library)
#include <ESP32Servo.h>

Servo myservo;
const int SERVO_PIN = 18;

void setup() {
  Serial.begin(115200);
  myservo.attach(SERVO_PIN);
}

void loop() {
  for (int a = 0; a <= 180; a += 2) {
    myservo.write(a);
    Serial.printf("angle=%d\\n", a);
    delay(15);
  }
  for (int a = 180; a >= 0; a -= 2) {
    myservo.write(a);
    delay(15);
  }
}`,
    pattern: { kind: 'pwm-breath', pin: 18, periodMs: 2700 },
    serial: [
      { t: 0.0, text: 'angle=0' },
      { t: 0.7, text: 'angle=90' },
      { t: 1.35, text: 'angle=180' },
      { t: 2.0, text: 'angle=90' },
    ],
    serialLoopMs: 2700,
    objectives: [
      'Điều khiển servo qua PWM',
      'Hiểu thư viện ESP32Servo',
      'Thiết kế mẫu sweep',
    ],
  },

  {
    id: 'ultrasonic',
    name: 'Ultrasonic HC-SR04',
    board: 'Arduino UNO',
    tags: ['ultrasonic', 'distance', 'HC-SR04'],
    xp: 160,
    difficulty: 'Trung bình',
    description: 'Đo khoảng cách bằng cảm biến siêu âm HC-SR04. Bật LED cảnh báo khi < 20cm.',
    components: ['Arduino UNO', 'HC-SR04', 'LED đỏ + 220Ω'],
    pins: {
      'D7': 'Trig → HC-SR04',
      'D8': 'Echo ← HC-SR04',
      '5V': 'VCC HC-SR04',
      'GND': 'GND HC-SR04 + LED cathode',
      'D13': 'LED cảnh báo qua 220Ω',
    },
    code: `// Ultrasonic HC-SR04 — đo khoảng cách
const int TRIG = 7, ECHO = 8, LED = 13;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(LED, OUTPUT);
}

long readDistanceCm() {
  digitalWrite(TRIG, LOW); delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long dur = pulseIn(ECHO, HIGH, 30000);
  return dur / 58;  // cm
}

void loop() {
  long d = readDistanceCm();
  Serial.print("Distance: "); Serial.print(d); Serial.println(" cm");
  digitalWrite(LED, d > 0 && d < 20 ? HIGH : LOW);
  delay(200);
}`,
    pattern: { kind: 'blink', pin: 13, periodMs: 400 },
    serial: [
      { t: 0.0, text: 'Distance: 45 cm' },
      { t: 0.2, text: 'Distance: 30 cm' },
      { t: 0.4, text: 'Distance: 18 cm' },
      { t: 0.6, text: 'Distance: 12 cm' },
      { t: 0.8, text: 'Distance: 25 cm' },
      { t: 1.0, text: 'Distance: 40 cm' },
    ],
    serialLoopMs: 1200,
    objectives: [
      'Dùng pulseIn() đo xung',
      'Tính khoảng cách từ thời gian',
      'Kết hợp sensor + actuator',
    ],
  },

  {
    id: 'dht22',
    name: 'DHT22 Temperature & Humidity',
    board: 'ESP32',
    tags: ['sensor', 'DHT22', 'temperature'],
    xp: 180,
    difficulty: 'Trung bình',
    description: 'Đọc nhiệt độ & độ ẩm từ DHT22 mỗi 2 giây, log ra Serial.',
    components: ['ESP32', 'DHT22', 'Điện trở 10kΩ pull-up'],
    pins: {
      'GPIO4': 'DATA DHT22 (kèm 10kΩ pull-up lên 3V3)',
      '3V3': 'VCC DHT22',
      'GND': 'GND DHT22',
    },
    code: `// DHT22 — ESP32 (cần DHT sensor library)
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h)) {
    Serial.println("DHT read fail");
  } else {
    Serial.printf("T=%.1f°C  H=%.1f%%\\n", t, h);
  }
  delay(2000);
}`,
    pattern: { kind: 'always', pin: 4, on: true },
    serial: [
      { t: 0, text: 'T=25.3°C  H=58.2%' },
      { t: 2, text: 'T=25.5°C  H=58.4%' },
      { t: 4, text: 'T=25.4°C  H=59.1%' },
      { t: 6, text: 'T=25.6°C  H=58.8%' },
    ],
    serialLoopMs: 8000,
    objectives: [
      'Giao tiếp 1-wire của DHT22',
      'Xử lý giá trị NaN',
      'Định dạng printf trong C++',
    ],
  },

  {
    id: 'chaser',
    name: 'LED Chaser (Knight Rider)',
    board: 'Arduino UNO',
    tags: ['LED', 'array', 'animation'],
    xp: 100,
    difficulty: 'Dễ',
    description: '5 LED chạy như đèn xe Knight Rider, đi phải → trái → phải lặp lại.',
    components: ['Arduino UNO', '5× LED', '5× điện trở 220Ω'],
    pins: {
      'D3..D7': '5 LED qua 220Ω',
      'GND': 'Cathode chung',
    },
    code: `// Knight Rider Chaser
const int LEDS[] = {3, 4, 5, 6, 7};
const int N = 5;

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < N; i++) pinMode(LEDS[i], OUTPUT);
}

void scan(int dir) {
  for (int i = 0; i < N; i++) {
    int idx = dir > 0 ? i : (N - 1 - i);
    for (int j = 0; j < N; j++) digitalWrite(LEDS[j], LOW);
    digitalWrite(LEDS[idx], HIGH);
    Serial.println(idx);
    delay(120);
  }
}

void loop() {
  scan(+1);
  scan(-1);
}`,
    pattern: { kind: 'sequence', pins: [3, 4, 5, 6, 7], stepMs: 120 },
    serial: [
      { t: 0.00, text: '0' },
      { t: 0.12, text: '1' },
      { t: 0.24, text: '2' },
      { t: 0.36, text: '3' },
      { t: 0.48, text: '4' },
      { t: 0.60, text: '4' },
      { t: 0.72, text: '3' },
      { t: 0.84, text: '2' },
      { t: 0.96, text: '1' },
      { t: 1.08, text: '0' },
    ],
    serialLoopMs: 1200,
    objectives: [
      'Quản lý mảng pin',
      'Thiết kế animation lặp',
      'Tư duy thuật toán đảo chiều',
    ],
  },

  {
    id: 'esp32-web',
    name: 'ESP32 HTTP IoT Server',
    board: 'ESP32',
    tags: ['WiFi', 'HTTP', 'IoT', 'WebServer', 'Wokwi'],
    xp: 250,
    difficulty: 'Nâng cao',
    description: 'Project gốc trên Wokwi (id 320964045035274834, tác giả Uri Shaked): ESP32 chạy HTTP server cổng 80 với UI HTML, bật/tắt LED qua trình duyệt. Cần Wokwi IoT Gateway để test WiFi thực.',
    components: ['ESP32 DevKit v4', 'LED xanh dương', 'LED xanh lá', '2× điện trở 1kΩ'],
    pins: {
      'GPIO26': 'LED1 (xanh dương) qua 1kΩ',
      'GPIO27': 'LED2 (xanh lá) qua 1kΩ',
      'GND.1':  'Cathode chung 2 LED',
      'TX/RX':  'Serial Monitor 115200',
    },
    code: `/* ESP32 HTTP IoT Server Example for Wokwi.com

  https://wokwi.com/projects/320964045035274834

  To test, you need the Wokwi IoT Gateway, as explained here:

  https://docs.wokwi.com/guides/esp32-wifi#the-private-gateway

  Then start the simulation, and open http://localhost:9080
  in another browser tab.

  Note that the IoT Gateway requires a Wokwi Club subscription.
  To purchase a Wokwi Club subscription, go to https://wokwi.com/club
*/

#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <uri/UriBraces.h>

#define WIFI_SSID "Wokwi-GUEST"
#define WIFI_PASSWORD ""
// Defining the WiFi channel speeds up the connection:
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
          div { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; grid-auto-flow: column; grid-gap: 1em; }
          .btn { background-color: #5B5; border: none; color: #fff; padding: 0.5em 1em;
                 font-size: 2em; text-decoration: none }
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
  // Wait for connection
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

    switch (led.toInt()) {
      case 1:
        led1State = !led1State;
        digitalWrite(LED1, led1State);
        break;
      case 2:
        led2State = !led2State;
        digitalWrite(LED2, led2State);
        break;
    }

    sendHtml();
  });

  server.begin();
  Serial.println("HTTP server started");
}

void loop(void) {
  server.handleClient();
  delay(2);
}`,
    pattern: { kind: 'dual-led', pinA: 26, pinB: 27, periodMs: 2400 },
    serial: [
      { t: 0.0, text: 'Connecting to WiFi Wokwi-GUEST' },
      { t: 0.3, text: '......' },
      { t: 0.8, text: ' Connected!' },
      { t: 0.9, text: 'IP address: 10.13.37.2' },
      { t: 1.0, text: 'HTTP server started' },
      { t: 2.0, text: 'Toggle LED #1' },
      { t: 3.2, text: 'Toggle LED #2' },
      { t: 4.4, text: 'Toggle LED #1' },
    ],
    serialLoopMs: 6000,
    objectives: [
      'Kết nối WiFi với ESP32',
      'Xây dựng HTTP WebServer trên ESP32',
      'Routing với UriBraces cho REST endpoint',
      'Template HTML dùng raw string R"()"',
    ],
  },

  {
    id: 'esp32-ntp-lcd',
    name: 'NTP Clock + LCD 1602 I²C',
    board: 'ESP32',
    tags: ['WiFi', 'NTP', 'LCD', 'I2C', 'LiquidCrystal_I2C'],
    xp: 280,
    difficulty: 'Nâng cao',
    description: 'ESP32 kết nối WiFi Wokwi-GUEST, lấy thời gian qua NTP (pool.ntp.org) và hiển thị đồng hồ real-time lên LCD 1602 qua I²C (địa chỉ 0x27). Cần thư viện LiquidCrystal_I2C.',
    components: ['ESP32 DevKit v4', 'LCD 1602 I²C (PCF8574, 0x27)', 'Dây I²C SDA/SCL'],
    pins: {
      'GPIO21': 'SDA ← LCD SDA',
      'GPIO22': 'SCL ← LCD SCL',
      '3V3':    'VCC LCD',
      'GND.2':  'GND LCD',
    },
    code: `// Learn about the ESP32 WiFi simulation in
// https://docs.wokwi.com/guides/esp32-wifi

#include <WiFi.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C LCD = LiquidCrystal_I2C(0x27, 16, 2);

#define NTP_SERVER     "pool.ntp.org"
#define UTC_OFFSET     0
#define UTC_OFFSET_DST 0

void spinner() {
  static int8_t counter = 0;
  const char* glyphs = "\\xa1\\xa5\\xdb";
  LCD.setCursor(15, 1);
  LCD.print(glyphs[counter++]);
  if (counter == strlen(glyphs)) {
    counter = 0;
  }
}

void printLocalTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    LCD.setCursor(0, 1);
    LCD.println("Connection Err");
    return;
  }

  LCD.setCursor(8, 0);
  LCD.println(&timeinfo, "%H:%M:%S");

  LCD.setCursor(0, 1);
  LCD.println(&timeinfo, "%d/%m/%Y   %Z");
}

void setup() {
  Serial.begin(115200);

  LCD.init();
  LCD.backlight();
  LCD.setCursor(0, 0);
  LCD.print("Connecting to ");
  LCD.setCursor(0, 1);
  LCD.print("WiFi ");

  WiFi.begin("Wokwi-GUEST", "", 6);
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    spinner();
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  LCD.clear();
  LCD.setCursor(0, 0);
  LCD.println("Online");
  LCD.setCursor(0, 1);
  LCD.println("Updating time...");

  configTime(UTC_OFFSET, UTC_OFFSET_DST, NTP_SERVER);
}

void loop() {
  printLocalTime();
  delay(250);
}

/* === diagram.json ===
{
  "version": 1, "author": "Anonymous maker", "editor": "wokwi",
  "parts": [
    { "type": "board-esp32-devkit-c-v4", "id": "esp" },
    { "type": "wokwi-lcd1602", "id": "lcd1", "attrs": { "pins": "i2c" } }
  ],
  "connections": [
    ["lcd1:SDA", "esp:21", "green", []],
    ["lcd1:SCL", "esp:22", "purple", []],
    ["lcd1:VCC", "esp:3V3", "red", []],
    ["lcd1:GND", "esp:GND.2", "black", []]
  ]
}
*/`,
    pattern: { kind: 'lcd-clock', sdaPin: 21, sclPin: 22 },
    serial: [
      { t: 0.0, text: 'WiFi connected' },
      { t: 0.1, text: 'IP address: 10.13.37.2' },
      { t: 0.3, text: 'configTime → pool.ntp.org' },
      { t: 0.5, text: 'NTP sync OK' },
    ],
    serialLoopMs: 10000,
    objectives: [
      'Kết nối WiFi và NTP (getLocalTime / configTime)',
      'Dùng I²C với PCF8574 backpack (địa chỉ 0x27)',
      'Thư viện LiquidCrystal_I2C — init, backlight, setCursor, print',
      'Thiết kế spinner UI khi chờ kết nối',
      'Định dạng thời gian với strftime-style (%H:%M:%S, %d/%m/%Y)',
    ],
  },
]

// ───────────────────────────────────────────────────────────────────
// Simulator helpers
// ───────────────────────────────────────────────────────────────────

/** Compute LED brightness 0..1 at time t (ms) for a given pin, based on pattern. */
function ledBrightness(pattern: LedPattern, pin: number, tMs: number): number {
  if (pattern.kind === 'blink') {
    if (pattern.pin !== pin) return 0
    const half = pattern.periodMs / 2
    return (tMs % pattern.periodMs) < half ? 1 : 0
  }
  if (pattern.kind === 'always') {
    return pattern.pin === pin && pattern.on ? 1 : 0
  }
  if (pattern.kind === 'traffic') {
    const total = pattern.redMs + pattern.greenMs + pattern.yellowMs
    const phase = tMs % total
    if (phase < pattern.redMs) return pattern.redPin === pin ? 1 : 0
    if (phase < pattern.redMs + pattern.greenMs) return pattern.greenPin === pin ? 1 : 0
    return pattern.yellowPin === pin ? 1 : 0
  }
  if (pattern.kind === 'pwm-breath') {
    if (pattern.pin !== pin) return 0
    const phase = (tMs % pattern.periodMs) / pattern.periodMs
    return 0.5 + 0.5 * Math.sin(phase * Math.PI * 2 - Math.PI / 2)
  }
  if (pattern.kind === 'sequence') {
    const idx = pattern.pins.indexOf(pin)
    if (idx < 0) return 0
    const N = pattern.pins.length
    const step = pattern.stepMs
    const totalPhase = N * 2
    const phase = Math.floor((tMs / step) % totalPhase)
    const activeIdx = phase < N ? phase : (totalPhase - 1 - phase)
    return activeIdx === idx ? 1 : 0
  }
  if (pattern.kind === 'dual-led') {
    const half = pattern.periodMs / 2
    const onA = (tMs % pattern.periodMs) < half
    if (pattern.pinA === pin) return onA ? 1 : 0
    if (pattern.pinB === pin) return onA ? 0 : 1
    return 0
  }
  if (pattern.kind === 'lcd-clock') {
    return 0   // no LEDs in this circuit
  }
  return 0
}

/** Format a live clock time string HH:MM:SS for the LCD clock circuit. */
function clockHHMMSS(tMs: number): { time: string; date: string } {
  const now = new Date(Date.now() + tMs * 0)  // uses real-time; tMs isn't wall clock
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const mo = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear())
  return { time: `${hh}:${mm}:${ss}`, date: `${dd}/${mo}/${yy}` }
}

// ───────────────────────────────────────────────────────────────────
// Small components
// ───────────────────────────────────────────────────────────────────

function DifficultyPill({ level }: { level: Circuit['difficulty'] }) {
  const color =
    level === 'Dễ' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
    level === 'Trung bình' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
    'bg-rose-500/15 text-rose-400 border-rose-500/30'
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${color}`}>
      {level}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
      title="Sao chép code"
    >
      {copied
        ? (<><Check className="w-3.5 h-3.5 text-emerald-400" /> Đã copy</>)
        : (<><Copy className="w-3.5 h-3.5" /> Copy code</>)}
    </button>
  )
}

// ───────────────────────────────────────────────────────────────────
// SVG Schematic
// ───────────────────────────────────────────────────────────────────

function Schematic({ circuit, tMs }: { circuit: Circuit; tMs: number }) {
  const isESP = circuit.board === 'ESP32'

  // Board rect
  const boardFill = isESP ? '#0f172a' : '#1e3a5f'
  const boardStroke = isESP ? '#3b82f6' : '#60a5fa'
  const boardLabel = isESP ? 'ESP32' : 'Arduino UNO'

  // Collect LED pins to render from pattern
  const ledPins: { pin: number; color: string; label: string }[] = []
  const p = circuit.pattern
  if (p.kind === 'blink') {
    ledPins.push({ pin: p.pin, color: '#ef4444', label: `D${p.pin}` })
  } else if (p.kind === 'always') {
    ledPins.push({ pin: p.pin, color: '#22c55e', label: `GPIO${p.pin}` })
  } else if (p.kind === 'traffic') {
    ledPins.push({ pin: p.redPin, color: '#ef4444', label: 'Đỏ' })
    ledPins.push({ pin: p.yellowPin, color: '#eab308', label: 'Vàng' })
    ledPins.push({ pin: p.greenPin, color: '#22c55e', label: 'Xanh' })
  } else if (p.kind === 'pwm-breath') {
    ledPins.push({ pin: p.pin, color: '#a855f7', label: `PWM${p.pin}` })
  } else if (p.kind === 'sequence') {
    p.pins.forEach((pin, i) => {
      const hues = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6']
      ledPins.push({ pin, color: hues[i % hues.length], label: `D${pin}` })
    })
  } else if (p.kind === 'dual-led') {
    ledPins.push({ pin: p.pinA, color: '#3b82f6', label: `LED1 · GPIO${p.pinA}` })
    ledPins.push({ pin: p.pinB, color: '#22c55e', label: `LED2 · GPIO${p.pinB}` })
  }
  // lcd-clock is handled separately below

  const W = 520, H = 260
  const boardX = 120, boardY = 50, boardW = 280, boardH = 160

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-2xl mx-auto select-none"
      style={{ filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.35))' }}
    >
      {/* background */}
      <rect x={0} y={0} width={W} height={H} fill="#0b0f1a" rx={12} />

      {/* breadboard strip */}
      <rect x={14} y={H - 48} width={W - 28} height={36} fill="#1a1f2e" rx={4}
            stroke="#2a3244" strokeWidth={1} />
      <text x={22} y={H - 26} fill="#475569" fontSize={10} fontFamily="monospace">
        Breadboard
      </text>

      {/* board */}
      <rect x={boardX} y={boardY} width={boardW} height={boardH} fill={boardFill}
            stroke={boardStroke} strokeWidth={2} rx={8} />
      <text x={boardX + boardW / 2} y={boardY + 22} fill="#e2e8f0"
            fontSize={13} fontWeight={700} textAnchor="middle" fontFamily="sans-serif">
        {boardLabel}
      </text>
      <text x={boardX + boardW / 2} y={boardY + 40} fill="#94a3b8"
            fontSize={9} textAnchor="middle" fontFamily="monospace">
        {isESP ? 'DevKit v4 · 38-pin' : 'R3 · ATmega328P'}
      </text>

      {/* USB connector */}
      <rect x={boardX - 18} y={boardY + 50} width={22} height={32} fill="#334155" rx={2} />
      <text x={boardX - 7} y={boardY + 70} fill="#64748b"
            fontSize={8} textAnchor="middle">USB</text>

      {/* Pin dots on board */}
      {Array.from({ length: 14 }).map((_, i) => (
        <circle key={`top-${i}`} cx={boardX + 20 + i * 18} cy={boardY + 58}
                r={2.5} fill="#64748b" />
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <circle key={`bot-${i}`} cx={boardX + 20 + i * 18} cy={boardY + boardH - 10}
                r={2.5} fill="#64748b" />
      ))}

      {/* LEDs + wires */}
      {ledPins.map((led, i) => {
        const n = ledPins.length
        const spacing = 60
        const totalW = (n - 1) * spacing
        const x = boardX + boardW / 2 - totalW / 2 + i * spacing
        const y = H - 90
        const bright = ledBrightness(circuit.pattern, led.pin, tMs)

        return (
          <g key={`led-${i}`}>
            {/* wire from board bottom to LED */}
            <path
              d={`M ${x} ${boardY + boardH - 10} L ${x} ${y - 8}`}
              stroke={led.color}
              strokeWidth={1.5}
              strokeOpacity={0.5}
              fill="none"
            />
            {/* resistor (zigzag) */}
            <path
              d={`M ${x} ${y - 8}
                  l -4 -2 l 8 -4 l -8 -4 l 8 -4 l -8 -4 l 8 -4 l -4 -2`}
              stroke="#fbbf24" strokeWidth={1.5} fill="none"
              transform={`translate(0, -4)`}
            />
            {/* LED glow halo */}
            <circle cx={x} cy={y + 10} r={14 + bright * 6}
                    fill={led.color}
                    fillOpacity={0.12 + bright * 0.35}
                    style={{ transition: 'r 120ms linear, fill-opacity 120ms linear' }} />
            {/* LED body */}
            <circle cx={x} cy={y + 10} r={7}
                    fill={led.color}
                    fillOpacity={0.3 + bright * 0.7}
                    stroke={led.color} strokeWidth={1.5}
                    style={{ transition: 'fill-opacity 120ms linear' }} />
            {/* label */}
            <text x={x} y={y + 34} fill="#cbd5e1"
                  fontSize={9} textAnchor="middle" fontFamily="monospace">
              {led.label}
            </text>
            {/* wire to GND rail */}
            <path
              d={`M ${x} ${y + 17} L ${x} ${H - 30}`}
              stroke="#334155" strokeWidth={1.5} fill="none"
            />
          </g>
        )
      })}

      {/* LCD 1602 for lcd-clock pattern */}
      {circuit.pattern.kind === 'lcd-clock' && (() => {
        const clk = clockHHMMSS(tMs)
        // 16x2 LCD at right of board
        const lcdX = boardX + boardW + 20
        const lcdY = boardY + 20
        const lcdW = 160, lcdH = 80
        const glow = (tMs / 600) % 1 < 0.5 ? 1 : 0.85  // subtle backlight pulse
        return (
          <g>
            {/* SDA wire (green) */}
            <path d={`M ${boardX + boardW - 36} ${boardY + boardH - 10}
                     C ${boardX + boardW + 5} ${boardY + boardH + 20},
                       ${lcdX + 10} ${lcdY + lcdH + 20},
                       ${lcdX + 40} ${lcdY + lcdH - 6}`}
                  stroke="#22c55e" strokeWidth={2} fill="none" />
            {/* SCL wire (purple) */}
            <path d={`M ${boardX + boardW - 18} ${boardY + boardH - 10}
                     C ${boardX + boardW + 15} ${boardY + boardH + 30},
                       ${lcdX + 20} ${lcdY + lcdH + 30},
                       ${lcdX + 60} ${lcdY + lcdH - 6}`}
                  stroke="#a855f7" strokeWidth={2} fill="none" />
            {/* VCC (red) */}
            <path d={`M ${boardX + 30} ${boardY + 58}
                     C ${boardX - 10} ${boardY - 10},
                       ${lcdX - 20} ${lcdY - 10},
                       ${lcdX + 100} ${lcdY - 4}`}
                  stroke="#ef4444" strokeWidth={1.5} fill="none" />
            {/* GND (black/dashed) */}
            <path d={`M ${boardX + boardW - 54} ${boardY + 58}
                     C ${boardX + boardW + 40} ${boardY + 10},
                       ${lcdX + 110} ${lcdY + 10},
                       ${lcdX + 130} ${lcdY - 4}`}
                  stroke="#475569" strokeWidth={1.5} fill="none" strokeDasharray="3 2" />

            {/* LCD body */}
            <rect x={lcdX} y={lcdY} width={lcdW} height={lcdH}
                  fill="#1e293b" stroke="#334155" strokeWidth={1.5} rx={4} />
            {/* LCD screen */}
            <rect x={lcdX + 8} y={lcdY + 10} width={lcdW - 16} height={lcdH - 30}
                  fill={`rgba(16, 185, 129, ${0.18 * glow})`}
                  stroke="#064e3b" strokeWidth={1} rx={2} />
            {/* Row 1 — time HH:MM:SS at col 8 */}
            <text x={lcdX + 16} y={lcdY + 28} fill="#34d399"
                  fontSize={11} fontFamily="monospace" fontWeight={700}
                  style={{ filter: `drop-shadow(0 0 2px #10b981)` }}>
              {'Online  '}{clk.time}
            </text>
            {/* Row 2 — date */}
            <text x={lcdX + 16} y={lcdY + 46} fill="#34d399"
                  fontSize={11} fontFamily="monospace"
                  style={{ filter: `drop-shadow(0 0 2px #10b981)` }}>
              {clk.date}   UTC
            </text>
            {/* I2C backpack (blue block at bottom) */}
            <rect x={lcdX + 20} y={lcdY + lcdH - 14} width={lcdW - 40} height={10}
                  fill="#1e40af" stroke="#3b82f6" strokeWidth={1} rx={1} />
            <text x={lcdX + lcdW / 2} y={lcdY + lcdH - 6} fill="#bfdbfe"
                  fontSize={7} textAnchor="middle" fontFamily="monospace">
              PCF8574 · 0x27 · I²C
            </text>
            {/* Title */}
            <text x={lcdX + lcdW / 2} y={lcdY - 6} fill="#94a3b8"
                  fontSize={9} textAnchor="middle" fontFamily="monospace">
              LCD 1602
            </text>
          </g>
        )
      })()}

      {/* GND rail line */}
      <line x1={20} y1={H - 30} x2={W - 20} y2={H - 30}
            stroke="#334155" strokeWidth={2} strokeDasharray="3 2" />
      <text x={W - 18} y={H - 34} fill="#64748b"
            fontSize={9} textAnchor="end" fontFamily="monospace">GND rail</text>
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────────
// Serial monitor (simulated, loops)
// ───────────────────────────────────────────────────────────────────

function SerialMonitor({ circuit, tMs, running }: { circuit: Circuit; tMs: number; running: boolean }) {
  const loopSec = circuit.serialLoopMs / 1000
  const tSec = (tMs / 1000) % loopSec

  // Compute lines to display: gather across a few loops up to tMs
  const lines = useMemo(() => {
    const out: { t: number; text: string }[] = []
    const totalMs = tMs
    const loopMs = circuit.serialLoopMs
    if (loopMs <= 0) return out
    const loops = Math.floor(totalMs / loopMs)
    // Past complete loops
    for (let L = 0; L <= loops; L++) {
      const base = L * loopMs
      for (const s of circuit.serial) {
        const absMs = base + s.t * 1000
        if (absMs <= totalMs) {
          out.push({ t: absMs / 1000, text: s.text })
        }
      }
    }
    return out.slice(-14)
  }, [tMs, circuit])

  return (
    <div className="bg-black/80 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-emerald-300 h-48 overflow-y-auto">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800 text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Activity className={`w-3 h-3 ${running ? 'text-emerald-400 animate-pulse' : ''}`} />
          Serial Monitor · {circuit.board === 'ESP32' ? '115200' : '9600'} baud
        </span>
        <span className="text-[10px]">t = {tSec.toFixed(1)}s / {loopSec.toFixed(1)}s loop</span>
      </div>
      {lines.length === 0 && (
        <div className="text-zinc-600 italic">Bấm ▶ Run để xem output…</div>
      )}
      {lines.map((l, i) => (
        <div key={i} className="whitespace-pre">
          <span className="text-zinc-600">[{l.t.toFixed(2).padStart(6, ' ')}s]</span>{' '}
          <span>{l.text}</span>
        </div>
      ))}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// Main page
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// Wokwi diagram.json types + parser
// ───────────────────────────────────────────────────────────────────

interface WokwiPart {
  type: string
  id: string
  top?: number
  left?: number
  attrs?: Record<string, string | number>
}

interface WokwiDiagram {
  version?: number
  author?: string
  editor?: string
  parts: WokwiPart[]
  connections: Array<[string, string, string?, unknown?]>
  dependencies?: Record<string, unknown>
}

interface ParsedDiagram {
  board: Board | 'Unknown'
  boardType: string
  leds: Array<{ id: string; color: string; pin: number | null }>
  resistors: Array<{ id: string; value: string }>
  buttons: Array<{ id: string; pin: number | null }>
  others: Array<{ id: string; type: string }>
  connections: Array<{ from: string; to: string; color: string }>
  summary: string
}

function parseWokwiDiagram(raw: string): { ok: true; data: ParsedDiagram } | { ok: false; error: string } {
  let obj: WokwiDiagram
  try {
    obj = JSON.parse(raw)
  } catch (e: any) {
    return { ok: false, error: 'JSON không hợp lệ: ' + (e?.message ?? 'parse error') }
  }
  if (!obj || !Array.isArray(obj.parts) || !Array.isArray(obj.connections)) {
    return { ok: false, error: 'Thiếu trường "parts" hoặc "connections" (đây không phải diagram Wokwi?)' }
  }

  const leds: ParsedDiagram['leds'] = []
  const resistors: ParsedDiagram['resistors'] = []
  const buttons: ParsedDiagram['buttons'] = []
  const others: ParsedDiagram['others'] = []
  let board: Board | 'Unknown' = 'Unknown'
  let boardType = ''
  let boardId = ''

  for (const p of obj.parts) {
    if (p.type?.startsWith('board-esp32')) {
      board = 'ESP32'; boardType = p.type; boardId = p.id
    } else if (p.type?.startsWith('board-arduino') || p.type?.startsWith('wokwi-arduino')) {
      board = 'Arduino UNO'; boardType = p.type; boardId = p.id
    } else if (p.type === 'wokwi-led') {
      leds.push({ id: p.id, color: String(p.attrs?.color ?? 'red'), pin: null })
    } else if (p.type === 'wokwi-resistor') {
      resistors.push({ id: p.id, value: String(p.attrs?.value ?? '?') })
    } else if (p.type === 'wokwi-pushbutton') {
      buttons.push({ id: p.id, pin: null })
    } else if (p.type !== '$serialMonitor') {
      others.push({ id: p.id, type: p.type })
    }
  }

  // Trace LED → resistor → board pin (common Wokwi wiring pattern)
  // led.A (anode) ← r.1 ← r.2 ← board.PIN
  const findEdge = (fromPrefix: string, toPrefix?: string) =>
    obj.connections.filter(c => String(c[0]).startsWith(fromPrefix) || String(c[1]).startsWith(fromPrefix))
      .filter(c => !toPrefix || String(c[0]).startsWith(toPrefix) || String(c[1]).startsWith(toPrefix))

  for (const led of leds) {
    // find edge: led.A -> r.1  OR r.1 -> led.A
    const ledAnodeEdges = obj.connections.filter(c => {
      const a = String(c[0]), b = String(c[1])
      return a === `${led.id}:A` || b === `${led.id}:A`
    })
    for (const e of ledAnodeEdges) {
      const other = String(e[0]) === `${led.id}:A` ? String(e[1]) : String(e[0])
      const m = other.match(/^(r\w+):(\d+)$/)
      if (!m) continue
      const rId = m[1]
      // now find r's other pin → board
      const rOtherEdges = obj.connections.filter(c => {
        const a = String(c[0]), b = String(c[1])
        return (a.startsWith(rId + ':') || b.startsWith(rId + ':')) && !(a === `${led.id}:A` || b === `${led.id}:A`)
      })
      for (const re of rOtherEdges) {
        const target = String(re[0]).startsWith(rId) ? String(re[1]) : String(re[0])
        if (boardId && target.startsWith(boardId + ':')) {
          const pinStr = target.slice(boardId.length + 1)
          const pinNum = parseInt(pinStr, 10)
          if (!Number.isNaN(pinNum)) led.pin = pinNum
        }
      }
    }
  }

  const connections = obj.connections.map(c => ({
    from: String(c[0]),
    to: String(c[1]),
    color: String(c[2] ?? ''),
  }))

  const pinLines = leds.filter(l => l.pin !== null)
    .map(l => `LED ${l.color} @ GPIO${l.pin}`)
    .join(' · ')

  const summary = [
    board !== 'Unknown' ? `Board: ${board} (${boardType})` : 'Board: Unknown',
    `${leds.length} LED · ${resistors.length} điện trở · ${buttons.length} nút · ${others.length} khác`,
    pinLines,
  ].filter(Boolean).join(' — ')

  return { ok: true, data: { board, boardType, leds, resistors, buttons, others, connections, summary } }
}

// Generate a minimal Arduino sketch from a parsed diagram (best-effort)
function generateCodeFromDiagram(d: ParsedDiagram): string {
  const pinnedLeds = d.leds.filter(l => l.pin !== null) as Array<{ id: string; color: string; pin: number }>
  if (pinnedLeds.length === 0) {
    return `// Diagram import — không tìm thấy LED nối với pin trên board.\n// Thêm wiring LED → resistor → board để tự động tạo code mẫu.\n`
  }
  const header = d.board === 'ESP32' ? 'Serial.begin(115200);' : 'Serial.begin(9600);'
  const decls = pinnedLeds.map((l, i) => `const int LED_${i + 1} = ${l.pin}; // ${l.color}`).join('\n')
  const setups = pinnedLeds.map((_, i) => `  pinMode(LED_${i + 1}, OUTPUT);`).join('\n')
  const loops = pinnedLeds.map((l, i) =>
    `  digitalWrite(LED_${i + 1}, HIGH);\n  Serial.println("${l.color} ON");\n  delay(500);\n  digitalWrite(LED_${i + 1}, LOW);\n  Serial.println("${l.color} OFF");\n  delay(500);`
  ).join('\n')
  return `// Auto-generated từ Wokwi diagram (${d.board})\n${decls}\n\nvoid setup() {\n  ${header}\n${setups}\n}\n\nvoid loop() {\n${loops}\n}\n`
}

export default function IoTLab() {
  const [mode, setMode] = useState<'arduino' | 'analog' | 'semi' | 'custom'>('arduino')
  const [analogTab, setAnalogTab] = useState<'builder' | 'presets'>('presets')
  const [activeId, setActiveId] = useState<string>(CIRCUITS[0].id)
  const [running, setRunning] = useState(true)
  const [tMs, setTMs] = useState(0)
  const [filterBoard, setFilterBoard] = useState<'all' | Board>('all')

  // Editable code per-circuit (keyed by circuit id, persisted in memory for the session)
  const [userCodeMap, setUserCodeMap] = useState<Record<string, string>>({})

  // Wokwi diagram import state
  const [diagramText, setDiagramText] = useState('')
  const [diagramParsed, setDiagramParsed] = useState<ParsedDiagram | null>(null)
  const [diagramError, setDiagramError] = useState<string | null>(null)
  const [showDiagramPanel, setShowDiagramPanel] = useState(false)

  const lastTickRef = useRef<number>(performance.now())
  const rafRef = useRef<number | null>(null)

  const active = useMemo(
    () => CIRCUITS.find(c => c.id === activeId) ?? CIRCUITS[0],
    [activeId]
  )

  const filtered = useMemo(
    () => filterBoard === 'all'
      ? CIRCUITS
      : CIRCUITS.filter(c => c.board === filterBoard),
    [filterBoard]
  )

  // Animation loop
  useEffect(() => {
    function tick(now: number) {
      const dt = now - lastTickRef.current
      lastTickRef.current = now
      if (running) setTMs(t => t + dt)
      rafRef.current = requestAnimationFrame(tick)
    }
    lastTickRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [running])

  // Reset time when switching circuits
  useEffect(() => { setTMs(0) }, [activeId])

  // Current code to display/edit — falls back to the circuit's default
  const currentCode = userCodeMap[active.id] ?? active.code
  const isEdited = userCodeMap[active.id] !== undefined && userCodeMap[active.id] !== active.code

  const setCurrentCode = (next: string) => {
    setUserCodeMap(m => ({ ...m, [active.id]: next }))
  }
  const resetCurrentCode = () => {
    setUserCodeMap(m => {
      const copy = { ...m }
      delete copy[active.id]
      return copy
    })
  }

  // Tab → 2 spaces inside the code textarea
  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = currentCode.slice(0, start) + '  ' + currentCode.slice(end)
      setCurrentCode(next)
      // Restore caret after React re-render
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
  }

  const downloadIno = () => {
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${active.id}.ino`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Parse diagram JSON whenever text changes (debounced via state)
  const handleDiagramParse = () => {
    const trimmed = diagramText.trim()
    if (!trimmed) {
      setDiagramParsed(null); setDiagramError(null); return
    }
    const res = parseWokwiDiagram(trimmed)
    if (res.ok) { setDiagramParsed(res.data); setDiagramError(null) }
    else { setDiagramParsed(null); setDiagramError(res.error) }
  }

  const applyDiagramToCurrent = () => {
    if (!diagramParsed) return
    const generated = generateCodeFromDiagram(diagramParsed)
    setCurrentCode(generated)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-slate-950 to-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100"
          >
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </Link>
          <Link
            to="/dashboard/iot-lab/emulator"
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition-transform"
            title="Viết code Arduino C++ → chạy real-time trong browser"
          >
            <Zap className="w-3.5 h-3.5" /> Arduino Emulator
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/15 ml-1">⚡ NEW</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600/30 to-cyan-600/30 border border-blue-500/40">
                <CircuitBoard className="w-6 h-6 text-cyan-300" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                IoT Lab — Điện tử & Mạch điện
              </h1>
            </div>
            <p className="text-sm text-zinc-400 max-w-2xl">
              {mode === 'arduino' && (
                <>Bộ sưu tập {CIRCUITS.length} mạch điện tử mô phỏng kiểu Wokwi: LED blink, đèn giao thông, button, PWM, servo, siêu âm, DHT22, chaser, Web Server IoT và NTP Clock với LCD 1602 I²C.</>
              )}
              {mode === 'analog' && (
                <>Giả lập mạch điện analog kiểu Crocodile Clips: nguồn điện, điện trở, bóng đèn, ampe kế, vôn kế, tụ điện. Điều chỉnh giá trị, đóng/ngắt mạch, quan sát dòng điện và nạp tụ theo thời gian thực.</>
              )}
              {mode === 'semi' && (
                <>Phòng thí nghiệm bán dẫn &amp; tín hiệu: Diode I-V, Zener, LED · NE555 astable/monostable · Op-Amp 7 topology (inverting, non-inverting, Schmitt…). Phase 2 &amp; 3 sẽ bổ sung BJT, MOSFET, Filter, Oscillator, Function Generator.</>
              )}
              {mode === 'custom' && (
                <>Thiết kế mạch <strong>tự do kiểu Wokwi</strong> + <strong>💾 lưu vào thư viện cá nhân</strong> với 10 danh mục (LED, Cảm biến, Hiển thị, Game…) → có thể chia sẻ công khai cho cộng đồng. Sẵn 8 template (Simon Says, Servo+POT, DHT22+LCD, HC-SR04, LDR…). Hover part = highlight dây. Click = chi tiết pin. Export <code>.json</code> + <code>.ino</code> tương thích Wokwi.com.</>
              )}
            </p>
          </div>

          {/* Filter (Arduino mode only) */}
          {mode === 'arduino' && (
            <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded-lg p-1">
              {(['all', 'Arduino UNO', 'ESP32'] as const).map(b => (
                <button
                  key={b}
                  onClick={() => setFilterBoard(b)}
                  className={`px-3 py-1.5 text-xs rounded-md transition ${
                    filterBoard === b
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {b === 'all' ? 'Tất cả' : b}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setMode('arduino')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition font-medium ${
              mode === 'arduino'
                ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cpu className="w-4 h-4" /> Arduino / ESP32
          </button>
          <button
            onClick={() => setMode('analog')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition font-medium ${
              mode === 'analog'
                ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wrench className="w-4 h-4" /> Mạch điện Analog
          </button>
          <button
            onClick={() => setMode('semi')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition font-medium ${
              mode === 'semi'
                ? 'bg-gradient-to-r from-purple-500/25 to-indigo-500/25 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sigma className="w-4 h-4" /> Bán dẫn & Tín hiệu
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition font-medium ${
              mode === 'custom'
                ? 'bg-gradient-to-r from-pink-500/25 to-rose-500/25 text-pink-200 border border-pink-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Plug className="w-4 h-4" /> Mạch Custom
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-pink-500/30 ml-1">NEW</span>
          </button>
        </div>

        {mode === 'analog' && (
          <>
            {/* Sub-tabs: Mạch mẫu (presets) vs Mô phỏng tự do (builder) */}
            <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded-lg p-1 mb-4 w-fit">
              <button
                onClick={() => setAnalogTab('presets')}
                className={`px-3 py-1.5 text-xs rounded-md transition ${
                  analogTab === 'presets'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📚 Mạch mẫu (8 topology)
              </button>
              <button
                onClick={() => setAnalogTab('builder')}
                className={`px-3 py-1.5 text-xs rounded-md transition ${
                  analogTab === 'builder'
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ⚙ Mô phỏng tự do (ghép linh kiện)
              </button>
            </div>
            {analogTab === 'presets'  && <CircuitPresets />}
            {analogTab === 'builder'  && <CircuitBuilder />}
          </>
        )}
        {mode === 'semi' && <SemiconductorLab />}
        {mode === 'custom' && <CustomWokwiBoard />}

        {/* Two-pane layout (Arduino mode) */}
        {mode === 'arduino' && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Sidebar — circuit list */}
          <aside className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 h-fit sticky top-4">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-2 py-1">
              {filtered.length} mạch
            </div>
            <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
              {filtered.map(c => {
                const isActive = c.id === active.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left rounded-lg px-3 py-2 transition border ${
                      isActive
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-100'
                        : 'border-transparent hover:bg-zinc-800/60 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      {c.board === 'ESP32'
                        ? <Cpu className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        : <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DifficultyPill level={c.difficulty} />
                      <span className="text-[10px] text-zinc-500">{c.xp} XP</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Main content */}
          <main className="space-y-4">
            {/* Info + controls */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold">{active.name}</h2>
                    <DifficultyPill level={active.difficulty} />
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300">
                      +{active.xp} XP
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      {active.board === 'ESP32'
                        ? <Cpu className="w-3.5 h-3.5 text-blue-400" />
                        : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                      {active.board}
                    </span>
                    {active.tags.map(t => (
                      <span key={t} className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRunning(r => !r)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      running
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    }`}
                  >
                    {running
                      ? (<><Pause className="w-3.5 h-3.5" /> Pause</>)
                      : (<><Play className="w-3.5 h-3.5" /> Run</>)}
                  </button>
                  <button
                    onClick={() => setTMs(0)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                    title="Reset thời gian"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                  </button>
                </div>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed">
                {active.description}
              </p>
            </div>

            {/* Schematic + pins */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" /> Schematic (mô phỏng)
                </h3>
                <Schematic circuit={active} tMs={tMs} />
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                  Sơ đồ chân
                </h3>
                <div className="space-y-2 text-xs">
                  {Object.entries(active.pins).map(([pin, usage]) => (
                    <div key={pin} className="flex items-start gap-2">
                      <span className="font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0 min-w-[60px] text-center">
                        {pin}
                      </span>
                      <span className="text-zinc-300 leading-relaxed">{usage}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-xs uppercase tracking-wider text-zinc-500 mt-4 mb-2">
                  Linh kiện
                </h3>
                <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                  {active.components.map(c => <li key={c}>{c}</li>)}
                </ul>
              </div>
            </div>

            {/* Code editor + Serial */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-4">
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5" />
                    {active.id}.ino
                    {isEdited && (
                      <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        đã chỉnh sửa
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDiagramPanel(v => !v)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition border ${
                        showDiagramPanel
                          ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                      }`}
                      title="Dán diagram.json từ Wokwi để import nhanh"
                    >
                      <Plug className="w-3.5 h-3.5" /> Diagram
                    </button>
                    {isEdited && (
                      <button
                        onClick={resetCurrentCode}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition border border-zinc-700"
                        title="Khôi phục code gốc của mạch này"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset code
                      </button>
                    )}
                    <CopyButton text={currentCode} />
                    <button
                      onClick={downloadIno}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                      title="Tải file .ino"
                    >
                      <Download className="w-3.5 h-3.5" /> .ino
                    </button>
                  </div>
                </div>

                {showDiagramPanel && (
                  <div className="mb-3 bg-zinc-950/60 border border-cyan-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="text-[11px] uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Thiết bị nhanh — dán diagram.json (Wokwi)
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDiagramParse}
                          className="text-[11px] px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40"
                        >
                          Phân tích
                        </button>
                        <button
                          onClick={() => { setDiagramText(''); setDiagramParsed(null); setDiagramError(null) }}
                          className="text-[11px] px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={diagramText}
                      onChange={e => setDiagramText(e.target.value)}
                      spellCheck={false}
                      placeholder={'Dán nội dung diagram.json từ Wokwi vào đây (bao gồm parts & connections)…'}
                      className="w-full h-28 bg-black/70 border border-zinc-800 rounded-md p-2 text-[11px] font-mono text-zinc-200 placeholder-zinc-600 resize-y focus:outline-none focus:ring-1 focus:ring-cyan-500/60"
                    />
                    {diagramError && (
                      <div className="mt-2 text-[11px] text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> {diagramError}
                      </div>
                    )}
                    {diagramParsed && (
                      <div className="mt-2 space-y-1.5">
                        <div className="text-[11px] text-emerald-300">{diagramParsed.summary}</div>
                        {diagramParsed.leds.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {diagramParsed.leds.map(l => (
                              <span
                                key={l.id}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-300"
                              >
                                {l.id} · {l.color}{l.pin !== null ? ` → GPIO${l.pin}` : ' · ?'}
                              </span>
                            ))}
                          </div>
                        )}
                        {diagramParsed.resistors.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {diagramParsed.resistors.map(r => (
                              <span
                                key={r.id}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-200"
                              >
                                {r.id} · {r.value}Ω
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={applyDiagramToCurrent}
                            className="text-[11px] px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40"
                          >
                            Tạo code mẫu từ diagram này
                          </button>
                          <span className="text-[10px] text-zinc-500">
                            sẽ ghi đè nội dung editor ({active.id}.ino)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <textarea
                  value={currentCode}
                  onChange={e => setCurrentCode(e.target.value)}
                  onKeyDown={handleCodeKeyDown}
                  spellCheck={false}
                  className="w-full bg-black/60 border border-zinc-800 rounded-lg p-3 text-[11px] text-zinc-200 leading-relaxed font-mono min-h-[420px] max-h-[620px] resize-y focus:outline-none focus:ring-1 focus:ring-cyan-500/60"
                  style={{ tabSize: 2 }}
                />
                <div className="text-[10px] text-zinc-500 mt-1.5">
                  Tab = 2 spaces · Thay đổi code chỉ lưu trong phiên trình duyệt · Dùng “Reset code” để khôi phục mặc định
                </div>
              </div>

              <div className="space-y-4">
                <SerialMonitor circuit={active} tMs={tMs} running={running} />

                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Mục tiêu học tập
                  </h3>
                  <ul className="text-xs text-zinc-300 space-y-1.5">
                    {active.objectives.map((o, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-0.5">▸</span>
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 text-center py-4">
              Mô phỏng chạy hoàn toàn trên trình duyệt — không cần Wokwi backend. Serial
              Monitor và LED animation được sinh theo pattern khai báo trong circuit data.
            </div>
          </main>
        </div>
        )}
      </div>
    </div>
  )
}
