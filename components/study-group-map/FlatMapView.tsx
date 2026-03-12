"use client";

import { useMemo, useState, useEffect } from "react";
import { DeckGL } from "@deck.gl/react";
import { ScatterplotLayer, ArcLayer } from "@deck.gl/layers";
import type {
  LearnerMarker,
  StudyGroupMarker,
  StudyMapArc,
  StudyMapLayers,
  EducationIndicatorRegion,
} from "@/types/study-map";
import {
  VIEW_PRESETS,
  getStudyMapOverlayColors,
  type StudyMapView,
} from "@/lib/study-map-config";

/** Check that WebGL is available and getParameter returns valid values (avoids maxTextureDimension2D-style crashes in strict/SES environments). */
function hasWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (typeof maxSize !== "number" || maxSize < 256) return false;
    return true;
  } catch {
    return false;
  }
}

interface FlatMapViewProps {
  learners: LearnerMarker[];
  studyGroups: StudyGroupMarker[];
  arcs: StudyMapArc[];
  educationIndicators?: EducationIndicatorRegion[];
  layers: StudyMapLayers;
  width: number;
  height: number;
  /** Preset view (worldmonitor-style) */
  currentView?: StudyMapView;
  /** Dark basemap / overlay colors */
  isDark?: boolean;
  onLearnerClick?: (m: LearnerMarker) => void;
  onGroupClick?: (g: StudyGroupMarker) => void;
}

export function FlatMapView({
  learners,
  studyGroups,
  arcs,
  educationIndicators = [],
  layers,
  width,
  height,
  currentView = "asia",
  isDark = true,
  onLearnerClick,
  onGroupClick,
}: FlatMapViewProps) {
  const [canRender, setCanRender] = useState(false);
  useEffect(() => {
    setCanRender(hasWebGLSupport());
  }, []);

  const preset = VIEW_PRESETS[currentView];
  const [viewState, setViewState] = useState({
    longitude: preset.longitude,
    latitude: preset.latitude,
    zoom: preset.zoom,
  });

  useEffect(() => {
    const p = VIEW_PRESETS[currentView];
    if (p) setViewState({ longitude: p.longitude, latitude: p.latitude, zoom: p.zoom });
  }, [currentView]);

  const colors = useMemo(() => getStudyMapOverlayColors(!isDark), [isDark]);

  const learnerPoints = useMemo(() => {
    const show = layers.learnersAll || layers.learnersByInterest || layers.suggestedBuddies;
    if (!show) return [];
    return learners.map((m) => ({
      position: [m.lng, m.lat] as [number, number],
      ...m,
    }));
  }, [learners, layers.learnersAll, layers.learnersByInterest, layers.suggestedBuddies]);

  const groupPoints = useMemo(() => {
    if (!layers.studyGroups) return [];
    return studyGroups.map((g) => ({
      position: [g.lng, g.lat] as [number, number],
      ...g,
    }));
  }, [studyGroups, layers.studyGroups]);

  const arcData = useMemo(() => {
    if (!layers.arcsSuggestions || arcs.length === 0) return [];
    return arcs.map((a) => ({
      sourcePosition: [a.from[1], a.from[0]] as [number, number],
      targetPosition: [a.to[1], a.to[0]] as [number, number],
    }));
  }, [arcs, layers.arcsSuggestions]);

  const indicatorLayersOn =
    layers.accessEnrollment ||
    layers.accessSummary ||
    layers.completionRate ||
    layers.completionSummary ||
    layers.qualityTestScores ||
    layers.qualitySummary ||
    layers.resourcesSpending ||
    layers.resourcesSummary ||
    layers.equityGenderParity ||
    layers.equitySummary ||
    layers.efficiencyYearsOfSchooling ||
    layers.efficiencySummary ||
    layers.impactHumanCapital ||
    layers.impactEducationIndex ||
    layers.higherEdRanking ||
    layers.higherEdResearch;

  const indicatorPoints = useMemo(() => {
    if (!indicatorLayersOn || educationIndicators.length === 0) return [];
    return educationIndicators.map((r) => ({
      position: [r.lng, r.lat] as [number, number],
      ...r,
      value:
        r.enrollmentRate ??
        r.completionRate ??
        r.literacyRate ??
        (r.educationIndex != null ? r.educationIndex * 100 : null) ??
        (r.humanCapitalIndex != null ? r.humanCapitalIndex * 100 : null) ??
        0,
    }));
  }, [educationIndicators, indicatorLayersOn]);

  const layersList = useMemo(() => {
    const list: any[] = [];
    if (learnerPoints.length > 0) {
      list.push(
        new ScatterplotLayer({
          id: "learners",
          data: learnerPoints,
          getPosition: (d: any) => d.position,
          getRadius: 40000,
          getFillColor: (d: any) => (d.matchScore != null ? colors.learnerSuggested : colors.learner),
          pickable: true,
          onClick: (info: any) => info.object && onLearnerClick?.(info.object),
        })
      );
    }
    if (groupPoints.length > 0) {
      list.push(
        new ScatterplotLayer({
          id: "study-groups",
          data: groupPoints,
          getPosition: (d: any) => d.position,
          getRadius: 60000,
          getFillColor: colors.studyGroup,
          pickable: true,
          onClick: (info: any) => info.object && onGroupClick?.(info.object),
        })
      );
    }
    if (arcData.length > 0) {
      list.push(
        new ArcLayer({
          id: "arcs",
          data: arcData,
          getSourcePosition: (d: any) => d.sourcePosition,
          getTargetPosition: (d: any) => d.targetPosition,
          getSourceColor: colors.arc,
          getTargetColor: colors.arc,
          getWidth: 2,
        })
      );
    }
    if (indicatorPoints.length > 0) {
      list.push(
        new ScatterplotLayer({
          id: "education-indicators",
          data: indicatorPoints,
          getPosition: (d: any) => d.position,
          getRadius: 50000,
          getFillColor: (d: any) => {
            const v = Number(d.value) ?? 0;
            if (v >= 80) return colors.indicatorHigh;
            if (v >= 50) return colors.indicatorMid;
            return colors.indicatorLow;
          },
          pickable: true,
        })
      );
    }
    return list;
  }, [learnerPoints, groupPoints, arcData, indicatorPoints, colors, onLearnerClick, onGroupClick]);

  if (!canRender || width < 100 || height < 100) {
    return (
      <div
        style={{
          width: Math.max(width, 300),
          height: Math.max(height, 300),
          background: isDark
            ? "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)"
            : "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: "14px",
        }}
      >
        {!canRender
          ? "WebGL không khả dụng. Hãy dùng chế độ Globe 3D hoặc mở trong trình duyệt."
          : "Đang tải bản đồ…"}
      </div>
    );
  }

  return (
    <DeckGL
      width={width}
      height={height}
      viewState={viewState}
      onViewStateChange={({ viewState: vs }: { viewState: typeof viewState }) => setViewState(vs)}
      controller={true}
      layers={layersList}
      getTooltip={({ object }: { object?: { name?: string; value?: number } }) =>
        object?.name
          ? {
              text: object.value != null ? `${object.name}: ${object.value.toFixed(1)}` : object.name,
            }
          : null
      }
    />
  );
}
