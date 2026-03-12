"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type {
  LearnerMarker,
  StudyGroupMarker,
  StudyMapArc,
  StudyMapLayers,
  MapMode,
  EducationIndicatorRegion,
} from "@/types/study-map";
import {
  DEFAULT_STUDY_MAP_LAYERS,
  STUDY_MAP_LAYER_KEYS,
  STUDY_MAP_LAYER_LABELS,
  STUDY_MAP_LAYER_GROUPS,
} from "@/types/study-map";
import {
  STUDY_MAP_VIEW_LABELS,
  type StudyMapView,
} from "@/lib/study-map-config";
import { MapErrorBoundary } from "./MapErrorBoundary";

const GlobeView = dynamic(
  () => import("./GlobeView").then((m) => m.GlobeView),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-slate-400">Đang tải Globe…</div> }
);

const FlatMapView = dynamic(
  () => import("./FlatMapView").then((m) => m.FlatMapView),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-slate-400">Đang tải bản đồ phẳng…</div> }
);

function MapFallback({ message, onSwitch }: { message: string; onSwitch?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400 text-sm text-center p-6 bg-slate-900/80">
      <p className="mb-2">{message}</p>
      {onSwitch && (
        <button
          type="button"
          onClick={onSwitch}
          className="px-4 py-2 rounded-lg bg-indigo-600/80 text-white hover:bg-indigo-600"
        >
          Chuyển sang chế độ khác
        </button>
      )}
    </div>
  );
}

export interface DualMapEngineProps {
  learners: LearnerMarker[];
  studyGroups: StudyGroupMarker[];
  arcs: StudyMapArc[];
  /** Chỉ số giáo dục theo vùng (từ API /api/study-group-map/indicators) */
  educationIndicators?: EducationIndicatorRegion[];
  /** Initial mode */
  initialMode?: MapMode;
  /** Container width/height; defaults to full container */
  width?: number;
  height?: number;
  onLearnerClick?: (m: LearnerMarker) => void;
  onGroupClick?: (g: StudyGroupMarker) => void;
}

export function DualMapEngine({
  learners,
  studyGroups,
  arcs,
  educationIndicators = [],
  initialMode = "globe",
  width: propWidth,
  height: propHeight,
  onLearnerClick,
  onGroupClick,
}: DualMapEngineProps) {
  const [mode, setMode] = useState<MapMode>(initialMode);
  const [layers, setLayers] = useState<StudyMapLayers>(DEFAULT_STUDY_MAP_LAYERS);
  const [currentView, setCurrentView] = useState<StudyMapView>("vietnam");
  const [isDark, setIsDark] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  /** Set when deck.gl throws maxTextureDimension2D / WebGL in strict (e.g. SES) environments; avoid re-mounting flat map. */
  const [flatMapUnavailable, setFlatMapUnavailable] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event.message ?? "";
      if (
        (msg.includes("maxTextureDimension2D") || msg.includes("canvas-context")) &&
        modeRef.current === "flat"
      ) {
        setFlatMapUnavailable(true);
        setMode("globe");
        event.preventDefault?.();
      }
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry?.contentRect ?? { width: 800, height: 600 };
      setContainerSize({ width: Math.max(300, width), height: Math.max(300, height) });
    });
    ro.observe(node);
    setContainerSize({
      width: Math.max(300, node.getBoundingClientRect().width),
      height: Math.max(300, node.getBoundingClientRect().height),
    });
    return () => ro.disconnect();
  }, []);

  const width = propWidth ?? containerSize.width;
  const height = propHeight ?? containerSize.height;

  const toggleLayer = useCallback((key: keyof StudyMapLayers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const visibleLayerKeys = useMemo(
    () => STUDY_MAP_LAYER_KEYS.filter((k) => layers[k]),
    [layers]
  );

  return (
    <div className="flex flex-col h-full w-full rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-900/80">
      {/* Toolbar: mode switch, view preset, theme, layer count (worldmonitor-style) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-slate-700/50 bg-slate-800/60">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setMode("globe")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === "globe"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-slate-700/60 text-slate-300 hover:bg-slate-600"
            }`}
          >
            🌐 Globe 3D
          </button>
          <button
            type="button"
            onClick={() => setMode("flat")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === "flat"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-slate-700/60 text-slate-300 hover:bg-slate-600"
            }`}
          >
            🗺️ Bản đồ phẳng
          </button>
          <select
            value={currentView}
            onChange={(e) => setCurrentView(e.target.value as StudyMapView)}
            className="rounded-xl bg-slate-700/80 border border-slate-600 text-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            title="Vùng xem (như worldmonitor)"
          >
            {(Object.keys(STUDY_MAP_VIEW_LABELS) as StudyMapView[]).map((v) => (
              <option key={v} value={v}>
                {STUDY_MAP_VIEW_LABELS[v]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsDark((d) => !d)}
            className="px-3 py-2 rounded-xl text-sm font-medium bg-slate-700/60 text-slate-300 hover:bg-slate-600"
            title={isDark ? "Chuyển nền sáng" : "Chuyển nền tối"}
          >
            {isDark ? "🌙 Nền tối" : "☀️ Nền sáng"}
          </button>
        </div>
        <span className="text-slate-400 text-sm">
          {visibleLayerKeys.length} / {STUDY_MAP_LAYER_KEYS.length} lớp
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Map viewport */}
        <div ref={containerRef} className="flex-1 min-w-0 min-h-[400px] relative">
          {mode === "globe" && (
            <MapErrorBoundary
              fallback={
                <MapFallback
                  message="Globe 3D không tải được (WebGL). Thử chuyển sang Bản đồ phẳng."
                  onSwitch={() => setMode("flat")}
                />
              }
            >
              <GlobeView
                learners={learners}
                studyGroups={studyGroups}
                arcs={arcs}
                educationIndicators={educationIndicators}
                layers={layers}
                width={width}
                height={height}
                currentView={currentView}
                isDark={isDark}
                onLearnerClick={onLearnerClick}
                onGroupClick={onGroupClick}
              />
            </MapErrorBoundary>
          )}
          {mode === "flat" && (
            <>
              {flatMapUnavailable ? (
                <MapFallback
                  message="Bản đồ phẳng không khả dụng (WebGL bị giới hạn trên môi trường này). Đang dùng Globe 3D."
                  onSwitch={() => setMode("globe")}
                />
              ) : (
                <MapErrorBoundary
                  fallback={
                    <MapFallback
                      message="Bản đồ phẳng không tải được (WebGL/WebGPU). Thử chuyển sang Globe 3D hoặc mở trong trình duyệt."
                      onSwitch={() => setMode("globe")}
                    />
                  }
                >
                  <FlatMapView
                    learners={learners}
                    studyGroups={studyGroups}
                    arcs={arcs}
                    educationIndicators={educationIndicators}
                    layers={layers}
                    width={Math.max(1, width)}
                    height={Math.max(1, height)}
                    currentView={currentView}
                    isDark={isDark}
                    onLearnerClick={onLearnerClick}
                    onGroupClick={onGroupClick}
                  />
                </MapErrorBoundary>
              )}
            </>
          )}
        </div>

        {/* Layer panel: collapse/expand */}
        <LayerPanel layers={layers} onToggle={toggleLayer} />
      </div>
    </div>
  );
}

const LAYER_PANEL_GROUPS: { label: string; keys: (keyof StudyMapLayers)[] }[] = [
  { label: "Cá nhân & học nhóm", keys: STUDY_MAP_LAYER_GROUPS.personal },
  { label: "1. Tiếp cận (Access)", keys: STUDY_MAP_LAYER_GROUPS.access },
  { label: "2. Chất lượng & hoàn thành (Quality)", keys: STUDY_MAP_LAYER_GROUPS.quality },
  { label: "3. Công bằng (Equity)", keys: STUDY_MAP_LAYER_GROUPS.equity },
  { label: "4. Hiệu quả & nguồn lực (Efficiency)", keys: STUDY_MAP_LAYER_GROUPS.efficiency },
  { label: "Tác động (HDI, Human Capital)", keys: STUDY_MAP_LAYER_GROUPS.impact },
  { label: "Đại học & nghiên cứu", keys: STUDY_MAP_LAYER_GROUPS.higherEd },
  {
    label: "Hiển thị",
    keys: ["labelsLearners", "labelsGroups", "labelsRegions", "baseMapDark", "baseMapLight"],
  },
];

function LayerPanel({
  layers,
  onToggle,
}: {
  layers: StudyMapLayers;
  onToggle: (k: keyof StudyMapLayers) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`border-l border-slate-700/50 bg-slate-800/40 flex flex-col transition-all ${
        open ? "w-64" : "w-12"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-2 text-slate-400 hover:text-white border-b border-slate-700/50"
        title={open ? "Thu gọn" : "Lớp dữ liệu"}
      >
        {open ? "◀" : "▶"}
      </button>
      {open && (
        <div className="p-2 overflow-y-auto flex-1 min-h-0">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Lớp dữ liệu</p>
          {LAYER_PANEL_GROUPS.map((g) => (
            <div key={g.label} className="mb-3">
              <p className="text-xs text-slate-500 mb-1">{g.label}</p>
              {g.keys.map((key) => (
                <label key={key} className="flex items-center gap-2 py-0.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layers[key]}
                    onChange={() => onToggle(key)}
                    className="rounded border-slate-600"
                  />
                  <span className="text-sm text-slate-300">
                    {STUDY_MAP_LAYER_LABELS[key] ?? key}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
