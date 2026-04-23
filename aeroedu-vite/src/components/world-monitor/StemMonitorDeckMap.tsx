/**
 * StemMonitorDeckMap — full-bleed worldmonitor.app-style map for AeroEdu.
 *
 * "Cách C" — real geographic map using deck.gl + MapLibre instead of SVG.
 * Architecture:
 *   - MapLibre GL renders the dark basemap (https://tiles.openfreemap.org/styles/dark)
 *   - @deck.gl/mapbox MapboxOverlay attaches deck.gl layers in interleaved mode
 *   - ScatterplotLayer × 4 for STARTUP_HUBS, TECH_HQS, ACCELERATORS, CLOUD_REGIONS
 *   - PathLayer for UNDERSEA_CABLES (worldmonitor [lon, lat] format — direct use)
 *   - ScatterplotLayer (pulsed) for DISRUPTIONS
 *
 * Sidebar UI (layer toggles, view presets, legend) mirrors StemMonitor2DMap
 * so users get a consistent control surface across both views.
 *
 * Reuses data + design tokens exported from `./StemMonitor2DMap.tsx`.
 */

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Layers, Globe, MapPin, Cable, Cpu, AlertTriangle,
  Building2, Server, Rocket, Activity,
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
   LayerRow — sidebar toggle (copied from StemMonitor2DMap)
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

/* ══════════════════════════════════════════════════════════════
   Main component
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

export default function StemMonitorDeckMap({
  onClose,
  initialView = 'asia',
}: StemMonitorDeckMapProps) {
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

  // ── Refs for MapLibre + deck overlay ──
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MaplibreMap | null>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)

  // ── Pulse animation for outage markers (60-cycle loop) ──
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
      antialias: true,
    })

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    mapRef.current = map

    // Attach a deck.gl overlay to MapLibre
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
        getPath: (d) => d.points,                     // already [lon, lat][]
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

  // ── Counts for sidebar tally ──
  const counts = useMemo(() => ({
    startups:     STARTUP_HUBS.length,
    techHQs:      TECH_HQS.length,
    accelerators: ACCELERATORS.length,
    clouds:       CLOUD_REGIONS.length,
    cables:       CABLES.length,
    disruptions:  DISRUPTIONS.length,
  }), [])

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
        gridTemplateColumns: '260px 1fr',
        gridTemplateRows: '40px 1fr',
        gridTemplateAreas: `"header header" "sidebar map"`,
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          gridArea: 'header',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: `1px solid ${T.border}`,
          background: T.bgPanel,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Globe size={14} style={{ color: T.startup }} />
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
          }}>
            STEM·MONITOR
          </span>
          <span style={{ color: T.textMuted, fontSize: 10 }}>v2 · deck.gl + maplibre</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(Object.keys(VIEW_PRESETS) as ViewPreset[]).map((k) => (
            <button
              key={k}
              onClick={() => setView(k)}
              style={{
                background: view === k ? T.bgPanel2 : 'transparent',
                color: view === k ? T.text : T.textDim,
                border: `1px solid ${view === k ? T.borderHi : T.border}`,
                fontFamily: T.font,
                fontSize: 10,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              {VIEW_PRESETS[k].label}
            </button>
          ))}
          <button
            onClick={onClose}
            aria-label="Close monitor"
            style={{
              background: 'transparent',
              border: `1px solid ${T.border}`,
              color: T.textDim,
              padding: 4,
              marginLeft: 4,
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div
        style={{
          gridArea: 'sidebar',
          background: T.bgPanel,
          borderRight: `1px solid ${T.border}`,
          padding: '12px 0',
          overflowY: 'auto',
        }}
      >
        <div style={{
          padding: '0 12px 8px',
          fontSize: 9,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: T.textMuted,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <Layers size={10} /> Layers
        </div>
        <LayerRow enabled={layers.startups} onToggle={() => setLayers((l) => ({ ...l, startups: !l.startups }))}
          color={T.startup} icon={<Rocket size={12} />} label="Startup Hubs" count={counts.startups} />
        <LayerRow enabled={layers.techHQs} onToggle={() => setLayers((l) => ({ ...l, techHQs: !l.techHQs }))}
          color={T.techHQ} icon={<Building2 size={12} />} label="Tech HQs" count={counts.techHQs} />
        <LayerRow enabled={layers.accelerators} onToggle={() => setLayers((l) => ({ ...l, accelerators: !l.accelerators }))}
          color={T.accel} icon={<Cpu size={12} />} label="Accelerators" count={counts.accelerators} />
        <LayerRow enabled={layers.clouds} onToggle={() => setLayers((l) => ({ ...l, clouds: !l.clouds }))}
          color={T.cloud} icon={<Server size={12} />} label="Cloud Regions" count={counts.clouds} />
        <LayerRow enabled={layers.cables} onToggle={() => setLayers((l) => ({ ...l, cables: !l.cables }))}
          color={T.cable} icon={<Cable size={12} />} label="Undersea Cables" count={counts.cables} />
        <LayerRow enabled={layers.disruptions} onToggle={() => setLayers((l) => ({ ...l, disruptions: !l.disruptions }))}
          color={T.outage} icon={<AlertTriangle size={12} />} label="Disruptions" count={counts.disruptions} />

        <div style={{
          padding: '18px 12px 8px',
          fontSize: 9,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: T.textMuted,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <Activity size={10} /> System
        </div>
        <div style={{ padding: '8px 12px', fontSize: 10, color: T.textDim, lineHeight: 1.55 }}>
          Basemap: OpenFreeMap dark<br />
          Engine: deck.gl 9.3.1 + maplibre-gl 5.23<br />
          Data sources: tech-geo (worldmonitor)
        </div>
      </div>

      {/* ── Map container ── */}
      <div style={{ gridArea: 'map', position: 'relative', background: T.bgMap }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Hover tooltip */}
        {hoverInfo && (
          <div
            style={{
              position: 'absolute',
              left: hoverInfo.x + 14,
              top: hoverInfo.y + 14,
              background: T.bgPanel,
              border: `1px solid ${hoverInfo.color}`,
              padding: '6px 10px',
              fontSize: 11,
              fontFamily: T.font,
              color: T.text,
              pointerEvents: 'none',
              maxWidth: 280,
              zIndex: 5,
              boxShadow: `0 6px 24px rgba(0,0,0,0.55)`,
            }}
          >
            <div style={{ fontWeight: 700, color: hoverInfo.color }}>{hoverInfo.title}</div>
            <div style={{ color: T.textDim, marginTop: 2 }}>{hoverInfo.subtitle}</div>
          </div>
        )}

        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            background: `${T.bgPanel}EE`,
            border: `1px solid ${T.border}`,
            padding: '8px 12px',
            fontSize: 10,
            color: T.textDim,
            fontFamily: T.font,
            pointerEvents: 'none',
            display: 'grid',
            gridTemplateColumns: 'auto auto',
            gap: '4px 14px',
          }}
        >
          <span style={{ color: T.startup }}>● Startup Hubs</span>
          <span style={{ color: T.techHQ }}>● Tech HQs</span>
          <span style={{ color: T.accel }}>● Accelerators</span>
          <span style={{ color: T.cloud }}>● Cloud Regions</span>
          <span style={{ color: T.cable }}>━ Cables</span>
          <span style={{ color: T.outage }}>● Disruptions</span>
        </div>

        {/* View preset indicator */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: `${T.bgPanel}DD`,
            border: `1px solid ${T.border}`,
            padding: '4px 10px',
            fontSize: 10,
            color: T.textDim,
            fontFamily: T.font,
            letterSpacing: 0.8,
          }}
        >
          <MapPin size={10} style={{ display: 'inline', marginRight: 6, color: T.cyan }} />
          {VIEW_PRESETS[view].label} · {VIEW_PRESETS[view].lat.toFixed(1)}°, {VIEW_PRESETS[view].lon.toFixed(1)}° · z{VIEW_PRESETS[view].zoom.toFixed(1)}
        </div>
      </div>
    </div>
  )
}
