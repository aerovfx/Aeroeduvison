"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import type {
  LearnerMarker,
  StudyGroupMarker,
  StudyMapArc,
  StudyMapLayers,
  EducationIndicatorRegion,
} from "@/types/study-map";
import { VIEW_PRESETS, getStudyMapOverlayColors, type StudyMapView } from "@/lib/study-map-config";

interface GlobeViewProps {
  learners: LearnerMarker[];
  studyGroups: StudyGroupMarker[];
  arcs: StudyMapArc[];
  educationIndicators?: EducationIndicatorRegion[];
  layers: StudyMapLayers;
  width: number;
  height: number;
  currentView?: StudyMapView;
  isDark?: boolean;
  onLearnerClick?: (m: LearnerMarker) => void;
  onGroupClick?: (g: StudyGroupMarker) => void;
}

export function GlobeView({
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
}: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const colors = useMemo(() => getStudyMapOverlayColors(!isDark), [isDark]);

  const initGlobe = useCallback(async () => {
    if (!containerRef.current || typeof window === "undefined") return;
    const Globe = (await import("globe.gl")).default;
    const preset = VIEW_PRESETS[currentView];
    const globe = Globe()(containerRef.current)
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundImageUrl(
        isDark
          ? "//unpkg.com/three-globe/example/img/night-sky.png"
          : "//unpkg.com/three-globe/example/img/space.png"
      )
      .width(width)
      .height(height);
    if (preset && globe.pointOfView) {
      globe.pointOfView({ lat: preset.latitude, lng: preset.longitude, altitude: 2.2 });
    }
    globeRef.current = globe;
    return globe;
  }, [width, height, currentView, isDark]);

  useEffect(() => {
    let globe: any;
    initGlobe().then((g) => {
      globe = g;
      if (!g) return;
      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.5;
    });
    return () => {
      if (globeRef.current) {
        try {
          globeRef.current._destructor?.();
        } catch {}
      }
      globeRef.current = null;
    };
  }, [initGlobe]);

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    g.width(width).height(height);
  }, [width, height]);

  // Points: learners + study groups + indicator regions (single layer, different size/color by type)
  const indicatorLayersOn = useMemo(
    () =>
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
      layers.higherEdResearch,
    [layers]
  );
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const showLearners = layers.learnersAll || layers.learnersByInterest || layers.suggestedBuddies;
    const learnerPoints = showLearners && learners.length > 0
      ? learners.map((m) => ({ lat: m.lat, lng: m.lng, type: "learner", ...m }))
      : [];
    const groupPoints = layers.studyGroups && studyGroups.length > 0
      ? studyGroups.map((s) => ({ lat: s.lat, lng: s.lng, type: "group", ...s }))
      : [];
    const indicatorPoints =
      indicatorLayersOn && educationIndicators.length > 0
        ? educationIndicators.map((r) => ({
            lat: r.lat,
            lng: r.lng,
            type: "indicator",
            ...r,
            value:
              r.enrollmentRate ??
              r.completionRate ??
              r.literacyRate ??
              r.educationIndex ??
              r.humanCapitalIndex ??
              0,
          }))
        : [];
    const allPoints = [...learnerPoints, ...groupPoints, ...indicatorPoints];
    g.pointsData(allPoints);
    g.pointLat("lat");
    g.pointLng("lng");
    g.pointAltitude((d: any) => (d.type === "group" ? 0.02 : d.type === "indicator" ? 0.015 : 0.01));
    g.pointRadius((d: any) => (d.type === "group" ? 0.6 : d.type === "indicator" ? 0.5 : 0.4));
    const toRgba = (arr: [number, number, number, number]) =>
      `rgba(${arr[0]},${arr[1]},${arr[2]},${arr[3] / 255})`;
    g.pointColor((d: any) => {
      if (d.type === "group") return toRgba(colors.studyGroup);
      if (d.type === "indicator") {
        const v = Number(d.value) ?? 0;
        if (v >= 80) return toRgba(colors.indicatorHigh);
        if (v >= 50) return toRgba(colors.indicatorMid);
        return toRgba(colors.indicatorLow);
      }
      return d.matchScore != null ? toRgba(colors.learnerSuggested) : toRgba(colors.learner);
    });
    g.onPointClick((p: any) => {
      if (p.type === "group") onGroupClick?.(p);
      else onLearnerClick?.(p);
    });
  }, [learners, studyGroups, educationIndicators, indicatorLayersOn, layers.learnersAll, layers.learnersByInterest, layers.suggestedBuddies, layers.studyGroups, colors, onLearnerClick, onGroupClick]);

  // Arcs layer
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    if (!layers.arcsSuggestions || arcs.length === 0) {
      g.arcsData([]);
      return;
    }
    const data = arcs.map((a) => ({
      startLat: a.from[0],
      startLng: a.from[1],
      endLat: a.to[0],
      endLng: a.to[1],
      color: a.color || colors.arc.slice(0, 3),
    }));
    g.arcsData(data);
    g.arcStartLat("startLat");
    g.arcStartLng("startLng");
    g.arcEndLat("endLat");
    g.arcEndLng("endLng");
    g.arcColor("color");
    g.arcAltitude(0.15);
    g.arcStroke(1.2);
  }, [arcs, layers.arcsSuggestions, colors]);

  useEffect(() => {
    const g = globeRef.current;
    if (!g || !g.pointOfView) return;
    const preset = VIEW_PRESETS[currentView];
    if (preset) g.pointOfView({ lat: preset.latitude, lng: preset.longitude, altitude: 2.2 });
  }, [currentView]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        background: isDark ? "#0a0a12" : "#e2e8f0",
      }}
    />
  );
}
