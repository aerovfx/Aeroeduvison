/**
 * Dual Map Engine — shared types and 45 data layers for Study Group Map.
 * Layers are consumed by both Globe (globe.gl + Three.js) and Flat (deck.gl) views.
 */

export type MapMode = "globe" | "flat";

/** Learner marker for map (optional geo from profile/school/city) */
export interface LearnerMarker {
  id: string;
  name: string;
  email?: string;
  image?: string | null;
  lat: number;
  lng: number;
  /** City or region label */
  locationLabel?: string;
  /** Subjects interested in */
  subjects: string[];
  /** Free-form interests/tags */
  interests: string[];
  /** Level: beginner | intermediate | advanced */
  level?: string;
  /** Match score 0–100 when shown as "suggested" */
  matchScore?: number;
  /** Current study group id if any */
  studyGroupId?: string | null;
  /** Online now */
  online?: boolean;
}

/** Study group cluster or single group */
export interface StudyGroupMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  memberCount: number;
  subject?: string;
  interests: string[];
  isOpen: boolean;
}

/** Arc between two points (e.g. learner–learner suggestion link) */
export interface StudyMapArc {
  id: string;
  from: [number, number];
  to: [number, number];
  color?: [number, number, number];
  weight?: number;
}

/**
 * Chỉ số giáo dục theo vùng/trường (SDG4, PISA, HDI…).
 * Dùng cho lớp choropleth hoặc marker theo regionId.
 */
export interface EducationIndicatorRegion {
  regionId: string;
  name: string;
  lat: number;
  lng: number;
  /** Mã tỉnh/quốc gia (ISO hoặc GSO) */
  code?: string;
  /** 1. Access – Tiếp cận */
  enrollmentRate?: number;
  netEnrollmentRate?: number;
  attendanceRate?: number;
  outOfSchoolRate?: number;
  /** 2. Completion – Hoàn thành */
  completionRate?: number;
  graduationRate?: number;
  dropoutRate?: number;
  transitionRate?: number;
  /** 3. Quality – Chất lượng (Learning outcomes) */
  avgTestScore?: number;
  literacyRate?: number;
  pisaReading?: number;
  pisaMath?: number;
  pisaScience?: number;
  /** 4. Resources – Nguồn lực */
  educationSpendPctGdp?: number;
  spendingPerStudent?: number;
  studentTeacherRatio?: number;
  teacherQualificationRate?: number;
  /** 5. Equity – Công bằng */
  genderParityIndex?: number;
  urbanRuralGap?: number;
  /** 6. Efficiency – Hiệu quả hệ thống */
  yearsOfSchooling?: number;
  expectedYearsOfSchooling?: number;
  lays?: number;
  /** 7. Tác động (HDI, Human Capital) */
  humanCapitalIndex?: number;
  educationIndex?: number;
  /** 8. Đại học (nếu vùng có dữ liệu) */
  universityRankScore?: number;
  researchOutput?: number;
}

// —— Shared layer keys: cá nhân + chỉ số giáo dục (runtime-switchable) ——
export interface StudyMapLayers {
  // ——— Chỉ số cá nhân / học nhóm (1–45) ———
  learnersAll: boolean;
  learnersBySubject: boolean;
  learnersByInterest: boolean;
  learnersByLevel: boolean;
  suggestedBuddies: boolean;
  myPosition: boolean;
  learnersOnline: boolean;
  learnersInMyGroup: boolean;
  learnersNearby: boolean;
  learnersSameGoal: boolean;
  studyGroups: boolean;
  studyGroupsOpen: boolean;
  studyGroupsBySubject: boolean;
  studyGroupClusters: boolean;
  myStudyGroups: boolean;
  recommendedGroups: boolean;
  groupActivity: boolean;
  groupConnections: boolean;
  interestToán: boolean;
  interestLý: boolean;
  interestHóa: boolean;
  interestSinh: boolean;
  interestVăn: boolean;
  interestAnh: boolean;
  interestSTEM: boolean;
  interestLậpTrình: boolean;
  interestKhoaHọc: boolean;
  interestKhác: boolean;
  heatmapLearners: boolean;
  heatmapActivity: boolean;
  densityByRegion: boolean;
  densityBySubject: boolean;
  clustersInterests: boolean;
  clustersLevel: boolean;
  clustersTimeZone: boolean;
  arcsSuggestions: boolean;
  arcsStudyGroups: boolean;
  arcsSameInterest: boolean;
  arcsSameSubject: boolean;
  arcsConnections: boolean;
  labelsLearners: boolean;
  labelsGroups: boolean;
  labelsRegions: boolean;
  baseMapDark: boolean;
  baseMapLight: boolean;
  // ——— 1. Chỉ số tiếp cận (Access) ———
  accessEnrollment: boolean;
  accessAttendance: boolean;
  accessOutOfSchool: boolean;
  accessSummary: boolean;
  // ——— 2. Chỉ số hoàn thành (Completion) ———
  completionRate: boolean;
  completionDropout: boolean;
  completionTransition: boolean;
  completionSummary: boolean;
  // ——— 3. Chỉ số chất lượng (Learning outcomes / Quality) ———
  qualityTestScores: boolean;
  qualityLiteracy: boolean;
  qualityPISA: boolean;
  qualitySummary: boolean;
  // ——— 4. Chỉ số nguồn lực (Resources) ———
  resourcesSpending: boolean;
  resourcesStudentTeacherRatio: boolean;
  resourcesSummary: boolean;
  // ——— 5. Chỉ số công bằng (Equity) ———
  equityGenderParity: boolean;
  equityUrbanRural: boolean;
  equitySummary: boolean;
  // ——— 6. Chỉ số hiệu quả hệ thống (Efficiency) ———
  efficiencyYearsOfSchooling: boolean;
  efficiencyLAYS: boolean;
  efficiencySummary: boolean;
  // ——— 7. Tác động kinh tế – xã hội ———
  impactHumanCapital: boolean;
  impactEducationIndex: boolean;
  // ——— 8. Giáo dục đại học & nghiên cứu ———
  higherEdRanking: boolean;
  higherEdResearch: boolean;
}

export const DEFAULT_STUDY_MAP_LAYERS: StudyMapLayers = {
  learnersAll: true,
  learnersBySubject: false,
  learnersByInterest: true,
  learnersByLevel: false,
  suggestedBuddies: true,
  myPosition: true,
  learnersOnline: false,
  learnersInMyGroup: false,
  learnersNearby: false,
  learnersSameGoal: false,
  studyGroups: true,
  studyGroupsOpen: false,
  studyGroupsBySubject: false,
  studyGroupClusters: false,
  myStudyGroups: true,
  recommendedGroups: true,
  groupActivity: false,
  groupConnections: false,
  interestToán: false,
  interestLý: false,
  interestHóa: false,
  interestSinh: false,
  interestVăn: false,
  interestAnh: false,
  interestSTEM: false,
  interestLậpTrình: false,
  interestKhoaHọc: false,
  interestKhác: false,
  heatmapLearners: false,
  heatmapActivity: false,
  densityByRegion: false,
  densityBySubject: false,
  clustersInterests: false,
  clustersLevel: false,
  clustersTimeZone: false,
  arcsSuggestions: true,
  arcsStudyGroups: false,
  arcsSameInterest: false,
  arcsSameSubject: false,
  arcsConnections: false,
  labelsLearners: true,
  labelsGroups: true,
  labelsRegions: false,
  baseMapDark: true,
  baseMapLight: false,
  // Chỉ số giáo dục (mặc định tắt)
  accessEnrollment: false,
  accessAttendance: false,
  accessOutOfSchool: false,
  accessSummary: false,
  completionRate: false,
  completionDropout: false,
  completionTransition: false,
  completionSummary: false,
  qualityTestScores: false,
  qualityLiteracy: false,
  qualityPISA: false,
  qualitySummary: false,
  resourcesSpending: false,
  resourcesStudentTeacherRatio: false,
  resourcesSummary: false,
  equityGenderParity: false,
  equityUrbanRural: false,
  equitySummary: false,
  efficiencyYearsOfSchooling: false,
  efficiencyLAYS: false,
  efficiencySummary: false,
  impactHumanCapital: false,
  impactEducationIndex: false,
  higherEdRanking: false,
  higherEdResearch: false,
};

export const STUDY_MAP_LAYER_KEYS = Object.keys(DEFAULT_STUDY_MAP_LAYERS) as (keyof StudyMapLayers)[];

export const STUDY_MAP_LAYER_LABELS: Partial<Record<keyof StudyMapLayers, string>> = {
  learnersAll: "Tất cả người học",
  learnersBySubject: "Theo môn học",
  learnersByInterest: "Theo sở thích",
  suggestedBuddies: "Gợi ý học chung",
  myPosition: "Vị trí của tôi",
  learnersOnline: "Đang online",
  studyGroups: "Nhóm học",
  studyGroupsOpen: "Nhóm mở",
  myStudyGroups: "Nhóm của tôi",
  recommendedGroups: "Nhóm gợi ý",
  arcsSuggestions: "Đường nối gợi ý",
  labelsLearners: "Tên người học",
  labelsGroups: "Tên nhóm",
  baseMapDark: "Nền tối",
  baseMapLight: "Nền sáng",
  // 1. Tiếp cận
  accessEnrollment: "Tỷ lệ nhập học (GER/NER)",
  accessAttendance: "Tỷ lệ đi học thực tế",
  accessOutOfSchool: "Tỷ lệ không đi học",
  accessSummary: "Tổng hợp tiếp cận",
  // 2. Hoàn thành
  completionRate: "Tỷ lệ hoàn thành cấp học",
  completionDropout: "Tỷ lệ bỏ học",
  completionTransition: "Tỷ lệ chuyển cấp",
  completionSummary: "Tổng hợp hoàn thành",
  // 3. Chất lượng
  qualityTestScores: "Điểm thi trung bình",
  qualityLiteracy: "Tỷ lệ biết đọc viết",
  qualityPISA: "PISA (đọc, toán, khoa học)",
  qualitySummary: "Tổng hợp chất lượng",
  // 4. Nguồn lực
  resourcesSpending: "Chi tiêu GD / GDP, theo học sinh",
  resourcesStudentTeacherRatio: "Tỷ lệ HS/GV",
  resourcesSummary: "Tổng hợp nguồn lực",
  // 5. Công bằng
  equityGenderParity: "Bình đẳng giới (GPI)",
  equityUrbanRural: "Khoảng cách thành thị–nông thôn",
  equitySummary: "Tổng hợp công bằng",
  // 6. Hiệu quả
  efficiencyYearsOfSchooling: "Số năm đi học",
  efficiencyLAYS: "LAYS (Learning-adjusted years)",
  efficiencySummary: "Tổng hợp hiệu quả",
  // 7. Tác động
  impactHumanCapital: "Human Capital Index",
  impactEducationIndex: "Education Index (HDI)",
  // 8. Đại học
  higherEdRanking: "Xếp hạng đại học",
  higherEdResearch: "Nghiên cứu, công bố",
};

/** Nhóm lớp theo 4 tầng đo lường: Access – Quality – Equity – Efficiency */
export const STUDY_MAP_LAYER_GROUPS = {
  personal: ["learnersAll", "learnersBySubject", "learnersByInterest", "suggestedBuddies", "myPosition", "studyGroups", "myStudyGroups", "recommendedGroups", "arcsSuggestions"] as (keyof StudyMapLayers)[],
  access: ["accessEnrollment", "accessAttendance", "accessOutOfSchool", "accessSummary"] as (keyof StudyMapLayers)[],
  quality: ["qualityTestScores", "qualityLiteracy", "qualityPISA", "qualitySummary", "completionRate", "completionDropout", "completionTransition", "completionSummary"] as (keyof StudyMapLayers)[],
  equity: ["equityGenderParity", "equityUrbanRural", "equitySummary"] as (keyof StudyMapLayers)[],
  efficiency: ["efficiencyYearsOfSchooling", "efficiencyLAYS", "efficiencySummary", "resourcesSpending", "resourcesStudentTeacherRatio", "resourcesSummary"] as (keyof StudyMapLayers)[],
  impact: ["impactHumanCapital", "impactEducationIndex"] as (keyof StudyMapLayers)[],
  higherEd: ["higherEdRanking", "higherEdResearch"] as (keyof StudyMapLayers)[],
} as const;
