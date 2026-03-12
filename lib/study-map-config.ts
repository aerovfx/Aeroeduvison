/**
 * Cấu hình bản đồ học nhóm — theo cấu trúc worldmonitor
 * (VIEW_PRESETS, basemap dark/light, zoom thresholds, màu overlay theo theme)
 * Chỉ thay đổi các lớp dữ liệu (learners, study groups, arcs).
 */

import type { StudyMapLayers } from "@/types/study-map";

export type StudyMapView =
  | "global"
  | "america"
  | "mena"
  | "eu"
  | "asia"
  | "latam"
  | "africa"
  | "oceania"
  | "vietnam";

/** View presets: longitude, latitude, zoom (giống worldmonitor) */
export const VIEW_PRESETS: Record<
  StudyMapView,
  { longitude: number; latitude: number; zoom: number }
> = {
  global: { longitude: 0, latitude: 20, zoom: 1.5 },
  america: { longitude: -95, latitude: 38, zoom: 3 },
  mena: { longitude: 45, latitude: 28, zoom: 3.5 },
  eu: { longitude: 15, latitude: 50, zoom: 3.5 },
  asia: { longitude: 105, latitude: 35, zoom: 3 },
  latam: { longitude: -60, latitude: -15, zoom: 3 },
  africa: { longitude: 20, latitude: 5, zoom: 3 },
  oceania: { longitude: 135, latitude: -25, zoom: 3.5 },
  vietnam: { longitude: 108, latitude: 16, zoom: 5 },
};

/** Basemap style URLs — CARTO (giống worldmonitor) */
export const BASEMAP_DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
export const BASEMAP_LIGHT_STYLE =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

/** Zoom thresholds cho từng lớp (ẩn/hiện theo zoom) */
export const LAYER_ZOOM_THRESHOLDS: Partial<
  Record<keyof StudyMapLayers, { minZoom: number; showLabels?: number }>
> = {
  learnersAll: { minZoom: 1, showLabels: 4 },
  learnersByInterest: { minZoom: 2, showLabels: 5 },
  suggestedBuddies: { minZoom: 2, showLabels: 5 },
  studyGroups: { minZoom: 2, showLabels: 4 },
  myStudyGroups: { minZoom: 2, showLabels: 4 },
  recommendedGroups: { minZoom: 3, showLabels: 5 },
  arcsSuggestions: { minZoom: 2 },
  labelsLearners: { minZoom: 4 },
  labelsGroups: { minZoom: 3 },
  // Chỉ số giáo dục: choropleth theo vùng, hiện từ zoom 2 trở lên
  accessEnrollment: { minZoom: 2, showLabels: 4 },
  accessAttendance: { minZoom: 2, showLabels: 4 },
  accessOutOfSchool: { minZoom: 2, showLabels: 4 },
  accessSummary: { minZoom: 2, showLabels: 4 },
  completionRate: { minZoom: 2, showLabels: 4 },
  completionDropout: { minZoom: 2, showLabels: 4 },
  completionTransition: { minZoom: 2, showLabels: 4 },
  completionSummary: { minZoom: 2, showLabels: 4 },
  qualityTestScores: { minZoom: 2, showLabels: 4 },
  qualityLiteracy: { minZoom: 2, showLabels: 4 },
  qualityPISA: { minZoom: 2, showLabels: 4 },
  qualitySummary: { minZoom: 2, showLabels: 4 },
  resourcesSpending: { minZoom: 2, showLabels: 4 },
  resourcesStudentTeacherRatio: { minZoom: 2, showLabels: 4 },
  resourcesSummary: { minZoom: 2, showLabels: 4 },
  equityGenderParity: { minZoom: 2, showLabels: 4 },
  equityUrbanRural: { minZoom: 2, showLabels: 4 },
  equitySummary: { minZoom: 2, showLabels: 4 },
  efficiencyYearsOfSchooling: { minZoom: 2, showLabels: 4 },
  efficiencyLAYS: { minZoom: 2, showLabels: 4 },
  efficiencySummary: { minZoom: 2, showLabels: 4 },
  impactHumanCapital: { minZoom: 2, showLabels: 4 },
  impactEducationIndex: { minZoom: 2, showLabels: 4 },
  higherEdRanking: { minZoom: 3, showLabels: 5 },
  higherEdResearch: { minZoom: 3, showLabels: 5 },
};

/** Màu overlay theo theme (light/dark) — chỉ cho các lớp dữ liệu study map */
export function getStudyMapOverlayColors(isLight: boolean): {
  learner: [number, number, number, number];
  learnerSuggested: [number, number, number, number];
  studyGroup: [number, number, number, number];
  arc: [number, number, number, number];
  arcHighlight: [number, number, number, number];
  /** Choropleth chỉ số giáo dục: thấp → cao (tránh xanh = tốt, đỏ = cần cải thiện) */
  indicatorLow: [number, number, number, number];
  indicatorMid: [number, number, number, number];
  indicatorHigh: [number, number, number, number];
} {
  return {
    learner: isLight
      ? ([66, 133, 244, 220] as [number, number, number, number])
      : ([102, 126, 234, 220] as [number, number, number, number]),
    learnerSuggested: isLight
      ? ([234, 179, 8, 240] as [number, number, number, number])
      : ([250, 204, 21, 240] as [number, number, number, number]),
    studyGroup: isLight
      ? ([22, 163, 74, 220] as [number, number, number, number])
      : ([72, 187, 120, 220] as [number, number, number, number]),
    arc: isLight
      ? ([102, 126, 234, 140] as [number, number, number, number])
      : ([102, 126, 234, 180] as [number, number, number, number]),
    arcHighlight: isLight
      ? ([234, 179, 8, 200] as [number, number, number, number])
      : ([250, 204, 21, 200] as [number, number, number, number]),
    indicatorLow: isLight
      ? ([239, 68, 68, 180] as [number, number, number, number])
      : ([248, 113, 113, 180] as [number, number, number, number]),
    indicatorMid: isLight
      ? ([234, 179, 8, 200] as [number, number, number, number])
      : ([250, 204, 21, 200] as [number, number, number, number]),
    indicatorHigh: isLight
      ? ([34, 197, 94, 200] as [number, number, number, number])
      : ([74, 222, 128, 200] as [number, number, number, number]),
  };
}

export const STUDY_MAP_VIEW_LABELS: Record<StudyMapView, string> = {
  global: "Toàn cầu",
  america: "Châu Mỹ",
  mena: "MENA",
  eu: "Châu Âu",
  asia: "Châu Á",
  latam: "Mỹ Latinh",
  africa: "Châu Phi",
  oceania: "Châu Đại Dương",
  vietnam: "Việt Nam",
};
