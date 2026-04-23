/**
 * StemMonitor2DMap — full-bleed worldmonitor.app-style 2D map for AeroEdu.
 *
 * Inspired by https://tech.worldmonitor.app — square corners, monospace,
 * dark gunmetal background, thin grid lines, color-coded marker layers
 * with a left sidebar of layer toggles + view selector.
 *
 * This is the "Full screen monitor" mode triggered from the Landing page hero.
 * The default landing hero (2-column with the 3D globe) is preserved; this
 * component renders as an overlay when the user activates the toggle.
 *
 * Layers (default-on):
 *   • Startup Hubs    — green   (#10b981)  — global tech startup capitals
 *   • Tech HQs        — blue    (#3b82f6)  — major tech company headquarters
 *   • Cloud Regions   — purple  (#a78bfa)  — AWS / GCP / Azure / others
 *   • Undersea Cables — cyan    (#22d3ee)  — submarine cable trunks
 * Layer (optional, default-off):
 *   • Internet Disruptions — pink (#e879f9) — recent outage hotspots
 *
 * Projection: Equirectangular over a 1024×512 SVG viewport.
 *   xPx(lon) = (lon + 180) * 1024 / 360
 *   yPx(lat) = (90 - lat)  * 512  / 180
 *
 * View presets:
 *   • Asia      — center 35°N 105°E, zoom 3.0  (matches the user's reference URL)
 *   • Vietnam   — center 16°N 107°E, zoom 5.0
 *   • Americas  — center 20°N -90°E, zoom 2.4
 *   • Europe    — center 50°N  10°E, zoom 3.5
 *   • World     — center  0°N   0°E, zoom 1.0
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import {
  X, Layers, Globe, MapPin, Cable, Cpu, AlertTriangle,
  Building2, Server, Rocket, Activity,
} from 'lucide-react'
import { STARTUP_HUBS, type StartupHub } from '@/config/world-monitor-data'

/* ──────────────────────────────────────────────────────────────
   Design tokens — ported from worldmonitor-main source
   (DeckGLMap.ts:207-267 RGBA palette, normalised to hex).
────────────────────────────────────────────────────────────── */
export const T = {
  bg:          '#050608',
  bgPanel:     '#0a0c10',
  bgPanel2:    '#0e1116',
  bgMap:       '#020308',
  border:      '#1c2028',
  borderHi:    '#2a3140',
  text:        '#e6e8eb',
  textDim:     '#8a93a3',
  textMuted:   '#5a6373',
  // ── Worldmonitor-exact layer colours ──
  startup:     '#00FF96',  // [0, 255, 150]   — startup hubs
  techHQ:      '#64C8FF',  // [100, 200, 255] — tech HQs
  accel:       '#FFC800',  // [255, 200, 0]   — accelerators
  cloud:       '#9664FF',  // [150, 100, 255] — cloud regions
  cable:       '#00C8FF',  // [0, 200, 255]   — undersea cables
  outage:      '#FF3232',  // [255, 50, 50]   — outages / disruptions
  // ── Status / accent ──
  amber:       '#f59e0b',
  red:         '#ef4444',
  // ── Backwards-compat aliases (old generic names map onto layer semantics) ──
  cyan:        '#00C8FF',  // ≡ cable
  green:       '#00FF96',  // ≡ startup
  blue:        '#64C8FF',  // ≡ techHQ
  purple:      '#9664FF',  // ≡ cloud
  pink:        '#FF3232',  // ≡ outage
  font:        "'SF Mono','Monaco','Cascadia Code','Fira Code','DejaVu Sans Mono',monospace",
}

/* ──────────────────────────────────────────────────────────────
   Equirectangular projection (1024 × 512 SVG canvas)
────────────────────────────────────────────────────────────── */
const MAP_W = 1024
const MAP_H = 512

function xPx(lon: number): number { return ((lon + 180) % 360) * (MAP_W / 360) }
function yPx(lat: number): number { return (90 - lat) * (MAP_H / 180) }

/* ──────────────────────────────────────────────────────────────
   View presets (lat, lon, zoom multiplier)
────────────────────────────────────────────────────────────── */
export type ViewPreset = 'asia' | 'vietnam' | 'americas' | 'europe' | 'world'

export const VIEW_PRESETS: Record<ViewPreset, { label: string; lat: number; lon: number; zoom: number }> = {
  asia:     { label: 'Asia',         lat: 35,  lon: 105,  zoom: 2.8 },
  vietnam:  { label: 'Vietnam',      lat: 16,  lon: 107,  zoom: 5.0 },
  americas: { label: 'Americas',     lat: 20,  lon: -90,  zoom: 2.4 },
  europe:   { label: 'Europe',       lat: 50,  lon: 10,   zoom: 3.4 },
  world:    { label: 'World',        lat: 5,   lon: 30,   zoom: 1.0 },
}

/* ──────────────────────────────────────────────────────────────
   Data: Tech HQs — ported from worldmonitor-main/src/config/tech-geo.ts
   (subset of the 200+ entries — kept the strategically-significant
   FAANG / unicorns / regional leaders to stay performant in SVG.)
────────────────────────────────────────────────────────────── */
export interface TechHQ {
  id: string
  name: string
  city: string
  country: string
  lat: number
  lon: number
  cap: 'mega' | 'large' | 'mid'
}

export const TECH_HQS: TechHQ[] = [
  // ══ USA — FAANG & Big Tech ══
  { id: 'apple',     name: 'Apple',          city: 'Cupertino',     country: 'USA',  lat: 37.3349, lon: -122.0090, cap: 'mega' },
  { id: 'google',    name: 'Google',         city: 'Mountain View', country: 'USA',  lat: 37.4220, lon: -122.0841, cap: 'mega' },
  { id: 'amazon',    name: 'Amazon',         city: 'Seattle',       country: 'USA',  lat: 47.6205, lon: -122.3493, cap: 'mega' },
  { id: 'meta',      name: 'Meta',           city: 'Menlo Park',    country: 'USA',  lat: 37.4530, lon: -122.1817, cap: 'mega' },
  { id: 'microsoft', name: 'Microsoft',      city: 'Redmond',       country: 'USA',  lat: 47.6740, lon: -122.1215, cap: 'mega' },
  { id: 'nvidia',    name: 'NVIDIA',         city: 'Santa Clara',   country: 'USA',  lat: 37.3708, lon: -121.9675, cap: 'mega' },
  { id: 'netflix',   name: 'Netflix',        city: 'Los Gatos',     country: 'USA',  lat: 37.2358, lon: -121.9624, cap: 'large' },
  // ══ USA — AI Leaders ══
  { id: 'openai',    name: 'OpenAI',         city: 'San Francisco', country: 'USA',  lat: 37.7749, lon: -122.4194, cap: 'mega' },
  { id: 'anthropic', name: 'Anthropic',      city: 'San Francisco', country: 'USA',  lat: 37.7849, lon: -122.4094, cap: 'large' },
  { id: 'databricks',name: 'Databricks',     city: 'San Francisco', country: 'USA',  lat: 37.7749, lon: -122.4294, cap: 'large' },
  // ══ USA — Enterprise & Cloud ══
  { id: 'salesforce',name: 'Salesforce',     city: 'San Francisco', country: 'USA',  lat: 37.7897, lon: -122.3972, cap: 'large' },
  { id: 'oracle',    name: 'Oracle',         city: 'Austin',        country: 'USA',  lat: 30.2672, lon: -97.7431,  cap: 'large' },
  { id: 'ibm',       name: 'IBM',            city: 'Armonk',        country: 'USA',  lat: 41.1118, lon: -73.7204,  cap: 'large' },
  { id: 'snowflake', name: 'Snowflake',      city: 'Bozeman',       country: 'USA',  lat: 45.6770, lon: -111.0429, cap: 'large' },
  { id: 'cloudflare',name: 'Cloudflare',     city: 'San Francisco', country: 'USA',  lat: 37.7849, lon: -122.3894, cap: 'large' },
  // ══ USA — Semiconductors ══
  { id: 'intel',     name: 'Intel',          city: 'Santa Clara',   country: 'USA',  lat: 37.3875, lon: -121.9636, cap: 'large' },
  { id: 'amd',       name: 'AMD',            city: 'Santa Clara',   country: 'USA',  lat: 37.3803, lon: -121.9610, cap: 'large' },
  { id: 'qualcomm',  name: 'Qualcomm',       city: 'San Diego',     country: 'USA',  lat: 32.8998, lon: -117.2016, cap: 'large' },
  // ══ USA — SaaS / Hardware ══
  { id: 'adobe',     name: 'Adobe',          city: 'San Jose',      country: 'USA',  lat: 37.3309, lon: -121.8930, cap: 'large' },
  { id: 'cisco',     name: 'Cisco',          city: 'San Jose',      country: 'USA',  lat: 37.4089, lon: -121.9533, cap: 'large' },
  { id: 'palantir',  name: 'Palantir',       city: 'Denver',        country: 'USA',  lat: 39.7392, lon: -104.9903, cap: 'large' },
  { id: 'tesla',     name: 'Tesla',          city: 'Austin',        country: 'USA',  lat: 30.2231, lon: -97.6228,  cap: 'mega' },
  { id: 'spacex',    name: 'SpaceX',         city: 'Hawthorne',     country: 'USA',  lat: 33.9207, lon: -118.3280, cap: 'large' },
  { id: 'stripe',    name: 'Stripe',         city: 'San Francisco', country: 'USA',  lat: 37.7902, lon: -122.4069, cap: 'large' },
  { id: 'airbnb',    name: 'Airbnb',         city: 'San Francisco', country: 'USA',  lat: 37.7717, lon: -122.4063, cap: 'large' },
  { id: 'uber',      name: 'Uber',           city: 'San Francisco', country: 'USA',  lat: 37.7749, lon: -122.4148, cap: 'large' },
  // ══ Europe ══
  { id: 'arm',       name: 'ARM',            city: 'Cambridge',     country: 'UK',   lat: 52.2053, lon: 0.1218,    cap: 'large' },
  { id: 'deepmind',  name: 'DeepMind',       city: 'London',        country: 'UK',   lat: 51.5334, lon: -0.1254,   cap: 'large' },
  { id: 'revolut',   name: 'Revolut',        city: 'London',        country: 'UK',   lat: 51.5154, lon: -0.1410,   cap: 'mid' },
  { id: 'sap',       name: 'SAP',            city: 'Walldorf',      country: 'Germany', lat: 49.3064, lon: 8.6498, cap: 'large' },
  { id: 'asml',      name: 'ASML',           city: 'Veldhoven',     country: 'Netherlands', lat: 51.4200, lon: 5.4000, cap: 'mega' },
  { id: 'spotify',   name: 'Spotify',        city: 'Stockholm',     country: 'Sweden', lat: 59.3293, lon: 18.0686, cap: 'large' },
  { id: 'klarna',    name: 'Klarna',         city: 'Stockholm',     country: 'Sweden', lat: 59.3366, lon: 18.0717, cap: 'mid' },
  { id: 'mistral',   name: 'Mistral AI',     city: 'Paris',         country: 'France', lat: 48.8716, lon: 2.3427,  cap: 'mid' },
  { id: 'nokia',     name: 'Nokia',          city: 'Espoo',         country: 'Finland', lat: 60.1756, lon: 24.8272, cap: 'large' },
  // ══ MENA ══
  { id: 'careem',    name: 'Careem',         city: 'Dubai',         country: 'UAE',  lat: 25.0771, lon: 55.1396,   cap: 'mid' },
  { id: 'g42',       name: 'G42',            city: 'Abu Dhabi',     country: 'UAE',  lat: 24.4669, lon: 54.3659,   cap: 'large' },
  { id: 'tabby',     name: 'Tabby',          city: 'Riyadh',        country: 'Saudi Arabia', lat: 24.7200, lon: 46.6900, cap: 'mid' },
  // ══ China ══
  { id: 'tencent',   name: 'Tencent',        city: 'Shenzhen',      country: 'China', lat: 22.5333, lon: 114.1333, cap: 'mega' },
  { id: 'alibaba',   name: 'Alibaba',        city: 'Hangzhou',      country: 'China', lat: 30.2741, lon: 120.1551, cap: 'mega' },
  { id: 'bytedance', name: 'ByteDance',      city: 'Beijing',       country: 'China', lat: 39.9876, lon: 116.4841, cap: 'mega' },
  { id: 'baidu',     name: 'Baidu',          city: 'Beijing',       country: 'China', lat: 40.0564, lon: 116.3053, cap: 'large' },
  { id: 'huawei',    name: 'Huawei',         city: 'Shenzhen',      country: 'China', lat: 22.7240, lon: 114.1181, cap: 'mega' },
  { id: 'xiaomi',    name: 'Xiaomi',         city: 'Beijing',       country: 'China', lat: 40.0010, lon: 116.3062, cap: 'large' },
  { id: 'dji',       name: 'DJI',            city: 'Shenzhen',      country: 'China', lat: 22.5388, lon: 113.9461, cap: 'mid' },
  { id: 'byd',       name: 'BYD',            city: 'Shenzhen',      country: 'China', lat: 22.6506, lon: 114.0572, cap: 'large' },
  // ══ India ══
  { id: 'flipkart',  name: 'Flipkart',       city: 'Bangalore',     country: 'India', lat: 12.9716, lon: 77.5946,  cap: 'large' },
  { id: 'phonepe',   name: 'PhonePe',        city: 'Bangalore',     country: 'India', lat: 12.9641, lon: 77.5967,  cap: 'large' },
  { id: 'razorpay',  name: 'Razorpay',       city: 'Bangalore',     country: 'India', lat: 12.9716, lon: 77.5946,  cap: 'mid' },
  { id: 'infosys',   name: 'Infosys',        city: 'Bangalore',     country: 'India', lat: 12.8399, lon: 77.6770,  cap: 'large' },
  { id: 'tcs',       name: 'TCS',            city: 'Mumbai',        country: 'India', lat: 19.0625, lon: 72.8689,  cap: 'large' },
  { id: 'paytm',     name: 'Paytm',          city: 'Noida',         country: 'India', lat: 28.5355, lon: 77.3910,  cap: 'large' },
  { id: 'zomato',    name: 'Zomato',         city: 'Gurgaon',       country: 'India', lat: 28.4595, lon: 77.0266,  cap: 'large' },
  // ══ SE Asia ══
  { id: 'grab',      name: 'Grab',           city: 'Singapore',     country: 'Singapore', lat: 1.3080, lon: 103.8545, cap: 'large' },
  { id: 'sea',       name: 'Sea Limited',    city: 'Singapore',     country: 'Singapore', lat: 1.2966, lon: 103.8560, cap: 'large' },
  { id: 'razer',     name: 'Razer',          city: 'Singapore',     country: 'Singapore', lat: 1.2936, lon: 103.8547, cap: 'mid' },
  { id: 'goto',      name: 'GoTo',           city: 'Jakarta',       country: 'Indonesia', lat: -6.2088, lon: 106.8456, cap: 'large' },
  { id: 'traveloka', name: 'Traveloka',      city: 'Jakarta',       country: 'Indonesia', lat: -6.2250, lon: 106.8100, cap: 'mid' },
  // ══ Vietnam (host country — emphasised) ══
  { id: 'vng',       name: 'VNG Corporation',city: 'Ho Chi Minh',   country: 'Vietnam', lat: 10.7769, lon: 106.7009, cap: 'mid' },
  { id: 'momo',      name: 'MoMo',           city: 'Ho Chi Minh',   country: 'Vietnam', lat: 10.7800, lon: 106.6958, cap: 'mid' },
  { id: 'vnpay',     name: 'VNPay',          city: 'Hanoi',         country: 'Vietnam', lat: 21.0285, lon: 105.8542, cap: 'mid' },
  { id: 'sky-mavis', name: 'Sky Mavis',      city: 'Ho Chi Minh',   country: 'Vietnam', lat: 10.7620, lon: 106.6602, cap: 'mid' },
  { id: 'fpt',       name: 'FPT',            city: 'Hanoi',         country: 'Vietnam', lat: 21.0285, lon: 105.8542, cap: 'large' },
  { id: 'aeroedu',   name: 'AeroEdu HQ',     city: 'Ho Chi Minh',   country: 'Vietnam', lat: 10.8231, lon: 106.6297, cap: 'mid' },
  // ══ North Asia ══
  { id: 'sony',      name: 'Sony',           city: 'Tokyo',         country: 'Japan', lat: 35.6192, lon: 139.7500, cap: 'large' },
  { id: 'softbank',  name: 'SoftBank',       city: 'Tokyo',         country: 'Japan', lat: 35.6558, lon: 139.7513, cap: 'large' },
  { id: 'nintendo',  name: 'Nintendo',       city: 'Kyoto',         country: 'Japan', lat: 34.9696, lon: 135.7557, cap: 'large' },
  { id: 'samsung',   name: 'Samsung',        city: 'Seoul',         country: 'South Korea', lat: 37.5284, lon: 127.0366, cap: 'mega' },
  { id: 'sk-hynix',  name: 'SK Hynix',       city: 'Icheon',        country: 'South Korea', lat: 37.2792, lon: 127.4349, cap: 'large' },
  { id: 'naver',     name: 'Naver',          city: 'Seongnam',      country: 'South Korea', lat: 37.3595, lon: 127.1054, cap: 'large' },
  { id: 'tsmc',      name: 'TSMC',           city: 'Hsinchu',       country: 'Taiwan', lat: 24.7736, lon: 120.9974, cap: 'mega' },
  { id: 'foxconn',   name: 'Foxconn',        city: 'New Taipei',    country: 'Taiwan', lat: 25.0459, lon: 121.4652, cap: 'large' },
  // ══ Australia / Canada ══
  { id: 'atlassian', name: 'Atlassian',      city: 'Sydney',        country: 'Australia', lat: -33.8688, lon: 151.2093, cap: 'large' },
  { id: 'canva',     name: 'Canva',          city: 'Sydney',        country: 'Australia', lat: -33.8651, lon: 151.2099, cap: 'large' },
  { id: 'shopify',   name: 'Shopify',        city: 'Ottawa',        country: 'Canada', lat: 45.4215, lon: -75.6972, cap: 'large' },
  // ══ LATAM / Africa ══
  { id: 'nubank',    name: 'Nubank',         city: 'São Paulo',     country: 'Brazil', lat: -23.5629, lon: -46.6544, cap: 'large' },
  { id: 'mercadolibre', name: 'MercadoLibre',city: 'Buenos Aires',  country: 'Argentina', lat: -34.6037, lon: -58.3816, cap: 'large' },
  { id: 'rappi',     name: 'Rappi',          city: 'Bogotá',        country: 'Colombia', lat: 4.6097, lon: -74.0817, cap: 'mid' },
  { id: 'flutterwave',name:'Flutterwave',    city: 'Lagos',         country: 'Nigeria', lat: 6.4541, lon: 3.3947,   cap: 'mid' },
]

/* ──────────────────────────────────────────────────────────────
   Data: Cloud Regions — ported from worldmonitor-main/src/config/tech-geo.ts
   (CLOUD_REGIONS, line 600+).
────────────────────────────────────────────────────────────── */
export interface CloudRegion {
  id: string
  provider: 'AWS' | 'GCP' | 'Azure' | 'Cloudflare'
  region: string
  city: string
  lat: number
  lon: number
}

export const CLOUD_REGIONS: CloudRegion[] = [
  // ── AWS Major Regions ──
  { id: 'aws-us-east-1',     provider: 'AWS', region: 'us-east-1 · N. Virginia',  city: 'Ashburn',     lat: 39.0438, lon: -77.4874 },
  { id: 'aws-us-west-2',     provider: 'AWS', region: 'us-west-2 · Oregon',       city: 'Boardman',    lat: 45.8399, lon: -119.7006 },
  { id: 'aws-eu-west-1',     provider: 'AWS', region: 'eu-west-1 · Ireland',      city: 'Dublin',      lat: 53.3498, lon: -6.2603 },
  { id: 'aws-eu-central-1',  provider: 'AWS', region: 'eu-central-1 · Frankfurt', city: 'Frankfurt',   lat: 50.1109, lon: 8.6821 },
  { id: 'aws-ap-northeast-1',provider: 'AWS', region: 'ap-northeast-1 · Tokyo',   city: 'Tokyo',       lat: 35.6762, lon: 139.6503 },
  { id: 'aws-ap-southeast-1',provider: 'AWS', region: 'ap-southeast-1 · Singapore', city: 'Singapore', lat: 1.3521,  lon: 103.8198 },
  { id: 'aws-ap-south-1',    provider: 'AWS', region: 'ap-south-1 · Mumbai',      city: 'Mumbai',      lat: 19.0760, lon: 72.8777 },
  { id: 'aws-sa-east-1',     provider: 'AWS', region: 'sa-east-1 · São Paulo',    city: 'São Paulo',   lat: -23.5505, lon: -46.6333 },
  { id: 'aws-me-south-1',    provider: 'AWS', region: 'me-south-1 · Bahrain',     city: 'Manama',      lat: 26.2285, lon: 50.5860 },
  { id: 'aws-me-central-1',  provider: 'AWS', region: 'me-central-1 · UAE',       city: 'Dubai',       lat: 25.2048, lon: 55.2708 },
  // ── GCP Major Regions ──
  { id: 'gcp-us-central1',   provider: 'GCP', region: 'us-central1 · Iowa',        city: 'Council Bluffs', lat: 41.2619, lon: -95.8608 },
  { id: 'gcp-us-east1',      provider: 'GCP', region: 'us-east1 · S.Carolina',     city: 'Moncks Corner',  lat: 33.1960, lon: -80.0131 },
  { id: 'gcp-europe-west1',  provider: 'GCP', region: 'europe-west1 · Belgium',    city: 'St. Ghislain',   lat: 50.4489, lon: 3.8187 },
  { id: 'gcp-asia-east1',    provider: 'GCP', region: 'asia-east1 · Taiwan',       city: 'Changhua',       lat: 24.0518, lon: 120.5161 },
  { id: 'gcp-asia-northeast1',provider:'GCP', region: 'asia-northeast1 · Tokyo',   city: 'Tokyo',          lat: 35.6895, lon: 139.6917 },
  { id: 'gcp-me-central1',   provider: 'GCP', region: 'me-central1 · Doha',        city: 'Doha',           lat: 25.2854, lon: 51.5310 },
  { id: 'gcp-me-west1',      provider: 'GCP', region: 'me-west1 · Tel Aviv',       city: 'Tel Aviv',       lat: 32.0853, lon: 34.7818 },
  // ── Azure Major Regions ──
  { id: 'azure-eastus',      provider: 'Azure', region: 'East US · Virginia',      city: 'Virginia',    lat: 37.3719, lon: -79.8164 },
  { id: 'azure-westeurope',  provider: 'Azure', region: 'West Europe · Amsterdam', city: 'Amsterdam',   lat: 52.3676, lon: 4.9041 },
  { id: 'azure-northeurope', provider: 'Azure', region: 'North Europe · Dublin',   city: 'Dublin',      lat: 53.3331, lon: -6.2489 },
  { id: 'azure-southeastasia',provider:'Azure', region: 'Southeast Asia · SG',     city: 'Singapore',   lat: 1.2833,  lon: 103.8333 },
  { id: 'azure-uaenorth',    provider: 'Azure', region: 'UAE North · Dubai',       city: 'Dubai',       lat: 25.2669, lon: 55.3172 },
  { id: 'azure-uaecentral',  provider: 'Azure', region: 'UAE Central · Abu Dhabi', city: 'Abu Dhabi',   lat: 24.4539, lon: 54.3773 },
  // ── Cloudflare Edge ──
  { id: 'cf-sfo',            provider: 'Cloudflare', region: 'SFO · San Francisco',city: 'San Francisco', lat: 37.6213, lon: -122.3790 },
  { id: 'cf-lhr',            provider: 'Cloudflare', region: 'LHR · London',       city: 'London',      lat: 51.4700, lon: -0.4543 },
  { id: 'cf-nrt',            provider: 'Cloudflare', region: 'NRT · Tokyo',        city: 'Tokyo',       lat: 35.7653, lon: 140.3864 },
]

/* ──────────────────────────────────────────────────────────────
   Data: Accelerators & Incubators — ported from worldmonitor-main
   (subset of ACCELERATORS, focused on famous global programs).
────────────────────────────────────────────────────────────── */
export interface Accelerator {
  id: string
  name: string
  city: string
  country: string
  lat: number
  lon: number
  type: 'accelerator' | 'incubator' | 'studio'
}

export const ACCELERATORS: Accelerator[] = [
  // ── USA ──
  { id: 'yc',                 name: 'Y Combinator',          city: 'San Francisco', country: 'USA', lat: 37.7749, lon: -122.4194, type: 'accelerator' },
  { id: '500',                name: '500 Global',            city: 'San Francisco', country: 'USA', lat: 37.7849, lon: -122.4094, type: 'accelerator' },
  { id: 'plug-play',          name: 'Plug and Play',         city: 'Sunnyvale',     country: 'USA', lat: 37.3688, lon: -122.0363, type: 'accelerator' },
  { id: 'techstars-boulder',  name: 'Techstars Boulder',     city: 'Boulder',       country: 'USA', lat: 40.0150, lon: -105.2705, type: 'accelerator' },
  { id: 'techstars-nyc',      name: 'Techstars NYC',         city: 'New York',      country: 'USA', lat: 40.7128, lon: -74.0060,  type: 'accelerator' },
  { id: 'masschallenge',      name: 'MassChallenge',         city: 'Boston',        country: 'USA', lat: 42.3480, lon: -71.0466,  type: 'accelerator' },
  { id: 'capital-factory',    name: 'Capital Factory',       city: 'Austin',        country: 'USA', lat: 30.2686, lon: -97.7435,  type: 'accelerator' },
  { id: 'newlab',             name: 'Newlab',                city: 'Brooklyn',      country: 'USA', lat: 40.6914, lon: -73.9785,  type: 'incubator' },
  { id: 'google-startups',    name: 'Google for Startups',   city: 'Mountain View', country: 'USA', lat: 37.4220, lon: -122.0841, type: 'accelerator' },
  { id: 'nvidia-inception',   name: 'NVIDIA Inception',      city: 'Santa Clara',   country: 'USA', lat: 37.3708, lon: -121.9675, type: 'accelerator' },
  // ── Europe ──
  { id: 'seedcamp',           name: 'Seedcamp',              city: 'London',        country: 'UK',  lat: 51.5074, lon: -0.1278,   type: 'accelerator' },
  { id: 'ef-london',          name: 'Entrepreneur First',    city: 'London',        country: 'UK',  lat: 51.5174, lon: -0.0878,   type: 'accelerator' },
  { id: 'founders-factory',   name: 'Founders Factory',      city: 'London',        country: 'UK',  lat: 51.5154, lon: -0.1410,   type: 'studio' },
  { id: 'stationf',           name: 'Station F',             city: 'Paris',         country: 'France', lat: 48.8341, lon: 2.3699, type: 'incubator' },
  { id: 'rocket-internet',    name: 'Rocket Internet',       city: 'Berlin',        country: 'Germany', lat: 52.5067, lon: 13.3244, type: 'studio' },
  { id: 'startupbootcamp',    name: 'Startupbootcamp',       city: 'Amsterdam',     country: 'Netherlands', lat: 52.3702, lon: 4.8952, type: 'accelerator' },
  { id: 'slush',              name: 'Slush',                 city: 'Helsinki',      country: 'Finland', lat: 60.1699, lon: 24.9384, type: 'accelerator' },
  // ── Asia / Pacific ──
  { id: 'antler-sg',          name: 'Antler',                city: 'Singapore',     country: 'Singapore', lat: 1.2833, lon: 103.8333, type: 'accelerator' },
  { id: 't-hub',              name: 'T-Hub',                 city: 'Hyderabad',     country: 'India', lat: 17.4486, lon: 78.3908,  type: 'incubator' },
  { id: 'sinovation',         name: 'Sinovation Ventures',   city: 'Beijing',       country: 'China', lat: 39.9042, lon: 116.4074, type: 'accelerator' },
  { id: 'hax-shenzhen',       name: 'HAX Shenzhen',          city: 'Shenzhen',      country: 'China', lat: 22.5431, lon: 114.0579, type: 'accelerator' },
  { id: 'sparklabs-korea',    name: 'SparkLabs Korea',       city: 'Seoul',         country: 'South Korea', lat: 37.5665, lon: 126.9780, type: 'accelerator' },
  { id: 'startmate',          name: 'Startmate',             city: 'Sydney',        country: 'Australia', lat: -33.8688, lon: 151.2093, type: 'accelerator' },
  // ── MENA & Africa ──
  { id: 'flat6labs',          name: 'Flat6Labs',             city: 'Cairo',         country: 'Egypt', lat: 30.0444, lon: 31.2357,  type: 'accelerator' },
  { id: 'hub71',              name: 'Hub71',                 city: 'Abu Dhabi',     country: 'UAE', lat: 24.4669, lon: 54.3659,    type: 'accelerator' },
  { id: 'misk',               name: 'Misk Accelerator',      city: 'Riyadh',        country: 'Saudi Arabia', lat: 24.7136, lon: 46.6753, type: 'accelerator' },
  { id: 'ihub',               name: 'iHub',                  city: 'Nairobi',       country: 'Kenya', lat: -1.2921, lon: 36.8219,  type: 'incubator' },
  // ── LATAM ──
  { id: 'startup-chile',      name: 'Startup Chile',         city: 'Santiago',      country: 'Chile', lat: -33.4489, lon: -70.6693, type: 'accelerator' },
  { id: 'cubo',               name: 'Cubo Itaú',             city: 'São Paulo',     country: 'Brazil', lat: -23.5629, lon: -46.6544, type: 'incubator' },
]

/* ──────────────────────────────────────────────────────────────
   Data: Undersea Cables — ported from worldmonitor-main/src/config/geo.ts
   UNDERSEA_CABLES (line 819+).
   NB: worldmonitor stores points as [lon, lat] — kept as-is here for
   provenance, but the renderer maps them via xPx/yPx accordingly.
────────────────────────────────────────────────────────────── */
export interface UnderseaCable {
  id: string
  name: string
  rfs: number                       // ready-for-service year
  /** [lon, lat] tuples, matching worldmonitor source format. */
  points: [number, number][]
  owners?: string[]
}

export const CABLES: UnderseaCable[] = [
  // ══ TRANS-ATLANTIC ══
  { id: 'marea',         name: 'MAREA',                rfs: 2018,
    owners: ['Meta', 'Microsoft', 'Telxius'],
    points: [[-76.1, 36.8], [-72.4, 37.4], [-50.4, 37.9], [-23.4, 44.7], [-9.9, 46.6], [-4.5, 44.7], [-2.9, 43.3]] },
  { id: 'grace_hopper',  name: 'Grace Hopper',         rfs: 2022,
    owners: ['Google'],
    points: [[-72.9, 40.8], [-61.2, 38.7], [-23.4, 46], [-8.1, 49.7], [-9.9, 46.9], [-2.9, 43.3]] },
  { id: 'havfrue',       name: 'Havfrue/AEC-2',        rfs: 2020,
    owners: ['Google', 'Meta', 'Bulk Infra', 'EXA'],
    points: [[8.3, 55.8], [-9.7, 53.8], [8, 58.2], [-74.1, 40.2]] },
  { id: 'dunant',        name: 'Dunant',               rfs: 2021,
    owners: ['Google'],
    points: [[-2, 46.7], [-5.4, 46.6], [-16.2, 45.3], [-39.6, 39.7], [-61.2, 37.6], [-74.7, 36.7], [-76.1, 36.8]] },
  { id: 'amitie',        name: 'Amitié',               rfs: 2023,
    owners: ['Meta', 'Microsoft', 'Vodafone'],
    points: [[-71, 42.5], [-50.4, 43.6], [-16.2, 50.2], [-3.1, 45.1], [-7.2, 50.9], [-4.5, 50.8]] },
  { id: 'apollo',        name: 'Apollo',               rfs: 2003,
    owners: ['Vodafone'],
    points: [[-74, 40.1], [-50.4, 38.5], [-5.4, 49.1], [-71.1, 40.2], [-39.6, 45], [-8.1, 50.5], [-4.5, 50.8]] },
  // ══ TRANS-PACIFIC ══
  { id: 'faster',        name: 'FASTER',               rfs: 2016,
    owners: ['Google', 'KDDI', 'NTT'],
    points: [[136.9, 34.3], [149.4, 37.6], [140.4, 34.4], [-129.6, 43.7], [135, 30.3], [121.5, 25.2]] },
  { id: 'jupiter',       name: 'JUPITER',              rfs: 2020,
    owners: ['Google', 'Meta', 'NTT', 'PCCW'],
    points: [[-118.4, 33.9], [180, 44.1], [140.4, 34.7], [142, 34.4], [124.6, 15.2], [-138.5, 41.4]] },
  { id: 'echo',          name: 'Echo',                 rfs: 2024,
    owners: ['Google', 'Meta'],
    points: [[180, 26.3], [143.5, 13.4], [123.7, -6.5], [104.8, 1.2], [133.6, 7.7], [-163.8, 33.3], [-180, 26.3]] },
  { id: 'topaz',         name: 'Topaz',                rfs: 2023,
    owners: ['Google'],
    points: [[138.6, 33.2], [120.9, 22.3], [-151.2, 49.6], [142.2, 36.9], [140.8, 33.9], [-123.1, 49.3]] },
  { id: 'plcn',          name: 'Pacific Light (PLCN)', rfs: 2022,
    owners: ['Google', 'Meta'],
    points: [[126, 21], [121.9, 15.8], [122.2, 24.8], [138.6, 25.8], [-120.6, 33.6], [-180, 43.4]] },
  { id: 'sccn',          name: 'Southern Cross Cable', rfs: 2000,
    points: [[174.8, -36.8], [178.9, -18], [-168.3, -10.2], [-123, 45.5], [-160, 18.7], [-158.1, 21.4]] },
  { id: 'curie',         name: 'Curie',                rfs: 2019,
    owners: ['Google'],
    points: [[-71.6, -33], [-85.5, -6.6], [-98.1, 12.6], [-118.8, 27.8], [-118.4, 33.9], [-79.4, 7.3], [-79.6, 9]] },
  // ══ ASIA-MIDDLE-EAST-EUROPE (AAE-1, SEAMEWE family, APG) ══
  { id: 'aae1',          name: 'AAE-1',                rfs: 2017,
    points: [[103.5, 10.6], [114.3, 22.2], [43.2, 11.6], [29.7, 31.1], [32.7, 29.1], [5.4, 43.3], [24, 35.5], [72.9, 19.1], [16.9, 41.1], [100.4, 5.4], [94.4, 16.9], [58.6, 23.6], [67, 24.9], [51.5, 25.3], [39.2, 21.5], [100.1, 6.6], [56.3, 25.1], [107.1, 10.3], [45, 12.8]] },
  { id: 'seamewe6',      name: 'SEA-ME-WE 6',          rfs: 2025,
    points: [[50.6, 26.2], [92, 21.4], [43.2, 11.6], [32.3, 31.3], [33.1, 28.4], [5.4, 43.3], [80.2, 13.1], [72.9, 19.1], [101.4, 2.8], [73.5, 4.2], [58.4, 23.6], [67, 24.9], [51.5, 25.3], [38.1, 24.1], [103.7, 1.3], [80.5, 5.9], [54.4, 24.4]] },
  { id: 'seamewe5',      name: 'SEA-ME-WE 5',          rfs: 2016,
    points: [[90.1, 21.8], [43.2, 11.6], [29.7, 31.1], [32.7, 29.1], [5.9, 43.1], [101.5, 1.7], [98.7, 3.8], [102.2, 2.3], [94.4, 16.9], [59.4, 22.7], [67, 24.9], [38.1, 24.1], [103.7, 1.3], [80.5, 5.9], [56.3, 25.1]] },
  { id: 'imewe',         name: 'IMEWE',                rfs: 2010,
    points: [[38.1, 22.1], [62.1, 19.1], [16.7, 34.7], [31.4, 31.1], [29.9, 31.2]] },
  { id: 'eig',           name: 'Europe India Gateway', rfs: 2011,
    points: [[56.3, 25.1], [9, 38], [16.7, 33.2], [-13.5, 44.1], [43.4, 12.6], [32.7, 29.1]] },
  // ══ AUSTRALASIA ══
  { id: 'sccn-next',     name: 'Southern Cross NEXT',  rfs: 2022,
    points: [[151.2, -33.9], [180, -18.9], [-175.5, -14.6], [-138.6, 23.3]] },
  { id: 'hawaiki',       name: 'Hawaiki',              rfs: 2018,
    points: [[174.6, -36.1], [151.2, -33.9], [-173.7, -11.9], [-153, 25.3], [165.6, -34.1]] },
]

/* ──────────────────────────────────────────────────────────────
   Data: Internet Disruptions (sample)
────────────────────────────────────────────────────────────── */
export interface Disruption {
  id: string
  region: string
  lat: number
  lon: number
  severity: 'low' | 'med' | 'high'
  note: string
}

export const DISRUPTIONS: Disruption[] = [
  { id: 'd1', region: 'Red Sea cables',     lat: 12.5,  lon:  43.0, severity: 'high', note: 'Multiple cable cuts' },
  { id: 'd2', region: 'Iran',                lat: 32.0,  lon:  53.0, severity: 'med',  note: 'Throttling reported' },
  { id: 'd3', region: 'Pakistan',            lat: 30.0,  lon:  70.0, severity: 'med',  note: 'Submarine cable fault' },
  { id: 'd4', region: 'Sudan',               lat: 15.5,  lon:  32.5, severity: 'high', note: 'Country-wide outage' },
  { id: 'd5', region: 'Eastern Ukraine',     lat: 48.5,  lon:  37.5, severity: 'med',  note: 'Power-grid linked' },
  { id: 'd6', region: 'Tonga',               lat: -21.0, lon: -175.0, severity: 'low',  note: 'Cable repair ongoing' },
]

/* ──────────────────────────────────────────────────────────────
   Stylized continents — procedural ellipses (matches the existing
   3D globe earth texture aesthetic; no external network deps).
────────────────────────────────────────────────────────────── */
type Blob = { cx: number; cy: number; rx: number; ry: number; rot?: number }

const CONTINENT_BLOBS: Blob[] = [
  // North America
  { cx: 240, cy: 170, rx: 110, ry: 80 },
  { cx: 175, cy: 120, rx: 60,  ry: 40 },
  { cx: 290, cy: 215, rx: 50,  ry: 35 },
  // Central + South America
  { cx: 290, cy: 260, rx: 30,  ry: 25 },
  { cx: 320, cy: 340, rx: 55,  ry: 100, rot: -20 },
  // Greenland
  { cx: 380, cy: 95,  rx: 35,  ry: 28 },
  // Europe + Russia
  { cx: 540, cy: 145, rx: 130, ry: 55 },
  { cx: 660, cy: 130, rx: 110, ry: 45 },
  // Africa
  { cx: 545, cy: 290, rx: 70,  ry: 100 },
  { cx: 565, cy: 360, rx: 50,  ry: 45 },
  // Middle East
  { cx: 615, cy: 220, rx: 45,  ry: 35 },
  // Asia (main)
  { cx: 745, cy: 195, rx: 130, ry: 75 },
  { cx: 800, cy: 250, rx: 60,  ry: 50 },
  // SE Asia archipelago
  { cx: 800, cy: 295, rx: 50,  ry: 22 },
  // India
  { cx: 705, cy: 250, rx: 32,  ry: 45 },
  // Australia
  { cx: 850, cy: 360, rx: 70,  ry: 45 },
  // Antarctica strip
  { cx: 512, cy: 495, rx: 510, ry: 25 },
]

/* ──────────────────────────────────────────────────────────────
   Sub-component: layer toggle row in the sidebar
────────────────────────────────────────────────────────────── */
interface LayerRowProps {
  enabled: boolean
  onToggle: () => void
  color: string
  icon: React.ReactNode
  label: string
  count: number
}

function LayerRow({ enabled, onToggle, color, icon, label, count }: LayerRowProps) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '14px 1fr auto auto',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        background: enabled ? T.bgPanel2 : 'transparent',
        border: 'none',
        borderLeft: `2px solid ${enabled ? color : 'transparent'}`,
        color: enabled ? T.text : T.textDim,
        fontFamily: T.font,
        fontSize: 11,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 120ms, color 120ms, border-color 120ms',
      }}
      onMouseEnter={(e) => {
        if (!enabled) e.currentTarget.style.background = T.bgPanel2
      }}
      onMouseLeave={(e) => {
        if (!enabled) e.currentTarget.style.background = 'transparent'
      }}
    >
      <span style={{ color, display: 'flex' }}>{icon}</span>
      <span style={{
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 9,
        color: T.textMuted,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {count}
      </span>
      <span
        style={{
          width: 18, height: 10,
          borderRadius: 6,
          background: enabled ? color : T.border,
          position: 'relative',
          transition: 'background 120ms',
        }}
      >
        <span style={{
          position: 'absolute',
          top: 1, left: enabled ? 9 : 1,
          width: 8, height: 8,
          borderRadius: '50%',
          background: T.bg,
          transition: 'left 120ms',
        }} />
      </span>
    </button>
  )
}

/* ──────────────────────────────────────────────────────────────
   Hover tooltip — follows the cursor on the map
────────────────────────────────────────────────────────────── */
interface HoverInfo {
  x: number
  y: number
  title: string
  subtitle: string
  color: string
}

/* ══════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════ */
export interface StemMonitor2DMapProps {
  /** Called when the user dismisses the full-screen monitor view. */
  onClose: () => void
  /** Optional initial preset — defaults to 'asia' to match the user's reference URL. */
  initialView?: ViewPreset
}

export default function StemMonitor2DMap({
  onClose,
  initialView = 'asia',
}: StemMonitor2DMapProps) {
  // Layer visibility — defaults match the user's stated preference (4 default-on)
  const [layers, setLayers] = useState({
    startups:     true,
    techHQs:      true,
    accelerators: false,
    clouds:       true,
    cables:       true,
    disruptions:  false,
  })
  const [view, setView] = useState<ViewPreset>(initialView)
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const [now, setNow] = useState(() => new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // ESC closes
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const toggleLayer = useCallback((k: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [k]: !prev[k] }))
  }, [])

  // SVG viewBox derived from view preset (lat/lon center + zoom)
  const viewBox = useMemo(() => {
    const v = VIEW_PRESETS[view]
    const cx = xPx(v.lon)
    const cy = yPx(v.lat)
    const w = MAP_W / v.zoom
    const h = MAP_H / v.zoom
    return `${cx - w / 2} ${cy - h / 2} ${w} ${h}`
  }, [view])

  // Counts for sidebar
  const counts = {
    startups:     STARTUP_HUBS.length,
    techHQs:      TECH_HQS.length,
    accelerators: ACCELERATORS.length,
    clouds:       CLOUD_REGIONS.length,
    cables:       CABLES.length,
    disruptions:  DISRUPTIONS.length,
  }

  // Hover handler factory
  const onMarkerOver = (
    e: React.MouseEvent,
    title: string,
    subtitle: string,
    color: string,
  ) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setHover({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      title, subtitle, color,
    })
  }
  const onMarkerOut = () => setHover(null)

  const time = now.toLocaleTimeString('vi-VN', { hour12: false, timeZone: 'Asia/Ho_Chi_Minh' })
  const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: T.bg,
        color: T.text,
        fontFamily: T.font,
        display: 'flex',
        flexDirection: 'column',
        animation: 'stemMonFadeIn 220ms ease both',
      }}
    >
      <style>{`
        @keyframes stemMonFadeIn {
          from { opacity: 0; transform: scale(0.985); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes stemMonPulse {
          0%, 100% { opacity: 1;   transform: scale(1);    }
          50%      { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes stemMonCableFlow {
          to { stroke-dashoffset: -200; }
        }
        @keyframes stemMonRipple {
          0%   { r: 1.5; opacity: 0.9; }
          100% { r: 6;   opacity: 0;   }
        }
        .stemmon-cable-line {
          stroke-dasharray: 6 4;
          animation: stemMonCableFlow 12s linear infinite;
        }
        .stemmon-marker { cursor: pointer; transition: transform 120ms; }
        .stemmon-marker:hover { transform: scale(1.4); transform-origin: center; }
        .stemmon-scroll::-webkit-scrollbar { width: 4px; }
        .stemmon-scroll::-webkit-scrollbar-thumb { background: ${T.border}; }
      `}</style>

      {/* ══ Top bar ══ */}
      <div style={{
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: T.bgPanel,
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{
            fontWeight: 800, letterSpacing: 1.4,
            background: `linear-gradient(90deg, ${T.cyan}, ${T.purple})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontSize: 13,
          }}>
            STEM·MONITOR
          </span>
          <span style={{ color: T.borderHi }}>|</span>
          <span style={{
            fontSize: 10, color: T.textDim,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: T.green,
              boxShadow: `0 0 8px ${T.green}`,
              animation: 'stemMonPulse 1.6s ease-in-out infinite',
            }} />
            LIVE
          </span>
          <span style={{ color: T.borderHi }}>|</span>
          <span style={{ fontSize: 10, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
            {date} · {time} <span style={{ color: T.textMuted }}>ICT</span>
          </span>
          <span style={{ color: T.borderHi }}>|</span>
          <span style={{ fontSize: 10, color: T.textMuted }}>
            v2026.04 · inspired by worldmonitor.app
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'transparent',
            border: `1px solid ${T.border}`,
            color: T.textDim,
            fontFamily: T.font,
            fontSize: 11,
            letterSpacing: 0.5,
            padding: '4px 10px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'color 120ms, border-color 120ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = T.cyan
            e.currentTarget.style.borderColor = T.cyan
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = T.textDim
            e.currentTarget.style.borderColor = T.border
          }}
        >
          <X size={12} /> Đóng monitor (ESC)
        </button>
      </div>

      {/* ══ Body: sidebar + map ══ */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* ── Sidebar ── */}
        <aside
          className="stemmon-scroll"
          style={{
            width: 260,
            flexShrink: 0,
            background: T.bgPanel,
            borderRight: `1px solid ${T.border}`,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* View selector */}
          <div style={{ padding: '14px 12px 10px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{
              fontSize: 9, color: T.textMuted,
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Globe size={10} /> View preset
            </div>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as ViewPreset)}
              style={{
                width: '100%',
                background: T.bgPanel2,
                border: `1px solid ${T.border}`,
                color: T.text,
                fontFamily: T.font,
                fontSize: 11,
                padding: '6px 8px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {(Object.keys(VIEW_PRESETS) as ViewPreset[]).map((k) => (
                <option key={k} value={k} style={{ background: T.bgPanel }}>
                  {VIEW_PRESETS[k].label} · {Math.round(VIEW_PRESETS[k].zoom * 10) / 10}×
                </option>
              ))}
            </select>
          </div>

          {/* Layer toggles */}
          <div style={{ borderBottom: `1px solid ${T.border}` }}>
            <div style={{
              padding: '14px 12px 8px',
              fontSize: 9, color: T.textMuted,
              textTransform: 'uppercase', letterSpacing: 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Layers size={10} /> Lớp dữ liệu
            </div>
            <LayerRow
              enabled={layers.startups}
              onToggle={() => toggleLayer('startups')}
              color={T.green}
              icon={<Rocket size={11} />}
              label="Startup Hubs"
              count={counts.startups}
            />
            <LayerRow
              enabled={layers.techHQs}
              onToggle={() => toggleLayer('techHQs')}
              color={T.techHQ}
              icon={<Building2 size={11} />}
              label="Tech HQs"
              count={counts.techHQs}
            />
            <LayerRow
              enabled={layers.accelerators}
              onToggle={() => toggleLayer('accelerators')}
              color={T.accel}
              icon={<Cpu size={11} />}
              label="Accelerators"
              count={counts.accelerators}
            />
            <LayerRow
              enabled={layers.clouds}
              onToggle={() => toggleLayer('clouds')}
              color={T.cloud}
              icon={<Server size={11} />}
              label="Cloud Regions"
              count={counts.clouds}
            />
            <LayerRow
              enabled={layers.cables}
              onToggle={() => toggleLayer('cables')}
              color={T.cyan}
              icon={<Cable size={11} />}
              label="Undersea Cables"
              count={counts.cables}
            />
            <LayerRow
              enabled={layers.disruptions}
              onToggle={() => toggleLayer('disruptions')}
              color={T.pink}
              icon={<AlertTriangle size={11} />}
              label="Disruptions"
              count={counts.disruptions}
            />
          </div>

          {/* Active layers stats */}
          <div style={{
            padding: '14px 12px',
            borderBottom: `1px solid ${T.border}`,
          }}>
            <div style={{
              fontSize: 9, color: T.textMuted,
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Activity size={10} /> Trạng thái
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 5, fontSize: 10 }}>
              <span style={{ color: T.textDim }}>Markers hiển thị</span>
              <span style={{ color: T.cyan, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {(layers.startups     ? counts.startups     : 0)
                 + (layers.techHQs      ? counts.techHQs      : 0)
                 + (layers.accelerators ? counts.accelerators : 0)
                 + (layers.clouds       ? counts.clouds       : 0)
                 + (layers.disruptions  ? counts.disruptions  : 0)}
              </span>
              <span style={{ color: T.textDim }}>Cables vẽ</span>
              <span style={{ color: T.cyan, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {layers.cables ? counts.cables : 0}
              </span>
              <span style={{ color: T.textDim }}>View hiện tại</span>
              <span style={{ color: T.purple, fontWeight: 700 }}>
                {VIEW_PRESETS[view].label}
              </span>
              <span style={{ color: T.textDim }}>Zoom</span>
              <span style={{ color: T.amber, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {VIEW_PRESETS[view].zoom.toFixed(1)}×
              </span>
            </div>
          </div>

          {/* Legend */}
          <div style={{ padding: '14px 12px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{
              fontSize: 9, color: T.textMuted,
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <MapPin size={10} /> Chú thích
            </div>
            {[
              { c: T.startup, l: 'Startup Hub' },
              { c: T.techHQ,  l: 'Tech HQ' },
              { c: T.accel,   l: 'Accelerator' },
              { c: T.cloud,   l: 'Cloud Region' },
              { c: T.cable,   l: 'Undersea Cable' },
              { c: T.outage,  l: 'Disruption' },
            ].map((row) => (
              <div key={row.l} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 10, color: T.textDim, padding: '3px 0',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: row.c, boxShadow: `0 0 6px ${row.c}`,
                }} />
                {row.l}
              </div>
            ))}
          </div>

          {/* AeroEdu attribution */}
          <div style={{
            marginTop: 'auto',
            padding: 12,
            fontSize: 9, color: T.textMuted, lineHeight: 1.5,
            borderTop: `1px solid ${T.border}`,
          }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: T.cyan, fontWeight: 700 }}>STEM MONITOR</span> · AeroEduVision
            </div>
            <div>
              Bản đồ giáo dục công nghệ — phong cách
              <span style={{ color: T.cyan }}> worldmonitor.app</span>.
              Dữ liệu demo, refresh mỗi 1s.
            </div>
          </div>
        </aside>

        {/* ── Map area ── */}
        <main style={{
          flex: 1,
          background: T.bgMap,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <svg
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid slice"
            style={{
              width: '100%', height: '100%', display: 'block',
              background: `radial-gradient(ellipse at 50% 50%, #0a1226 0%, ${T.bgMap} 80%)`,
            }}
          >
            {/* Lat/Lon graticule */}
            <g stroke="#1a2440" strokeWidth={0.4} opacity={0.7}>
              {Array.from({ length: 13 }).map((_, i) => {
                const y = (i * MAP_H) / 12
                return <line key={`h${i}`} x1={0} y1={y} x2={MAP_W} y2={y} />
              })}
              {Array.from({ length: 25 }).map((_, i) => {
                const x = (i * MAP_W) / 24
                return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={MAP_H} />
              })}
            </g>

            {/* Equator (highlighted) */}
            <line
              x1={0} y1={MAP_H / 2} x2={MAP_W} y2={MAP_H / 2}
              stroke={T.cyan} strokeWidth={0.6} opacity={0.25}
              strokeDasharray="4 4"
            />

            {/* Continents */}
            <g>
              {CONTINENT_BLOBS.map((b, i) => (
                <ellipse
                  key={i}
                  cx={b.cx} cy={b.cy}
                  rx={b.rx} ry={b.ry}
                  transform={b.rot ? `rotate(${b.rot} ${b.cx} ${b.cy})` : undefined}
                  fill="#0d1a36"
                  stroke="#1f3060"
                  strokeWidth={0.6}
                />
              ))}
              {/* Vietnam highlight */}
              <ellipse
                cx={xPx(107)} cy={yPx(16)}
                rx={6} ry={14}
                fill={`${T.pink}33`}
                stroke={T.pink}
                strokeWidth={0.4}
                opacity={0.6}
              />
            </g>

            {/* ── Layer: Undersea Cables ── */}
            {layers.cables && (
              <g>
                {CABLES.map((cable) => {
                  // Worldmonitor format: each point is [lon, lat]
                  const d = cable.points
                    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xPx(p[0])},${yPx(p[1])}`)
                    .join(' ')
                  const first = cable.points[0]
                  const last  = cable.points[cable.points.length - 1]
                  const endpoints = [first, last]
                  const ownerStr = cable.owners?.length ? ` · ${cable.owners.join(', ')}` : ''
                  return (
                    <g key={cable.id}>
                      <path
                        d={d}
                        fill="none"
                        stroke={T.cable}
                        strokeWidth={0.6}
                        opacity={0.55}
                        className="stemmon-cable-line"
                      />
                      {/* Endpoint diamonds */}
                      {endpoints.map((p, i) => (
                        <rect
                          key={i}
                          x={xPx(p[0]) - 1.6} y={yPx(p[1]) - 1.6}
                          width={3.2} height={3.2}
                          fill={T.cable}
                          opacity={0.85}
                          transform={`rotate(45 ${xPx(p[0])} ${yPx(p[1])})`}
                          className="stemmon-marker"
                          onMouseEnter={(e) => onMarkerOver(
                            e,
                            cable.name,
                            `Cáp ngầm · RFS ${cable.rfs} · ${cable.points.length} điểm landing${ownerStr}`,
                            T.cable,
                          )}
                          onMouseLeave={onMarkerOut}
                        />
                      ))}
                    </g>
                  )
                })}
              </g>
            )}

            {/* ── Layer: Cloud Regions ── */}
            {layers.clouds && (
              <g>
                {CLOUD_REGIONS.map((r) => (
                  <g key={r.id}>
                    <circle
                      cx={xPx(r.lon)} cy={yPx(r.lat)}
                      r={4}
                      fill={`${T.cloud}22`}
                      stroke={T.cloud}
                      strokeWidth={0.5}
                    />
                    <circle
                      cx={xPx(r.lon)} cy={yPx(r.lat)}
                      r={1.6}
                      fill={T.cloud}
                      className="stemmon-marker"
                      onMouseEnter={(e) => onMarkerOver(
                        e,
                        `${r.provider} · ${r.region}`,
                        `${r.city} · Cloud datacenter`,
                        T.cloud,
                      )}
                      onMouseLeave={onMarkerOut}
                    />
                  </g>
                ))}
              </g>
            )}

            {/* ── Layer: Tech HQs ── */}
            {layers.techHQs && (
              <g>
                {TECH_HQS.map((h) => {
                  const r = h.cap === 'mega' ? 2.4 : h.cap === 'large' ? 1.8 : 1.4
                  return (
                    <g key={h.id}>
                      <circle
                        cx={xPx(h.lon)} cy={yPx(h.lat)}
                        r={r * 2.4}
                        fill={`${T.techHQ}18`}
                        stroke="none"
                      />
                      <circle
                        cx={xPx(h.lon)} cy={yPx(h.lat)}
                        r={r}
                        fill={T.techHQ}
                        className="stemmon-marker"
                        onMouseEnter={(e) => onMarkerOver(
                          e,
                          h.name,
                          `${h.city}, ${h.country} · Tech HQ`,
                          T.techHQ,
                        )}
                        onMouseLeave={onMarkerOut}
                      />
                    </g>
                  )
                })}
              </g>
            )}

            {/* ── Layer: Accelerators ── */}
            {layers.accelerators && (
              <g>
                {ACCELERATORS.map((a) => {
                  const cx = xPx(a.lon)
                  const cy = yPx(a.lat)
                  // Triangle marker — visually distinct from circles (HQs/startups)
                  const s = 2.4
                  const tri = `${cx},${cy - s} ${cx - s},${cy + s * 0.7} ${cx + s},${cy + s * 0.7}`
                  return (
                    <g key={a.id}>
                      <circle
                        cx={cx} cy={cy}
                        r={s * 2.2}
                        fill={`${T.accel}18`}
                        stroke="none"
                      />
                      <polygon
                        points={tri}
                        fill={T.accel}
                        className="stemmon-marker"
                        onMouseEnter={(e) => onMarkerOver(
                          e,
                          a.name,
                          `${a.city}, ${a.country} · ${a.type}`,
                          T.accel,
                        )}
                        onMouseLeave={onMarkerOut}
                      />
                    </g>
                  )
                })}
              </g>
            )}

            {/* ── Layer: Startup Hubs ── */}
            {layers.startups && (
              <g>
                {STARTUP_HUBS.map((s: StartupHub) => {
                  const r = s.tier === 'mega' ? 2.6 : s.tier === 'major' ? 2.0 : 1.5
                  return (
                    <g key={s.id}>
                      <circle
                        cx={xPx(s.lon)} cy={yPx(s.lat)}
                        r={r * 2.4}
                        fill={`${T.startup}22`}
                        stroke="none"
                      />
                      <circle
                        cx={xPx(s.lon)} cy={yPx(s.lat)}
                        r={r}
                        fill={T.startup}
                        className="stemmon-marker"
                        onMouseEnter={(e) => onMarkerOver(
                          e,
                          s.name,
                          `${s.city}, ${s.country} · ${s.tier} hub${s.unicorns ? ` · ${s.unicorns} unicorns` : ''}`,
                          T.startup,
                        )}
                        onMouseLeave={onMarkerOut}
                      />
                    </g>
                  )
                })}
              </g>
            )}

            {/* ── Layer: Disruptions ── */}
            {layers.disruptions && (
              <g>
                {DISRUPTIONS.map((d) => {
                  const cx = xPx(d.lon)
                  const cy = yPx(d.lat)
                  return (
                    <g key={d.id}>
                      <circle
                        cx={cx} cy={cy}
                        r={4}
                        fill="none"
                        stroke={T.outage}
                        strokeWidth={0.5}
                        opacity={0.6}
                      />
                      {/* Pulse ripple */}
                      <circle cx={cx} cy={cy} r={1.5} fill={T.outage} opacity={0.6}>
                        <animate
                          attributeName="r"
                          values="1.5;6;1.5"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.9;0;0.9"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        cx={cx} cy={cy}
                        r={1.6}
                        fill={T.outage}
                        className="stemmon-marker"
                        onMouseEnter={(e) => onMarkerOver(
                          e,
                          d.region,
                          `${d.severity.toUpperCase()} · ${d.note}`,
                          T.outage,
                        )}
                        onMouseLeave={onMarkerOut}
                      />
                    </g>
                  )
                })}
              </g>
            )}
          </svg>

          {/* Floating coords HUD (top-left of map) */}
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: 'rgba(8,12,20,0.85)',
            border: `1px solid ${T.border}`,
            padding: '6px 10px',
            fontSize: 10, color: T.textDim,
            fontFamily: T.font,
            display: 'flex', alignItems: 'center', gap: 10,
            backdropFilter: 'blur(6px)',
          }}>
            <span style={{ color: T.cyan, fontWeight: 700 }}>
              {VIEW_PRESETS[view].label.toUpperCase()}
            </span>
            <span style={{ color: T.borderHi }}>·</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              lat {VIEW_PRESETS[view].lat.toFixed(2)}°, lon {VIEW_PRESETS[view].lon.toFixed(2)}°
            </span>
            <span style={{ color: T.borderHi }}>·</span>
            <span style={{ color: T.amber, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              zoom {VIEW_PRESETS[view].zoom.toFixed(1)}×
            </span>
          </div>

          {/* Layer status pill (top-right of map) */}
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(8,12,20,0.85)',
            border: `1px solid ${T.border}`,
            padding: '6px 10px',
            fontSize: 10, color: T.textDim,
            fontFamily: T.font,
            display: 'flex', alignItems: 'center', gap: 8,
            backdropFilter: 'blur(6px)',
          }}>
            <Cpu size={11} color={T.green} />
            <span>
              {Object.values(layers).filter(Boolean).length}/{Object.keys(layers).length} layers active
            </span>
          </div>

          {/* Hover tooltip */}
          {hover && (
            <div style={{
              position: 'absolute',
              left: hover.x + 14, top: hover.y + 14,
              background: 'rgba(8,12,20,0.96)',
              border: `1px solid ${hover.color}`,
              borderLeft: `3px solid ${hover.color}`,
              padding: '6px 10px',
              fontFamily: T.font,
              fontSize: 11,
              color: T.text,
              pointerEvents: 'none',
              boxShadow: `0 4px 16px ${hover.color}33`,
              maxWidth: 320,
              zIndex: 5,
            }}>
              <div style={{ color: hover.color, fontWeight: 700, marginBottom: 2 }}>
                {hover.title}
              </div>
              <div style={{ color: T.textDim, fontSize: 10 }}>
                {hover.subtitle}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
