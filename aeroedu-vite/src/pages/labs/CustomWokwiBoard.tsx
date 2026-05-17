/**
 * CustomWokwiBoard — Editor mạch Custom kiểu Wokwi
 *
 * Cho phép học sinh / giáo viên thiết kế mạch Analog / Arduino / ESP32
 * bằng cách dán JSON diagram (định dạng Wokwi v1) và xem trực quan:
 *
 *   - SVG canvas render từng part theo (top, left, rotate) trong JSON
 *   - Connections vẽ thành dây (màu theo connection[2])
 *   - Editor JSON 2 chiều: sửa → preview cập nhật real-time
 *   - Editor Arduino sketch (.ino) đi kèm
 *   - Bộ template ví dụ: Blink, Traffic Light, Simon Says (4 LED + buzzer
 *     + 4 button + 2x 74HC595 + 2x 7-segment), v.v.
 *   - Export .json + .ino để dùng trên Wokwi.com hoặc lưu local
 *
 * Component registry hỗ trợ:
 *   wokwi-arduino-uno · wokwi-arduino-nano · wokwi-arduino-mega
 *   wokwi-led · wokwi-pushbutton · wokwi-resistor · wokwi-buzzer
 *   wokwi-74hc595 (shift register) · wokwi-7segment (7-seg digit)
 *   wokwi-potentiometer · wokwi-servo · wokwi-photoresistor
 *   wokwi-ds1307 · wokwi-lcd1602 · wokwi-dht22 · wokwi-hc-sr04
 *   board-esp32-devkit-c-v4 · breadboard / breadboard-half
 *   Mỗi part không nhận diện được sẽ vẽ placeholder grey box.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown, Code2, Download, FileCode2, Layers, Loader2,
  Play, RotateCcw, Sparkles, Upload, AlertTriangle, BookOpen, Check,
  Save, Trash2, X, Globe, User as UserIcon,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  customCircuitService,
  CIRCUIT_CATEGORIES,
  categoryEmoji,
  categoryLabel,
  type CustomCircuit,
  type CreateCustomCircuitInput,
} from '@/services/customCircuit.service'
import { useAuth } from '@/hooks/useAuth'

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface WokwiPart {
  type: string
  id: string
  top?: number
  left?: number
  rotate?: number
  attrs?: Record<string, string | number>
}

type Connection = [string, string, string?, unknown?]

interface WokwiDiagram {
  version?: number
  author?: string
  editor?: string
  parts: WokwiPart[]
  connections: Connection[]
  dependencies?: Record<string, unknown>
}

interface Template {
  id: string
  name: string
  emoji: string
  description: string
  board: string
  difficulty: 'Dễ' | 'Trung bình' | 'Nâng cao'
  diagram: WokwiDiagram
  sketch: string
  objectives: string[]
}

// ────────────────────────────────────────────────────────────────
// Templates — bao gồm Simon Says (mạch của user)
// ────────────────────────────────────────────────────────────────

const TEMPLATES: Template[] = [
  // Simon Says — mạch người dùng cung cấp
  {
    id: 'simon-says',
    name: 'Simon Says — trò ghi nhớ màu',
    emoji: '🎮',
    description:
      'Trò chơi Simon kinh điển: 4 LED (đỏ/xanh lá/lam/vàng) + 4 button tương ứng + buzzer + 2 chip 74HC595 nối 2 led 7-đoạn hiển thị điểm. Học sinh phải nhấn lại đúng chuỗi LED phát ra.',
    board: 'Arduino UNO',
    difficulty: 'Nâng cao',
    diagram: {
      version: 1,
      author: 'Uri Shaked',
      editor: 'wokwi',
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 183, left: 18.6, attrs: {} },
        { type: 'wokwi-buzzer', id: 'buzzer', top: 16, left: 124, attrs: { volume: '0.1' } },
        { type: 'wokwi-led', id: 'led-red', top: 10, left: 6, attrs: { color: 'red' } },
        { type: 'wokwi-led', id: 'led-green', top: 73, left: 6, attrs: { color: 'green' } },
        { type: 'wokwi-led', id: 'led-blue', top: 10, left: 270, attrs: { color: 'blue' } },
        { type: 'wokwi-led', id: 'led-yellow', top: 73, left: 270, attrs: { color: 'yellow' } },
        { type: 'wokwi-pushbutton', id: 'btn-red', top: 10, left: 46, attrs: { color: 'red', key: '1', label: '1' } },
        { type: 'wokwi-pushbutton', id: 'btn-green', top: 76, left: 46, attrs: { color: 'green', key: '2', label: '2' } },
        { type: 'wokwi-pushbutton', id: 'btn-blue', top: 10, left: 200, attrs: { color: 'blue', key: '3', label: '3' } },
        { type: 'wokwi-pushbutton', id: 'btn-yellow', top: 76, left: 200, attrs: { color: 'yellow', key: '4', label: '4' } },
        { type: 'wokwi-74hc595', id: 'sr1', top: 171.8, left: 361.16, rotate: 180, attrs: {} },
        { type: 'wokwi-74hc595', id: 'sr2', top: 171.8, left: 457.16, rotate: 180, attrs: {} },
        { type: 'wokwi-7segment', id: 'sevseg1', top: 47.16, left: 379.48, attrs: {} },
        { type: 'wokwi-7segment', id: 'sevseg2', top: 47.16, left: 446.68, attrs: {} },
      ],
      connections: [
        ['uno:GND.1', 'buzzer:1', 'black', ['v-12', '*', 'h0']],
        ['uno:2', 'btn-yellow:1.l', 'gold', ['v-48', '*', 'h-6']],
        ['uno:3', 'btn-blue:1.l', 'blue', ['v-44', '*', 'h-10']],
        ['uno:4', 'btn-green:2.r', 'green', ['v-40', '*', 'h6']],
        ['uno:5', 'btn-red:2.r', 'orange', ['v-36', '*', 'h10']],
        ['uno:8', 'buzzer:2', 'purple', ['v-32', '*', 'h0']],
        ['uno:9', 'led-yellow:A', 'gold', ['v-28', '*', 'h0']],
        ['uno:10', 'led-blue:A', 'blue', ['v-24', '*', 'h8']],
        ['uno:11', 'led-green:A', 'green', ['v-20', '*', 'h0']],
        ['uno:12', 'led-red:A', 'orange', ['v-16', '*', 'h6']],
        ['uno:5V', 'sr1:VCC', 'red', ['v57.5', 'h253.4']],
        ['uno:A2', 'sr1:SHCP', 'gray', ['v19.1', 'h138.4']],
        ['uno:A1', 'sr1:STCP', 'purple', ['v28.7', 'h157.5']],
        ['uno:A0', 'sr1:DS', 'blue', ['v38.3', 'h186.2']],
        ['sr1:Q7S', 'sr2:DS', 'blue', ['h0.52', 'v56.6', 'h144']],
        ['sr1:Q0', 'sevseg1:A', 'green'],
        ['sr1:Q1', 'sevseg1:B', 'green'],
        ['sr1:Q2', 'sevseg1:C', 'green'],
        ['sr1:Q3', 'sevseg1:D', 'green'],
        ['sr1:Q4', 'sevseg1:E', 'green'],
        ['sr1:Q5', 'sevseg1:F', 'green'],
        ['sr1:Q6', 'sevseg1:G', 'green'],
        ['sr2:Q0', 'sevseg2:A', 'green'],
        ['sr2:Q1', 'sevseg2:B', 'green'],
        ['sr2:Q2', 'sevseg2:C', 'green'],
        ['sr2:Q3', 'sevseg2:D', 'green'],
        ['sr2:Q4', 'sevseg2:E', 'green'],
        ['sr2:Q5', 'sevseg2:F', 'green'],
        ['sr2:Q6', 'sevseg2:G', 'green'],
      ],
    },
    sketch: `// Simon Says — trò ghi nhớ chuỗi màu
// 4 LED + 4 button + buzzer + score hiển thị qua 2 chip 74HC595 → 2 led 7-seg
#include <Arduino.h>

const int LED_PINS[4]   = {12, 11, 10, 9};   // red, green, blue, yellow
const int BTN_PINS[4]   = {5, 4, 3, 2};
const int BUZZER_PIN    = 8;
const int TONES[4]      = {262, 330, 392, 494}; // C4 E4 G4 B4

const int SR_DATA  = A0;  // DS
const int SR_LATCH = A1;  // STCP
const int SR_CLOCK = A2;  // SHCP

// Segment patterns for digits 0-9 (a b c d e f g)
const uint8_t DIGITS[10] = {
  0b1111110, 0b0110000, 0b1101101, 0b1111001, 0b0110011,
  0b1011011, 0b1011111, 0b1110000, 0b1111111, 0b1111011,
};

int sequence[64];
int seqLen = 0;
int score = 0;

void showScore(int n) {
  uint8_t d1 = DIGITS[(n / 10) % 10];
  uint8_t d2 = DIGITS[n % 10];
  digitalWrite(SR_LATCH, LOW);
  shiftOut(SR_DATA, SR_CLOCK, MSBFIRST, d2);
  shiftOut(SR_DATA, SR_CLOCK, MSBFIRST, d1);
  digitalWrite(SR_LATCH, HIGH);
}

void playStep(int i) {
  digitalWrite(LED_PINS[i], HIGH);
  tone(BUZZER_PIN, TONES[i], 300);
  delay(400);
  digitalWrite(LED_PINS[i], LOW);
  noTone(BUZZER_PIN);
  delay(100);
}

int readButton() {
  while (true) {
    for (int i = 0; i < 4; i++) {
      if (digitalRead(BTN_PINS[i]) == LOW) {
        playStep(i);
        while (digitalRead(BTN_PINS[i]) == LOW) delay(10);
        return i;
      }
    }
    delay(10);
  }
}

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 4; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    pinMode(BTN_PINS[i], INPUT_PULLUP);
  }
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(SR_DATA, OUTPUT);
  pinMode(SR_LATCH, OUTPUT);
  pinMode(SR_CLOCK, OUTPUT);
  randomSeed(analogRead(A5));
  showScore(0);
  delay(800);
}

void loop() {
  sequence[seqLen++] = random(4);
  for (int i = 0; i < seqLen; i++) playStep(sequence[i]);
  for (int i = 0; i < seqLen; i++) {
    if (readButton() != sequence[i]) {
      Serial.println("Game over!");
      for (int j = 0; j < 3; j++) {
        for (int k = 0; k < 4; k++) digitalWrite(LED_PINS[k], HIGH);
        tone(BUZZER_PIN, 130, 200); delay(250);
        for (int k = 0; k < 4; k++) digitalWrite(LED_PINS[k], LOW);
        delay(150);
      }
      seqLen = 0; score = 0; showScore(0);
      delay(1500);
      return;
    }
  }
  score++; showScore(score);
  Serial.print("Score: "); Serial.println(score);
  delay(800);
}`,
    objectives: [
      'Dùng shiftOut() để điều khiển 16 LED chỉ với 3 chân Arduino',
      'Mảng + chuỗi pseudo-random với randomSeed() từ chân analog floating',
      'Đọc input có debounce + polling state machine',
      'Phát tone qua buzzer + tắt bằng noTone()',
    ],
  },

  // 7-segment counter (đơn giản hơn để học cơ bản 74HC595)
  {
    id: 'seg-counter',
    name: 'Đếm 0-99 — 2x 74HC595 + 7-seg',
    emoji: '🔢',
    description:
      'Mạch đếm 2-chữ-số 00 → 99 chu kỳ 1 giây dùng 2 chip dịch 8 bit nối tiếp. Hiển thị qua 2 led 7-đoạn anode chung.',
    board: 'Arduino UNO',
    difficulty: 'Trung bình',
    diagram: {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 200, left: 20, attrs: {} },
        { type: 'wokwi-74hc595', id: 'sr1', top: 100, left: 250, attrs: {} },
        { type: 'wokwi-74hc595', id: 'sr2', top: 100, left: 360, attrs: {} },
        { type: 'wokwi-7segment', id: 'd1', top: 20, left: 280, attrs: { color: 'red' } },
        { type: 'wokwi-7segment', id: 'd2', top: 20, left: 380, attrs: { color: 'red' } },
      ],
      connections: [
        ['uno:11', 'sr1:DS', 'blue'],
        ['uno:12', 'sr1:STCP', 'purple'],
        ['uno:13', 'sr1:SHCP', 'gray'],
        ['sr1:Q7S', 'sr2:DS', 'blue'],
        ['sr1:STCP', 'sr2:STCP', 'purple'],
        ['sr1:SHCP', 'sr2:SHCP', 'gray'],
        ['uno:5V', 'sr1:VCC', 'red'],
        ['uno:5V', 'sr2:VCC', 'red'],
        ['uno:GND.1', 'sr1:GND', 'black'],
        ['uno:GND.1', 'sr2:GND', 'black'],
      ],
    },
    sketch: `// Đếm 0-99 trên 2 LED 7-đoạn qua 2 chip 74HC595
const int DATA = 11, LATCH = 12, CLOCK = 13;
const uint8_t DIGITS[10] = {
  0b1111110, 0b0110000, 0b1101101, 0b1111001, 0b0110011,
  0b1011011, 0b1011111, 0b1110000, 0b1111111, 0b1111011,
};

void show(int n) {
  digitalWrite(LATCH, LOW);
  shiftOut(DATA, CLOCK, MSBFIRST, DIGITS[n % 10]);
  shiftOut(DATA, CLOCK, MSBFIRST, DIGITS[(n / 10) % 10]);
  digitalWrite(LATCH, HIGH);
}

void setup() {
  pinMode(DATA, OUTPUT);
  pinMode(LATCH, OUTPUT);
  pinMode(CLOCK, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  for (int i = 0; i < 100; i++) {
    show(i);
    Serial.println(i);
    delay(1000);
  }
}`,
    objectives: [
      'Hiểu nguyên lý dịch bit nối tiếp của 74HC595',
      'Bảng tra mã 7-đoạn (segment pattern)',
      'Tối ưu chân — 3 chân điều khiển nhiều LED',
    ],
  },

  // Blink — basic
  {
    id: 'blink-custom',
    name: 'Blink LED cơ bản',
    emoji: '💡',
    description: 'Mạch khởi điểm: 1 LED + 1 điện trở 220Ω trên pin D13. Hello-world của Arduino.',
    board: 'Arduino UNO',
    difficulty: 'Dễ',
    diagram: {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 100, left: 100, attrs: {} },
        { type: 'wokwi-led', id: 'led1', top: 50, left: 50, attrs: { color: 'red' } },
        { type: 'wokwi-resistor', id: 'r1', top: 80, left: 100, attrs: { value: '220' } },
      ],
      connections: [
        ['uno:13', 'r1:1', 'red'],
        ['r1:2', 'led1:A', 'red'],
        ['led1:C', 'uno:GND.1', 'black'],
      ],
    },
    sketch: `// Blink LED — pin 13 → 220Ω → LED → GND
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}`,
    objectives: [
      'pinMode + digitalWrite + delay',
      'Vai trò điện trở giới hạn dòng cho LED',
    ],
  },

  // Traffic light
  {
    id: 'traffic-light',
    name: 'Đèn giao thông',
    emoji: '🚦',
    description: 'Chu kỳ Đỏ (5s) → Vàng (2s) → Xanh (5s) tuần hoàn. 3 LED + 3 điện trở.',
    board: 'Arduino UNO',
    difficulty: 'Dễ',
    diagram: {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 200, left: 50, attrs: {} },
        { type: 'wokwi-led', id: 'led-red', top: 20, left: 80, attrs: { color: 'red' } },
        { type: 'wokwi-led', id: 'led-yellow', top: 20, left: 140, attrs: { color: 'yellow' } },
        { type: 'wokwi-led', id: 'led-green', top: 20, left: 200, attrs: { color: 'green' } },
        { type: 'wokwi-resistor', id: 'r1', top: 80, left: 80, attrs: { value: '220' } },
        { type: 'wokwi-resistor', id: 'r2', top: 80, left: 140, attrs: { value: '220' } },
        { type: 'wokwi-resistor', id: 'r3', top: 80, left: 200, attrs: { value: '220' } },
      ],
      connections: [
        ['uno:13', 'r1:1', 'red'],
        ['uno:12', 'r2:1', 'yellow'],
        ['uno:11', 'r3:1', 'green'],
        ['r1:2', 'led-red:A', 'red'],
        ['r2:2', 'led-yellow:A', 'yellow'],
        ['r3:2', 'led-green:A', 'green'],
        ['led-red:C', 'uno:GND.1', 'black'],
        ['led-yellow:C', 'uno:GND.1', 'black'],
        ['led-green:C', 'uno:GND.1', 'black'],
      ],
    },
    sketch: `// Đèn giao thông cơ bản
const int RED = 13, YELLOW = 12, GREEN = 11;

void setup() {
  pinMode(RED, OUTPUT);
  pinMode(YELLOW, OUTPUT);
  pinMode(GREEN, OUTPUT);
}

void loop() {
  digitalWrite(RED, HIGH);    delay(5000);
  digitalWrite(RED, LOW);
  digitalWrite(GREEN, HIGH);  delay(5000);
  digitalWrite(GREEN, LOW);
  digitalWrite(YELLOW, HIGH); delay(2000);
  digitalWrite(YELLOW, LOW);
}`,
    objectives: [
      'Sequence điều khiển 3 LED tuần hoàn',
      'Tính toán timing chu kỳ giao thông thực tế',
    ],
  },

  // Servo + potentiometer
  {
    id: 'servo-pot',
    name: 'Servo điều khiển bằng biến trở',
    emoji: '🎛',
    description: 'Xoay biến trở (POT) → analogRead trả 0-1023 → map sang 0-180° → quay servo SG90. Demo cách analog input điều khiển actuator.',
    board: 'Arduino UNO',
    difficulty: 'Trung bình',
    diagram: {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 200, left: 30, attrs: {} },
        { type: 'wokwi-potentiometer', id: 'pot1', top: 30, left: 80, attrs: {} },
        { type: 'wokwi-servo', id: 'servo1', top: 30, left: 220, attrs: {} },
      ],
      connections: [
        ['uno:A0', 'pot1:SIG', 'blue'],
        ['uno:5V', 'pot1:VCC', 'red'],
        ['uno:GND.1', 'pot1:GND', 'black'],
        ['uno:9', 'servo1:PWM', 'gold'],
        ['uno:5V', 'servo1:V+', 'red'],
        ['uno:GND.1', 'servo1:GND', 'black'],
      ],
    },
    sketch: `// Servo điều khiển bằng biến trở
#include <Servo.h>

Servo myServo;
const int POT = A0;

void setup() {
  myServo.attach(9);
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(POT);          // 0-1023
  int angle = map(raw, 0, 1023, 0, 180);
  myServo.write(angle);
  Serial.print("POT="); Serial.print(raw);
  Serial.print(" → "); Serial.print(angle); Serial.println("°");
  delay(15);  // wait for servo to settle
}`,
    objectives: [
      'analogRead trả 10-bit (0-1023) từ chân analog',
      'Hàm map() chuyển đổi tuyến tính giữa 2 dải',
      'Thư viện Servo.h sinh PWM 50Hz chuẩn hobby servo',
    ],
  },

  // DHT22 + LCD1602 thermometer
  {
    id: 'dht-lcd-thermo',
    name: 'Nhiệt kế DHT22 + LCD 16×2',
    emoji: '🌡',
    description: 'Đọc nhiệt độ + độ ẩm từ DHT22 mỗi 2 giây, hiển thị lên LCD 1602 I²C. Học giao tiếp 1-Wire (DHT) và I²C (LCD).',
    board: 'Arduino UNO',
    difficulty: 'Nâng cao',
    diagram: {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 220, left: 20, attrs: {} },
        { type: 'wokwi-dht22', id: 'dht1', top: 30, left: 60, attrs: {} },
        { type: 'wokwi-lcd1602', id: 'lcd1', top: 80, left: 170, attrs: { pins: 'i2c' } },
      ],
      connections: [
        ['uno:2', 'dht1:SDA', 'green'],
        ['uno:5V', 'dht1:VCC', 'red'],
        ['uno:GND.1', 'dht1:GND', 'black'],
        ['uno:A4', 'lcd1:SDA', 'green'],
        ['uno:A5', 'lcd1:SCL', 'yellow'],
        ['uno:5V', 'lcd1:VCC', 'red'],
        ['uno:GND.1', 'lcd1:GND', 'black'],
      ],
    },
    sketch: `// Nhiệt kế DHT22 + LCD 1602 I²C
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

#define DHT_PIN 2
#define DHT_TYPE DHT22

LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(9600);
  lcd.init();
  lcd.backlight();
  dht.begin();
  lcd.setCursor(0, 0);
  lcd.print("DHT22 Thermo");
  delay(1500);
  lcd.clear();
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h)) {
    lcd.setCursor(0, 0); lcd.print("Sensor error    ");
    delay(2000); return;
  }
  lcd.setCursor(0, 0); lcd.print("Temp: "); lcd.print(t, 1); lcd.print((char)223); lcd.print("C  ");
  lcd.setCursor(0, 1); lcd.print("Hum:  "); lcd.print(h, 1); lcd.print("%    ");
  Serial.print("T="); Serial.print(t); Serial.print("  H="); Serial.println(h);
  delay(2000);
}`,
    objectives: [
      'Giao tiếp 1-Wire với DHT22 (Wire + DHT lib)',
      'I²C bus (chân A4=SDA, A5=SCL) cho LCD',
      'Định dạng số thực + ký tự đặc biệt 0xDF = °',
    ],
  },

  // HC-SR04 ultrasonic distance
  {
    id: 'ultrasonic-distance',
    name: 'Đo khoảng cách HC-SR04',
    emoji: '📏',
    description: 'Bắn xung siêu âm 40kHz → đo thời gian phản hồi → tính khoảng cách (cm). Cảnh báo bằng LED + buzzer khi vật < 10cm.',
    board: 'Arduino UNO',
    difficulty: 'Trung bình',
    diagram: {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 200, left: 30, attrs: {} },
        { type: 'wokwi-hc-sr04', id: 'sonar1', top: 30, left: 100, attrs: {} },
        { type: 'wokwi-led', id: 'led-warn', top: 40, left: 240, attrs: { color: 'red' } },
        { type: 'wokwi-buzzer', id: 'buzz1', top: 100, left: 240, attrs: { volume: '0.1' } },
        { type: 'wokwi-resistor', id: 'r1', top: 30, left: 220, attrs: { value: '220' } },
      ],
      connections: [
        ['uno:9', 'sonar1:TRIG', 'gold'],
        ['uno:10', 'sonar1:ECHO', 'blue'],
        ['uno:5V', 'sonar1:VCC', 'red'],
        ['uno:GND.1', 'sonar1:GND', 'black'],
        ['uno:13', 'r1:1', 'red'],
        ['r1:2', 'led-warn:A', 'red'],
        ['led-warn:C', 'uno:GND.1', 'black'],
        ['uno:8', 'buzz1:1', 'purple'],
        ['uno:GND.1', 'buzz1:2', 'black'],
      ],
    },
    sketch: `// HC-SR04 đo khoảng cách + cảnh báo
const int TRIG = 9, ECHO = 10, LED = 13, BUZZER = 8;

long readDistanceCm() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long duration = pulseIn(ECHO, HIGH, 30000UL);   // 30ms timeout
  return duration / 58;  // µs / 58 ≈ cm (tốc độ âm 343 m/s)
}

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  long d = readDistanceCm();
  Serial.print("Distance: "); Serial.print(d); Serial.println(" cm");
  if (d > 0 && d < 10) {
    digitalWrite(LED, HIGH);
    tone(BUZZER, 2000, 100);
  } else {
    digitalWrite(LED, LOW);
    noTone(BUZZER);
  }
  delay(150);
}`,
    objectives: [
      'pulseIn() đo thời gian xung HIGH',
      'Vật lý sóng âm: d = v·t / 2 (echo về cả 2 chiều)',
      'Threshold logic — cảnh báo khi gần',
    ],
  },

  // LDR auto-light
  {
    id: 'ldr-auto-light',
    name: 'Đèn tự động (LDR)',
    emoji: '🌒',
    description: 'Quang trở (LDR) đo cường độ ánh sáng → khi tối → bật LED. Áp dụng cho đèn đường, đèn ngủ tự động.',
    board: 'Arduino UNO',
    difficulty: 'Dễ',
    diagram: {
      version: 1,
      parts: [
        { type: 'wokwi-arduino-uno', id: 'uno', top: 160, left: 40, attrs: {} },
        { type: 'wokwi-photoresistor', id: 'ldr1', top: 30, left: 80, attrs: {} },
        { type: 'wokwi-resistor', id: 'r-divider', top: 90, left: 80, attrs: { value: '10000' } },
        { type: 'wokwi-led', id: 'led1', top: 30, left: 200, attrs: { color: 'amber' } },
        { type: 'wokwi-resistor', id: 'r-led', top: 90, left: 200, attrs: { value: '220' } },
      ],
      connections: [
        ['uno:5V', 'ldr1:1', 'red'],
        ['ldr1:2', 'r-divider:1', 'orange'],
        ['ldr1:2', 'uno:A0', 'blue'],
        ['r-divider:2', 'uno:GND.1', 'black'],
        ['uno:9', 'r-led:1', 'gold'],
        ['r-led:2', 'led1:A', 'gold'],
        ['led1:C', 'uno:GND.1', 'black'],
      ],
    },
    sketch: `// Đèn tự động sáng khi tối — LDR + LED
const int LDR = A0;
const int LED = 9;
const int DARK_THRESHOLD = 500;  // tinh chỉnh theo môi trường

void setup() {
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int light = analogRead(LDR);
  Serial.print("Light: "); Serial.println(light);
  if (light < DARK_THRESHOLD) {
    int brightness = map(light, 0, DARK_THRESHOLD, 255, 50);
    analogWrite(LED, brightness);
  } else {
    analogWrite(LED, 0);
  }
  delay(200);
}`,
    objectives: [
      'Cầu chia điện áp (voltage divider) với LDR + 10kΩ',
      'analogWrite() tạo PWM điều chỉnh độ sáng',
      'Adaptive lighting: càng tối càng sáng',
    ],
  },
]

// ────────────────────────────────────────────────────────────────
// Component dimensions & renderer
// ────────────────────────────────────────────────────────────────

interface PartShape {
  width: number
  height: number
  render: (part: WokwiPart) => JSX.Element
}

const LED_COLORS: Record<string, string> = {
  red: '#ef4444', green: '#22c55e', blue: '#3b82f6', yellow: '#facc15',
  amber: '#f59e0b', orange: '#f97316', white: '#e5e7eb', purple: '#a855f7',
}

function ledShape(part: WokwiPart): JSX.Element {
  const color = String(part.attrs?.color ?? 'red')
  const fill = LED_COLORS[color] ?? '#ef4444'
  return (
    <g>
      <circle cx={14} cy={14} r={11} fill={fill} stroke="#111" strokeWidth={1.5} />
      <circle cx={11} cy={11} r={3} fill="white" opacity={0.6} />
      <text x={14} y={36} textAnchor="middle" fontSize={8} fill="#94a3b8">{part.id}</text>
    </g>
  )
}

function buttonShape(part: WokwiPart): JSX.Element {
  const color = String(part.attrs?.color ?? 'red')
  const fill = LED_COLORS[color] ?? '#64748b'
  const label = String(part.attrs?.label ?? '')
  return (
    <g>
      <rect x={0} y={0} width={36} height={36} rx={4} fill="#1f2937" stroke="#374151" strokeWidth={1} />
      <circle cx={18} cy={18} r={11} fill={fill} stroke="#0f172a" strokeWidth={1.5} />
      {label && <text x={18} y={22} textAnchor="middle" fontSize={10} fontWeight={700} fill="white">{label}</text>}
      <text x={18} y={48} textAnchor="middle" fontSize={7} fill="#94a3b8">{part.id}</text>
    </g>
  )
}

function resistorShape(part: WokwiPart): JSX.Element {
  const v = String(part.attrs?.value ?? '?')
  return (
    <g>
      <line x1={0} y1={6} x2={6} y2={6} stroke="#9ca3af" strokeWidth={1.5} />
      <line x1={42} y1={6} x2={48} y2={6} stroke="#9ca3af" strokeWidth={1.5} />
      <rect x={6} y={0} width={36} height={12} rx={3} fill="#fef3c7" stroke="#92400e" strokeWidth={0.8} />
      <rect x={12} y={0} width={3} height={12} fill="#92400e" />
      <rect x={18} y={0} width={3} height={12} fill="#dc2626" />
      <rect x={24} y={0} width={3} height={12} fill="#facc15" />
      <rect x={30} y={0} width={3} height={12} fill="#f59e0b" />
      <text x={24} y={24} textAnchor="middle" fontSize={7} fill="#94a3b8">{v}Ω</text>
    </g>
  )
}

function buzzerShape(part: WokwiPart): JSX.Element {
  return (
    <g>
      <circle cx={20} cy={20} r={18} fill="#0f172a" stroke="#475569" strokeWidth={1.2} />
      <circle cx={20} cy={20} r={13} fill="#1e293b" stroke="#64748b" strokeWidth={0.8} />
      <circle cx={20} cy={20} r={2} fill="#7c3aed" />
      <text x={20} y={50} textAnchor="middle" fontSize={7} fill="#94a3b8">{part.id}</text>
    </g>
  )
}

function arduinoUnoShape(part: WokwiPart): JSX.Element {
  return (
    <g>
      <rect x={0} y={0} width={280} height={210} rx={6} fill="#0e7490" stroke="#0c4a6e" strokeWidth={1.5} />
      <rect x={8} y={8} width={264} height={20} rx={2} fill="#075985" />
      <text x={140} y={22} textAnchor="middle" fontSize={10} fontWeight={700} fill="white">Arduino UNO R3</text>
      {/* Pin headers top (digital) */}
      <rect x={8} y={32} width={200} height={8} fill="#1e293b" />
      <rect x={8} y={170} width={140} height={8} fill="#1e293b" />
      {/* USB jack */}
      <rect x={4} y={60} width={26} height={22} fill="#9ca3af" stroke="#374151" />
      {/* Barrel jack */}
      <rect x={4} y={120} width={20} height={14} fill="#0f172a" />
      {/* IC */}
      <rect x={120} y={100} width={70} height={20} rx={2} fill="#1e293b" stroke="#475569" />
      <text x={155} y={114} textAnchor="middle" fontSize={7} fill="#cbd5e1">ATmega328P</text>
      {/* Label */}
      <text x={140} y={196} textAnchor="middle" fontSize={8} fill="#bae6fd">{part.id}</text>
    </g>
  )
}

function esp32Shape(part: WokwiPart): JSX.Element {
  return (
    <g>
      <rect x={0} y={0} width={180} height={250} rx={4} fill="#1e293b" stroke="#0f172a" strokeWidth={1.5} />
      <rect x={20} y={10} width={140} height={70} rx={3} fill="#0f172a" stroke="#475569" />
      <text x={90} y={50} textAnchor="middle" fontSize={9} fontWeight={700} fill="#cbd5e1">ESP-WROOM-32</text>
      <rect x={0} y={100} width={6} height={140} fill="#0f172a" />
      <rect x={174} y={100} width={6} height={140} fill="#0f172a" />
      <text x={90} y={232} textAnchor="middle" fontSize={7} fill="#94a3b8">{part.id}</text>
    </g>
  )
}

function shiftRegister595Shape(part: WokwiPart): JSX.Element {
  return (
    <g>
      <rect x={0} y={0} width={72} height={90} rx={2} fill="#0f172a" stroke="#475569" strokeWidth={1.2} />
      <text x={36} y={20} textAnchor="middle" fontSize={9} fontWeight={700} fill="#fef3c7">74HC595</text>
      <text x={36} y={32} textAnchor="middle" fontSize={6} fill="#94a3b8">8-bit shift</text>
      {/* Pin marks */}
      {[10, 22, 34, 46, 58, 70, 82].map(y => (
        <rect key={`l-${y}`} x={-3} y={y} width={3} height={2} fill="#9ca3af" />
      ))}
      {[10, 22, 34, 46, 58, 70, 82].map(y => (
        <rect key={`r-${y}`} x={72} y={y} width={3} height={2} fill="#9ca3af" />
      ))}
      <circle cx={6} cy={6} r={2} fill="#fbbf24" />
      <text x={36} y={84} textAnchor="middle" fontSize={6} fill="#94a3b8">{part.id}</text>
    </g>
  )
}

function sevenSegShape(part: WokwiPart): JSX.Element {
  return (
    <g>
      <rect x={0} y={0} width={48} height={70} rx={3} fill="#1c1917" stroke="#44403c" strokeWidth={1} />
      {/* Segment outlines */}
      <line x1={10} y1={10} x2={38} y2={10} stroke="#ef4444" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <line x1={10} y1={36} x2={38} y2={36} stroke="#ef4444" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <line x1={10} y1={62} x2={38} y2={62} stroke="#ef4444" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <line x1={8} y1={12} x2={8} y2={34} stroke="#ef4444" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <line x1={40} y1={12} x2={40} y2={34} stroke="#ef4444" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <line x1={8} y1={38} x2={8} y2={60} stroke="#ef4444" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <line x1={40} y1={38} x2={40} y2={60} stroke="#ef4444" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <circle cx={42} cy={62} r={2} fill="#ef4444" opacity={0.85} />
      <text x={24} y={80} textAnchor="middle" fontSize={6} fill="#94a3b8">{part.id}</text>
    </g>
  )
}

function potentiometerShape(part: WokwiPart): JSX.Element {
  return (
    <g>
      <rect x={0} y={20} width={60} height={36} rx={4} fill="#1e3a8a" stroke="#0f172a" strokeWidth={1.2} />
      <circle cx={30} cy={20} r={18} fill="#172554" stroke="#0f172a" strokeWidth={1.2} />
      <circle cx={30} cy={20} r={13} fill="#1e40af" />
      {/* Knob ridges */}
      {[0, 60, 120, 180, 240, 300].map(a => (
        <line key={a}
          x1={30 + Math.cos((a * Math.PI) / 180) * 8}
          y1={20 + Math.sin((a * Math.PI) / 180) * 8}
          x2={30 + Math.cos((a * Math.PI) / 180) * 13}
          y2={20 + Math.sin((a * Math.PI) / 180) * 13}
          stroke="#1e3a8a" strokeWidth={1} />
      ))}
      <line x1={30} y1={20} x2={30} y2={9} stroke="#fef3c7" strokeWidth={1.6} strokeLinecap="round" />
      <text x={30} y={50} textAnchor="middle" fontSize={7} fill="#bfdbfe">POT</text>
      <text x={30} y={66} textAnchor="middle" fontSize={6} fill="#94a3b8">{part.id}</text>
    </g>
  )
}

function servoShape(part: WokwiPart): JSX.Element {
  return (
    <g>
      {/* SG90 body — light blue plastic */}
      <rect x={0} y={20} width={50} height={36} rx={2} fill="#3b82f6" stroke="#1e40af" strokeWidth={1.2} />
      <rect x={50} y={28} width={8} height={20} fill="#3b82f6" stroke="#1e40af" strokeWidth={1.2} />
      {/* Output disc */}
      <circle cx={15} cy={38} r={11} fill="#1e293b" stroke="#0f172a" strokeWidth={1.2} />
      <circle cx={15} cy={38} r={4} fill="#94a3b8" />
      {/* Horn */}
      <rect x={5} y={37} width={20} height={2} fill="#e2e8f0" rx={1} />
      {/* Cable */}
      <line x1={0} y1={36} x2={-6} y2={36} stroke="#dc2626" strokeWidth={1.2} />
      <line x1={0} y1={40} x2={-6} y2={40} stroke="#1f2937" strokeWidth={1.2} />
      <line x1={0} y1={44} x2={-6} y2={44} stroke="#facc15" strokeWidth={1.2} />
      <text x={28} y={50} textAnchor="middle" fontSize={6} fill="#dbeafe">SG90</text>
      <text x={28} y={66} textAnchor="middle" fontSize={6} fill="#94a3b8">{part.id}</text>
    </g>
  )
}

function photoresistorShape(part: WokwiPart): JSX.Element {
  return (
    <g>
      <circle cx={20} cy={20} r={16} fill="#fef3c7" stroke="#92400e" strokeWidth={1.2} />
      {/* Zigzag CdS pattern */}
      <path d="M 8 20 L 14 14 L 14 26 L 20 14 L 20 26 L 26 14 L 26 26 L 32 20"
        fill="none" stroke="#92400e" strokeWidth={1.4} strokeLinejoin="round" />
      <line x1={4} y1={20} x2={0} y2={20} stroke="#9ca3af" strokeWidth={1.2} />
      <line x1={36} y1={20} x2={40} y2={20} stroke="#9ca3af" strokeWidth={1.2} />
      <text x={20} y={48} textAnchor="middle" fontSize={6} fill="#94a3b8">LDR · {part.id}</text>
    </g>
  )
}

function dht22Shape(part: WokwiPart): JSX.Element {
  return (
    <g>
      <rect x={0} y={0} width={50} height={66} rx={3} fill="#f8fafc" stroke="#475569" strokeWidth={1.2} />
      {/* Grille slits */}
      {[12, 18, 24, 30, 36, 42].map(y => (
        <line key={y} x1={6} y1={y} x2={44} y2={y} stroke="#94a3b8" strokeWidth={0.8} />
      ))}
      <text x={25} y={58} textAnchor="middle" fontSize={7} fontWeight={700} fill="#475569">DHT22</text>
      <text x={25} y={80} textAnchor="middle" fontSize={6} fill="#94a3b8">{part.id}</text>
    </g>
  )
}

function hcsr04Shape(part: WokwiPart): JSX.Element {
  return (
    <g>
      {/* PCB */}
      <rect x={0} y={0} width={80} height={36} rx={2} fill="#0b6e4f" stroke="#064e3b" strokeWidth={1.2} />
      {/* Two ultrasonic transducers */}
      <circle cx={20} cy={18} r={14} fill="#52525b" stroke="#1f2937" strokeWidth={1.2} />
      <circle cx={20} cy={18} r={11} fill="#3f3f46" />
      <text x={20} y={21} textAnchor="middle" fontSize={6} fontWeight={700} fill="#e5e7eb">T</text>
      <circle cx={60} cy={18} r={14} fill="#52525b" stroke="#1f2937" strokeWidth={1.2} />
      <circle cx={60} cy={18} r={11} fill="#3f3f46" />
      <text x={60} y={21} textAnchor="middle" fontSize={6} fontWeight={700} fill="#e5e7eb">R</text>
      <text x={40} y={48} textAnchor="middle" fontSize={7} fill="#34d399">HC-SR04 · {part.id}</text>
    </g>
  )
}

function lcd1602Shape(part: WokwiPart): JSX.Element {
  return (
    <g>
      {/* PCB green */}
      <rect x={0} y={0} width={150} height={60} rx={3} fill="#0b6e4f" stroke="#064e3b" strokeWidth={1.2} />
      {/* Display blue */}
      <rect x={10} y={8} width={130} height={36} rx={1} fill="#1d4ed8" stroke="#1e3a8a" strokeWidth={0.8} />
      {/* Char grid hint — 16x2 dots */}
      {Array.from({ length: 16 }).map((_, i) => (
        <g key={i}>
          <rect x={14 + i * 8} y={12} width={6} height={12} fill="#1e40af" stroke="#172554" strokeWidth={0.3} />
          <rect x={14 + i * 8} y={26} width={6} height={12} fill="#1e40af" stroke="#172554" strokeWidth={0.3} />
        </g>
      ))}
      <text x={75} y={56} textAnchor="middle" fontSize={6} fill="#34d399">LCD1602 · {part.id}</text>
    </g>
  )
}

function ds1307Shape(part: WokwiPart): JSX.Element {
  return (
    <g>
      <rect x={0} y={0} width={80} height={50} rx={3} fill="#0b6e4f" stroke="#064e3b" strokeWidth={1.2} />
      {/* IC */}
      <rect x={10} y={10} width={32} height={18} rx={1} fill="#0f172a" stroke="#475569" />
      <text x={26} y={22} textAnchor="middle" fontSize={6} fontWeight={700} fill="#cbd5e1">DS1307</text>
      {/* Coin battery */}
      <circle cx={60} cy={22} r={14} fill="#94a3b8" stroke="#475569" strokeWidth={1.2} />
      <text x={60} y={25} textAnchor="middle" fontSize={5} fill="#1f2937">CR2032</text>
      <text x={40} y={45} textAnchor="middle" fontSize={6} fill="#34d399">RTC · {part.id}</text>
    </g>
  )
}

function ssd1306Shape(part: WokwiPart): JSX.Element {
  return (
    <g>
      {/* PCB */}
      <rect x={0} y={0} width={90} height={70} rx={2} fill="#0f172a" stroke="#1e293b" strokeWidth={1.2} />
      {/* Display */}
      <rect x={6} y={6} width={78} height={48} fill="#020617" stroke="#475569" strokeWidth={0.8} />
      {/* Sample text */}
      <text x={45} y={28} textAnchor="middle" fontSize={7} fontWeight={700} fill="#06b6d4">OLED</text>
      <text x={45} y={42} textAnchor="middle" fontSize={6} fill="#22d3ee">128×64</text>
      <text x={45} y={66} textAnchor="middle" fontSize={6} fill="#94a3b8">{part.id}</text>
    </g>
  )
}

function genericShape(part: WokwiPart): JSX.Element {
  return (
    <g>
      <rect x={0} y={0} width={60} height={40} rx={3} fill="#3f3f46" stroke="#71717a" strokeWidth={1} strokeDasharray="3 2" />
      <text x={30} y={20} textAnchor="middle" fontSize={6} fill="#a1a1aa">{part.type.replace('wokwi-', '')}</text>
      <text x={30} y={32} textAnchor="middle" fontSize={6} fill="#a1a1aa">{part.id}</text>
    </g>
  )
}

const PART_REGISTRY: Record<string, PartShape> = {
  'wokwi-arduino-uno':   { width: 280, height: 210, render: arduinoUnoShape },
  'wokwi-arduino-nano':  { width: 180, height: 80,  render: arduinoUnoShape },
  'wokwi-arduino-mega':  { width: 320, height: 240, render: arduinoUnoShape },
  'board-esp32-devkit-c-v4': { width: 180, height: 250, render: esp32Shape },
  'board-esp32-c3-devkitm-1': { width: 160, height: 220, render: esp32Shape },
  'wokwi-esp32-devkit-v1': { width: 180, height: 250, render: esp32Shape },
  'wokwi-led':           { width: 28, height: 40, render: ledShape },
  'wokwi-pushbutton':    { width: 36, height: 50, render: buttonShape },
  'wokwi-resistor':      { width: 48, height: 28, render: resistorShape },
  'wokwi-buzzer':        { width: 40, height: 55, render: buzzerShape },
  'wokwi-74hc595':       { width: 72, height: 90, render: shiftRegister595Shape },
  'wokwi-7segment':      { width: 48, height: 85, render: sevenSegShape },
  'wokwi-potentiometer': { width: 60, height: 70, render: potentiometerShape },
  'wokwi-servo':         { width: 58, height: 70, render: servoShape },
  'wokwi-photoresistor': { width: 40, height: 52, render: photoresistorShape },
  'wokwi-dht22':         { width: 50, height: 84, render: dht22Shape },
  'wokwi-hc-sr04':       { width: 80, height: 52, render: hcsr04Shape },
  'wokwi-lcd1602':       { width: 150, height: 64, render: lcd1602Shape },
  'wokwi-ds1307':        { width: 80, height: 50, render: ds1307Shape },
  'board-ssd1306':       { width: 90, height: 74, render: ssd1306Shape },
  'wokwi-ssd1306':       { width: 90, height: 74, render: ssd1306Shape },
}

function shapeFor(part: WokwiPart): PartShape {
  return PART_REGISTRY[part.type] ?? { width: 60, height: 40, render: genericShape }
}

// ────────────────────────────────────────────────────────────────
// SVG board renderer
// ────────────────────────────────────────────────────────────────

function partCenter(part: WokwiPart): { x: number; y: number } {
  const shape = shapeFor(part)
  return {
    x: (part.left ?? 0) + shape.width / 2,
    y: (part.top ?? 0) + shape.height / 2,
  }
}

function connectionColor(c: string | undefined): string {
  const key = (c || '').toLowerCase()
  const map: Record<string, string> = {
    red: '#ef4444', green: '#22c55e', blue: '#3b82f6', yellow: '#facc15',
    orange: '#f97316', purple: '#a855f7', black: '#1f2937', white: '#e5e7eb',
    gray: '#6b7280', gold: '#d97706',
  }
  return map[key] ?? '#94a3b8'
}

function DiagramSVG({
  diagram, focusedPartId, onFocusPart,
}: {
  diagram: WokwiDiagram
  focusedPartId: string | null
  onFocusPart: (id: string | null) => void
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const activeId = hoverId ?? focusedPartId

  // Compute bounds
  const bounds = useMemo(() => {
    let minX = 0, minY = 0, maxX = 600, maxY = 400
    for (const p of diagram.parts) {
      const s = shapeFor(p)
      const l = p.left ?? 0, t = p.top ?? 0
      if (l < minX) minX = l
      if (t < minY) minY = t
      if (l + s.width > maxX) maxX = l + s.width
      if (t + s.height > maxY) maxY = t + s.height
    }
    return { minX: minX - 30, minY: minY - 30, maxX: maxX + 30, maxY: maxY + 30 }
  }, [diagram])
  const w = bounds.maxX - bounds.minX
  const h = bounds.maxY - bounds.minY

  // Build part index by id (for resolving connection endpoints)
  const byId = useMemo(() => {
    const m = new Map<string, WokwiPart>()
    for (const p of diagram.parts) m.set(p.id, p)
    return m
  }, [diagram])

  return (
    <svg
      viewBox={`${bounds.minX} ${bounds.minY} ${w} ${h}`}
      className="w-full h-full"
      style={{ maxHeight: 560, background: '#020617' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onFocusPart(null)
      }}
    >
      {/* Background grid */}
      <defs>
        <pattern id="grid-pattern" width={20} height={20} patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth={0.5} />
        </pattern>
      </defs>
      <rect
        x={bounds.minX} y={bounds.minY} width={w} height={h}
        fill="url(#grid-pattern)"
        onClick={() => onFocusPart(null)}
      />

      {/* Connections — drawn first so parts overlap them */}
      <g>
        {diagram.connections.map((c, i) => {
          const fromRef = String(c[0]).split(':')[0]
          const toRef = String(c[1]).split(':')[0]
          const from = byId.get(fromRef)
          const to = byId.get(toRef)
          if (!from || !to) return null
          const fp = partCenter(from)
          const tp = partCenter(to)
          // Manhattan-ish: horizontal then vertical
          const midX = (fp.x + tp.x) / 2
          const isHighlighted = activeId !== null && (fromRef === activeId || toRef === activeId)
          const isDimmed = activeId !== null && !isHighlighted
          return (
            <path
              key={i}
              d={`M ${fp.x} ${fp.y} L ${midX} ${fp.y} L ${midX} ${tp.y} L ${tp.x} ${tp.y}`}
              fill="none"
              stroke={connectionColor(c[2] as string | undefined)}
              strokeWidth={isHighlighted ? 2.5 : 1.5}
              strokeLinecap="round"
              opacity={isDimmed ? 0.15 : isHighlighted ? 1 : 0.7}
              style={{ transition: 'opacity 120ms, stroke-width 120ms' }}
            />
          )
        })}
      </g>

      {/* Parts */}
      {diagram.parts.map((p) => {
        const shape = shapeFor(p)
        const rot = p.rotate ?? 0
        const isFocused = p.id === focusedPartId
        const isHover = p.id === hoverId
        const isDimmed = activeId !== null && p.id !== activeId
        return (
          <g
            key={p.id}
            transform={`translate(${p.left ?? 0}, ${p.top ?? 0}) rotate(${rot}, ${shape.width / 2}, ${shape.height / 2})`}
            onMouseEnter={() => setHoverId(p.id)}
            onMouseLeave={() => setHoverId(null)}
            onClick={(e) => { e.stopPropagation(); onFocusPart(isFocused ? null : p.id) }}
            style={{
              cursor: 'pointer',
              opacity: isDimmed ? 0.45 : 1,
              transition: 'opacity 120ms',
            }}
          >
            {/* Focus / hover halo */}
            {(isFocused || isHover) && (
              <rect
                x={-4} y={-4} width={shape.width + 8} height={shape.height + 8} rx={6}
                fill="none"
                stroke={isFocused ? '#22d3ee' : '#94a3b8'}
                strokeWidth={isFocused ? 2 : 1.2}
                strokeDasharray={isFocused ? undefined : '3 2'}
              />
            )}
            {shape.render(p)}
          </g>
        )
      })}
    </svg>
  )
}

// ────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────

function safeStringify(obj: unknown): string {
  try { return JSON.stringify(obj, null, 2) } catch { return '' }
}

function parseDiagram(text: string): { ok: true; data: WokwiDiagram } | { ok: false; error: string } {
  if (!text.trim()) return { ok: false, error: 'JSON trống — dán nội dung diagram vào textbox bên trái.' }
  try {
    const obj = JSON.parse(text) as WokwiDiagram
    if (!obj || !Array.isArray(obj.parts)) {
      return { ok: false, error: 'Thiếu trường `parts` — đây không phải JSON Wokwi?' }
    }
    if (!Array.isArray(obj.connections)) obj.connections = []
    return { ok: true, data: obj }
  } catch (e: any) {
    return { ok: false, error: 'JSON không hợp lệ: ' + (e?.message ?? 'parse error') }
  }
}

/**
 * Đoán danh mục từ các part trong diagram — giúp gợi ý category trong
 * Save modal. Heuristic ưu tiên category cụ thể hơn (game/sound) trước
 * generic (gpio).
 */
function detectCategory(diagram: WokwiDiagram | null): string {
  if (!diagram?.parts) return 'general'
  const types = new Set(diagram.parts.map(p => p.type))
  const has = (t: string) => types.has(t)
  const hasMultiple = (...keys: string[]) =>
    keys.filter(k => types.has(k)).length >= 2

  // Game = ≥3 button + ≥3 LED + buzzer (Simon Says pattern)
  const ledCount = diagram.parts.filter(p => p.type === 'wokwi-led').length
  const btnCount = diagram.parts.filter(p => p.type === 'wokwi-pushbutton').length
  if (btnCount >= 3 && ledCount >= 3 && has('wokwi-buzzer')) return 'game'

  // MCU nâng cao: shift register, decoder
  if (has('wokwi-74hc595') || has('wokwi-74hc165') || has('wokwi-cd4017')) return 'mcu'

  // Hiển thị
  if (has('wokwi-lcd1602') || has('wokwi-7segment')
    || has('wokwi-ssd1306') || has('board-ssd1306')) return 'display'

  // Motor & Servo
  if (has('wokwi-servo') || has('wokwi-dc-motor') || has('wokwi-stepper-motor')) return 'motor'

  // Cảm biến
  if (has('wokwi-dht22') || has('wokwi-hc-sr04') || has('wokwi-photoresistor')
    || has('wokwi-mpu6050') || has('wokwi-ds18b20')) return 'sensor'

  // IoT (ESP32 boards)
  if (has('board-esp32-devkit-c-v4') || has('wokwi-esp32-devkit-v1')
    || has('board-esp32-c3-devkitm-1')) return 'iot'

  // Âm thanh
  if (has('wokwi-buzzer')) return 'sound'

  // Input — nhiều button + ít/không LED
  if (btnCount >= 2 && ledCount === 0) return 'input'

  // GPIO cơ bản: LED + resistor + Arduino
  if (hasMultiple('wokwi-led', 'wokwi-resistor', 'wokwi-arduino-uno')) return 'gpio'
  if (ledCount > 0) return 'gpio'

  return 'general'
}

export default function CustomWokwiBoard() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const myUserId = user?.id ?? null
  const [activeTemplateId, setActiveTemplateId] = useState<string>(TEMPLATES[0].id)
  const [diagramText, setDiagramText] = useState<string>(safeStringify(TEMPLATES[0].diagram))
  const [sketchText, setSketchText] = useState<string>(TEMPLATES[0].sketch)
  const [parsed, setParsed] = useState<WokwiDiagram | null>(TEMPLATES[0].diagram)
  const [error, setError] = useState<string | null>(null)
  const [autoParse, setAutoParse] = useState<boolean>(true)
  const [view, setView] = useState<'split' | 'preview' | 'json'>('split')
  const [focusedPartId, setFocusedPartId] = useState<string | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [editingCircuit, setEditingCircuit] = useState<CustomCircuit | null>(null)

  // Load mạch đã lưu của user (+ public)
  const { data: savedCircuits = [] } = useQuery({
    queryKey: ['custom-circuits', 'mine'],
    queryFn: () => customCircuitService.list(true),
    staleTime: 30_000,
  })

  const builtInIds = useMemo(() => new Set(TEMPLATES.map(t => t.id)), [])
  // isCustomActive removed — replaced by canEditActive (sees ownerId, not just builtin-ness)
  void builtInIds // kept for potential future use; suppress unused warning
  const activeCustom = useMemo(
    () => savedCircuits.find(c => c.id === activeTemplateId) ?? null,
    [savedCircuits, activeTemplateId]
  )

  // Phân chia theo ownership: của tôi vs công khai của người khác
  const myCircuits = useMemo(
    () => myUserId ? savedCircuits.filter(c => c.ownerId === myUserId) : [],
    [savedCircuits, myUserId]
  )
  const communityCircuits = useMemo(
    () => myUserId
      ? savedCircuits.filter(c => c.ownerId !== myUserId && c.isPublic)
      : savedCircuits.filter(c => c.isPublic),
    [savedCircuits, myUserId]
  )

  // Owner check cho nút Cập nhật / Xoá — chỉ active khi user sở hữu
  const canEditActive = activeCustom !== null && (
    !myUserId ? true : activeCustom.ownerId === myUserId
  )

  const activeTemplate = useMemo(() => {
    // First check built-in templates
    const bi = TEMPLATES.find(t => t.id === activeTemplateId)
    if (bi) return bi
    // Fall back to a saved custom circuit (adapted to Template shape)
    if (activeCustom) {
      return {
        id: activeCustom.id,
        name: activeCustom.name,
        emoji: categoryEmoji(activeCustom.category),
        description: activeCustom.description || 'Mạch tự lưu',
        board: activeCustom.board,
        difficulty: (['Dễ', 'Trung bình', 'Nâng cao'].includes(activeCustom.difficulty as string)
          ? activeCustom.difficulty
          : 'Dễ') as Template['difficulty'],
        diagram: activeCustom.diagram as Template['diagram'],
        sketch: activeCustom.sketch,
        objectives: activeCustom.objectives.length > 0
          ? activeCustom.objectives
          : ['Mạch tự lưu — bổ sung mục tiêu khi cập nhật.'],
      }
    }
    return TEMPLATES[0]
  }, [activeTemplateId, activeCustom])

  // Auto-parse on edit (debounced via state batching)
  useEffect(() => {
    if (!autoParse) return
    const t = setTimeout(() => {
      const res = parseDiagram(diagramText)
      if (res.ok) {
        setParsed(res.data); setError(null)
      } else {
        setError(res.error)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [diagramText, autoParse])

  const loadTemplate = (t: Template) => {
    setActiveTemplateId(t.id)
    setDiagramText(safeStringify(t.diagram))
    setSketchText(t.sketch)
    setFocusedPartId(null)
    setParsed(t.diagram)
    setError(null)
    toast.success(`Đã tải template: ${t.name}`)
  }

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleParse = () => {
    const res = parseDiagram(diagramText)
    if (res.ok) { setParsed(res.data); setError(null); toast.success('Diagram OK') }
    else { setError(res.error); toast.error(res.error) }
  }

  const handleReset = () => {
    setDiagramText(safeStringify(activeTemplate.diagram))
    setSketchText(activeTemplate.sketch)
    setParsed(activeTemplate.diagram)
    setError(null)
  }

  const handleUploadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const txt = String(reader.result || '')
      setDiagramText(txt)
      const res = parseDiagram(txt)
      if (res.ok) { setParsed(res.data); setError(null); toast.success('Đã import diagram') }
      else { setError(res.error); toast.error(res.error) }
    }
    reader.readAsText(file)
    e.target.value = '' // reset so same file can be re-selected
  }

  /** Load mạch đã lưu (custom) — chuyển sang dropdown của user */
  const loadCustomCircuit = (c: CustomCircuit) => {
    setActiveTemplateId(c.id)
    setDiagramText(safeStringify(c.diagram))
    setSketchText(c.sketch || '')
    setParsed(c.diagram as WokwiDiagram)
    setError(null)
    setFocusedPartId(null)
    toast.success(`Đã tải: ${c.name}`)
  }

  /** Mở Save modal — nếu đang ở mạch của chính user thì gợi ý update,
   *  ngược lại tạo mới (kể cả khi đang xem mạch public của người khác
   *  → cho clone về thư viện cá nhân). */
  const openSaveModal = () => {
    // Parse trước để không cho lưu JSON lỗi
    const res = parseDiagram(diagramText)
    if (!res.ok) {
      toast.error('Sửa lỗi JSON trước khi lưu: ' + res.error)
      return
    }
    setEditingCircuit(canEditActive ? activeCustom : null)
    setShowSaveModal(true)
  }

  /** Submit save / update lên backend */
  const handleSaveCircuit = async (input: CreateCustomCircuitInput) => {
    const res = parseDiagram(diagramText)
    if (!res.ok) {
      toast.error('JSON không hợp lệ')
      return
    }
    const payload: CreateCustomCircuitInput = {
      ...input,
      diagram: res.data,
      sketch: sketchText,
    }
    try {
      let saved: CustomCircuit | null
      if (editingCircuit?.id) {
        saved = await customCircuitService.update(editingCircuit.id, payload)
        toast.success('Đã cập nhật mạch')
      } else {
        saved = await customCircuitService.create(payload)
        toast.success('Đã lưu mạch vào thư viện')
      }
      await queryClient.invalidateQueries({ queryKey: ['custom-circuits', 'mine'] })
      if (saved) setActiveTemplateId(saved.id)
      setShowSaveModal(false)
    } catch (e: any) {
      toast.error(e?.message || 'Lưu thất bại')
    }
  }

  /** Xoá mạch đang active (nếu là custom của user) */
  const handleDeleteCircuit = async () => {
    if (!activeCustom) return
    if (!window.confirm(`Xoá mạch "${activeCustom.name}"? Không thể hoàn tác.`)) return
    try {
      await customCircuitService.delete(activeCustom.id)
      toast.success('Đã xoá mạch')
      await queryClient.invalidateQueries({ queryKey: ['custom-circuits', 'mine'] })
      // Quay về template đầu tiên
      loadTemplate(TEMPLATES[0])
    } catch (e: any) {
      toast.error(e?.message || 'Xoá thất bại')
    }
  }

  const partsCount = parsed?.parts.length ?? 0
  const connCount = parsed?.connections.length ?? 0
  const partTypes = useMemo(() => {
    if (!parsed) return new Map<string, number>()
    const m = new Map<string, number>()
    for (const p of parsed.parts) m.set(p.type, (m.get(p.type) ?? 0) + 1)
    return m
  }, [parsed])

  return (
    <div className="space-y-4">
      {/* Header: template selector + actions */}
      <div className="flex flex-wrap items-center gap-3 bg-zinc-900/40 border border-zinc-800 rounded-xl p-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Mạch Custom (Wokwi)</span>
        </div>

        <div className="h-5 w-px bg-zinc-700 mx-1" />

        <select
          value={activeTemplateId}
          onChange={(e) => {
            const id = e.target.value
            const tpl = TEMPLATES.find(x => x.id === id)
            if (tpl) { loadTemplate(tpl); return }
            const cc = savedCircuits.find(x => x.id === id)
            if (cc) loadCustomCircuit(cc)
          }}
          className="text-xs bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-zinc-100 max-w-[280px]"
        >
          <optgroup label="📚 Template có sẵn">
            {TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.emoji} {t.name} · {t.difficulty}</option>
            ))}
          </optgroup>
          {myCircuits.length > 0 && (
            <optgroup label={`📁 Mạch của tôi (${myCircuits.length})`}>
              {myCircuits.map(c => (
                <option key={c.id} value={c.id}>
                  {categoryEmoji(c.category)} {c.name} · {c.difficulty}
                  {c.isPublic ? ' · 🌍' : ''}
                </option>
              ))}
            </optgroup>
          )}
          {communityCircuits.length > 0 && (
            <optgroup label={`🌍 Công khai từ cộng đồng (${communityCircuits.length})`}>
              {communityCircuits.map(c => (
                <option key={c.id} value={c.id}>
                  {categoryEmoji(c.category)} {c.name} · {c.difficulty}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Save button — primary action */}
        <button
          onClick={openSaveModal}
          className="text-xs px-3 py-1.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 inline-flex items-center gap-1.5 font-semibold"
          title={canEditActive ? 'Cập nhật mạch của bạn' : 'Lưu mạch này vào thư viện cá nhân'}
        >
          <Save className="w-3.5 h-3.5" />
          {canEditActive ? 'Cập nhật' : 'Lưu mạch'}
        </button>

        {/* Delete chỉ hiển thị cho mạch của chính user */}
        {activeCustom && canEditActive && (
          <button
            onClick={handleDeleteCircuit}
            className="text-xs px-2 py-1.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/40 inline-flex items-center gap-1"
            title="Xoá mạch này khỏi thư viện"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Browse community gallery */}
        <button
          onClick={() => setShowGallery(true)}
          className="text-xs px-3 py-1.5 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 inline-flex items-center gap-1.5"
          title="Khám phá tất cả mạch công khai từ cộng đồng + thư viện cá nhân"
        >
          <Globe className="w-3.5 h-3.5" />
          Khám phá ({myCircuits.length + communityCircuits.length})
        </button>

        <div className="flex-1" />

        {/* View mode */}
        <div className="flex items-center gap-1 bg-zinc-800/60 border border-zinc-700 rounded-md p-0.5">
          {(['split', 'preview', 'json'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-[10px] px-2 py-1 rounded transition ${
                view === v ? 'bg-cyan-500/25 text-cyan-200' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {v === 'split' ? 'Cả 2' : v === 'preview' ? 'Schematic' : 'JSON'}
            </button>
          ))}
        </div>

        <label className="text-[11px] text-zinc-400 inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={autoParse}
            onChange={(e) => setAutoParse(e.target.checked)}
            className="accent-cyan-500"
          />
          Tự động parse
        </label>

        <label className="text-xs px-2 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer inline-flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" />
          Import JSON
          <input type="file" accept=".json,application/json" className="hidden" onChange={handleUploadJson} />
        </label>

        <button
          onClick={() => downloadFile('diagram.json', diagramText, 'application/json')}
          className="text-xs px-2 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> .json
        </button>

        <button
          onClick={() => downloadFile('sketch.ino', sketchText, 'text/x-arduino')}
          className="text-xs px-2 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> .ino
        </button>

        <button
          onClick={handleReset}
          className="text-xs px-2 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 inline-flex items-center gap-1.5"
          title="Khôi phục template gốc"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>

        {!autoParse && (
          <button
            onClick={handleParse}
            className="text-xs px-3 py-1.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 inline-flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" /> Parse
          </button>
        )}
      </div>

      {/* Active template summary */}
      <div className="bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 border border-cyan-500/20 rounded-xl p-3 flex items-start gap-3">
        <div className="text-2xl">{activeTemplate.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-zinc-100">{activeTemplate.name}</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-900/60 text-zinc-300">
              {activeTemplate.board}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
              activeTemplate.difficulty === 'Dễ'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : activeTemplate.difficulty === 'Trung bình'
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
            }`}>
              {activeTemplate.difficulty}
            </span>
            {activeCustom && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-200">
                {categoryEmoji(activeCustom.category)} {categoryLabel(activeCustom.category)}
              </span>
            )}
            {activeCustom?.isPublic && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 inline-flex items-center gap-1">
                <Globe className="w-2.5 h-2.5" /> Công khai
              </span>
            )}
            {activeCustom && !canEditActive && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-200">
                🔒 Chỉ xem (không phải của bạn)
              </span>
            )}
            <span className="text-[10px] text-zinc-500">· {partsCount} parts · {connCount} dây nối</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">{activeTemplate.description}</p>
        </div>
      </div>

      {/* Main work area */}
      <div className={`grid gap-3 ${
        view === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
      }`}>
        {/* Schematic preview */}
        {(view === 'split' || view === 'preview') && (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-zinc-200">Schematic Preview</span>
              <div className="flex-1" />
              {error ? (
                <span className="text-[10px] text-rose-300 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Lỗi parse
                </span>
              ) : parsed ? (
                <span className="text-[10px] text-emerald-300 inline-flex items-center gap-1">
                  <Check className="w-3 h-3" /> OK
                </span>
              ) : (
                <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
              )}
            </div>
            <div className="bg-slate-950">
              {parsed ? (
                <DiagramSVG
                  diagram={parsed}
                  focusedPartId={focusedPartId}
                  onFocusPart={setFocusedPartId}
                />
              ) : (
                <div className="h-96 flex items-center justify-center text-xs text-zinc-500">
                  Diagram chưa parse được — xem panel JSON
                </div>
              )}
            </div>

            {/* Focused part info panel */}
            {parsed && focusedPartId && (() => {
              const part = parsed.parts.find(p => p.id === focusedPartId)
              if (!part) return null
              const conns = parsed.connections.filter(c =>
                String(c[0]).split(':')[0] === focusedPartId ||
                String(c[1]).split(':')[0] === focusedPartId
              )
              return (
                <div className="p-2.5 border-t border-cyan-500/30 bg-cyan-500/5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-bold text-cyan-200">
                      📌 {part.id}
                      <span className="ml-1.5 text-[10px] font-normal text-cyan-400/70">{part.type}</span>
                    </div>
                    <button
                      onClick={() => setFocusedPartId(null)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-200"
                    >
                      ✕ Bỏ chọn
                    </button>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Vị trí: ({part.left ?? 0}, {part.top ?? 0})
                    {part.rotate ? ` · xoay ${part.rotate}°` : ''}
                    {part.attrs && Object.keys(part.attrs).length > 0 && (
                      <span className="ml-2">
                        · attrs: {Object.entries(part.attrs).map(([k, v]) => `${k}=${v}`).join(', ')}
                      </span>
                    )}
                  </div>
                  {conns.length > 0 ? (
                    <div className="space-y-0.5">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        {conns.length} đường nối:
                      </div>
                      {conns.map((c, i) => {
                        const from = String(c[0]), to = String(c[1]), color = String(c[2] ?? '')
                        const other = from.split(':')[0] === focusedPartId ? to : from
                        const myPin = from.split(':')[0] === focusedPartId ? from : to
                        return (
                          <div key={i} className="text-[10px] text-zinc-300 flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: connectionColor(color) }}
                            />
                            <span className="font-mono text-cyan-300">{myPin}</span>
                            <span className="text-zinc-500">→</span>
                            <span className="font-mono text-zinc-200">{other}</span>
                            {color && <span className="text-[9px] text-zinc-500 ml-auto">{color}</span>}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-500 italic">Chưa có đường nối nào tới part này.</div>
                  )}
                </div>
              )
            })()}

            {/* Part type legend */}
            {parsed && partTypes.size > 0 && (
              <div className="p-2 border-t border-zinc-800 bg-zinc-950/50 flex flex-wrap items-center gap-1">
                {Array.from(partTypes.entries()).map(([type, count]) => (
                  <span
                    key={type}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      PART_REGISTRY[type]
                        ? 'border-cyan-500/30 bg-cyan-500/5 text-cyan-200'
                        : 'border-zinc-700 bg-zinc-800/60 text-zinc-400'
                    }`}
                    title={PART_REGISTRY[type] ? 'Có renderer' : 'Vẽ placeholder'}
                  >
                    {type.replace('wokwi-', '').replace('board-', '')} ×{count}
                  </span>
                ))}
                <span className="ml-auto text-[9px] text-zinc-600 italic">
                  💡 Hover part = highlight dây · Click = pin để xem chi tiết
                </span>
              </div>
            )}
          </div>
        )}

        {/* JSON + sketch editor */}
        {(view === 'split' || view === 'json') && (
          <div className="space-y-3">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2 text-xs">
                <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-zinc-200">diagram.json</span>
                <div className="flex-1" />
                <span className="text-[10px] text-zinc-500">{diagramText.length} ký tự</span>
              </div>
              <textarea
                value={diagramText}
                onChange={(e) => setDiagramText(e.target.value)}
                spellCheck={false}
                className="w-full bg-black/60 text-zinc-200 font-mono text-[11px] leading-relaxed p-3 outline-none resize-y"
                style={{ minHeight: 240, height: 320, tabSize: 2 }}
              />
              {error && (
                <div className="px-3 py-1.5 text-[11px] text-rose-300 bg-rose-500/10 border-t border-rose-500/30 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> {error}
                </div>
              )}
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2 text-xs">
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-zinc-200">sketch.ino</span>
                <div className="flex-1" />
                <span className="text-[10px] text-zinc-500">{sketchText.length} ký tự</span>
              </div>
              <textarea
                value={sketchText}
                onChange={(e) => setSketchText(e.target.value)}
                spellCheck={false}
                className="w-full bg-black/60 text-zinc-100 font-mono text-[11px] leading-relaxed p-3 outline-none resize-y"
                style={{ minHeight: 200, height: 260, tabSize: 2 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Objectives + tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3">
          <h4 className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Mục tiêu học tập
          </h4>
          <ul className="space-y-1.5">
            {activeTemplate.objectives.map((o, i) => (
              <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">▸</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3">
          <h4 className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
            <ChevronDown className="w-3.5 h-3.5" /> Hướng dẫn
          </h4>
          <ul className="space-y-1 text-xs text-zinc-400">
            <li>• Sửa <code className="text-cyan-300">diagram.json</code> → preview cập nhật ngay (nếu bật "Tự động parse")</li>
            <li>• Import <code className="text-cyan-300">.json</code> từ Wokwi.com hoặc paste trực tiếp</li>
            <li>• Bộ part hỗ trợ renderer: <span className="text-cyan-300">arduino-uno, esp32, led, button, resistor, buzzer, 74hc595, 7segment</span></li>
            <li>• Part khác sẽ vẽ placeholder grey — vẫn xuất khẩu được .json/.ino chuẩn Wokwi</li>
            <li>• Đường nối vẽ kiểu Manhattan (đơn giản hoá) từ tâm part đến tâm part</li>
            <li>• Nút <span className="text-emerald-300 font-semibold">Lưu mạch</span> → đưa vào thư viện cá nhân, chọn danh mục + có thể chia sẻ công khai</li>
          </ul>
        </div>
      </div>

      {/* Gallery modal — khám phá tất cả mạch công khai */}
      {showGallery && (
        <BrowseGalleryModal
          myCircuits={myCircuits}
          communityCircuits={communityCircuits}
          activeId={activeTemplateId}
          onClose={() => setShowGallery(false)}
          onOpen={(c) => { loadCustomCircuit(c); setShowGallery(false) }}
        />
      )}

      {/* Save modal */}
      {showSaveModal && (
        <SaveCircuitModal
          initial={editingCircuit ?? {
            // Khi tạo mới (clone từ builtin / public circuit) → suggest "(bản sao)"
            name: activeTemplate.name + ' (bản sao)',
            description: activeTemplate.description,
            board: activeTemplate.board,
            difficulty: activeTemplate.difficulty as any,
            // Inherit category nếu đang clone public circuit, không thì
            // auto-detect từ diagram parts. Fall back 'general' nếu không khớp.
            category: activeCustom?.category ?? detectCategory(parsed),
            isPublic: false,
            objectives: activeTemplate.objectives,
          }}
          isUpdate={!!editingCircuit}
          onClose={() => setShowSaveModal(false)}
          onSubmit={handleSaveCircuit}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// SaveCircuitModal
// ────────────────────────────────────────────────────────────────
interface SaveModalProps {
  initial: Partial<CreateCustomCircuitInput>
  isUpdate: boolean
  onClose: () => void
  onSubmit: (input: CreateCustomCircuitInput) => Promise<void>
}

function SaveCircuitModal({ initial, isUpdate, onClose, onSubmit }: SaveModalProps) {
  const [name, setName] = useState(initial.name ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [board, setBoard] = useState(initial.board ?? 'Arduino UNO')
  const [difficulty, setDifficulty] = useState<'Dễ' | 'Trung bình' | 'Nâng cao'>(
    (initial.difficulty as any) ?? 'Dễ'
  )
  const [category, setCategory] = useState(initial.category ?? 'general')
  const [isPublic, setIsPublic] = useState(initial.isPublic ?? false)
  const [objectives, setObjectives] = useState<string>(
    (initial.objectives ?? []).join('\n')
  )
  const [submitting, setSubmitting] = useState(false)

  const trimmedName = name.trim()
  const canSubmit = trimmedName.length > 0 && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const objArr = objectives
        .split('\n').map(s => s.trim()).filter(Boolean).slice(0, 10)
      await onSubmit({
        name: trimmedName,
        description: description.trim(),
        board,
        difficulty,
        category,
        isPublic,
        objectives: objArr,
        // diagram + sketch sẽ được parent gắn vào (đọc từ state hiện tại)
        diagram: { parts: [] }, // placeholder, parent overrides
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Save className="w-4 h-4 text-emerald-400" />
            {isUpdate ? 'Cập nhật mạch' : 'Lưu mạch vào thư viện'}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          Mạch sẽ xuất hiện trong dropdown <strong>"📁 Mạch của tôi"</strong> bên cạnh
          các template có sẵn. Bật chia sẻ công khai để mọi người dùng đều thấy được.
        </p>

        {/* Name */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
            Tên mạch <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            autoFocus
            placeholder="vd. Đếm 0-99 trên 2 led 7-đoạn"
            className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
            Mô tả ngắn
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Giải thích ngắn về mạch — nguyên lý, ứng dụng…"
            className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-sm text-zinc-100 resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
          />
        </div>

        {/* Category — grid picker */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
            Danh mục
          </label>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {CIRCUIT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`text-left text-xs px-2.5 py-2 rounded-md border transition flex items-center gap-1.5 ${
                  category === c.id
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                    : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                <span className="text-base">{c.emoji}</span>
                <span className="truncate">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Board + Difficulty in same row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              Board
            </label>
            <select
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              className="w-full mt-1 px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-sm text-zinc-100"
            >
              <option>Arduino UNO</option>
              <option>Arduino Nano</option>
              <option>Arduino Mega</option>
              <option>ESP32</option>
              <option>ESP32-C3</option>
              <option>Raspberry Pi Pico</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              Độ khó
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full mt-1 px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-sm text-zinc-100"
            >
              <option value="Dễ">Dễ</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Nâng cao">Nâng cao</option>
            </select>
          </div>
        </div>

        {/* Objectives — multiline, 1 dòng = 1 mục tiêu */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
            Mục tiêu học tập <span className="text-zinc-600 normal-case">(mỗi dòng = 1 mục tiêu, tối đa 10)</span>
          </label>
          <textarea
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
            rows={3}
            placeholder={'vd:\nHiểu nguyên lý dịch bit của 74HC595\nDùng shiftOut() điều khiển 16 LED bằng 3 chân'}
            className="w-full mt-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md text-sm text-zinc-100 resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
          />
        </div>

        {/* Public toggle */}
        <label className="flex items-start gap-2 p-2.5 rounded-md bg-zinc-950 border border-zinc-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-0.5 accent-emerald-500"
          />
          <div className="text-xs">
            <div className="text-zinc-200 font-semibold flex items-center gap-1.5">
              {isPublic ? <Globe className="w-3.5 h-3.5 text-emerald-300" /> : <UserIcon className="w-3.5 h-3.5 text-zinc-400" />}
              {isPublic ? 'Chia sẻ công khai' : 'Chỉ mình tôi xem được'}
            </div>
            <div className="text-zinc-500 mt-0.5">
              {isPublic
                ? 'Mọi user khác sẽ thấy mạch này trong mục "🌍 Công khai từ cộng đồng".'
                : 'Bật để chia sẻ với cộng đồng — vẫn có thể tắt sau.'}
            </div>
          </div>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-xs px-3 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="text-xs px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isUpdate ? 'Lưu thay đổi' : 'Lưu mạch'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// BrowseGalleryModal — khám phá tất cả mạch (cá nhân + công khai)
// ────────────────────────────────────────────────────────────────
interface GalleryProps {
  myCircuits: CustomCircuit[]
  communityCircuits: CustomCircuit[]
  activeId: string
  onClose: () => void
  onOpen: (c: CustomCircuit) => void
}

function BrowseGalleryModal({
  myCircuits, communityCircuits, activeId, onClose, onOpen,
}: GalleryProps) {
  const [tab, setTab] = useState<'community' | 'mine'>(
    myCircuits.length === 0 ? 'community' : 'mine'
  )
  const [catFilter, setCatFilter] = useState<string>('all')
  const [searchQ, setSearchQ] = useState('')

  const source = tab === 'mine' ? myCircuits : communityCircuits

  // Filter pipeline
  const filtered = useMemo(() => {
    let list = source
    if (catFilter !== 'all') list = list.filter(c => c.category === catFilter)
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      )
    }
    return list
  }, [source, catFilter, searchQ])

  // Group by category for display
  const grouped = useMemo(() => {
    const m = new Map<string, CustomCircuit[]>()
    for (const c of filtered) {
      const arr = m.get(c.category) ?? []
      arr.push(c); m.set(c.category, arr)
    }
    // Sort by CIRCUIT_CATEGORIES order
    const ordered: [string, CustomCircuit[]][] = []
    for (const cat of CIRCUIT_CATEGORIES) {
      const arr = m.get(cat.id)
      if (arr) ordered.push([cat.id, arr])
    }
    // Append unknown categories at end
    for (const [k, v] of m) {
      if (!CIRCUIT_CATEGORIES.find(c => c.id === k)) ordered.push([k, v])
    }
    return ordered
  }, [filtered])

  const usedCategories = useMemo(() => {
    const s = new Set(source.map(c => c.category))
    return s
  }, [source])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-cyan-300" />
            <h3 className="text-base font-bold text-zinc-100">Khám phá mạch Custom</h3>
            <div className="flex items-center gap-1 bg-zinc-800/60 border border-zinc-700 rounded-md p-0.5">
              <button
                onClick={() => { setTab('mine'); setCatFilter('all') }}
                className={`text-[11px] px-2.5 py-1 rounded transition ${
                  tab === 'mine'
                    ? 'bg-cyan-500/25 text-cyan-200'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📁 Của tôi ({myCircuits.length})
              </button>
              <button
                onClick={() => { setTab('community'); setCatFilter('all') }}
                className={`text-[11px] px-2.5 py-1 rounded transition ${
                  tab === 'community'
                    ? 'bg-cyan-500/25 text-cyan-200'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🌍 Cộng đồng ({communityCircuits.length})
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-3 border-b border-zinc-800 flex items-center gap-2 flex-wrap">
          <input
            type="search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Tìm theo tên hoặc mô tả..."
            className="flex-1 min-w-[200px] px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-md text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/60"
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="text-xs bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1.5 text-zinc-200"
          >
            <option value="all">Tất cả danh mục ({source.length})</option>
            {CIRCUIT_CATEGORIES.filter(c => usedCategories.has(c.id)).map(c => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Grid scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-zinc-500">
              {tab === 'mine'
                ? 'Bạn chưa lưu mạch nào. Hãy thiết kế và bấm "Lưu mạch" để thêm vào thư viện cá nhân!'
                : source.length === 0
                ? 'Chưa có mạch công khai nào. Hãy là người đầu tiên chia sẻ!'
                : 'Không có mạch nào khớp bộ lọc — thử bỏ keyword hoặc đổi danh mục.'}
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(([catId, items]) => (
                <div key={catId}>
                  <h4 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 flex items-center gap-1.5">
                    <span className="text-base">{categoryEmoji(catId)}</span>
                    {categoryLabel(catId)}
                    <span className="text-zinc-600">· {items.length}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {items.map(c => {
                      const partsCount = Array.isArray((c.diagram as any)?.parts)
                        ? (c.diagram as any).parts.length : 0
                      const connCount = Array.isArray((c.diagram as any)?.connections)
                        ? (c.diagram as any).connections.length : 0
                      const isActive = c.id === activeId
                      return (
                        <button
                          key={c.id}
                          onClick={() => onOpen(c)}
                          className={`text-left rounded-lg border p-3 transition group ${
                            isActive
                              ? 'border-cyan-500/60 bg-cyan-500/10 ring-1 ring-cyan-500/40'
                              : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-base">{categoryEmoji(c.category)}</span>
                              <span className="text-sm font-semibold text-zinc-100 truncate">{c.name}</span>
                            </div>
                            <span className={`text-[9px] px-1 py-0.5 rounded shrink-0 ${
                              c.difficulty === 'Dễ' ? 'bg-emerald-500/15 text-emerald-300'
                              : c.difficulty === 'Trung bình' ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-rose-500/15 text-rose-300'
                            }`}>
                              {c.difficulty}
                            </span>
                          </div>
                          {c.description && (
                            <p className="text-[11px] text-zinc-400 mb-1.5 line-clamp-2">{c.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                            <span>{c.board}</span>
                            <span>·</span>
                            <span>{partsCount} parts</span>
                            <span>·</span>
                            <span>{connCount} dây</span>
                            {c.isPublic && (
                              <>
                                <span>·</span>
                                <span className="text-emerald-400 inline-flex items-center gap-0.5">
                                  <Globe className="w-2.5 h-2.5" /> Công khai
                                </span>
                              </>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-2 border-t border-zinc-800 text-[10px] text-zinc-500 text-center">
          💡 Click 1 mạch để mở · Mạch cộng đồng có thể "Lưu mạch" để clone về thư viện cá nhân
        </div>
      </div>
    </div>
  )
}
