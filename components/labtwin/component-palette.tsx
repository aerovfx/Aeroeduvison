'use client';

import React, { useState, useRef, useEffect } from 'react';
import { COMPONENT_REGISTRY, COMPONENT_CATEGORIES, getComponentsByCategory } from '@/lib/labtwin/component-registry';
import { ComponentDef } from '@/lib/labtwin/types';

// ============================================
// Wokwi-style Component Picker Dialog
// Modal popup triggered by "+" button
// All Wokwi categories with thumbnail SVGs
// ============================================

interface ComponentPaletteProps {
  onAddComponent: (component: ComponentDef) => void;
  isOpen: boolean;
  onClose: () => void;
}

// Palette categories mapping to registry categories
const PALETTE_CATEGORIES = COMPONENT_CATEGORIES.map(cat => ({
  id: cat.id,
  label: cat.label,
}));

// ============================================
// Component Thumbnail SVGs (48x48 miniatures)
// ============================================
function ComponentThumbnail({ type }: { type: string }) {
  const s = 48;

  switch (type) {
    // ---- BOARDS ----
    case 'board-esp32-devkit-c-v4':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="2" width="32" height="44" rx="2" fill="#1a1a2e" stroke="#333" strokeWidth="1" />
          <rect x="16" y="4" width="16" height="8" rx="1" fill="#444" />
          <text x="24" y="28" textAnchor="middle" fill="#fff" fontSize="5" fontWeight="bold">ESP32</text>
          <g fill="#daa520">
            {[14,18,22,26,30,34,38].map((y,i) => (
              <React.Fragment key={i}>
                <rect x="6" y={y} width="4" height="2" rx="0.5" />
                <rect x="38" y={y} width="4" height="2" rx="0.5" />
              </React.Fragment>
            ))}
          </g>
        </svg>
      );
    case 'wokwi-arduino-uno':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="4" width="40" height="40" rx="2" fill="#006d77" stroke="#00838f" strokeWidth="1" />
          <rect x="14" y="6" width="20" height="8" rx="1" fill="#333" />
          <rect x="32" y="18" width="8" height="6" rx="1" fill="#666" />
          <text x="24" y="32" textAnchor="middle" fill="#fff" fontSize="4.5" fontWeight="bold">UNO</text>
          <g fill="#daa520">
            {[10,14,18,22,26,30,34,38].map((x,i) => (
              <rect key={i} x={x} y="40" width="2" height="4" rx="0.3" />
            ))}
          </g>
        </svg>
      );
    case 'wokwi-arduino-mega':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="2" y="6" width="44" height="36" rx="2" fill="#006d77" stroke="#00838f" strokeWidth="1" />
          <rect x="6" y="8" width="16" height="6" rx="1" fill="#333" />
          <text x="24" y="30" textAnchor="middle" fill="#fff" fontSize="4" fontWeight="bold">MEGA</text>
          <g fill="#daa520">
            {Array.from({length:12},(_, i) => <rect key={i} x={4+i*3.5} y="38" width="1.5" height="4" rx="0.2" />)}
          </g>
        </svg>
      );
    case 'wokwi-arduino-nano':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="12" y="2" width="24" height="44" rx="2" fill="#006d77" stroke="#00838f" strokeWidth="1" />
          <rect x="18" y="3" width="12" height="6" rx="1" fill="#333" />
          <text x="24" y="28" textAnchor="middle" fill="#fff" fontSize="4" fontWeight="bold">NANO</text>
          <g fill="#daa520">
            {[12,16,20,24,28,32,36,40].map((y,i) => (
              <React.Fragment key={i}>
                <rect x="10" y={y} width="4" height="1.5" rx="0.3" />
                <rect x="34" y={y} width="4" height="1.5" rx="0.3" />
              </React.Fragment>
            ))}
          </g>
        </svg>
      );
    case 'board-esp32-s2-devkitm-1':
    case 'board-esp32-s3-devkitc-1':
    case 'board-esp32-c3-devkitm-1':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="2" width="32" height="44" rx="2" fill="#1a1a2e" stroke="#333" strokeWidth="1" />
          <rect x="16" y="4" width="16" height="6" rx="1" fill="#444" />
          <text x="24" y="26" textAnchor="middle" fill="#fff" fontSize="4" fontWeight="bold">
            {type.includes('s2') ? 'ESP32-S2' : type.includes('s3') ? 'ESP32-S3' : 'ESP32-C3'}
          </text>
          <g fill="#daa520">
            {[16,20,24,28,32,36].map((y,i) => (
              <React.Fragment key={i}>
                <rect x="6" y={y} width="4" height="2" rx="0.5" />
                <rect x="38" y={y} width="4" height="2" rx="0.5" />
              </React.Fragment>
            ))}
          </g>
        </svg>
      );
    case 'wokwi-pi-pico':
    case 'wokwi-pi-pico-w':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="10" y="2" width="28" height="44" rx="2" fill="#2d8b2d" stroke="#3a3" strokeWidth="1" />
          <rect x="18" y="3" width="12" height="6" rx="1" fill="#444" />
          <text x="24" y="26" textAnchor="middle" fill="#fff" fontSize="4" fontWeight="bold">
            {type.includes('-w') ? 'PICO W' : 'PICO'}
          </text>
          <g fill="#daa520">
            {[14,18,22,26,30,34,38].map((y,i) => (
              <React.Fragment key={i}>
                <rect x="8" y={y} width="4" height="2" rx="0.5" />
                <rect x="36" y={y} width="4" height="2" rx="0.5" />
              </React.Fragment>
            ))}
          </g>
        </svg>
      );
    case 'wokwi-attiny85':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="12" y="12" width="24" height="24" rx="2" fill="#222" stroke="#555" strokeWidth="1" />
          <circle cx="17" cy="16" r="2" fill="#555" />
          <text x="24" y="28" textAnchor="middle" fill="#aaa" fontSize="4">ATtiny</text>
          <g fill="#daa520">
            {[16,20,24,28].map((y,i) => (
              <React.Fragment key={i}>
                <rect x="10" y={y} width="4" height="2" rx="0.5" />
                <rect x="34" y={y} width="4" height="2" rx="0.5" />
              </React.Fragment>
            ))}
          </g>
        </svg>
      );

    // ---- LEDs ----
    case 'wokwi-led':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <line x1="18" y1="32" x2="18" y2="44" stroke="#aaa" strokeWidth="1.5" />
          <line x1="30" y1="32" x2="30" y2="44" stroke="#aaa" strokeWidth="1.5" />
          <ellipse cx="24" cy="22" rx="10" ry="14" fill="#ff3333" opacity="0.9" />
          <ellipse cx="22" cy="18" rx="4" ry="6" fill="#ff6666" opacity="0.5" />
        </svg>
      );
    case 'wokwi-rgb-led':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <line x1="14" y1="34" x2="14" y2="44" stroke="#c00" strokeWidth="1.2" />
          <line x1="21" y1="34" x2="21" y2="44" stroke="#0a0" strokeWidth="1.2" />
          <line x1="28" y1="34" x2="28" y2="44" stroke="#00c" strokeWidth="1.2" />
          <line x1="34" y1="34" x2="34" y2="44" stroke="#aaa" strokeWidth="1.2" />
          <ellipse cx="24" cy="20" rx="12" ry="14" fill="#ddd" opacity="0.7" />
          <circle cx="19" cy="16" r="5" fill="#ff3333" opacity="0.4" />
          <circle cx="28" cy="16" r="5" fill="#3333ff" opacity="0.4" />
          <circle cx="24" cy="22" r="5" fill="#33ff33" opacity="0.4" />
        </svg>
      );

    // ---- PASSIVE ----
    case 'wokwi-pushbutton':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="12" width="32" height="24" rx="2" fill="#464646" />
          <rect x="12" y="15" width="24" height="18" rx="1" fill="#eaeaea" />
          <circle cx="24" cy="24" r="7" fill="#4caf50" />
          <circle cx="24" cy="24" r="5" fill="#66bb6a" />
          <line x1="10" y1="16" x2="10" y2="8" stroke="#aaa" strokeWidth="1.5" />
          <line x1="38" y1="16" x2="38" y2="8" stroke="#aaa" strokeWidth="1.5" />
          <line x1="10" y1="32" x2="10" y2="40" stroke="#aaa" strokeWidth="1.5" />
          <line x1="38" y1="32" x2="38" y2="40" stroke="#aaa" strokeWidth="1.5" />
        </svg>
      );
    case 'wokwi-resistor':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <line x1="4" y1="24" x2="14" y2="24" stroke="#aaa" strokeWidth="1.5" />
          <line x1="34" y1="24" x2="44" y2="24" stroke="#aaa" strokeWidth="1.5" />
          <rect x="14" y="18" width="20" height="12" rx="4" fill="#d4a574" />
          <rect x="18" y="18" width="2" height="12" fill="#8b4513" />
          <rect x="22" y="18" width="2" height="12" fill="#000" />
          <rect x="26" y="18" width="2" height="12" fill="#ff0000" />
          <rect x="30" y="18" width="2" height="12" fill="#daa520" />
        </svg>
      );
    case 'wokwi-breadboard-half':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="10" width="40" height="28" rx="2" fill="#e8e0d0" stroke="#ccc" strokeWidth="0.5" />
          <g fill="#555">
            {Array.from({length:8},(_, i) => Array.from({length:4},(_, j) => (
              <circle key={`${i}-${j}`} cx={8+i*5} cy={16+j*5} r="1" />
            )))}
          </g>
        </svg>
      );
    case 'wokwi-breadboard':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="2" y="6" width="44" height="36" rx="2" fill="#e8e0d0" stroke="#ccc" strokeWidth="0.5" />
          <line x1="2" y1="24" x2="46" y2="24" stroke="#d00" strokeWidth="0.5" />
          <g fill="#555">
            {Array.from({length:10},(_, i) => Array.from({length:6},(_, j) => (
              <circle key={`${i}-${j}`} cx={6+i*4} cy={10+j*5} r="0.8" />
            )))}
          </g>
        </svg>
      );

    // ---- DISPLAY ----
    case 'wokwi-neopixel-ring':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="18" fill="none" stroke="#333" strokeWidth="4" />
          {Array.from({length:12},(_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            return <circle key={i} cx={24+Math.cos(a)*15} cy={24+Math.sin(a)*15} r="2.5" fill={`hsl(${i*30},100%,50%)`} />;
          })}
        </svg>
      );
    case 'wokwi-led-strip':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="2" y="16" width="44" height="16" rx="2" fill="#222" stroke="#444" strokeWidth="0.5" />
          {Array.from({length:8},(_, i) => (
            <circle key={i} cx={6+i*5.5} cy="24" r="2.5" fill={`hsl(${i*45},100%,50%)`} />
          ))}
        </svg>
      );
    case 'wokwi-led-matrix':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="4" width="40" height="40" rx="2" fill="#1a1a1a" />
          {Array.from({length:8},(_, r) => Array.from({length:8},(_, c) => (
            <circle key={`${r}-${c}`} cx={9+c*4.5} cy={9+r*4.5} r="1.5" fill={(r+c)%3===0?"#ff0000":"#330000"} />
          )))}
        </svg>
      );
    case 'wokwi-neopixel-meter':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="8" width="40" height="32" rx="3" fill="#1a1a2e" stroke="#333" strokeWidth="0.5" />
          <path d="M10 36 Q24 6 38 36" fill="none" stroke="#444" strokeWidth="2" />
          {Array.from({length:8},(_, i) => {
            const a = Math.PI + (i / 7) * Math.PI;
            return <circle key={i} cx={24+Math.cos(a)*12} cy={30+Math.sin(a)*12} r="2" fill={`hsl(${i*20},100%,50%)`} />;
          })}
        </svg>
      );
    case 'wokwi-7segment':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="4" width="32" height="40" rx="2" fill="#111" />
          <g stroke="#ff0000" strokeWidth="3" strokeLinecap="round" fill="none">
            <line x1="18" y1="10" x2="30" y2="10" />
            <line x1="16" y1="12" x2="16" y2="22" />
            <line x1="32" y1="12" x2="32" y2="22" />
            <line x1="18" y1="24" x2="30" y2="24" />
            <line x1="16" y1="26" x2="16" y2="36" />
            <line x1="32" y1="26" x2="32" y2="36" />
            <line x1="18" y1="38" x2="30" y2="38" />
          </g>
        </svg>
      );
    case 'wokwi-7segment-4digit':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="2" y="8" width="44" height="32" rx="2" fill="#111" />
          {[8,18,28,38].map((x,d) => (
            <g key={d} stroke="#ff0000" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8">
              <line x1={x} y1="14" x2={x+6} y2="14" />
              <line x1={x-1} y1="15" x2={x-1} y2="22" />
              <line x1={x+7} y1="15" x2={x+7} y2="22" />
              <line x1={x} y1="23" x2={x+6} y2="23" />
              <line x1={x-1} y1="24" x2={x-1} y2="31" />
              <line x1={x+7} y1="24" x2={x+7} y2="31" />
              <line x1={x} y1="32" x2={x+6} y2="32" />
            </g>
          ))}
        </svg>
      );
    case 'wokwi-tm1637':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="2" y="8" width="44" height="32" rx="2" fill="#006622" stroke="#333" strokeWidth="0.5" />
          <rect x="6" y="12" width="36" height="24" rx="1" fill="#111" />
          {[12,22,32].map((x,d) => (
            <g key={d} stroke="#ff0000" strokeWidth="1.2" strokeLinecap="round" fill="none">
              <line x1={x} y1="18" x2={x+5} y2="18" />
              <line x1={x} y1="24" x2={x+5} y2="24" />
              <line x1={x} y1="30" x2={x+5} y2="30" />
            </g>
          ))}
          <text x="24" y="40" textAnchor="middle" fill="#aaa" fontSize="3">TM1637</text>
        </svg>
      );
    case 'wokwi-led-bar-graph':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="4" width="32" height="40" rx="2" fill="#222" />
          {Array.from({length:10},(_, i) => (
            <rect key={i} x="12" y={6+i*3.6} width="24" height="2.8" rx="0.5"
              fill={i < 2 ? '#ff0000' : i < 4 ? '#ffaa00' : '#00cc00'} opacity={i < 6 ? 0.9 : 0.3} />
          ))}
        </svg>
      );
    case 'wokwi-epaper-29':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="2" width="40" height="44" rx="2" fill="#333" stroke="#555" strokeWidth="0.5" />
          <rect x="8" y="6" width="32" height="32" rx="1" fill="#f5f0e8" />
          <text x="24" y="24" textAnchor="middle" fill="#222" fontSize="5">e-Paper</text>
          <g fill="#daa520">
            {[10,16,22,28,34,40].map((x,i) => <rect key={i} x={x} y="40" width="2" height="4" rx="0.3" />)}
          </g>
        </svg>
      );
    case 'wokwi-lcd1602':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="2" y="8" width="44" height="32" rx="2" fill="#087f45" />
          <rect x="6" y="12" width="36" height="24" rx="1" fill="#333" />
          <rect x="8" y="14" width="32" height="20" rx="1" fill="#6cb201" />
          <text x="24" y="27" textAnchor="middle" fill="#333" fontSize="5" fontFamily="monospace">Hello</text>
        </svg>
      );
    case 'wokwi-lcd2004':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="2" y="4" width="44" height="40" rx="2" fill="#087f45" />
          <rect x="5" y="8" width="38" height="32" rx="1" fill="#333" />
          <rect x="7" y="10" width="34" height="28" rx="1" fill="#6cb201" />
          <text x="24" y="22" textAnchor="middle" fill="#333" fontSize="4" fontFamily="monospace">LCD</text>
          <text x="24" y="32" textAnchor="middle" fill="#333" fontSize="4" fontFamily="monospace">20x4</text>
        </svg>
      );
    case 'wokwi-ili9341':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="2" width="40" height="44" rx="2" fill="#222" stroke="#444" strokeWidth="0.5" />
          <rect x="7" y="5" width="34" height="34" rx="1" fill="#0044aa" />
          <text x="24" y="26" textAnchor="middle" fill="#fff" fontSize="4" fontWeight="bold">TFT</text>
          <text x="24" y="46" textAnchor="middle" fill="#888" fontSize="3">ILI9341</text>
        </svg>
      );
    case 'wokwi-ssd1306':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="6" width="40" height="36" rx="2" fill="#1a1a2e" stroke="#333" strokeWidth="0.5" />
          <rect x="8" y="10" width="32" height="22" rx="1" fill="#000" />
          <text x="24" y="24" textAnchor="middle" fill="#00aaff" fontSize="5" fontFamily="monospace">OLED</text>
          <g fill="#daa520">
            {[14,20,26,32].map((x,i) => <rect key={i} x={x} y="34" width="2" height="4" rx="0.3" />)}
          </g>
        </svg>
      );
    case 'wokwi-max7219-matrix':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="4" width="40" height="40" rx="2" fill="#cc0000" stroke="#aa0000" strokeWidth="0.5" />
          <rect x="8" y="8" width="32" height="32" rx="1" fill="#1a1a1a" />
          {Array.from({length:8},(_, r) => Array.from({length:8},(_, c) => (
            <circle key={`${r}-${c}`} cx={12+c*3.7} cy={12+r*3.7} r="1.2" fill={(r===c||r+c===7)?"#ff0000":"#330000"} />
          )))}
        </svg>
      );

    // ---- INPUT ----
    case 'wokwi-potentiometer':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="8" width="32" height="32" rx="2" fill="#045881" />
          <circle cx="24" cy="22" r="12" fill="#e4e8eb" />
          <circle cx="24" cy="22" r="8" fill="#c3c2c3" />
          <rect x="22" y="12" width="4" height="8" rx="1" fill="#666" />
          <line x1="14" y1="40" x2="14" y2="46" stroke="#aaa" strokeWidth="1.5" />
          <line x1="24" y1="40" x2="24" y2="46" stroke="#aaa" strokeWidth="1.5" />
          <line x1="34" y1="40" x2="34" y2="46" stroke="#aaa" strokeWidth="1.5" />
        </svg>
      );
    case 'wokwi-slide-potentiometer':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="14" width="40" height="20" rx="2" fill="#333" stroke="#555" strokeWidth="0.5" />
          <line x1="10" y1="24" x2="38" y2="24" stroke="#666" strokeWidth="2" />
          <rect x="20" y="18" width="8" height="12" rx="2" fill="#aaa" stroke="#888" strokeWidth="0.5" />
          <line x1="10" y1="34" x2="10" y2="42" stroke="#aaa" strokeWidth="1.5" />
          <line x1="24" y1="34" x2="24" y2="42" stroke="#aaa" strokeWidth="1.5" />
          <line x1="38" y1="34" x2="38" y2="42" stroke="#aaa" strokeWidth="1.5" />
        </svg>
      );
    case 'wokwi-analog-joystick':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="4" width="40" height="40" rx="3" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
          <circle cx="24" cy="24" r="14" fill="#444" />
          <circle cx="24" cy="24" r="8" fill="#666" />
          <circle cx="24" cy="24" r="5" fill="#888" />
        </svg>
      );
    case 'wokwi-membrane-keypad':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="2" width="40" height="44" rx="2" fill="#e8e8e8" stroke="#ccc" strokeWidth="0.5" />
          {Array.from({length:4},(_, r) => Array.from({length:4},(_, c) => (
            <rect key={`${r}-${c}`} x={8+c*9} y={6+r*10} width="7" height="8" rx="1" fill="#ddd" stroke="#bbb" strokeWidth="0.5" />
          )))}
          <text x="12" y="13" fontSize="4" fill="#333" textAnchor="middle">1</text>
          <text x="21" y="13" fontSize="4" fill="#333" textAnchor="middle">2</text>
          <text x="30" y="13" fontSize="4" fill="#333" textAnchor="middle">3</text>
          <text x="39" y="13" fontSize="4" fill="#333" textAnchor="middle">A</text>
        </svg>
      );
    case 'wokwi-ky-040':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="8" width="32" height="32" rx="2" fill="#1a1a8e" stroke="#333" strokeWidth="0.5" />
          <circle cx="24" cy="22" r="10" fill="#444" />
          <circle cx="24" cy="22" r="6" fill="#888" />
          <rect x="22" y="14" width="4" height="6" rx="1" fill="#aaa" />
          <g fill="#daa520">
            {[12,18,24,30,36].map((x,i) => <rect key={i} x={x} y="38" width="2" height="6" rx="0.3" />)}
          </g>
        </svg>
      );
    case 'wokwi-slide-switch':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="16" width="32" height="16" rx="2" fill="#444" stroke="#666" strokeWidth="0.5" />
          <rect x="10" y="18" width="12" height="12" rx="2" fill="#888" />
          <line x1="14" y1="32" x2="14" y2="40" stroke="#aaa" strokeWidth="1.5" />
          <line x1="24" y1="32" x2="24" y2="40" stroke="#aaa" strokeWidth="1.5" />
          <line x1="34" y1="32" x2="34" y2="40" stroke="#aaa" strokeWidth="1.5" />
        </svg>
      );
    case 'wokwi-dip-switch-8':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="2" y="10" width="44" height="28" rx="2" fill="#cc0000" />
          {Array.from({length:8},(_, i) => (
            <React.Fragment key={i}>
              <rect x={5+i*5} y="14" width="3.5" height="10" rx="0.5" fill="#222" />
              <rect x={5+i*5} y={i%2===0?14:20} width="3.5" height="4" rx="0.5" fill="#ddd" />
            </React.Fragment>
          ))}
        </svg>
      );
    case 'wokwi-tilt-switch':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <line x1="18" y1="36" x2="18" y2="44" stroke="#aaa" strokeWidth="1.5" />
          <line x1="30" y1="36" x2="30" y2="44" stroke="#aaa" strokeWidth="1.5" />
          <rect x="12" y="8" width="24" height="28" rx="4" fill="#333" stroke="#555" strokeWidth="0.5" />
          <circle cx="24" cy="28" r="4" fill="#888" />
        </svg>
      );

    // ---- SENSOR ----
    case 'wokwi-dht22':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <line x1="14" y1="38" x2="14" y2="46" stroke="#aaa" strokeWidth="1.5" />
          <line x1="20" y1="38" x2="20" y2="46" stroke="#aaa" strokeWidth="1.5" />
          <line x1="28" y1="38" x2="28" y2="46" stroke="#aaa" strokeWidth="1.5" />
          <line x1="34" y1="38" x2="34" y2="46" stroke="#aaa" strokeWidth="1.5" />
          <path d="M8 38 V10 Q8 2 24 2 Q40 2 40 10 V38 Z" fill="#e8e8e8" stroke="#ccc" strokeWidth="0.5" />
          <circle cx="24" cy="14" r="5" fill="#ddd" stroke="#bbb" strokeWidth="0.5" />
          <text x="24" y="37" textAnchor="middle" fill="#666" fontSize="4">DHT22</text>
        </svg>
      );
    case 'wokwi-pir-motion-sensor':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <circle cx="24" cy="20" r="16" fill="#e8e8e8" stroke="#ccc" strokeWidth="0.5" />
          <circle cx="24" cy="20" r="8" fill="#f5f5dc" stroke="#ddd" strokeWidth="0.5" opacity="0.8" />
          <rect x="14" y="34" width="20" height="10" rx="2" fill="#006622" />
          <g fill="#daa520">
            {[18,24,30].map((x,i) => <rect key={i} x={x} y="42" width="2" height="4" rx="0.3" />)}
          </g>
        </svg>
      );
    case 'wokwi-hc-sr04':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="2" y="10" width="44" height="28" rx="2" fill="#0066cc" stroke="#004488" strokeWidth="0.5" />
          <circle cx="14" cy="24" r="8" fill="#c0c0c0" stroke="#aaa" strokeWidth="0.5" />
          <circle cx="34" cy="24" r="8" fill="#c0c0c0" stroke="#aaa" strokeWidth="0.5" />
          <g fill="#daa520">
            {[14,20,26,32].map((x,i) => <rect key={i} x={x} y="36" width="2" height="6" rx="0.3" />)}
          </g>
        </svg>
      );
    case 'wokwi-ntc-temperature-sensor':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <line x1="18" y1="32" x2="18" y2="44" stroke="#aaa" strokeWidth="1.5" />
          <line x1="30" y1="32" x2="30" y2="44" stroke="#aaa" strokeWidth="1.5" />
          <circle cx="24" cy="20" r="12" fill="#2a4a2a" stroke="#333" strokeWidth="0.5" />
          <text x="24" y="22" textAnchor="middle" fill="#aaa" fontSize="5">NTC</text>
        </svg>
      );
    case 'wokwi-photoresistor-sensor':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <line x1="18" y1="34" x2="18" y2="44" stroke="#aaa" strokeWidth="1.5" />
          <line x1="30" y1="34" x2="30" y2="44" stroke="#aaa" strokeWidth="1.5" />
          <circle cx="24" cy="20" r="12" fill="#8b4513" stroke="#666" strokeWidth="0.5" />
          <path d="M18 20 Q21 14 24 20 Q27 26 30 20" fill="none" stroke="#daa520" strokeWidth="1.5" />
        </svg>
      );
    case 'wokwi-flame-sensor':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="8" width="32" height="32" rx="2" fill="#006622" stroke="#333" strokeWidth="0.5" />
          <circle cx="24" cy="20" r="6" fill="#1a1a1a" />
          <circle cx="24" cy="20" r="4" fill="#333" />
          <text x="24" y="36" textAnchor="middle" fill="#ccc" fontSize="3.5">FLAME</text>
          <g fill="#daa520">
            {[14,20,26,32].map((x,i) => <rect key={i} x={x} y="38" width="2" height="6" rx="0.3" />)}
          </g>
        </svg>
      );
    case 'wokwi-gas-sensor':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="12" width="32" height="28" rx="2" fill="#006622" />
          <circle cx="24" cy="20" r="10" fill="#c0c0c0" stroke="#aaa" strokeWidth="0.5" />
          <circle cx="24" cy="20" r="4" fill="#888" />
          <text x="24" y="38" textAnchor="middle" fill="#ccc" fontSize="3">MQ-2</text>
        </svg>
      );
    case 'wokwi-ir-receiver':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <line x1="16" y1="34" x2="16" y2="44" stroke="#aaa" strokeWidth="1.5" />
          <line x1="24" y1="34" x2="24" y2="44" stroke="#aaa" strokeWidth="1.5" />
          <line x1="32" y1="34" x2="32" y2="44" stroke="#aaa" strokeWidth="1.5" />
          <path d="M12 34 V14 Q12 4 24 4 Q36 4 36 14 V34 Z" fill="#1a1a1a" stroke="#333" strokeWidth="0.5" />
          <circle cx="24" cy="18" r="4" fill="#330000" />
        </svg>
      );
    case 'wokwi-ds1307':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="8" width="40" height="32" rx="2" fill="#1a1a8e" stroke="#333" strokeWidth="0.5" />
          <circle cx="24" cy="20" r="8" fill="#c0c0c0" stroke="#aaa" strokeWidth="0.5" />
          <rect x="18" y="30" width="12" height="6" rx="1" fill="#222" />
          <text x="24" y="42" textAnchor="middle" fill="#888" fontSize="3">DS1307</text>
        </svg>
      );
    case 'wokwi-mpu6050':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="6" y="6" width="36" height="36" rx="2" fill="#1a1a8e" stroke="#333" strokeWidth="0.5" />
          <rect x="14" y="14" width="20" height="20" rx="1" fill="#222" stroke="#444" strokeWidth="0.5" />
          <text x="24" y="28" textAnchor="middle" fill="#aaa" fontSize="4">MPU</text>
          <g fill="#daa520">
            {[12,18,24,30,36].map((x,i) => <rect key={i} x={x} y="40" width="2" height="4" rx="0.3" />)}
          </g>
        </svg>
      );
    case 'wokwi-hx711':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="6" y="8" width="36" height="32" rx="2" fill="#006622" stroke="#333" strokeWidth="0.5" />
          <rect x="14" y="14" width="20" height="14" rx="1" fill="#222" />
          <text x="24" y="24" textAnchor="middle" fill="#aaa" fontSize="4">HX711</text>
          <g fill="#daa520">
            {[10,16,22,28,34].map((x,i) => <rect key={i} x={x} y="38" width="2" height="6" rx="0.3" />)}
          </g>
        </svg>
      );

    // ---- OUTPUT / ACTUATOR ----
    case 'wokwi-buzzer':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <line x1="20" y1="40" x2="20" y2="46" stroke="#222" strokeWidth="1.5" />
          <line x1="28" y1="40" x2="28" y2="46" stroke="#c00" strokeWidth="1.5" />
          <circle cx="24" cy="24" r="16" fill="#1a1a1a" />
          <circle cx="24" cy="24" r="12" fill="#222" />
          <circle cx="24" cy="24" r="8" fill="#2a2a2a" />
          <circle cx="24" cy="24" r="3" fill="#ccc" />
          <text x="32" y="12" fill="#fff" fontSize="8" fontWeight="bold">+</text>
        </svg>
      );
    case 'wokwi-servo':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <g>
            <line x1="4" y1="16" x2="12" y2="16" stroke="#b44200" strokeWidth="2" />
            <line x1="4" y1="22" x2="12" y2="22" stroke="#ff2300" strokeWidth="2" />
            <line x1="4" y1="28" x2="12" y2="28" stroke="#f47b00" strokeWidth="2" />
          </g>
          <rect x="12" y="10" width="28" height="28" rx="2" fill="#3f7cac" />
          <circle cx="35" cy="24" r="7" fill="#888" />
          <circle cx="35" cy="24" r="5" fill="#ccc" />
          <text x="26" y="26" textAnchor="middle" fill="#fff" fontSize="4">SG90</text>
        </svg>
      );
    case 'wokwi-stepper-motor':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="6" y="6" width="36" height="36" rx="3" fill="#444" stroke="#666" strokeWidth="0.5" />
          <circle cx="24" cy="24" r="12" fill="#888" />
          <circle cx="24" cy="24" r="4" fill="#bbb" />
          <g fill="#daa520">
            {[12,18,24,30].map((x,i) => <rect key={i} x={x} y="40" width="2" height="6" rx="0.3" />)}
          </g>
        </svg>
      );
    case 'wokwi-relay-module':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="4" width="40" height="40" rx="2" fill="#0066cc" stroke="#004488" strokeWidth="0.5" />
          <rect x="8" y="8" width="20" height="16" rx="1" fill="#222" />
          <rect x="30" y="8" width="10" height="16" rx="1" fill="#006622" />
          <text x="24" y="36" textAnchor="middle" fill="#fff" fontSize="4">RELAY</text>
        </svg>
      );
    case 'wokwi-a4988':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="4" width="32" height="40" rx="2" fill="#cc0000" stroke="#aa0000" strokeWidth="0.5" />
          <rect x="14" y="10" width="20" height="20" rx="1" fill="#222" stroke="#444" strokeWidth="0.5" />
          <text x="24" y="24" textAnchor="middle" fill="#aaa" fontSize="3.5">A4988</text>
          <rect x="12" y="32" width="24" height="4" rx="1" fill="#daa520" />
          <g fill="#daa520">
            {[10,14,18,22,26,30,34,38].map((x,i) => (
              <React.Fragment key={i}>
                <rect x={x} y="2" width="1.5" height="4" rx="0.3" />
                <rect x={x} y="42" width="1.5" height="4" rx="0.3" />
              </React.Fragment>
            ))}
          </g>
        </svg>
      );

    // ---- LOGIC ----
    case 'wokwi-74hc595':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="6" width="32" height="36" rx="1" fill="#222" stroke="#555" strokeWidth="0.5" />
          <circle cx="14" cy="12" r="2" fill="#555" />
          <text x="24" y="28" textAnchor="middle" fill="#aaa" fontSize="3.5">74HC595</text>
          <g fill="#daa520">
            {[10,16,22,28,34].map((y,i) => (
              <React.Fragment key={i}>
                <rect x="6" y={y} width="4" height="2" rx="0.3" />
                <rect x="38" y={y} width="4" height="2" rx="0.3" />
              </React.Fragment>
            ))}
          </g>
        </svg>
      );
    case 'wokwi-74hc165':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="6" width="32" height="36" rx="1" fill="#222" stroke="#555" strokeWidth="0.5" />
          <circle cx="14" cy="12" r="2" fill="#555" />
          <text x="24" y="28" textAnchor="middle" fill="#aaa" fontSize="3.5">74HC165</text>
          <g fill="#daa520">
            {[10,16,22,28,34].map((y,i) => (
              <React.Fragment key={i}>
                <rect x="6" y={y} width="4" height="2" rx="0.3" />
                <rect x="38" y={y} width="4" height="2" rx="0.3" />
              </React.Fragment>
            ))}
          </g>
        </svg>
      );

    // ---- MODULE ----
    case 'wokwi-microsd-card':
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="6" y="4" width="36" height="36" rx="2" fill="#0066cc" stroke="#004488" strokeWidth="0.5" />
          <rect x="14" y="10" width="20" height="14" rx="1" fill="#222" />
          <rect x="18" y="26" width="12" height="8" rx="1" fill="#444" />
          <text x="24" y="44" textAnchor="middle" fill="#888" fontSize="3">MicroSD</text>
        </svg>
      );

    // ---- GENERIC FALLBACK ----
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="8" y="8" width="32" height="32" rx="4" fill="#333" stroke="#555" strokeWidth="1" />
          <text x="24" y="28" textAnchor="middle" fill="#888" fontSize="8">?</text>
        </svg>
      );
  }
}

export default function ComponentPalette({ onAddComponent, isOpen, onClose }: ComponentPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
    if (isOpen) {
      setActiveCategory(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleAdd = (type: string) => {
    const meta = COMPONENT_REGISTRY[type];
    if (!meta) return;

    const newComponent: ComponentDef = {
      type: meta.type,
      id: `${type.replace('wokwi-', '').replace('board-', '')}-${Date.now()}`,
      top: 100 + Math.random() * 200,
      left: 100 + Math.random() * 200,
      rotate: 0,
      attrs: { ...meta.defaultAttrs },
    };
    onAddComponent(newComponent);
    onClose();
  };

  // Get filtered components
  const getFilteredComponents = () => {
    const allComponents = Object.values(COMPONENT_REGISTRY);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return allComponents.filter(meta =>
        meta.label.toLowerCase().includes(query) ||
        meta.type.toLowerCase().includes(query) ||
        meta.category.toLowerCase().includes(query)
      );
    }

    if (activeCategory) {
      return allComponents.filter(meta => meta.category === activeCategory);
    }

    return allComponents;
  };

  if (!isOpen) return null;

  const filteredComponents = getFilteredComponents();

  // Group by category if showing all
  const groupedView = !searchQuery && !activeCategory;
  const categories = groupedView
    ? PALETTE_CATEGORIES.filter(cat =>
        Object.values(COMPONENT_REGISTRY).some(m => m.category === cat.id)
      )
    : [];

  return (
    <div
      ref={dialogRef}
      className="absolute top-4 left-[80px] z-50 w-[420px] max-h-[calc(100vh-120px)] bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-2xl flex flex-col overflow-hidden"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Search bar */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setActiveCategory(null); }}
            className="w-full px-3 py-2 bg-transparent border-b-2 border-blue-500 text-white text-sm focus:outline-none placeholder-gray-500"
          />
          <svg className="absolute right-2 top-2.5 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Category tabs */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-700 shrink-0">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              !activeCategory ? 'bg-blue-600 text-white' : 'bg-[#333] text-gray-400 hover:bg-[#444] hover:text-gray-200'
            }`}
          >
            All
          </button>
          {PALETTE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-[#333] text-gray-400 hover:bg-[#444] hover:text-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Component list */}
      <div className="flex-1 overflow-y-auto">
        {groupedView ? (
          // Grouped by category
          categories.map(cat => {
            const components = Object.values(COMPONENT_REGISTRY).filter(m => m.category === cat.id);
            if (components.length === 0) return null;
            return (
              <div key={cat.id}>
                <div className="px-4 py-2 bg-[#2a2a2a] text-gray-300 text-sm font-medium sticky top-0 z-10">
                  {cat.label}
                </div>
                {components.map(meta => (
                  <button
                    key={meta.type}
                    onClick={() => handleAdd(meta.type)}
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#333] transition-colors cursor-pointer text-left"
                  >
                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                      <ComponentThumbnail type={meta.type} />
                    </div>
                    <span className="text-gray-200 text-sm">{meta.label}</span>
                  </button>
                ))}
              </div>
            );
          })
        ) : (
          // Flat filtered list
          filteredComponents.map(meta => (
            <button
              key={meta.type}
              onClick={() => handleAdd(meta.type)}
              className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#333] transition-colors cursor-pointer text-left"
            >
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <ComponentThumbnail type={meta.type} />
              </div>
              <div className="flex flex-col">
                <span className="text-gray-200 text-sm">{meta.label}</span>
                <span className="text-gray-500 text-xs">{meta.category}</span>
              </div>
            </button>
          ))
        )}

        {filteredComponents.length === 0 && (
          <div className="text-center text-gray-500 py-8 text-sm">
            No components found
          </div>
        )}
      </div>
    </div>
  );
}
