// ============================================
// Component Registry - ALL Wokwi Components
// Complete list matching Wokwi's component picker
// ============================================

import { ComponentMeta } from './types';

export const COMPONENT_REGISTRY: Record<string, ComponentMeta> = {

  // =============================================
  // MICROCONTROLLERS / BOARDS
  // =============================================

  'board-esp32-devkit-c-v4': {
    type: 'board-esp32-devkit-c-v4',
    label: 'ESP32 DevKit C V4',
    category: 'microcontroller',
    width: 105,
    height: 214,
    defaultAttrs: {},
    pins: [
      { name: '3V3', x: -4, y: 72, signal: 'power' },
      { name: 'EN', x: -4, y: 82, signal: 'digital' },
      { name: 'VP', x: -4, y: 91, signal: 'analog' },
      { name: 'VN', x: -4, y: 101, signal: 'analog' },
      { name: '34', x: -4, y: 110, signal: 'analog' },
      { name: '35', x: -4, y: 120, signal: 'analog' },
      { name: '32', x: -4, y: 129, signal: 'analog' },
      { name: '33', x: -4, y: 139, signal: 'analog' },
      { name: '25', x: -4, y: 148, signal: 'analog' },
      { name: '26', x: -4, y: 158, signal: 'analog' },
      { name: '27', x: -4, y: 167, signal: 'analog' },
      { name: '14', x: -4, y: 177, signal: 'digital' },
      { name: '12', x: -4, y: 186, signal: 'digital' },
      { name: 'GND.1', x: -4, y: 196, signal: 'ground' },
      { name: '13', x: -4, y: 205, signal: 'digital' },
      { name: 'GND', x: 109, y: 72, signal: 'ground' },
      { name: '23', x: 109, y: 82, signal: 'digital' },
      { name: '22', x: 109, y: 91, signal: 'digital' },
      { name: 'TX', x: 109, y: 101, signal: 'digital' },
      { name: 'RX', x: 109, y: 110, signal: 'digital' },
      { name: '21', x: 109, y: 120, signal: 'digital' },
      { name: '19', x: 109, y: 129, signal: 'digital' },
      { name: '18', x: 109, y: 139, signal: 'digital' },
      { name: '5', x: 109, y: 148, signal: 'digital' },
      { name: '17', x: 109, y: 158, signal: 'digital' },
      { name: '16', x: 109, y: 167, signal: 'digital' },
      { name: '4', x: 109, y: 177, signal: 'digital' },
      { name: '0', x: 109, y: 186, signal: 'digital' },
      { name: '2', x: 109, y: 196, signal: 'digital' },
      { name: '15', x: 109, y: 205, signal: 'digital' },
    ],
  },

  'wokwi-arduino-uno': {
    type: 'wokwi-arduino-uno',
    label: 'Arduino Uno',
    category: 'microcontroller',
    width: 220,
    height: 280,
    defaultAttrs: {},
    pins: [
      ...Array.from({ length: 14 }, (_, i) => ({
        name: `D${i}`,
        x: 28 + i * 11.5,
        y: -3,
        signal: 'digital' as const,
      })),
      { name: 'GND', x: 28 + 14 * 11.5, y: -3, signal: 'ground' as const },
      { name: 'AREF', x: 28 + 15 * 11.5, y: -3, signal: 'power' as const },
      ...['A0','A1','A2','A3','A4','A5'].map((name, i) => ({
        name, x: 43 + i * 12, y: 283, signal: 'analog' as const,
      })),
      { name: 'VIN', x: 43 + 6 * 12, y: 283, signal: 'power' as const },
      { name: 'GND.2', x: 43 + 7 * 12, y: 283, signal: 'ground' as const },
      { name: 'GND.3', x: 43 + 8 * 12, y: 283, signal: 'ground' as const },
      { name: '5V', x: 43 + 9 * 12, y: 283, signal: 'power' as const },
      { name: '3V3', x: 43 + 10 * 12, y: 283, signal: 'power' as const },
      { name: 'RST', x: 43 + 11 * 12, y: 283, signal: 'digital' as const },
    ],
  },

  'wokwi-arduino-mega': {
    type: 'wokwi-arduino-mega',
    label: 'Arduino Mega 2560',
    category: 'microcontroller',
    width: 280,
    height: 320,
    defaultAttrs: {},
    pins: [
      ...Array.from({ length: 54 }, (_, i) => ({
        name: `D${i}`, x: 20 + (i % 27) * 9, y: i < 27 ? -3 : 323, signal: 'digital' as const,
      })),
      ...['A0','A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15'].map((name, i) => ({
        name, x: 20 + i * 9, y: 323, signal: 'analog' as const,
      })),
    ],
  },

  'wokwi-arduino-nano': {
    type: 'wokwi-arduino-nano',
    label: 'Arduino Nano',
    category: 'microcontroller',
    width: 70,
    height: 180,
    defaultAttrs: {},
    pins: [
      ...Array.from({ length: 14 }, (_, i) => ({
        name: `D${i}`, x: -4, y: 30 + i * 10, signal: 'digital' as const,
      })),
      ...['A0','A1','A2','A3','A4','A5','A6','A7'].map((name, i) => ({
        name, x: 74, y: 30 + i * 10, signal: 'analog' as const,
      })),
    ],
  },

  'board-esp32-s2-devkitm-1': {
    type: 'board-esp32-s2-devkitm-1',
    label: 'ESP32-S2',
    category: 'microcontroller',
    width: 100,
    height: 200,
    defaultAttrs: {},
    pins: [
      { name: '3V3', x: -4, y: 60, signal: 'power' },
      { name: 'GND', x: -4, y: 70, signal: 'ground' },
      ...Array.from({ length: 10 }, (_, i) => ({
        name: `${i}`, x: -4, y: 80 + i * 10, signal: 'digital' as const,
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        name: `${i+10}`, x: 104, y: 80 + i * 10, signal: 'digital' as const,
      })),
    ],
  },

  'board-esp32-s3-devkitc-1': {
    type: 'board-esp32-s3-devkitc-1',
    label: 'ESP32-S3',
    category: 'microcontroller',
    width: 105,
    height: 220,
    defaultAttrs: {},
    pins: [
      { name: '3V3', x: -4, y: 65, signal: 'power' },
      { name: 'GND', x: -4, y: 75, signal: 'ground' },
      ...Array.from({ length: 12 }, (_, i) => ({
        name: `${i}`, x: -4, y: 85 + i * 10, signal: 'digital' as const,
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        name: `${i+12}`, x: 109, y: 85 + i * 10, signal: 'digital' as const,
      })),
    ],
  },

  'board-esp32-c3-devkitm-1': {
    type: 'board-esp32-c3-devkitm-1',
    label: 'ESP32-C3',
    category: 'microcontroller',
    width: 90,
    height: 160,
    defaultAttrs: {},
    pins: [
      { name: '3V3', x: -4, y: 50, signal: 'power' },
      { name: 'GND', x: -4, y: 60, signal: 'ground' },
      ...Array.from({ length: 8 }, (_, i) => ({
        name: `${i}`, x: -4, y: 70 + i * 10, signal: 'digital' as const,
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        name: `${i+8}`, x: 94, y: 70 + i * 10, signal: 'digital' as const,
      })),
    ],
  },

  'wokwi-pi-pico': {
    type: 'wokwi-pi-pico',
    label: 'Raspberry Pi Pico',
    category: 'microcontroller',
    width: 90,
    height: 210,
    defaultAttrs: {},
    pins: [
      ...Array.from({ length: 20 }, (_, i) => ({
        name: `GP${i}`, x: -4, y: 25 + i * 9, signal: 'digital' as const,
      })),
      { name: '3V3', x: 94, y: 25, signal: 'power' },
      { name: 'GND', x: 94, y: 35, signal: 'ground' },
      ...Array.from({ length: 8 }, (_, i) => ({
        name: `GP${i+20}`, x: 94, y: 55 + i * 9, signal: 'digital' as const,
      })),
    ],
  },

  'wokwi-pi-pico-w': {
    type: 'wokwi-pi-pico-w',
    label: 'Raspberry Pi Pico W',
    category: 'microcontroller',
    width: 90,
    height: 210,
    defaultAttrs: {},
    pins: [
      ...Array.from({ length: 20 }, (_, i) => ({
        name: `GP${i}`, x: -4, y: 25 + i * 9, signal: 'digital' as const,
      })),
      { name: '3V3', x: 94, y: 25, signal: 'power' },
      { name: 'GND', x: 94, y: 35, signal: 'ground' },
    ],
  },

  'wokwi-attiny85': {
    type: 'wokwi-attiny85',
    label: 'ATtiny85',
    category: 'microcontroller',
    width: 40,
    height: 50,
    defaultAttrs: {},
    pins: [
      { name: 'PB5', x: -4, y: 10, signal: 'digital' },
      { name: 'PB3', x: -4, y: 20, signal: 'digital' },
      { name: 'PB4', x: -4, y: 30, signal: 'digital' },
      { name: 'GND', x: -4, y: 40, signal: 'ground' },
      { name: 'PB0', x: 44, y: 40, signal: 'digital' },
      { name: 'PB1', x: 44, y: 30, signal: 'digital' },
      { name: 'PB2', x: 44, y: 20, signal: 'digital' },
      { name: 'VCC', x: 44, y: 10, signal: 'power' },
    ],
  },

  // =============================================
  // BASIC / PASSIVE COMPONENTS
  // =============================================

  'wokwi-led': {
    type: 'wokwi-led',
    label: 'LED',
    category: 'led',
    width: 56,
    height: 121,
    defaultAttrs: { color: 'red' },
    pins: [
      { name: 'A', x: 14.4, y: 120.8, signal: 'digital' },
      { name: 'C', x: 44, y: 120.8, signal: 'ground' },
    ],
  },

  'wokwi-rgb-led': {
    type: 'wokwi-rgb-led',
    label: 'RGB LED (Common Cathode)',
    category: 'led',
    width: 60,
    height: 121,
    defaultAttrs: { common: 'cathode' },
    pins: [
      { name: 'R', x: 10, y: 121, signal: 'digital' },
      { name: 'COM', x: 22, y: 121, signal: 'ground' },
      { name: 'G', x: 38, y: 121, signal: 'digital' },
      { name: 'B', x: 50, y: 121, signal: 'digital' },
    ],
  },

  'wokwi-pushbutton': {
    type: 'wokwi-pushbutton',
    label: 'Push Button',
    category: 'input',
    width: 50,
    height: 40,
    defaultAttrs: { color: 'red', bounce: 'false' },
    pins: [
      { name: '1.l', x: -8, y: 11, signal: 'digital' },
      { name: '2.l', x: -8, y: 28, signal: 'digital' },
      { name: '1.r', x: 48, y: 11, signal: 'digital' },
      { name: '2.r', x: 48, y: 28, signal: 'digital' },
    ],
  },

  'wokwi-resistor': {
    type: 'wokwi-resistor',
    label: 'Resistor',
    category: 'passive',
    width: 125,
    height: 24,
    defaultAttrs: { value: '1000' },
    pins: [
      { name: '1', x: 0, y: 12, signal: 'digital' },
      { name: '2', x: 124.8, y: 12, signal: 'digital' },
    ],
  },

  'wokwi-breadboard-half': {
    type: 'wokwi-breadboard-half',
    label: 'Half Breadboard',
    category: 'passive',
    width: 280,
    height: 180,
    defaultAttrs: {},
    pins: [],
  },

  'wokwi-breadboard': {
    type: 'wokwi-breadboard',
    label: 'Full Breadboard',
    category: 'passive',
    width: 540,
    height: 180,
    defaultAttrs: {},
    pins: [],
  },

  // =============================================
  // DISPLAY COMPONENTS
  // =============================================

  'wokwi-neopixel-ring': {
    type: 'wokwi-neopixel-ring',
    label: 'NeoPixel Ring (WS2812)',
    category: 'display',
    width: 80,
    height: 80,
    defaultAttrs: { pixels: '16' },
    pins: [
      { name: 'GND', x: 10, y: 80, signal: 'ground' },
      { name: 'VCC', x: 30, y: 80, signal: 'power' },
      { name: 'DIN', x: 50, y: 80, signal: 'digital' },
      { name: 'DOUT', x: 70, y: 80, signal: 'digital' },
    ],
  },

  'wokwi-led-strip': {
    type: 'wokwi-led-strip',
    label: 'LED Strip (WS2812/NeoPixel)',
    category: 'display',
    width: 200,
    height: 30,
    defaultAttrs: { pixels: '8' },
    pins: [
      { name: 'GND', x: 0, y: 25, signal: 'ground' },
      { name: 'VCC', x: 0, y: 15, signal: 'power' },
      { name: 'DIN', x: 0, y: 5, signal: 'digital' },
      { name: 'DOUT', x: 200, y: 5, signal: 'digital' },
    ],
  },

  'wokwi-led-matrix': {
    type: 'wokwi-led-matrix',
    label: 'LED Matrix (WS2812/NeoPixel)',
    category: 'display',
    width: 100,
    height: 100,
    defaultAttrs: { rows: '8', cols: '8' },
    pins: [
      { name: 'GND', x: 10, y: 100, signal: 'ground' },
      { name: 'VCC', x: 30, y: 100, signal: 'power' },
      { name: 'DIN', x: 50, y: 100, signal: 'digital' },
      { name: 'DOUT', x: 70, y: 100, signal: 'digital' },
    ],
  },

  'wokwi-7segment': {
    type: 'wokwi-7segment',
    label: 'Seven Segment Display',
    category: 'display',
    width: 50,
    height: 70,
    defaultAttrs: { color: 'red', common: 'anode' },
    pins: [
      { name: 'A', x: 5, y: -3, signal: 'digital' },
      { name: 'B', x: 15, y: -3, signal: 'digital' },
      { name: 'C', x: 25, y: -3, signal: 'digital' },
      { name: 'D', x: 35, y: -3, signal: 'digital' },
      { name: 'E', x: 45, y: -3, signal: 'digital' },
      { name: 'F', x: 5, y: 73, signal: 'digital' },
      { name: 'G', x: 15, y: 73, signal: 'digital' },
      { name: 'DP', x: 25, y: 73, signal: 'digital' },
      { name: 'COM', x: 35, y: 73, signal: 'digital' },
      { name: 'DIG', x: 45, y: 73, signal: 'digital' },
    ],
  },

  'wokwi-7segment-4digit': {
    type: 'wokwi-7segment-4digit',
    label: 'Seven Segment (4 digits)',
    category: 'display',
    width: 120,
    height: 70,
    defaultAttrs: { color: 'red', common: 'anode' },
    pins: [
      ...Array.from({ length: 12 }, (_, i) => ({
        name: `P${i}`, x: 10 + i * 9, y: -3, signal: 'digital' as const,
      })),
    ],
  },

  'wokwi-tm1637': {
    type: 'wokwi-tm1637',
    label: 'Seven Segment (TM1637)',
    category: 'display',
    width: 120,
    height: 65,
    defaultAttrs: {},
    pins: [
      { name: 'CLK', x: 20, y: 65, signal: 'digital' },
      { name: 'DIO', x: 40, y: 65, signal: 'digital' },
      { name: 'VCC', x: 80, y: 65, signal: 'power' },
      { name: 'GND', x: 100, y: 65, signal: 'ground' },
    ],
  },

  'wokwi-led-bar-graph': {
    type: 'wokwi-led-bar-graph',
    label: 'LED Bar Graph',
    category: 'display',
    width: 50,
    height: 80,
    defaultAttrs: { color: 'lime' },
    pins: [
      ...Array.from({ length: 10 }, (_, i) => ({
        name: `A${i+1}`, x: -4, y: 8 + i * 7, signal: 'digital' as const,
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        name: `C${i+1}`, x: 54, y: 8 + i * 7, signal: 'ground' as const,
      })),
    ],
  },

  'wokwi-epaper-29': {
    type: 'wokwi-epaper-29',
    label: '2.9" e-Paper Display',
    category: 'display',
    width: 160,
    height: 80,
    defaultAttrs: {},
    pins: [
      { name: 'DIN', x: 20, y: 80, signal: 'digital' },
      { name: 'CLK', x: 40, y: 80, signal: 'digital' },
      { name: 'CS', x: 60, y: 80, signal: 'digital' },
      { name: 'DC', x: 80, y: 80, signal: 'digital' },
      { name: 'RST', x: 100, y: 80, signal: 'digital' },
      { name: 'BUSY', x: 120, y: 80, signal: 'digital' },
      { name: 'VCC', x: 140, y: 80, signal: 'power' },
      { name: 'GND', x: 150, y: 80, signal: 'ground' },
    ],
  },

  'wokwi-lcd1602': {
    type: 'wokwi-lcd1602',
    label: 'LCD 16x2',
    category: 'display',
    width: 160,
    height: 72,
    defaultAttrs: { color: 'green', pins: '11' },
    pins: [
      { name: 'VSS', x: -6, y: 16, signal: 'ground' },
      { name: 'VDD', x: -6, y: 22, signal: 'power' },
      { name: 'SDA', x: -6, y: 34, signal: 'digital' },
      { name: 'SCL', x: -6, y: 40, signal: 'digital' },
    ],
  },

  'wokwi-lcd2004': {
    type: 'wokwi-lcd2004',
    label: 'LCD 20x4',
    category: 'display',
    width: 180,
    height: 90,
    defaultAttrs: { color: 'green', pins: '11' },
    pins: [
      { name: 'VSS', x: -6, y: 20, signal: 'ground' },
      { name: 'VDD', x: -6, y: 28, signal: 'power' },
      { name: 'SDA', x: -6, y: 44, signal: 'digital' },
      { name: 'SCL', x: -6, y: 52, signal: 'digital' },
    ],
  },

  'wokwi-ili9341': {
    type: 'wokwi-ili9341',
    label: 'ILI9341 LCD Display',
    category: 'display',
    width: 120,
    height: 160,
    defaultAttrs: {},
    pins: [
      { name: 'VCC', x: 10, y: -4, signal: 'power' },
      { name: 'GND', x: 25, y: -4, signal: 'ground' },
      { name: 'CS', x: 40, y: -4, signal: 'digital' },
      { name: 'RST', x: 55, y: -4, signal: 'digital' },
      { name: 'DC', x: 70, y: -4, signal: 'digital' },
      { name: 'MOSI', x: 85, y: -4, signal: 'digital' },
      { name: 'SCK', x: 100, y: -4, signal: 'digital' },
      { name: 'LED', x: 115, y: -4, signal: 'digital' },
    ],
  },

  'wokwi-ssd1306': {
    type: 'wokwi-ssd1306',
    label: 'SSD1306 OLED',
    category: 'display',
    width: 80,
    height: 50,
    defaultAttrs: {},
    pins: [
      { name: 'GND', x: 15, y: 50, signal: 'ground' },
      { name: 'VCC', x: 30, y: 50, signal: 'power' },
      { name: 'SCL', x: 45, y: 50, signal: 'digital' },
      { name: 'SDA', x: 60, y: 50, signal: 'digital' },
    ],
  },

  'wokwi-max7219-matrix': {
    type: 'wokwi-max7219-matrix',
    label: 'MAX7219 LED Dot Matrix',
    category: 'display',
    width: 65,
    height: 65,
    defaultAttrs: {},
    pins: [
      { name: 'VCC', x: 10, y: -4, signal: 'power' },
      { name: 'GND', x: 20, y: -4, signal: 'ground' },
      { name: 'DIN', x: 30, y: -4, signal: 'digital' },
      { name: 'CS', x: 40, y: -4, signal: 'digital' },
      { name: 'CLK', x: 50, y: -4, signal: 'digital' },
    ],
  },

  'wokwi-neopixel-meter': {
    type: 'wokwi-neopixel-meter',
    label: 'NeoPixel Meter',
    category: 'display',
    width: 80,
    height: 50,
    defaultAttrs: { pixels: '8' },
    pins: [
      { name: 'GND', x: 10, y: 50, signal: 'ground' },
      { name: 'VCC', x: 30, y: 50, signal: 'power' },
      { name: 'DIN', x: 50, y: 50, signal: 'digital' },
    ],
  },

  // =============================================
  // INPUT COMPONENTS
  // =============================================

  'wokwi-potentiometer': {
    type: 'wokwi-potentiometer',
    label: 'Potentiometer',
    category: 'input',
    width: 55,
    height: 55,
    defaultAttrs: { value: '10000' },
    pins: [
      { name: 'GND', x: 21, y: 54, signal: 'ground' },
      { name: 'SIG', x: 28, y: 54, signal: 'analog' },
      { name: 'VCC', x: 35, y: 54, signal: 'power' },
    ],
  },

  'wokwi-slide-potentiometer': {
    type: 'wokwi-slide-potentiometer',
    label: 'Slide Potentiometer',
    category: 'input',
    width: 120,
    height: 35,
    defaultAttrs: { value: '10000' },
    pins: [
      { name: 'VCC', x: 20, y: 35, signal: 'power' },
      { name: 'SIG', x: 60, y: 35, signal: 'analog' },
      { name: 'GND', x: 100, y: 35, signal: 'ground' },
    ],
  },

  'wokwi-analog-joystick': {
    type: 'wokwi-analog-joystick',
    label: 'Analog Joystick',
    category: 'input',
    width: 70,
    height: 70,
    defaultAttrs: {},
    pins: [
      { name: 'VCC', x: 10, y: 70, signal: 'power' },
      { name: 'VERT', x: 22, y: 70, signal: 'analog' },
      { name: 'HORZ', x: 34, y: 70, signal: 'analog' },
      { name: 'SEL', x: 46, y: 70, signal: 'digital' },
      { name: 'GND', x: 58, y: 70, signal: 'ground' },
    ],
  },

  'wokwi-membrane-keypad': {
    type: 'wokwi-membrane-keypad',
    label: 'Membrane Keypad 4x4',
    category: 'input',
    width: 80,
    height: 100,
    defaultAttrs: { keys: '4x4' },
    pins: [
      ...Array.from({ length: 8 }, (_, i) => ({
        name: `C${i}`, x: 10 + i * 9, y: 100, signal: 'digital' as const,
      })),
    ],
  },

  'wokwi-ky-040': {
    type: 'wokwi-ky-040',
    label: 'Rotary Encoder (KY-040)',
    category: 'input',
    width: 40,
    height: 50,
    defaultAttrs: {},
    pins: [
      { name: 'CLK', x: 5, y: 50, signal: 'digital' },
      { name: 'DT', x: 13, y: 50, signal: 'digital' },
      { name: 'SW', x: 21, y: 50, signal: 'digital' },
      { name: 'VCC', x: 29, y: 50, signal: 'power' },
      { name: 'GND', x: 37, y: 50, signal: 'ground' },
    ],
  },

  'wokwi-slide-switch': {
    type: 'wokwi-slide-switch',
    label: 'Slide Switch',
    category: 'input',
    width: 30,
    height: 20,
    defaultAttrs: {},
    pins: [
      { name: '1', x: 5, y: 20, signal: 'digital' },
      { name: '2', x: 15, y: 20, signal: 'digital' },
      { name: '3', x: 25, y: 20, signal: 'digital' },
    ],
  },

  'wokwi-dip-switch-8': {
    type: 'wokwi-dip-switch-8',
    label: 'DIP Switch 8',
    category: 'input',
    width: 80,
    height: 25,
    defaultAttrs: {},
    pins: [
      ...Array.from({ length: 8 }, (_, i) => ({
        name: `${i+1}`, x: 8 + i * 9, y: -3, signal: 'digital' as const,
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        name: `${i+9}`, x: 8 + i * 9, y: 28, signal: 'digital' as const,
      })),
    ],
  },

  'wokwi-tilt-switch': {
    type: 'wokwi-tilt-switch',
    label: 'Tilt Switch',
    category: 'input',
    width: 20,
    height: 30,
    defaultAttrs: {},
    pins: [
      { name: '1', x: 5, y: 30, signal: 'digital' },
      { name: '2', x: 15, y: 30, signal: 'digital' },
    ],
  },

  // =============================================
  // SENSOR COMPONENTS
  // =============================================

  'wokwi-dht22': {
    type: 'wokwi-dht22',
    label: 'DHT22 Temp/Humidity',
    category: 'sensor',
    width: 45,
    height: 93,
    defaultAttrs: { temperature: '24', humidity: '40' },
    pins: [
      { name: 'VCC', x: 12, y: 93, signal: 'power' },
      { name: 'SDA', x: 19, y: 93, signal: 'digital' },
      { name: 'NC', x: 27, y: 93, signal: 'digital' },
      { name: 'GND', x: 35, y: 93, signal: 'ground' },
    ],
  },

  'wokwi-pir-motion-sensor': {
    type: 'wokwi-pir-motion-sensor',
    label: 'PIR Motion Sensor',
    category: 'sensor',
    width: 60,
    height: 60,
    defaultAttrs: {},
    pins: [
      { name: 'GND', x: 15, y: 60, signal: 'ground' },
      { name: 'OUT', x: 30, y: 60, signal: 'digital' },
      { name: 'VCC', x: 45, y: 60, signal: 'power' },
    ],
  },

  'wokwi-hc-sr04': {
    type: 'wokwi-hc-sr04',
    label: 'HC-SR04 Ultrasonic',
    category: 'sensor',
    width: 80,
    height: 45,
    defaultAttrs: { distance: '100' },
    pins: [
      { name: 'VCC', x: 15, y: 45, signal: 'power' },
      { name: 'TRIG', x: 30, y: 45, signal: 'digital' },
      { name: 'ECHO', x: 50, y: 45, signal: 'digital' },
      { name: 'GND', x: 65, y: 45, signal: 'ground' },
    ],
  },

  'wokwi-ntc-temperature-sensor': {
    type: 'wokwi-ntc-temperature-sensor',
    label: 'NTC Temperature Sensor',
    category: 'sensor',
    width: 25,
    height: 35,
    defaultAttrs: { temperature: '24' },
    pins: [
      { name: '1', x: 8, y: 35, signal: 'analog' },
      { name: '2', x: 17, y: 35, signal: 'analog' },
    ],
  },

  'wokwi-photoresistor-sensor': {
    type: 'wokwi-photoresistor-sensor',
    label: 'Photoresistor (LDR)',
    category: 'sensor',
    width: 25,
    height: 35,
    defaultAttrs: { lux: '500' },
    pins: [
      { name: '1', x: 8, y: 35, signal: 'analog' },
      { name: '2', x: 17, y: 35, signal: 'analog' },
    ],
  },

  'wokwi-flame-sensor': {
    type: 'wokwi-flame-sensor',
    label: 'Flame Sensor',
    category: 'sensor',
    width: 30,
    height: 40,
    defaultAttrs: {},
    pins: [
      { name: 'VCC', x: 5, y: 40, signal: 'power' },
      { name: 'GND', x: 15, y: 40, signal: 'ground' },
      { name: 'DO', x: 25, y: 40, signal: 'digital' },
    ],
  },

  'wokwi-gas-sensor': {
    type: 'wokwi-gas-sensor',
    label: 'Gas Sensor (MQ-2)',
    category: 'sensor',
    width: 40,
    height: 45,
    defaultAttrs: {},
    pins: [
      { name: 'VCC', x: 8, y: 45, signal: 'power' },
      { name: 'GND', x: 18, y: 45, signal: 'ground' },
      { name: 'DO', x: 28, y: 45, signal: 'digital' },
      { name: 'AO', x: 38, y: 45, signal: 'analog' },
    ],
  },

  'wokwi-ir-receiver': {
    type: 'wokwi-ir-receiver',
    label: 'IR Receiver',
    category: 'sensor',
    width: 20,
    height: 30,
    defaultAttrs: {},
    pins: [
      { name: 'GND', x: 3, y: 30, signal: 'ground' },
      { name: 'VCC', x: 10, y: 30, signal: 'power' },
      { name: 'DAT', x: 17, y: 30, signal: 'digital' },
    ],
  },

  'wokwi-ds1307': {
    type: 'wokwi-ds1307',
    label: 'DS1307 RTC',
    category: 'sensor',
    width: 40,
    height: 50,
    defaultAttrs: {},
    pins: [
      { name: 'GND', x: 5, y: 50, signal: 'ground' },
      { name: 'VCC', x: 15, y: 50, signal: 'power' },
      { name: 'SDA', x: 25, y: 50, signal: 'digital' },
      { name: 'SCL', x: 35, y: 50, signal: 'digital' },
    ],
  },

  'wokwi-mpu6050': {
    type: 'wokwi-mpu6050',
    label: 'MPU6050 Accelerometer',
    category: 'sensor',
    width: 40,
    height: 50,
    defaultAttrs: {},
    pins: [
      { name: 'VCC', x: 5, y: -4, signal: 'power' },
      { name: 'GND', x: 12, y: -4, signal: 'ground' },
      { name: 'SCL', x: 19, y: -4, signal: 'digital' },
      { name: 'SDA', x: 26, y: -4, signal: 'digital' },
      { name: 'XDA', x: 33, y: -4, signal: 'digital' },
      { name: 'XCL', x: 40, y: -4, signal: 'digital' },
    ],
  },

  'wokwi-hx711': {
    type: 'wokwi-hx711',
    label: 'HX711 Load Cell',
    category: 'sensor',
    width: 40,
    height: 50,
    defaultAttrs: {},
    pins: [
      { name: 'VCC', x: 5, y: 50, signal: 'power' },
      { name: 'DT', x: 15, y: 50, signal: 'digital' },
      { name: 'SCK', x: 25, y: 50, signal: 'digital' },
      { name: 'GND', x: 35, y: 50, signal: 'ground' },
    ],
  },

  // =============================================
  // OUTPUT / ACTUATOR COMPONENTS
  // =============================================

  'wokwi-buzzer': {
    type: 'wokwi-buzzer',
    label: 'Buzzer',
    category: 'actuator',
    width: 44,
    height: 52,
    defaultAttrs: {},
    pins: [
      { name: '1', x: 19, y: 52, signal: 'digital' },
      { name: '2', x: 25, y: 52, signal: 'ground' },
    ],
  },

  'wokwi-servo': {
    type: 'wokwi-servo',
    label: 'Servo Motor',
    category: 'actuator',
    width: 85,
    height: 60,
    defaultAttrs: {},
    pins: [
      { name: 'GND', x: 2, y: 25, signal: 'ground' },
      { name: 'V+', x: 2, y: 30, signal: 'power' },
      { name: 'PWM', x: 2, y: 35, signal: 'digital' },
    ],
  },

  'wokwi-stepper-motor': {
    type: 'wokwi-stepper-motor',
    label: 'Stepper Motor',
    category: 'actuator',
    width: 70,
    height: 70,
    defaultAttrs: {},
    pins: [
      { name: 'A-', x: 10, y: 70, signal: 'digital' },
      { name: 'A+', x: 25, y: 70, signal: 'digital' },
      { name: 'B+', x: 45, y: 70, signal: 'digital' },
      { name: 'B-', x: 60, y: 70, signal: 'digital' },
    ],
  },

  'wokwi-relay-module': {
    type: 'wokwi-relay-module',
    label: 'Relay Module',
    category: 'actuator',
    width: 60,
    height: 70,
    defaultAttrs: {},
    pins: [
      { name: 'VCC', x: 10, y: -4, signal: 'power' },
      { name: 'GND', x: 30, y: -4, signal: 'ground' },
      { name: 'IN', x: 50, y: -4, signal: 'digital' },
      { name: 'NC', x: 10, y: 74, signal: 'digital' },
      { name: 'COM', x: 30, y: 74, signal: 'digital' },
      { name: 'NO', x: 50, y: 74, signal: 'digital' },
    ],
  },

  'wokwi-a4988': {
    type: 'wokwi-a4988',
    label: 'A4988 Stepper Driver',
    category: 'actuator',
    width: 40,
    height: 60,
    defaultAttrs: {},
    pins: [
      { name: 'EN', x: -4, y: 10, signal: 'digital' },
      { name: 'MS1', x: -4, y: 18, signal: 'digital' },
      { name: 'MS2', x: -4, y: 26, signal: 'digital' },
      { name: 'MS3', x: -4, y: 34, signal: 'digital' },
      { name: 'RST', x: -4, y: 42, signal: 'digital' },
      { name: 'SLP', x: -4, y: 50, signal: 'digital' },
      { name: 'STEP', x: 44, y: 10, signal: 'digital' },
      { name: 'DIR', x: 44, y: 18, signal: 'digital' },
      { name: 'VMOT', x: 44, y: 34, signal: 'power' },
      { name: 'GND', x: 44, y: 42, signal: 'ground' },
    ],
  },

  // =============================================
  // LOGIC / COMMUNICATION
  // =============================================

  'wokwi-74hc595': {
    type: 'wokwi-74hc595',
    label: '74HC595 Shift Register',
    category: 'logic',
    width: 40,
    height: 50,
    defaultAttrs: {},
    pins: [
      { name: 'Q1', x: -4, y: 8, signal: 'digital' },
      { name: 'Q2', x: -4, y: 16, signal: 'digital' },
      { name: 'Q3', x: -4, y: 24, signal: 'digital' },
      { name: 'Q4', x: -4, y: 32, signal: 'digital' },
      { name: 'Q5', x: -4, y: 40, signal: 'digital' },
      { name: 'Q6', x: -4, y: 48, signal: 'digital' },
      { name: 'GND', x: -4, y: 56, signal: 'ground' },
      { name: 'Q7', x: 44, y: 8, signal: 'digital' },
      { name: 'VCC', x: 44, y: 16, signal: 'power' },
      { name: 'DS', x: 44, y: 24, signal: 'digital' },
      { name: 'OE', x: 44, y: 32, signal: 'digital' },
      { name: 'STCP', x: 44, y: 40, signal: 'digital' },
      { name: 'SHCP', x: 44, y: 48, signal: 'digital' },
    ],
  },

  'wokwi-74hc165': {
    type: 'wokwi-74hc165',
    label: '74HC165 Input Shift Register',
    category: 'logic',
    width: 40,
    height: 50,
    defaultAttrs: {},
    pins: [
      { name: 'SH', x: -4, y: 8, signal: 'digital' },
      { name: 'CLK', x: -4, y: 16, signal: 'digital' },
      { name: 'E', x: -4, y: 24, signal: 'digital' },
      { name: 'SER', x: -4, y: 32, signal: 'digital' },
      { name: 'D0', x: -4, y: 40, signal: 'digital' },
      { name: 'GND', x: -4, y: 48, signal: 'ground' },
      { name: 'Q7', x: 44, y: 8, signal: 'digital' },
      { name: 'VCC', x: 44, y: 48, signal: 'power' },
    ],
  },

  'wokwi-microsd-card': {
    type: 'wokwi-microsd-card',
    label: 'MicroSD Card Module',
    category: 'module',
    width: 50,
    height: 40,
    defaultAttrs: {},
    pins: [
      { name: 'CS', x: 5, y: 40, signal: 'digital' },
      { name: 'SCK', x: 15, y: 40, signal: 'digital' },
      { name: 'MOSI', x: 25, y: 40, signal: 'digital' },
      { name: 'MISO', x: 35, y: 40, signal: 'digital' },
      { name: 'VCC', x: 45, y: 40, signal: 'power' },
      { name: 'GND', x: 50, y: 40, signal: 'ground' },
    ],
  },
};

export const COMPONENT_CATEGORIES = [
  { id: 'microcontroller', label: 'Boards', icon: '🔲' },
  { id: 'led', label: 'LED', icon: '💡' },
  { id: 'passive', label: 'Passive', icon: '⚡' },
  { id: 'display', label: 'Display', icon: '📺' },
  { id: 'input', label: 'Input', icon: '🔘' },
  { id: 'sensor', label: 'Sensor', icon: '📡' },
  { id: 'actuator', label: 'Output', icon: '⚙️' },
  { id: 'logic', label: 'Logic', icon: '🔧' },
  { id: 'module', label: 'Module', icon: '📦' },
] as const;

export function getComponentsByCategory(category: string): ComponentMeta[] {
  return Object.values(COMPONENT_REGISTRY).filter(c => c.category === category);
}
