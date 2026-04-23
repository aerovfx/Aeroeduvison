/**
 * Static seed data for the World Monitor hero globe on Landing.tsx.
 *
 * Ported from worldmonitor-main/src/config/tech-geo.ts and geo.ts
 * (AGPL-3.0, compatible) — used as a visual fallback when the live
 * aero-backend endpoints (/api/startups, /api/users-geo) are offline or
 * the VITE_AERO_BACKEND_URL env var is unset.
 *
 * Keep this list short-ish — it's rendered as individual Three.js points
 * on the landing page. ~50 markers is comfortable at 60fps on mid hardware.
 */

/* ──────────────────────────────────────────────────────────────
   Startup hubs
────────────────────────────────────────────────────────────── */
export interface StartupHub {
  id: string
  name: string
  city: string
  country: string
  lat: number
  lon: number
  /** `mega` = unicorn/public, `major` = Series B+, `emerging` = seed/A */
  tier: 'mega' | 'major' | 'emerging'
  unicorns?: number
  description?: string
}

export const STARTUP_HUBS: StartupHub[] = [
  // ══ Mega hubs ══
  { id: 'sf-bay',   name: 'Silicon Valley',    city: 'San Francisco', country: 'USA',     lat: 37.3861,  lon: -122.0839, tier: 'mega',  unicorns: 200 },
  { id: 'nyc',      name: 'New York Tech',     city: 'New York',      country: 'USA',     lat: 40.7128,  lon: -74.0060,  tier: 'mega',  unicorns: 100 },
  { id: 'london',   name: 'London Tech City',  city: 'London',        country: 'UK',      lat: 51.5074,  lon: -0.1278,   tier: 'mega',  unicorns: 45 },
  { id: 'beijing',  name: 'Zhongguancun',      city: 'Beijing',       country: 'China',   lat: 39.9042,  lon: 116.4074,  tier: 'mega',  unicorns: 80 },
  { id: 'shanghai', name: 'Shanghai Tech',     city: 'Shanghai',      country: 'China',   lat: 31.2304,  lon: 121.4737,  tier: 'mega',  unicorns: 50 },

  // ══ Major hubs ══
  { id: 'boston',    name: 'Boston/Cambridge', city: 'Boston',      country: 'USA',        lat: 42.3601,  lon: -71.0589,  tier: 'major', unicorns: 30 },
  { id: 'seattle',   name: 'Seattle Tech',     city: 'Seattle',     country: 'USA',        lat: 47.6062,  lon: -122.3321, tier: 'major', unicorns: 25 },
  { id: 'austin',    name: 'Austin Tech',      city: 'Austin',      country: 'USA',        lat: 30.2672,  lon: -97.7431,  tier: 'major', unicorns: 15 },
  { id: 'la',        name: 'Silicon Beach',    city: 'Los Angeles', country: 'USA',        lat: 34.0522,  lon: -118.2437, tier: 'major', unicorns: 20 },
  { id: 'berlin',    name: 'Berlin Startup',   city: 'Berlin',      country: 'Germany',    lat: 52.5200,  lon: 13.4050,   tier: 'major', unicorns: 15 },
  { id: 'paris',     name: 'Station F',        city: 'Paris',       country: 'France',     lat: 48.8566,  lon: 2.3522,    tier: 'major', unicorns: 25 },
  { id: 'telaviv',   name: 'Startup Nation',   city: 'Tel Aviv',    country: 'Israel',     lat: 32.0853,  lon: 34.7818,   tier: 'major', unicorns: 40 },
  { id: 'singapore', name: 'Singapore Tech',   city: 'Singapore',   country: 'Singapore',  lat: 1.3521,   lon: 103.8198,  tier: 'major', unicorns: 15 },
  { id: 'bangalore', name: 'Bangalore Tech',   city: 'Bangalore',   country: 'India',      lat: 12.9716,  lon: 77.5946,   tier: 'major', unicorns: 35 },
  { id: 'tokyo',     name: 'Tokyo Tech',       city: 'Tokyo',       country: 'Japan',      lat: 35.6762,  lon: 139.6503,  tier: 'major', unicorns: 10 },
  { id: 'toronto',   name: 'Toronto-Waterloo', city: 'Toronto',     country: 'Canada',     lat: 43.6532,  lon: -79.3832,  tier: 'major', unicorns: 15 },
  { id: 'shenzhen',  name: 'Shenzhen Tech',    city: 'Shenzhen',    country: 'China',      lat: 22.5431,  lon: 114.0579,  tier: 'major', unicorns: 25 },
  { id: 'dubai',     name: 'Dubai Internet City', city: 'Dubai',    country: 'UAE',        lat: 25.0994,  lon: 55.1641,   tier: 'major', unicorns: 5 },

  // ══ Emerging hubs ══
  { id: 'miami',     name: 'Miami Tech',       city: 'Miami',       country: 'USA',          lat: 25.7617,  lon: -80.1918, tier: 'emerging' },
  { id: 'denver',    name: 'Denver Tech',      city: 'Denver',      country: 'USA',          lat: 39.7392,  lon: -104.9903, tier: 'emerging' },
  { id: 'amsterdam', name: 'Amsterdam Startup',city: 'Amsterdam',   country: 'Netherlands',  lat: 52.3676,  lon: 4.9041,   tier: 'emerging' },
  { id: 'stockholm', name: 'Stockholm Tech',   city: 'Stockholm',   country: 'Sweden',       lat: 59.3293,  lon: 18.0686,  tier: 'emerging' },
  { id: 'dublin',    name: 'Dogpatch Labs',    city: 'Dublin',      country: 'Ireland',      lat: 53.3498,  lon: -6.2603,  tier: 'emerging' },
  { id: 'seoul',     name: 'Seoul Startup',    city: 'Seoul',       country: 'South Korea',  lat: 37.5665,  lon: 126.9780, tier: 'emerging' },
  { id: 'sydney',    name: 'Sydney Tech',      city: 'Sydney',      country: 'Australia',    lat: -33.8688, lon: 151.2093, tier: 'emerging' },
  { id: 'saopaulo',  name: 'São Paulo Tech',   city: 'São Paulo',   country: 'Brazil',       lat: -23.5505, lon: -46.6333, tier: 'emerging' },
  { id: 'nairobi',   name: 'Silicon Savannah', city: 'Nairobi',     country: 'Kenya',        lat: -1.2921,  lon: 36.8219,  tier: 'emerging' },
  { id: 'lagos',     name: 'Lagos Tech',       city: 'Lagos',       country: 'Nigeria',      lat: 6.5244,   lon: 3.3792,   tier: 'emerging' },
  { id: 'riyadh',    name: 'Riyadh Tech',      city: 'Riyadh',      country: 'Saudi Arabia', lat: 24.7136,  lon: 46.6753,  tier: 'emerging', unicorns: 2 },
  { id: 'cairo',     name: 'Cairo Tech',       city: 'Cairo',       country: 'Egypt',        lat: 30.0444,  lon: 31.2357,  tier: 'emerging' },
  { id: 'hcmc',      name: 'Ho Chi Minh Tech', city: 'Ho Chi Minh', country: 'Vietnam',      lat: 10.8231,  lon: 106.6297, tier: 'emerging', description: 'AeroEdu HQ — Vietnam startup capital' },
  { id: 'hanoi',     name: 'Hanoi Tech',       city: 'Hà Nội',      country: 'Vietnam',      lat: 21.0285,  lon: 105.8542, tier: 'emerging' },
  { id: 'danang',    name: 'Da Nang Tech',     city: 'Đà Nẵng',     country: 'Vietnam',      lat: 16.0544,  lon: 108.2022, tier: 'emerging' },
]

/* ──────────────────────────────────────────────────────────────
   Intel hotspots — stylised "news" overlay markers
   (Subset of worldmonitor INTEL_HOTSPOTS, trimmed to geo-political /
   climate events of global interest. Educational context.)
────────────────────────────────────────────────────────────── */
export interface IntelHotspot {
  id: string
  name: string
  lat: number
  lon: number
  category: 'climate' | 'geopolitics' | 'science' | 'space'
  severity: 'low' | 'med' | 'high'
  description?: string
}

export const INTEL_HOTSPOTS: IntelHotspot[] = [
  { id: 'arctic',      name: 'Arctic Sea Ice',       lat: 80.0,   lon: 0,      category: 'climate',     severity: 'high', description: 'Summer minimum tracking' },
  { id: 'amazon',      name: 'Amazon Rainforest',    lat: -3.4653,lon: -62.2159, category: 'climate',   severity: 'high', description: 'Deforestation alerts' },
  { id: 'antarctica',  name: 'Thwaites Glacier',     lat: -75.0,  lon: -106.0, category: 'climate',     severity: 'high' },
  { id: 'iss',         name: 'ISS Ground Track',     lat: 0,      lon: 0,      category: 'space',       severity: 'low',  description: 'International Space Station' },
  { id: 'cern',        name: 'CERN LHC',             lat: 46.2323,lon: 6.0554, category: 'science',     severity: 'med',  description: 'Particle physics research' },
  { id: 'itr',         name: 'ITER Fusion',          lat: 43.7084,lon: 5.7846, category: 'science',     severity: 'med',  description: 'Fusion reactor project' },
  { id: 'mars-ops',    name: 'JPL Mars Ops',         lat: 34.2048,lon: -118.1714, category: 'space',    severity: 'low',  description: 'Perseverance & Curiosity mission control' },
  { id: 'gulf-stream', name: 'Gulf Stream',          lat: 40.0,   lon: -60.0,  category: 'climate',     severity: 'med' },
  { id: 'sahel',       name: 'Sahel Drought',        lat: 15.0,   lon: 0.0,    category: 'climate',     severity: 'high' },
  { id: 'taiwan-strait', name: 'Taiwan Strait',      lat: 24.0,   lon: 120.0,  category: 'geopolitics', severity: 'med' },
]

/* ──────────────────────────────────────────────────────────────
   Helper: lat/lon → 3D point on unit sphere (radius r)
   Used by the WorldMonitorGlobe React component.
────────────────────────────────────────────────────────────── */
export function latLonToVec3(lat: number, lon: number, radius = 1): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  return [x, y, z]
}

/** Color map per startup tier — consumed by the globe markers. */
export const TIER_COLORS: Record<StartupHub['tier'], string> = {
  mega:     '#22d3ee', // cyan
  major:    '#a78bfa', // purple-light
  emerging: '#10b981', // green
}

/** Color map per intel category. */
export const CATEGORY_COLORS: Record<IntelHotspot['category'], string> = {
  climate:     '#ef4444',
  geopolitics: '#f59e0b',
  science:     '#3b82f6',
  space:       '#e879f9',
}
