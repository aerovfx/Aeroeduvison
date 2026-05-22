/**
 * StemMonitorDeckMap — worldmonitor.app-style full-bleed map for AeroEdu.
 *
 * Stack: MapLibre GL + @deck.gl/mapbox (MapboxOverlay) + OpenFreeMap dark tiles.
 *
 * Worldmonitor-style UX:
 *   - Topbar: logo badge + live tick indicator + view presets + layer count + close
 *   - Scrolling data ticker below topbar (cycling stats)
 *   - Sidebar: LAYERS section, INTEL section (education stats), SYSTEM section
 *   - Map overlays: Live/active-marker badge top-right, Focus Vietnam button
 *   - Terminal/hacker aesthetic: scanline CSS, monospace, square corners
 *   - Sidebar width 280px, subtle scanline overlay on sidebar
 *   - Pulsing LIVE indicator dot
 *
 * Reuses data + design tokens from StemMonitor2DMap.tsx.
 */

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Layers, Globe, MapPin, Cable, Cpu, AlertTriangle,
  Building2, Server, Rocket, Activity, Zap, Database, BarChart3,
} from 'lucide-react'
import maplibregl, { Map as MaplibreMap } from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers'
import 'maplibre-gl/dist/maplibre-gl.css'

import {
  STARTUP_HUBS, type StartupHub,
} from '@/config/world-monitor-data'
import {
  T,
  VIEW_PRESETS, type ViewPreset,
  TECH_HQS, type TechHQ,
  CLOUD_REGIONS, type CloudRegion,
  ACCELERATORS, type Accelerator,
  CABLES, type UnderseaCable,
  DISRUPTIONS, type Disruption,
} from './StemMonitor2DMap'

/* ──────────────────────────────────────────────────────────────
   Basemap — OpenFreeMap dark (no API key, free, MapLibre-style)
────────────────────────────────────────────────────────────── */
const BASEMAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'

/* ──────────────────────────────────────────────────────────────
   Data ticker — cycling stats shown below topbar
────────────────────────────────────────────────────────────── */
const TICKER_ITEMS = [
  `${STARTUP_HUBS.length} Startup Hubs`,
  `${TECH_HQS.length} Tech HQs`,
  `${CLOUD_REGIONS.length} Cloud Regions`,
  `${CABLES.length} Undersea Cables`,
  `${ACCELERATORS.length} Accelerators`,
  `${DISRUPTIONS.length} Active Disruptions`,
  'VN STEM Index · 74.2',
  '342 Schools Mapped',
  '21 / 63 Provinces Active',
  '8 Research Hubs',
  'Engine: deck.gl + MapLibre',
  'Basemap: OpenFreeMap Dark',
]

/* ──────────────────────────────────────────────────────────────
   INTEL stats — hardcoded education intelligence
────────────────────────────────────────────────────────────── */
const INTEL_STATS = [
  { label: 'VN STEM Index',      value: '74.2',   unit: '/ 100', color: T.startup },
  { label: 'Schools Mapped',     value: '342',    unit: '',      color: T.techHQ },
  { label: 'Active Provinces',   value: '21 / 63',unit: '',      color: T.accel },
  { label: 'Research Hubs',      value: '8',      unit: '',      color: T.cloud },
]

/* ──────────────────────────────────────────────────────────────
   Helper — hex colour → [r,g,b,a] for deck.gl
────────────────────────────────────────────────────────────── */
function hexToRgba(hex: string, alpha = 255): [number, number, number, number] {
  const h = hex.replace('#', '')
  const bigint = parseInt(h, 16)
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255, alpha]
}

const COLOR = {
  startup: hexToRgba(T.startup),
  techHQ:  hexToRgba(T.techHQ),
  accel:   hexToRgba(T.accel),
  cloud:   hexToRgba(T.cloud),
  cable:   hexToRgba(T.cable, 230),
  outage:  hexToRgba(T.outage),
}

/* ──────────────────────────────────────────────────────────────
   CSS injected once — scanline overlay + live-dot pulse
────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
@keyframes smLivePulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0, 255, 150, 0.7); }
  50%       { opacity: 0.6; box-shadow: 0 0 0 5px rgba(0, 255, 150, 0); }
}
@keyframes smTickerScroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
.sm-live-dot {
  animation: smLivePulse 1.6s ease-in-out infinite;
}
.sm-ticker-track {
  animation: smTickerScroll 36s linear infinite;
}
.sm-scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0, 0, 0, 0.08) 3px,
    rgba(0, 0, 0, 0.08) 4px
  );
  pointer-events: none;
  z-index: 1;
}
`

let cssInjected = false
function injectCss() {
  if (cssInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = GLOBAL_CSS
  document.head.appendChild(style)
  cssInjected = true
}

/* ──────────────────────────────────────────────────────────────
   Sub-components
────────────────────────────────────────────────────────────── */

/** Sidebar section header */
function SectionHead({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        padding: '16px 14px 7px',
        fontSize: 9,
        letterSpacing: 1.8,
        textTransform: 'uppercase',
        color: T.textMuted,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        borderTop: `1px solid ${T.border}`,
        marginTop: 4,
      }}
    >
      <span style={{ opacity: 0.7 }}>{icon}</span>
      {label}
    </div>
  )
}

/** Layer toggle row */
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
        padding: '7px 14px',
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
    >
      <span style={{ color, display: 'flex' }}>{icon}</span>
      <span style={{
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: 10,
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
          width: 20, height: 11,
          borderRadius: 6,
          background: enabled ? color : T.border,
          position: 'relative',
          transition: 'background 120ms',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute',
          top: 1.5, left: enabled ? 10 : 1.5,
          width: 8, height: 8,
          borderRadius: '50%',
          background: T.bg,
          transition: 'left 120ms',
        }} />
      </span>
    </button>
  )
}

/** INTEL stat row */
function IntelRow({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '5px 14px',
        borderLeft: `2px solid ${color}`,
        marginLeft: 0,
        marginBottom: 2,
      }}
    >
      <span style={{ fontSize: 10, color: T.textDim, letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {value}
        {unit && <span style={{ fontSize: 9, color: T.textMuted, marginLeft: 2 }}>{unit}</span>}
      </span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Props
══════════════════════════════════════════════════════════════ */
export interface StemMonitorDeckMapProps {
  onClose: () => void
  initialView?: ViewPreset
}

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
export default function StemMonitorDeckMap({
  onClose,
  initialView = 'asia',
}: StemMonitorDeckMapProps) {
  // ── Inject global CSS once ──
  useEffect(() => { injectCss() }, [])

  // ── Layer visibility ──
  const [layers, setLayers] = useState({
    startups:     true,
    techHQs:      true,
    accelerators: false,
    clouds:       true,
    cables:       true,
    disruptions:  false,
  })
  const [view, setView] = useState<ViewPreset>(initialView)
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [pulse, setPulse] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(VIEW_PRESETS[initialView].zoom)

  // ── Refs for MapLibre + deck overlay ──
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MaplibreMap | null>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)

  // ── Pulse animation for outage markers ──
  useEffect(() => {
    let raf = 0
    let t0 = performance.now()
    const tick = (t: number) => {
      const dt = (t - t0) / 1000
      setPulse((dt * 1.6) % 1)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ── Initialize MapLibre once ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const preset = VIEW_PRESETS[initialView]

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE_URL,
      center: [preset.lon, preset.lat],
      zoom: preset.zoom,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    // Track zoom level for display
    map.on('zoom', () => setZoomLevel(parseFloat(map.getZoom().toFixed(1))))

    mapRef.current = map

    const overlay = new MapboxOverlay({
      interleaved: true,
      layers: [],
    })
    map.addControl(overlay as unknown as maplibregl.IControl)
    overlayRef.current = overlay

    return () => {
      overlayRef.current = null
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fly to view preset whenever it changes ──
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const p = VIEW_PRESETS[view]
    map.flyTo({
      center: [p.lon, p.lat],
      zoom: p.zoom,
      duration: 1200,
      essential: true,
    })
  }, [view])

  // ── Hover handler shared across all deck.gl layers ──
  const onLayerHover = useCallback((info: any) => {
    if (!info?.object || info.x == null) {
      setHoverInfo(null)
      return
    }
    const { object, x, y, layer } = info
    let title = '', subtitle = '', color = T.text

    switch (layer.id) {
      case 'startups': {
        const o = object as StartupHub
        title = `${o.name} · ${o.tier.toUpperCase()}`
        subtitle = `${o.city}, ${o.country}${o.unicorns ? ` · ${o.unicorns} unicorns` : ''}`
        color = T.startup
        break
      }
      case 'techHQs': {
        const o = object as TechHQ
        title = o.name
        subtitle = `${o.city}, ${o.country} · ${o.cap.toUpperCase()}`
        color = T.techHQ
        break
      }
      case 'accelerators': {
        const o = object as Accelerator
        title = o.name
        subtitle = `${o.city}, ${o.country} · ${o.type}`
        color = T.accel
        break
      }
      case 'clouds': {
        const o = object as CloudRegion
        title = `${o.provider} · ${o.region}`
        subtitle = o.city
        color = T.cloud
        break
      }
      case 'cables': {
        const o = object as UnderseaCable
        title = o.name
        const owners = o.owners?.length ? ` · ${o.owners.join(', ')}` : ''
        subtitle = `RFS ${o.rfs}${owners}`
        color = T.cable
        break
      }
      case 'disruptions': {
        const o = object as Disruption
        title = o.region
        subtitle = `${o.severity.toUpperCase()} · ${o.note}`
        color = T.outage
        break
      }
      default:
        return
    }
    setHoverInfo({ x, y, title, subtitle, color })
  }, [])

  // ── Build deck.gl layers ──
  const deckLayers = useMemo(() => {
    const built: any[] = []

    if (layers.cables) {
      built.push(new PathLayer<UnderseaCable>({
        id: 'cables',
        data: CABLES,
        pickable: true,
        widthUnits: 'pixels',
        getPath: (d) => d.points,
        getColor: COLOR.cable,
        getWidth: 1.6,
        capRounded: true,
        jointRounded: true,
        onHover: onLayerHover,
        parameters: { depthCompare: 'always' },
      }))
    }

    if (layers.startups) {
      built.push(new ScatterplotLayer<StartupHub>({
        id: 'startups',
        data: STARTUP_HUBS,
        pickable: true,
        radiusUnits: 'pixels',
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) => d.tier === 'mega' ? 6 : d.tier === 'major' ? 5 : 4,
        getFillColor: COLOR.startup,
        getLineColor: [255, 255, 255, 90],
        lineWidthUnits: 'pixels',
        getLineWidth: 0.5,
        stroked: true,
        onHover: onLayerHover,
      }))
    }

    if (layers.clouds) {
      built.push(new ScatterplotLayer<CloudRegion>({
        id: 'clouds',
        data: CLOUD_REGIONS,
        pickable: true,
        radiusUnits: 'pixels',
        getPosition: (d) => [d.lon, d.lat],
        getRadius: 4.5,
        getFillColor: COLOR.cloud,
        getLineColor: [255, 255, 255, 110],
        lineWidthUnits: 'pixels',
        getLineWidth: 0.6,
        stroked: true,
        onHover: onLayerHover,
      }))
    }

    if (layers.techHQs) {
      built.push(new ScatterplotLayer<TechHQ>({
        id: 'techHQs',
        data: TECH_HQS,
        pickable: true,
        radiusUnits: 'pixels',
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) => d.cap === 'mega' ? 6 : d.cap === 'large' ? 5 : 4,
        getFillColor: COLOR.techHQ,
        getLineColor: [255, 255, 255, 110],
        lineWidthUnits: 'pixels',
        getLineWidth: 0.6,
        stroked: true,
        onHover: onLayerHover,
      }))
    }

    if (layers.accelerators) {
      built.push(new ScatterplotLayer<Accelerator>({
        id: 'accelerators',
        data: ACCELERATORS,
        pickable: true,
        radiusUnits: 'pixels',
        getPosition: (d) => [d.lon, d.lat],
        getRadius: 4.5,
        getFillColor: COLOR.accel,
        getLineColor: [0, 0, 0, 200],
        lineWidthUnits: 'pixels',
        getLineWidth: 0.6,
        stroked: true,
        onHover: onLayerHover,
      }))
    }

    if (layers.disruptions) {
      const pulseRadius = 6 + pulse * 14
      const pulseAlpha = Math.round(180 * (1 - pulse))
      built.push(new ScatterplotLayer<Disruption>({
        id: 'disruptions-pulse',
        data: DISRUPTIONS,
        pickable: false,
        radiusUnits: 'pixels',
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) => (d.severity === 'high' ? pulseRadius : pulseRadius * 0.7),
        getFillColor: [255, 50, 50, pulseAlpha],
        stroked: false,
      }))
      built.push(new ScatterplotLayer<Disruption>({
        id: 'disruptions',
        data: DISRUPTIONS,
        pickable: true,
        radiusUnits: 'pixels',
        getPosition: (d) => [d.lon, d.lat],
        getRadius: (d) => (d.severity === 'high' ? 5 : d.severity === 'med' ? 4 : 3),
        getFillColor: COLOR.outage,
        getLineColor: [255, 255, 255, 130],
        lineWidthUnits: 'pixels',
        getLineWidth: 0.7,
        stroked: true,
        onHover: onLayerHover,
      }))
    }

    return built
  }, [layers, pulse, onLayerHover])

  // ── Push layers to overlay ──
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setProps({ layers: deckLayers })
    }
  }, [deckLayers])

  // ── Counts for sidebar + header badge ──
  const counts = useMemo(() => ({
    startups:     STARTUP_HUBS.length,
    techHQs:      TECH_HQS.length,
    accelerators: ACCELERATORS.length,
    clouds:       CLOUD_REGIONS.length,
    cables:       CABLES.length,
    disruptions:  DISRUPTIONS.length,
  }), [])

  const activeLayers = Object.values(layers).filter(Boolean).length

  const activeMarkers = useMemo(() => {
    let n = 0
    if (layers.startups)     n += counts.startups
    if (layers.techHQs)      n += counts.techHQs
    if (layers.accelerators) n += counts.accelerators
    if (layers.clouds)       n += counts.clouds
    if (layers.disruptions)  n += counts.disruptions
    return n
  }, [layers, counts])

  // ── Ticker string (doubled for seamless loop) ──
  const tickerStr = TICKER_ITEMS.join('  ·  ') + '  ·  ' + TICKER_ITEMS.join('  ·  ')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: T.bg,
        color: T.text,
        fontFamily: T.font,
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gridTemplateRows: 'auto auto 1fr',
        gridTemplateAreas: `"topbar topbar" "ticker ticker" "sidebar map"`,
      }}
    >

      {/* ═══════════════════════════════════════════════════════════
          TOPBAR — worldmonitor-style
      ═══════════════════════════════════════════════════════════ */}
      <div
        style={{
          gridArea: 'topbar',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          height: 42,
          borderBottom: `1px solid ${T.border}`,
          background: T.bgPanel,
          flexShrink: 0,
        }}
      >
        {/* Left: logo + live dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
          <Globe size={13} style={{ color: T.startup }} />
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: T.text,
          }}>
            STEM·MONITOR
          </span>
          {/* Live indicator dot */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              className="sm-live-dot"
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: T.startup,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 9, color: T.startup, letterSpacing: 1, textTransform: 'uppercase' }}>
              Live
            </span>
          </span>
        </div>

        {/* Center: view preset buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' }}>
          {(Object.keys(VIEW_PRESETS) as ViewPreset[]).map((k) => (
            <button
              key={k}
              onClick={() => setView(k)}
              style={{
                background: view === k ? `${T.startup}18` : 'transparent',
                color: view === k ? T.startup : T.textDim,
                border: `1px solid ${view === k ? `${T.startup}55` : T.border}`,
                fontFamily: T.font,
                fontSize: 10,
                letterSpacing: 1,
                textTransform: 'uppercase',
                padding: '4px 11px',
                cursor: 'pointer',
                transition: 'all 150ms',
                fontWeight: view === k ? 700 : 400,
              }}
            >
              {VIEW_PRESETS[k].label}
            </button>
          ))}
        </div>

        {/* Right: layer badge + zoom + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160, justifyContent: 'flex-end' }}>
          <span
            style={{
              background: `${T.startup}18`,
              border: `1px solid ${T.startup}44`,
              color: T.startup,
              fontSize: 9,
              letterSpacing: 0.8,
              padding: '3px 8px',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {activeLayers} layers
          </span>
          <span style={{ fontSize: 10, color: T.textMuted, fontVariantNumeric: 'tabular-nums', letterSpacing: 0.5 }}>
            z{zoomLevel.toFixed(1)}
          </span>
          <button
            onClick={onClose}
            aria-label="Close monitor"
            style={{
              background: 'transparent',
              border: `1px solid ${T.border}`,
              color: T.textDim,
              padding: '4px 5px',
              marginLeft: 2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'border-color 150ms, color 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.outage
              e.currentTarget.style.color = T.outage
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = T.border
              e.currentTarget.style.color = T.textDim
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TICKER — scrolling data row below topbar
      ═══════════════════════════════════════════════════════════ */}
      <div
        style={{
          gridArea: 'ticker',
          height: 24,
          background: `${T.bgPanel2}`,
          borderBottom: `1px solid ${T.border}`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {/* Fade edge left */}
        <div style={{
          position: 'absolute',
          left: 0,
          width: 40,
          height: 24,
          background: `linear-gradient(to right, ${T.bgPanel2}, transparent)`,
          zIndex: 2,
          pointerEvents: 'none',
        }} />
        <div
          className="sm-ticker-track"
          style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            fontSize: 9,
            color: T.textDim,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {tickerStr}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SIDEBAR — worldmonitor 3-section layout
      ═══════════════════════════════════════════════════════════ */}
      <div
        className="sm-scanlines"
        style={{
          gridArea: 'sidebar',
          background: T.bgPanel,
          borderRight: `1px solid ${T.border}`,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
        }}
      >

        {/* ── Section: LAYERS ── */}
        <div style={{
          padding: '12px 14px 7px',
          fontSize: 9,
          letterSpacing: 1.8,
          textTransform: 'uppercase',
          color: T.textMuted,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}>
          <Layers size={10} style={{ opacity: 0.7 }} /> Layers
        </div>
        <LayerRow
          enabled={layers.startups}
          onToggle={() => setLayers((l) => ({ ...l, startups: !l.startups }))}
          color={T.startup} icon={<Rocket size={11} />} label="Startup Hubs"
          count={counts.startups}
        />
        <LayerRow
          enabled={layers.techHQs}
          onToggle={() => setLayers((l) => ({ ...l, techHQs: !l.techHQs }))}
          color={T.techHQ} icon={<Building2 size={11} />} label="Tech HQs"
          count={counts.techHQs}
        />
        <LayerRow
          enabled={layers.accelerators}
          onToggle={() => setLayers((l) => ({ ...l, accelerators: !l.accelerators }))}
          color={T.accel} icon={<Cpu size={11} />} label="Accelerators"
          count={counts.accelerators}
        />
        <LayerRow
          enabled={layers.clouds}
          onToggle={() => setLayers((l) => ({ ...l, clouds: !l.clouds }))}
          color={T.cloud} icon={<Server size={11} />} label="Cloud Regions"
          count={counts.clouds}
        />
        <LayerRow
          enabled={layers.cables}
          onToggle={() => setLayers((l) => ({ ...l, cables: !l.cables }))}
          color={T.cable} icon={<Cable size={11} />} label="Undersea Cables"
          count={counts.cables}
        />
        <LayerRow
          enabled={layers.disruptions}
          onToggle={() => setLayers((l) => ({ ...l, disruptions: !l.disruptions }))}
          color={T.outage} icon={<AlertTriangle size={11} />} label="Disruptions"
          count={counts.disruptions}
        />

        {/* ── Section: INTEL ── */}
        <SectionHead icon={<BarChart3 size={10} />} label="Intel" />
        <div style={{ padding: '4px 0 8px' }}>
          {INTEL_STATS.map((s) => (
            <IntelRow key={s.label} {...s} />
          ))}
        </div>

        {/* ── Divider ── */}
        <div style={{ margin: '0 14px', borderTop: `1px solid ${T.border}` }} />

        {/* ── Section: SYSTEM ── */}
        <SectionHead icon={<Activity size={10} />} label="System" />
        <div style={{ padding: '2px 14px 12px', fontSize: 10, color: T.textDim, lineHeight: 1.7 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div>
              <span style={{ color: T.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8 }}>Basemap  </span>
              <span>OpenFreeMap Dark</span>
            </div>
            <div>
              <span style={{ color: T.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8 }}>Engine  </span>
              <span>deck.gl + MapLibre</span>
            </div>
            <div>
              <span style={{ color: T.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8 }}>Data  </span>
              <span>tech-geo (worldmonitor)</span>
            </div>
            <div>
              <span style={{ color: T.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8 }}>Region  </span>
              <span>Asia-Pacific primary</span>
            </div>
          </div>
          <div
            style={{
              marginTop: 10,
              padding: '5px 8px',
              background: T.bgPanel2,
              border: `1px solid ${T.border}`,
              fontSize: 9,
              color: T.textMuted,
              letterSpacing: 0.5,
            }}
          >
            © OpenStreetMap contributors · OpenFreeMap
          </div>
        </div>

        {/* ── Legend swatches at bottom ── */}
        <div style={{
          margin: '0 14px 14px',
          padding: '8px 10px',
          background: T.bgPanel2,
          border: `1px solid ${T.border}`,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px 10px',
          fontSize: 9,
          color: T.textDim,
        }}>
          <span style={{ color: T.startup }}>● Startups</span>
          <span style={{ color: T.techHQ }}>● Tech HQs</span>
          <span style={{ color: T.accel }}>● Accel.</span>
          <span style={{ color: T.cloud }}>● Cloud</span>
          <span style={{ color: T.cable }}>━ Cables</span>
          <span style={{ color: T.outage }}>● Outages</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MAP AREA
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ gridArea: 'map', position: 'relative', background: T.bgMap }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

        {/* ── Hover tooltip ── */}
        {hoverInfo && (
          <div
            style={{
              position: 'absolute',
              left: hoverInfo.x + 14,
              top: hoverInfo.y + 14,
              background: T.bgPanel,
              border: `1px solid ${hoverInfo.color}`,
              padding: '7px 12px',
              fontSize: 11,
              fontFamily: T.font,
              color: T.text,
              pointerEvents: 'none',
              maxWidth: 300,
              zIndex: 5,
              boxShadow: `0 6px 24px rgba(0,0,0,0.6)`,
            }}
          >
            <div style={{ fontWeight: 700, color: hoverInfo.color, letterSpacing: 0.4 }}>{hoverInfo.title}</div>
            <div style={{ color: T.textDim, marginTop: 3, fontSize: 10 }}>{hoverInfo.subtitle}</div>
          </div>
        )}

        {/* ── Top-right overlay: Live badge + active marker count ── */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
            zIndex: 4,
          }}
        >
          {/* Live badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: `${T.bgPanel}EE`,
              border: `1px solid ${T.startup}55`,
              padding: '4px 10px',
              fontSize: 9,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: T.startup,
              fontWeight: 700,
            }}
          >
            <span
              className="sm-live-dot"
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: T.startup,
              }}
            />
            Live
          </div>

          {/* Active markers count */}
          <div
            style={{
              background: `${T.bgPanel}EE`,
              border: `1px solid ${T.border}`,
              padding: '4px 10px',
              fontSize: 10,
              color: T.textDim,
              fontFamily: T.font,
              letterSpacing: 0.4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <Zap size={9} style={{ display: 'inline', marginRight: 5, color: T.accel, verticalAlign: 'middle' }} />
            <span style={{ color: T.text, fontWeight: 700 }}>{activeMarkers}</span>
            {' '}markers active
          </div>

          {/* Focus Vietnam quick button */}
          <button
            onClick={() => setView('vietnam')}
            style={{
              background: view === 'vietnam' ? `${T.techHQ}22` : `${T.bgPanel}EE`,
              border: `1px solid ${view === 'vietnam' ? `${T.techHQ}66` : T.border}`,
              color: view === 'vietnam' ? T.techHQ : T.textDim,
              fontFamily: T.font,
              fontSize: 9,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              padding: '4px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 150ms',
            }}
          >
            <MapPin size={9} />
            Focus: Vietnam
          </button>
        </div>

        {/* ── Coordinate / view indicator (bottom-right above nav controls) ── */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: `${T.bgPanel}DD`,
            border: `1px solid ${T.border}`,
            padding: '5px 11px',
            fontSize: 10,
            color: T.textDim,
            fontFamily: T.font,
            letterSpacing: 0.6,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 4,
          }}
        >
          <Database size={9} style={{ color: T.cyan }} />
          <span style={{ color: T.text }}>{VIEW_PRESETS[view].label}</span>
          <span style={{ color: T.textMuted }}>
            {VIEW_PRESETS[view].lat.toFixed(1)}°, {VIEW_PRESETS[view].lon.toFixed(1)}° · z{VIEW_PRESETS[view].zoom.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  )
}
