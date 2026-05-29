/**
 * Router — ánh xạ toàn bộ Next.js routes → React Router paths
 *
 * Mapping:
 *   app/(auth)/...           → /auth/*
 *   app/(dashboard)/...      → /dashboard/*, /teacher/*, /student/*
 *   app/(course)/...         → /courses/*
 *   app/admin/...            → /admin/*
 *   app/(marketing)/...      → /, /pricing, /contact-sales
 *
 * Chiến lược:
 *   - Component Vite thực sự  → dùng lazy import trực tiếp
 *   - Trang chưa port         → PageFallback iframe Next.js (localhost:3000)
 *   - Wildcard sections       → PageFallback tự mirror path hiện tại
 */
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import PageFallback from '@/pages/common/PageFallback'
const NotFoundPage = lazy(() => import('@/pages/common/NotFound'))
import { RouteErrorBoundary } from '@/components/common/ErrorBoundary'
import { usePageTracking } from '@/hooks/usePageTracking'

// Loading spinner
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[hsl(262,83%,58%)] animate-spin" />
      </div>
    </div>
  )
}

// ── Auth Pages (không lazy vì cần load nhanh) ───────────────
import LoginPage from '@/pages/auth/Login'
import RegisterPage from '@/pages/auth/Register'
import ForgotPasswordPage from '@/pages/auth/ForgotPassword'
import ResetPasswordPage from '@/pages/auth/ResetPassword'

// ── Marketing Pages ─────────────────────────────────────────
const LandingPage      = lazy(() => import('@/pages/marketing/Landing'))
const FreeAiCoursePage = lazy(() => import('@/pages/marketing/FreeAiCourse'))
const LLMVisualizerPage = lazy(() => import('@/pages/marketing/LLMVisualizer'))
const PedagogyCoursePage = lazy(() => import('@/pages/marketing/PedagogyCourse'))
const AeroKidsPage = lazy(() => import('@/pages/kids/AeroKids'))
const AeroEpisodePlayerPage = lazy(() => import('@/pages/kids/AeroEpisodePlayer'))
const TermsPage        = lazy(() => import('@/pages/legal/Terms'))
const PrivacyPage      = lazy(() => import('@/pages/legal/Privacy'))
const ContactSalesPage = lazy(() => import('@/pages/legal/ContactSales'))

// ── Public Pages (không cần đăng nhập) ───────────────────────
const ScanAssignmentPage = lazy(() => import('@/pages/public/ScanAssignment'))
const KeoCoJoinPage      = lazy(() => import('@/pages/public/KeoCoJoin'))
// /join/:token — HS quét QR mời của GV vào lớp
const JoinByTokenPage    = lazy(() => import('@/pages/join/JoinByToken'))
const KeoCoChallengePage = lazy(() => import('@/pages/public/KeoCoChallenge'))
const KeoCoLivePage      = lazy(() => import('@/pages/public/KeoCoLive'))

// ── Dashboard (Student/General) ──────────────────────────────
const DashboardHome    = lazy(() => import('@/pages/dashboard/Home'))
const PostureMonitorPage = lazy(() => import('@/pages/dashboard/PostureMonitor'))
const AnalyticsPage    = lazy(() => import('@/pages/dashboard/Analytics'))
const AchievementsPage = lazy(() => import('@/pages/dashboard/Achievements'))
const AssignmentsPage  = lazy(() => import('@/pages/dashboard/Assignments'))
const AssignmentWorkspacePage = lazy(() => import('@/pages/student/AssignmentWorkspace'))
const CoursesPage      = lazy(() => import('@/pages/dashboard/Courses'))
const AiTutorPage      = lazy(() => import('@/pages/dashboard/AiTutor'))
const ChatPage         = lazy(() => import('@/pages/dashboard/Chat'))
const EmotionPage      = lazy(() => import('@/pages/dashboard/Emotion'))
const AuraPage         = lazy(() => import('@/pages/dashboard/Aura'))
// StemPage removed 2026-05-27 — /dashboard/stem redirected to /student/stem-projects.
// File aeroedu-vite/src/pages/dashboard/Stem.tsx có thể xoá ở commit cleanup sau.
const NotesPage        = lazy(() => import('@/pages/dashboard/Notes'))
const ScrumboardPage   = lazy(() => import('@/pages/dashboard/Scrumboard'))
const KnowledgeGraphPage = lazy(() => import('@/pages/dashboard/KnowledgeGraph'))
const TeacherScrumboardPage = lazy(() => import('@/pages/teacher/TeacherScrumboard'))
const AdminScrumboardPage   = lazy(() => import('@/pages/admin/AdminScrumboard'))
const AdminRsExperimentsPage= lazy(() => import('@/pages/admin/RsExperiments'))
const SettingsPage     = lazy(() => import('@/pages/dashboard/Settings'))
const ContactsPage     = lazy(() => import('@/pages/dashboard/Contacts'))

// ── STEM Sub-pages ───────────────────────────────────────────
const StemDetailPage      = lazy(() => import('@/pages/stem/StemDetail'))
const StemEditPage        = lazy(() => import('@/pages/stem/StemEdit'))
const StemTimelinePage    = lazy(() => import('@/pages/stem/StemTimeline'))
const StemCreatePage      = lazy(() => import('@/pages/stem/StemCreate'))
const StemTemplatesPage   = lazy(() => import('@/pages/stem/StemTemplates'))
const TeacherStemProjects = lazy(() => import('@/pages/teacher/StemProjects'))
const TeacherStemProjectDetail = lazy(() => import('@/pages/teacher/StemProjectDetail'))
const StemJoinByToken     = lazy(() => import('@/pages/stem/JoinByToken'))

// ── Courses ─────────────────────────────────────────────────
const CourseViewPage   = lazy(() => import('@/pages/courses/CourseView'))
const ChapterViewPage  = lazy(() => import('@/pages/courses/ChapterView'))

// ── Labs (3D heavy) ─────────────────────────────────────────
const LabsIndexPage      = lazy(() => import('@/pages/labs/LabsIndex'))
// PythonLabsPage removed — flattened all sims into /dashboard/labtwin (LabsIndex)
const AerodynamicsLab    = lazy(() => import('@/pages/labs/Aerodynamics'))
const FourierEpicycles   = lazy(() => import('@/pages/labs/FourierEpicycles'))
const CircularSHM        = lazy(() => import('@/pages/labs/CircularSHM'))
const VideoTrackingLab   = lazy(() => import('@/pages/labs/VideoTracking'))
const GeometryUnfoldLab  = lazy(() => import('@/pages/labs/GeometryUnfold'))
const PixelOfficeRPGLab  = lazy(() => import('@/pages/labs/PixelOfficeRPG'))
const AirflowCFDLab      = lazy(() => import('@/pages/labs/AirflowCFD'))
const ChemistryLab       = lazy(() => import('@/pages/labs/Chemistry'))
const CircuitSimulator   = lazy(() => import('@/pages/labs/CircuitSimulator'))
const DigitalLogicLab    = lazy(() => import('@/pages/labs/DigitalLogicLab'))
const PixelOdyssey       = lazy(() => import('@/pages/labs/PixelOdyssey'))
const GamesIndexPage     = lazy(() => import('@/pages/games/GamesIndex'))
const BuffaloRunnerPage  = lazy(() => import('@/pages/games/BuffaloRunnerPage'))
const ArduinoEmulator    = lazy(() => import('@/pages/labs/ArduinoEmulator'))
// IoT sub-pages — deep-link cho assignment "lắp ráp / nghiên cứu mạch"
const CircuitBuilder     = lazy(() => import('@/pages/labs/CircuitBuilder'))
const CircuitPresets     = lazy(() => import('@/pages/labs/CircuitPresets'))
const CustomWokwiBoard   = lazy(() => import('@/pages/labs/CustomWokwiBoard'))
const SemiconductorLab   = lazy(() => import('@/pages/labs/SemiconductorLab'))
const PhysicsMotion      = lazy(() => import('@/pages/labs/PhysicsMotion'))
const FluidDynamicsLab   = lazy(() => import('@/pages/labs/FluidDynamics'))
const LabNextJsFallback  = lazy(() => import('@/pages/labs/NextJsFallback'))
const SpringPendulum     = lazy(() => import('@/pages/labs/SpringPendulum'))
const SimplePendulum     = lazy(() => import('@/pages/labs/SimplePendulum'))
const OpticsLab          = lazy(() => import('@/pages/labs/OpticsLab'))
const WaveInterference   = lazy(() => import('@/pages/labs/WaveInterference'))
const MechaForce         = lazy(() => import('@/pages/labs/MechaForce'))
const MotionSim          = lazy(() => import('@/pages/labs/MotionSim'))
const PhysicsEngine2D    = lazy(() => import('@/pages/labs/PhysicsEngine2D'))
const MomentumCollision  = lazy(() => import('@/pages/labs/MomentumCollision'))
const ProjectileMotion   = lazy(() => import('@/pages/labs/ProjectileMotion'))
const CircularMotion     = lazy(() => import('@/pages/labs/CircularMotion'))
const RotationalDynamics = lazy(() => import('@/pages/labs/RotationalDynamics'))
const YoungDoubleSlit    = lazy(() => import('@/pages/labs/YoungDoubleSlit'))
const CircularMotion3D   = lazy(() => import('@/pages/labs/CircularMotion3D'))
const HarmonicMotion     = lazy(() => import('@/pages/labs/HarmonicMotion'))
const RefractionExplorer = lazy(() => import('@/pages/labs/RefractionExplorer'))
const DensityBuoyancy    = lazy(() => import('@/pages/labs/DensityBuoyancy'))
const ScratchKids        = lazy(() => import('@/pages/labs/ScratchKids'))
const CFDFlow            = lazy(() => import('@/pages/labs/CFDFlow'))
const StandingWaves      = lazy(() => import('@/pages/labs/StandingWaves'))
const StemDIYLibrary     = lazy(() => import('@/pages/labs/StemDIYLibrary'))
const BioGrowth          = lazy(() => import('@/pages/labs/BioGrowth'))
const ThermalGas         = lazy(() => import('@/pages/labs/ThermalGas'))
const WfcBuilder         = lazy(() => import('@/pages/labs/WfcBuilder'))
const PixelAgents        = lazy(() => import('@/pages/labs/PixelAgents'))
const PhysicsDungeon     = lazy(() => import('@/pages/labs/PhysicsDungeon'))
const KeoCoApp           = lazy(() => import('@/pages/labs/KeoCoApp'))
const RollCallWheel      = lazy(() => import('@/pages/labs/RollCallWheel'))
const GestureSwarm       = lazy(() => import('@/pages/labs/GestureSwarm'))
const AssemblySim        = lazy(() => import('@/pages/labs/AssemblySim'))
const IoTLab             = lazy(() => import('@/pages/labs/IoTLab'))
const GraphLab           = lazy(() => import('@/pages/labs/GraphLab'))
const PeriodicTablePage  = lazy(() => import('@/pages/labs/PeriodicTable'))

// ── Teacher Pages (đã port) ──────────────────────────────────
const TeacherDashboard      = lazy(() => import('@/pages/teacher/Dashboard'))
const TeacherSprintPage     = lazy(() => import('@/pages/teacher/Sprint'))
const ExamMatrixPage        = lazy(() => import('@/pages/teacher/ExamMatrix'))
const ExamMatrixDetailPage  = lazy(() => import('@/pages/teacher/ExamMatrixDetail'))
const ExamMatrixCreatePage  = lazy(() => import('@/pages/teacher/ExamMatrixCreate'))
const QuestionBankPage      = lazy(() => import('@/pages/teacher/QuestionBank'))
const ExamsPage             = lazy(() => import('@/pages/teacher/Exams'))
const CreateExamPage        = lazy(() => import('@/pages/teacher/CreateExam'))
const WaygroundCreatePage   = lazy(() => import('@/pages/teacher/WaygroundCreate'))
const ExamDetailPage        = lazy(() => import('@/pages/teacher/ExamDetail'))
const ExamHostPage          = lazy(() => import('@/pages/teacher/ExamHost'))
const PlayJoinPage          = lazy(() => import('@/pages/play/PlayJoin'))
const PlayRoomPage          = lazy(() => import('@/pages/play/PlayRoom'))
const ExamSheetPage         = lazy(() => import('@/pages/student/ExamSheet'))
const ExamModesPage         = lazy(() => import('@/pages/student/ExamModes'))
const ExamSoloPage          = lazy(() => import('@/pages/student/ExamSolo'))
const ExamFlashcardsPage    = lazy(() => import('@/pages/student/ExamFlashcards'))
const ExamMasteryPage       = lazy(() => import('@/pages/student/ExamMastery'))
const PricingPage2          = lazy(() => import('@/pages/payment/Pricing'))
const PaymentDetailPage     = lazy(() => import('@/pages/payment/PaymentDetail'))
const ActivatePage          = lazy(() => import('@/pages/payment/Activate'))
const OnlineExamRoomPage    = lazy(() => import('@/pages/teacher/OnlineExamRoom'))
const ExamGradingPage       = lazy(() => import('@/pages/teacher/ExamGrading'))
const TranscriptPage        = lazy(() => import('@/pages/teacher/Transcript'))
const TranscriptRecordingPage = lazy(() => import('@/pages/teacher/TranscriptRecording'))
const CreateModulePage      = lazy(() => import('@/pages/teacher/CreateModule'))
const LaTeXEditorPage       = lazy(() => import('@/pages/teacher/LaTeXEditor'))
const TeacherMyCoursesPage  = lazy(() => import('@/pages/teacher/MyCourses'))
const TeacherWayArena       = lazy(() => import('@/pages/teacher/WayArena'))
const TeacherCourseEditorPage = lazy(() => import('@/pages/teacher/CourseEditor'))
const TeacherCourseVideosPage = lazy(() => import('@/pages/teacher/CourseVideos'))
const TeacherCourseAssetsPage = lazy(() => import('@/pages/teacher/CourseAssets'))
const AiDashboardPage          = lazy(() => import('@/pages/teacher/AiDashboard'))
const TeacherAnalyticsPage     = lazy(() => import('@/pages/teacher/Analytics'))
const EmotionMapPage           = lazy(() => import('@/pages/teacher/EmotionMap'))
const TeacherClassesPage       = lazy(() => import('@/pages/teacher/Classes'))
const TeacherStudentRequestsPage = lazy(() => import('@/pages/teacher/StudentRequests'))
const ClassDetailPage          = lazy(() => import('@/pages/teacher/ClassDetail'))
const GradeBookPage            = lazy(() => import('@/pages/teacher/GradeBook'))
const TeacherCalendarPage      = lazy(() => import('@/pages/teacher/Calendar'))
const TeacherAssignmentsPage   = lazy(() => import('@/pages/teacher/Assignments'))
const MeetingNotesPage         = lazy(() => import('@/pages/teacher/MeetingNotes'))
const InteractionCenterPage    = lazy(() => import('@/pages/teacher/InteractionCenter'))
// ExamGeneratorPage REMOVED 2026-05-27 — route /teacher/exam-generator
// redirect → /teacher/taodethi (AI Composer chuẩn). File ExamGenerator.tsx
// có thể xoá ở commit cleanup sau.
const AgentsPage               = lazy(() => import('@/pages/teacher/Agents'))
const StudentInsightPage       = lazy(() => import('@/pages/teacher/StudentInsight'))
const ExamReportsPage          = lazy(() => import('@/pages/teacher/ExamReports'))
const DocumentDigitizationPage = lazy(() => import('@/pages/teacher/DocumentDigitization'))
const DocumentDigitizationReviewPage = lazy(() => import('@/pages/teacher/DocumentDigitizationReview'))
const LaTeXEditorDocumentPage = lazy(() => import('@/pages/teacher/LaTeXEditorDocument'))
const LearningPathBuilderPage = lazy(() => import('@/pages/teacher/LearningPathBuilder'))
const LessonPlansPage         = lazy(() => import('@/pages/teacher/LessonPlans'))
const LessonPlanEditorPage    = lazy(() => import('@/pages/teacher/LessonPlanEditor'))
const CameraManagementPage         = lazy(() => import('@/pages/teacher/CameraManagement'))
const EnvironmentMonitoringPage    = lazy(() => import('@/pages/teacher/EnvironmentMonitoring'))
const ProfessionalKGPage           = lazy(() => import('@/pages/teacher/ProfessionalKG'))
const ApiKeysPage                  = lazy(() => import('@/pages/common/ApiKeys'))

// ── Student Pages (đã port) ──────────────────────────────────
const StudentDashboardPage            = lazy(() => import('@/pages/student/Dashboard'))
const StudentProgressPage             = lazy(() => import('@/pages/student/Progress'))
const StudentSchedulePage             = lazy(() => import('@/pages/student/Schedule'))
const StudentMyCoursesPage            = lazy(() => import('@/pages/student/MyCourses'))
const StudentMyTeachersPage           = lazy(() => import('@/pages/student/MyTeachers'))
const StudentPurchaseHistoryPage      = lazy(() => import('@/pages/student/PurchaseHistory'))
const StudentWishlistPage             = lazy(() => import('@/pages/student/Wishlist'))
const StudentCertificatePage          = lazy(() => import('@/pages/student/Certificate'))
const StudentAgentSettingsPage        = lazy(() => import('@/pages/student/AgentSettings'))
const StudentAiTutorPage              = lazy(() => import('@/pages/student/AiTutor'))
const StudentCareerPage               = lazy(() => import('@/pages/student/Career'))
const StudentExamPrepPage             = lazy(() => import('@/pages/student/ExamPrep'))
const StudentExamsPage                = lazy(() => import('@/pages/student/Exams'))
const StudentSelfStudyPage            = lazy(() => import('@/pages/student/SelfStudy'))
const StudentKidsProgressPage         = lazy(() => import('@/pages/student/KidsProgress'))
const StudentStemProjects             = lazy(() => import('@/pages/student/StemProjects'))
const ForYouPage                      = lazy(() => import('@/pages/student/ForYou'))
const StudentDailyPage                = lazy(() => import('@/pages/student/Daily'))
const EnglishLearnPage                = lazy(() => import('@/pages/student/EnglishLearn'))
const EnglishLessonPage               = lazy(() => import('@/pages/student/EnglishLesson'))
const EnglishFlashcardsPage           = lazy(() => import('@/pages/student/EnglishFlashcards'))
const CareerGamesPage                 = lazy(() => import('@/pages/student/CareerGames'))
const CareerWorldOdysseyPage          = lazy(() => import('@/pages/student/CareerWorldOdyssey'))
const StudentVideoTranscriptPage      = lazy(() => import('@/pages/student/VideoTranscript'))
const StudentVideoTranscriptHistoryPage = lazy(() => import('@/pages/student/VideoTranscriptHistory'))

// ── Learning Paths ────────────────────────────────────────────
const LearningPathsPage            = lazy(() => import('@/pages/learning/LearningPaths'))
const LearningPathsRecommendedPage = lazy(() => import('@/pages/learning/LearningPathsRecommended'))
const LearningPathLessonPage       = lazy(() => import('@/pages/learning/LearningPathLesson'))

// ── Learning / Course Player ─────────────────────────────────
const CoursePlayerPage = lazy(() => import('@/pages/learning/CoursePlayer'))

// ── Profile Pages ────────────────────────────────────────────
const ProfileBasicInfoPage = lazy(() => import('@/pages/profile/BasicInfo'))
const ProfilePhotoPage     = lazy(() => import('@/pages/profile/Photo'))
const PublicProfilePage    = lazy(() => import('@/pages/profile/PublicProfile'))
const CustomizeProfilePage = lazy(() => import('@/pages/profile/Customize'))
const CareerSurveyPage     = lazy(() => import('@/pages/profile/CareerSurvey'))
const SecurityPage         = lazy(() => import('@/pages/profile/Security'))

// ── Docs / Hướng dẫn sử dụng ─────────────────────────────────
const DocsIndexPage   = lazy(() => import('@/pages/docs/DocsIndex'))
const DocsArticlePage = lazy(() => import('@/pages/docs/DocsArticle'))

// ── News / Tin tức (Soha-style) ──────────────────────────────
const NewsIndexPage   = lazy(() => import('@/pages/news/NewsIndex'))
const NewsArticlePage = lazy(() => import('@/pages/news/NewsArticle'))
const TeacherNewsComposePage = lazy(() => import('@/pages/teacher/NewsCompose'))
const AdminNewsReviewPage    = lazy(() => import('@/pages/admin/NewsReview'))

// ── Admin Pages (đã port) ────────────────────────────────────
const AdminOverview         = lazy(() => import('@/pages/admin/Overview'))
const AdminUsersPage        = lazy(() => import('@/pages/admin/Users'))
const AdminStudents         = lazy(() => import('@/pages/admin/Students'))
const AdminTeachers         = lazy(() => import('@/pages/admin/Teachers'))
const AdminCameraManagement = lazy(() => import('@/pages/admin/CameraManagement'))
const AdminIoTManagement    = lazy(() => import('@/pages/admin/IoTManagement'))
const AdminModels           = lazy(() => import('@/pages/admin/Models'))
const AdminSettings         = lazy(() => import('@/pages/admin/AdminSettings'))
const AdminAtRiskPage       = lazy(() => import('@/pages/admin/AtRisk'))
const AdminEmotionPage      = lazy(() => import('@/pages/admin/Emotion'))
const AdminContentPage      = lazy(() => import('@/pages/admin/Content'))
const AdminOperationsPage   = lazy(() => import('@/pages/admin/Operations'))
const AdminCategoriesPage   = lazy(() => import('@/pages/admin/Categories'))
const AdminEnglishEditorPage = lazy(() => import('@/pages/admin/EnglishEditor'))
const AdminAnalyticsPage    = lazy(() => import('@/pages/admin/Analytics'))
const AdminInsightsPage     = lazy(() => import('@/pages/admin/Insights'))
const AdminPaymentsPage     = lazy(() => import('@/pages/admin/Payments'))

// ── Fallback (PageFallback) dùng trực tiếp không cần lazy ────
// vì component rất nhẹ (chỉ là iframe)

// Track lượt truy cập từng route → bảng PageView, hiện ở /admin/analytics
// Backward-compat: /dashboard/labtwin/<slug> → /dashboard/labtwin/<slug>
// User: "bỏ route /labs/ chuyển toàn bộ giả lập ra route cha"
function LegacyLabSlugRedirect() {
  const { labSlug } = useParams<{ labSlug: string }>()
  return <Navigate to={`/dashboard/labtwin/${labSlug ?? ''}`} replace />
}

// 2026-05-27: HS dashboard cũ /dashboard/stem/:id → /student/stem-projects/:id
function StemRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/student/stem-projects/${id ?? ''}`} replace />
}

function PageTracker() {
  usePageTracking()
  return null
}

export function AppRouter() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <PageTracker />
        <Routes>

        {/* ══════════════════════════════════════════════════
            PUBLIC / MARKETING
        ══════════════════════════════════════════════════ */}
        <Route path="/"               element={<LandingPage />} />
        <Route path="/free-courses/llm-mastery" element={<FreeAiCoursePage />} />
        <Route path="/free-courses/llm-mastery/visualize" element={<LLMVisualizerPage />} />
        <Route path="/free-courses/pedagogy" element={<PedagogyCoursePage />} />
        {/* AeroKids — series game mầm non + tiểu học (Đậu Lém-inspired) */}
        <Route path="/kids/aero"             element={<AeroKidsPage />} />
        <Route path="/kids/aero/:episodeId"  element={<AeroEpisodePlayerPage />} />
        <Route path="/pricing"          element={<PricingPage2 />} />
        <Route path="/payment/:orderId" element={<PaymentDetailPage />} />
        <Route path="/activate"         element={<ActivatePage />} />
        <Route path="/a/:token"       element={<ScanAssignmentPage />} />
        <Route path="/k/:token"       element={<KeoCoJoinPage />} />
        <Route path="/join/:token"    element={<JoinByTokenPage />} />{/* HS quét QR vào lớp */}
        <Route path="/stem/join/:token" element={<StemJoinByToken />} />{/* HS join dự án STEM qua QR/link */}
        <Route path="/kc/:token"      element={<KeoCoChallengePage />} />
        <Route path="/kl/:token"      element={<KeoCoLivePage />} />
        <Route path="/contact-sales"  element={<ContactSalesPage />} />
        <Route path="/cookies"        element={<PrivacyPage />} />
        <Route path="/privacy"        element={<PrivacyPage />} />
        <Route path="/terms"          element={<TermsPage />} />

        {/* ── DOCS / Hướng dẫn sử dụng (public — ai cũng đọc được) ── */}
        <Route path="/docs"           element={<DocsIndexPage />} />
        <Route path="/docs/:slug"     element={<DocsArticlePage />} />

        {/* ── NEWS / Tin tức (Soha-style, public) ─────────────── */}
        <Route path="/news"           element={<NewsIndexPage />} />
        <Route path="/news/:slug"     element={<NewsArticlePage />} />

        {/* ══════════════════════════════════════════════════
            AUTH ROUTES (không cần login)
        ══════════════════════════════════════════════════ */}
        <Route path="/auth/login"          element={<LoginPage />} />
        <Route path="/auth/register"       element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        {/* Legacy redirects */}
        <Route path="/sign-in"        element={<Navigate to="/auth/login" replace />} />
        <Route path="/auth/signin"    element={<Navigate to="/auth/login" replace />} />
        <Route path="/auth/signup"    element={<Navigate to="/auth/register" replace />} />
        <Route path="/auth/error"     element={<PageFallback />} />

        {/* ══════════════════════════════════════════════════
            PUBLIC PLAY ROUTES — học sinh quét QR/nhập code, không cần login
        ══════════════════════════════════════════════════ */}
        <Route path="/play"            element={<PlayJoinPage />} />
        <Route path="/play/:code"      element={<PlayRoomPage />} />
        {/* Bộ-style answer sheet — học sinh làm đề chuẩn Bộ GD&ĐT */}
        <Route path="/exam-sheet/:examId" element={<ExamSheetPage />} />
        {/* 3 study modes (Wayground style) */}
        <Route path="/exam/:examId/modes"      element={<ExamModesPage />} />
        <Route path="/exam/:examId/solo"       element={<ExamSoloPage />} />
        <Route path="/exam/:examId/flashcards" element={<ExamFlashcardsPage />} />
        <Route path="/exam/:examId/mastery"    element={<ExamMasteryPage />} />
        {/* /exam/:id (no mode) → bare redirect handler trong ExamModes */}
        <Route path="/exam/:examId"            element={<ExamModesPage />} />

        {/* ══════════════════════════════════════════════════
            PROTECTED ROUTES (yêu cầu đăng nhập)
        ══════════════════════════════════════════════════ */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>

            {/* ── DASHBOARD (Student/General) ─────────────── */}
            <Route path="/dashboard"                      element={<DashboardHome />} />
            <Route path="/dashboard/analytics"            element={<AnalyticsPage />} />
            <Route path="/dashboard/achievements"         element={<AchievementsPage />} />
            <Route path="/dashboard/assignments"          element={<AssignmentsPage />} />
            <Route path="/dashboard/assignments/:id"      element={<AssignmentWorkspacePage />} />
            <Route path="/dashboard/courses"              element={<CoursesPage />} />
            <Route path="/dashboard/emotion"              element={<EmotionPage />} />
            <Route path="/ai-tutor"                       element={<AiTutorPage />} />
            <Route path="/chat"                           element={<ChatPage />} />

            {/* Dashboard pages chưa port → PageFallback */}
            <Route path="/dashboard/ai-content-generator" element={<PageFallback />} />
            <Route path="/dashboard/aura"                  element={<AuraPage />} />
            <Route path="/dashboard/aura/:simId"           element={<AuraPage />} />
            <Route path="/dashboard/change-password"       element={<PageFallback />} />
            <Route path="/dashboard/competition"           element={<PageFallback />} />
            <Route path="/dashboard/competition/:id"       element={<PageFallback />} />
            <Route path="/dashboard/contacts"              element={<ContactsPage />} />
            <Route path="/dashboard/iot-lab"                       element={<IoTLab />} />
            {/* User: "thêm các routes cho các thí nghiệm trong /dashboard/iot-lab" */}
            <Route path="/dashboard/iot-lab/sketch/:sketchId"      element={<IoTLab />} />
            <Route path="/dashboard/iot-lab/arduino/:sketchId"     element={<IoTLab />} />
            <Route path="/dashboard/iot-lab/emulator"              element={<ArduinoEmulator />} />
            {/* ── Deep-link routes cho assignment "lắp ráp / nghiên cứu mạch" ── */}
            <Route path="/dashboard/iot-lab/circuit-builder"       element={<CircuitBuilder />} />
            <Route path="/dashboard/iot-lab/circuit-presets"       element={<CircuitPresets />} />
            <Route path="/dashboard/iot-lab/custom-board"          element={<CustomWokwiBoard />} />
            <Route path="/dashboard/iot-lab/semiconductor"         element={<SemiconductorLab />} />
            <Route path="/dashboard/iot-lab/circuit-simulator"     element={<CircuitSimulator />} />
            <Route path="/dashboard/iot-lab/digital-logic"         element={<DigitalLogicLab />} />
            <Route path="/dashboard/graph-lab"             element={<GraphLab />} />
            <Route path="/dashboard/labtwin/graph-lab" element={<GraphLab />} />
            <Route path="/dashboard/periodic-table"        element={<PeriodicTablePage />} />
            <Route path="/dashboard/learning"              element={<PageFallback />} />
            <Route path="/dashboard/learning/*"            element={<PageFallback />} />
            <Route path="/dashboard/logo-a-demo"           element={<PageFallback />} />
            <Route path="/dashboard/notes"                 element={<NotesPage />} />
            <Route path="/dashboard/notifications"         element={<PageFallback />} />
            <Route path="/dashboard/profile"               element={<PageFallback />} />
            <Route path="/dashboard/quiz/:quizId"          element={<PageFallback />} />
            {/* /dashboard/quizzes → /student/exam-prep (Flashcard SRS + Quiz + Mock test)
                user 2026-05-27: Home.tsx có quick action trỏ /dashboard/quizzes
                nhưng route cũ là PageFallback placeholder → redirect về hub thật. */}
            <Route path="/dashboard/quizzes"               element={<Navigate to="/student/exam-prep" replace />} />
            <Route path="/dashboard/scrumboard"            element={<ScrumboardPage />} />
            <Route path="/dashboard/knowledge-graph"        element={<KnowledgeGraphPage />} />
            <Route path="/dashboard/posture-monitor"        element={<PostureMonitorPage />} />
            <Route path="/teacher/posture-monitor"          element={<PostureMonitorPage />} />
            <Route path="/dashboard/settings"              element={<SettingsPage />} />
            {/* 2026-05-27 user request: REMOVE /dashboard/stem (HS dashboard cũ).
                HS giờ dùng /student/stem-projects (unified joined + owned).
                Redirect tất cả /dashboard/stem/* → /student/stem-projects/* để
                backward-compat link cũ + bookmark vẫn hoạt động. */}
            <Route path="/dashboard/stem"                  element={<Navigate to="/student/stem-projects" replace />} />
            <Route path="/dashboard/stem/create"           element={<Navigate to="/student/stem-projects" replace />} />
            <Route path="/dashboard/stem/templates"        element={<Navigate to="/student/stem-projects" replace />} />
            <Route path="/dashboard/stem/:id"              element={<StemRedirect />} />
            <Route path="/dashboard/stem/:id/edit"         element={<StemRedirect />} />
            <Route path="/dashboard/stem/:id/timeline"     element={<StemRedirect />} />
            <Route path="/dashboard/study-dashboard"       element={<PageFallback />} />
            <Route path="/dashboard/study-group-map"       element={<PageFallback />} />
            <Route path="/dashboard/theme"                 element={<PageFallback />} />
            <Route path="/dashboard/vision-tracker"        element={<PageFallback />} />
            <Route path="/dashboard/weather"               element={<Navigate to="/dashboard" replace />} />

            {/* ── AI TUTOR sub-routes ─────────────────────── */}
            <Route path="/ai-tutor/assignments"  element={<PageFallback />} />
            <Route path="/ai-tutor/chat-test"    element={<PageFallback />} />

            {/* ── LABS ──────────────────────────────────────── */}
            <Route path="/dashboard/labtwin"                              element={<LabsIndexPage />} />
            {/* /labs catalog page — phải register TRƯỚC :labSlug catch-all
                để khớp đúng route. Trước đây bị Navigate redirect về /labtwin
                khiến mọi card "Xem tất cả" / category filter loop vô tận. */}
            {/* User: "bỏ route /dashboard/labtwin/" — flatten all sims into /dashboard/labtwin */}
            <Route path="/dashboard/labtwin/labs"                         element={<Navigate to="/dashboard/labtwin" replace />} />
            <Route path="/dashboard/labtwin/aerodynamics"            element={<AerodynamicsLab />} />
            <Route path="/dashboard/labtwin/fourier-epicycles"       element={<FourierEpicycles />} />
            <Route path="/dashboard/labtwin/circular-shm"            element={<CircularSHM />} />
            <Route path="/dashboard/labtwin/airflow-cfd"             element={<AirflowCFDLab />} />
            <Route path="/dashboard/labtwin/chemistry-lab"           element={<ChemistryLab />} />
            <Route path="/dashboard/labtwin/circuit-simulator"       element={<CircuitSimulator />} />
            <Route path="/dashboard/labtwin/digital-logic-lab"       element={<DigitalLogicLab />} />
            <Route path="/dashboard/labtwin/geometry-unfold"         element={<GeometryUnfoldLab />} />
            <Route path="/dashboard/labtwin/pixel-office-rpg"        element={<PixelOfficeRPGLab />} />
            {/* ── GAME HUB — mọi game mount trực tiếp dưới /dashboard/games/* ── */}
            <Route path="/dashboard/games"                                element={<GamesIndexPage />} />
            <Route path="/dashboard/games/pixel-odyssey"                  element={<PixelOdyssey />} />
            <Route path="/dashboard/games/pixel-agents"                   element={<PixelAgents />} />
            <Route path="/dashboard/games/keo-co"                         element={<KeoCoApp />} />
            <Route path="/dashboard/games/buffalo-runner"                 element={<BuffaloRunnerPage />} />
            <Route path="/dashboard/games/roll-call-wheel"                element={<RollCallWheel />} />
            <Route path="/dashboard/games/gesture-swarm"                  element={<GestureSwarm />} />
            <Route path="/dashboard/games/assembly-sim"                   element={<AssemblySim />} />
            <Route path="/dashboard/games/wayground"                      element={<Navigate to="/dashboard/games/keo-co" replace />} />
            <Route path="/dashboard/games/quiz-tug-of-war"                element={<Navigate to="/dashboard/games/keo-co" replace />} />
            {/* ── Backward compat — old labtwin/labs/* paths cho games → redirect ── */}
            <Route path="/dashboard/labtwin/pixel-odyssey"           element={<Navigate to="/dashboard/games/pixel-odyssey" replace />} />
            <Route path="/dashboard/labtwin/pixel-agents"            element={<Navigate to="/dashboard/games/pixel-agents" replace />} />
            <Route path="/dashboard/labtwin/keo-co-app"              element={<Navigate to="/dashboard/games/keo-co" replace />} />
            <Route path="/dashboard/labtwin/quiz-tug-of-war"         element={<Navigate to="/dashboard/games/keo-co" replace />} />
            <Route path="/dashboard/labtwin/roll-call-wheel"         element={<Navigate to="/dashboard/games/roll-call-wheel" replace />} />
            <Route path="/dashboard/labtwin/gesture-swarm"           element={<Navigate to="/dashboard/games/gesture-swarm" replace />} />
            <Route path="/dashboard/labtwin/assembly-sim"            element={<Navigate to="/dashboard/games/assembly-sim" replace />} />
            {/* ── Pure science labs (vẫn ở labtwin) ── */}
            <Route path="/dashboard/labtwin/physics-motion"          element={<PhysicsMotion />} />
            <Route path="/dashboard/labtwin/fluid-dynamics-2d"       element={<FluidDynamicsLab />} />
            <Route path="/dashboard/labtwin/spring-pendulum"         element={<SpringPendulum />} />
            <Route path="/dashboard/labtwin/simple-pendulum"         element={<SimplePendulum />} />
            <Route path="/dashboard/labtwin/optics-lab"              element={<OpticsLab />} />
            <Route path="/dashboard/labtwin/wave-interference"       element={<WaveInterference />} />
            <Route path="/dashboard/labtwin/mechaforce"              element={<MechaForce />} />
            <Route path="/dashboard/labtwin/motionsim"               element={<MotionSim />} />
            <Route path="/dashboard/labtwin/motion-sim"              element={<MotionSim />} />
            <Route path="/dashboard/labtwin/physics-engine-2d"       element={<PhysicsEngine2D />} />
            <Route path="/dashboard/labtwin/momentum-collision"      element={<MomentumCollision />} />
            <Route path="/dashboard/labtwin/projectile"              element={<ProjectileMotion />} />
            <Route path="/dashboard/labtwin/projectile-motion"       element={<ProjectileMotion />} />
            <Route path="/dashboard/labtwin/circular-motion"         element={<CircularMotion />} />
            <Route path="/dashboard/labtwin/rotational-dynamics"     element={<RotationalDynamics />} />
            <Route path="/dashboard/labtwin/young-double-slit"       element={<YoungDoubleSlit />} />
            <Route path="/dashboard/labtwin/young"                   element={<YoungDoubleSlit />} />
            <Route path="/dashboard/labtwin/double-slit"             element={<YoungDoubleSlit />} />
            <Route path="/dashboard/labtwin/light-interference"      element={<YoungDoubleSlit />} />
            <Route path="/dashboard/labtwin/circular-motion-3d"      element={<CircularMotion3D />} />
            <Route path="/dashboard/labtwin/circular-3d"             element={<CircularMotion3D />} />
            <Route path="/dashboard/labtwin/helix"                   element={<CircularMotion3D />} />
            <Route path="/dashboard/labtwin/harmonic-motion"         element={<HarmonicMotion />} />
            <Route path="/dashboard/labtwin/shm"                     element={<HarmonicMotion />} />
            <Route path="/dashboard/labtwin/refraction"              element={<RefractionExplorer />} />
            <Route path="/dashboard/labtwin/snell"                   element={<RefractionExplorer />} />
            <Route path="/dashboard/labtwin/density-buoyancy"        element={<DensityBuoyancy />} />
            <Route path="/dashboard/labtwin/archimedes"              element={<DensityBuoyancy />} />
            <Route path="/dashboard/labtwin/floating-sinking"        element={<DensityBuoyancy />} />
            <Route path="/dashboard/labtwin/scratch-kids"            element={<ScratchKids />} />
            <Route path="/dashboard/labtwin/scratch"                 element={<ScratchKids />} />
            <Route path="/dashboard/labtwin/code-kids"               element={<ScratchKids />} />
            <Route path="/dashboard/labtwin/coding"                  element={<ScratchKids />} />
            <Route path="/dashboard/labtwin/cfd-flow"                element={<CFDFlow />} />
            <Route path="/dashboard/labtwin/cfd"                     element={<CFDFlow />} />
            <Route path="/dashboard/labtwin/lbm"                     element={<CFDFlow />} />
            <Route path="/dashboard/labtwin/karman"                  element={<CFDFlow />} />
            <Route path="/dashboard/labtwin/standing-waves"          element={<StandingWaves />} />
            <Route path="/dashboard/labtwin/standing-wave"           element={<StandingWaves />} />
            <Route path="/dashboard/labtwin/harmonics"               element={<StandingWaves />} />
            <Route path="/dashboard/labtwin/stem-diy"                element={<StemDIYLibrary />} />
            <Route path="/dashboard/labtwin/diy"                     element={<StemDIYLibrary />} />
            <Route path="/dashboard/labtwin/diy-library"             element={<StemDIYLibrary />} />
            <Route path="/dashboard/labtwin/tutorials"               element={<StemDIYLibrary />} />
            <Route path="/dashboard/labtwin/biogrowth"               element={<BioGrowth />} />
            <Route path="/dashboard/labtwin/bio-growth"              element={<BioGrowth />} />
            <Route path="/dashboard/labtwin/population"              element={<BioGrowth />} />
            <Route path="/dashboard/labtwin/thermal-gas"             element={<ThermalGas />} />
            <Route path="/dashboard/labtwin/gas-laws"                element={<ThermalGas />} />
            <Route path="/dashboard/labtwin/thermodynamics"          element={<ThermalGas />} />
            <Route path="/dashboard/labtwin/ideal-gas"               element={<ThermalGas />} />
            <Route path="/dashboard/labtwin/wfc-builder"             element={<WfcBuilder />} />
            <Route path="/dashboard/labtwin/wfc"                     element={<WfcBuilder />} />
            <Route path="/dashboard/labtwin/wave-function-collapse"  element={<WfcBuilder />} />
            {/* Wokwi sim → redirect đến Arduino emulator hiện có */}
            <Route path="/dashboard/labtwin/wokwi-sim"               element={<Navigate to="/dashboard/iot-lab/emulator" replace />} />
            <Route path="/dashboard/labtwin/wokwi"                   element={<Navigate to="/dashboard/iot-lab/emulator" replace />} />
            <Route path="/dashboard/labtwin/physics-dungeon"         element={<PhysicsDungeon />} />
            {/* Backward compat — old /labs/<slug> URLs redirect to new /<slug> */}
            <Route path="/dashboard/labtwin/:labSlug"            element={<LegacyLabSlugRedirect />} />
            {/* Tất cả labs khác → LabNextJsFallback (info card, no iframe) */}
            <Route path="/dashboard/labtwin/:labSlug"                element={<LabNextJsFallback />} />
            {/* Lab experiment pages */}
            <Route path="/dashboard/labtwin/experiment/*"   element={<PageFallback />} />
            {/* /dashboard/labtwin/labs registered ở trên (line ~345) trước :labSlug */}
            <Route path="/dashboard/labtwin/labs-simple"    element={<PageFallback />} />
            <Route path="/dashboard/labtwin/ml-training"    element={<PageFallback />} />
            <Route path="/dashboard/labtwin/simulations-simple" element={<PageFallback />} />
            <Route path="/dashboard/labtwin/video-tracking" element={<VideoTrackingLab />} />

            {/* ── COURSES ───────────────────────────────────── */}
            <Route path="/courses/:courseId"                              element={<CourseViewPage />} />
            <Route path="/courses/:courseId/chapters/:chapterId"          element={<ChapterViewPage />} />

            {/* ── LEARNING PATHS ────────────────────────────── */}
            <Route path="/learning-paths"                     element={<LearningPathsPage />} />
            <Route path="/learning-paths/recommended"         element={<LearningPathsRecommendedPage />} />
            <Route path="/learning-paths/lesson/:lessonId"    element={<LearningPathLessonPage />} />

            {/* ── SEARCH ────────────────────────────────────── */}
            <Route path="/search"          element={<PageFallback />} />
            <Route path="/search-disabled" element={<PageFallback />} />

            {/* ── AEROEDU ───────────────────────────────────── */}
            <Route path="/aeroedu" element={<PageFallback />} />

            {/* ── PROFILE (all roles) ───────────────────────── */}
            <Route path="/profile/basic-information" element={<ProfileBasicInfoPage />} />
            <Route path="/profile/photo"             element={<ProfilePhotoPage />} />
            <Route path="/profile/customize"         element={<CustomizeProfilePage />} />
            <Route path="/profile/career-survey"     element={<CareerSurveyPage />} />
            <Route path="/profile/security"          element={<SecurityPage />} />
            <Route path="/profile"                   element={<Navigate to="/profile/basic-information" replace />} />
            {/* Trang cá nhân công khai (decorate-able) */}
            <Route path="/u/:userId"                 element={<PublicProfilePage />} />

            {/* ── COURSE PLAYER (full-screen) ───────────────── */}
            <Route path="/learning/course/:slug/:courseId" element={<CoursePlayerPage />} />
            {/* Legacy redirects */}
            <Route path="/learning/my-courses"         element={<Navigate to="/student/my-courses" replace />} />
            <Route path="/learning/wishlist"           element={<Navigate to="/student/wishlist" replace />} />
            <Route path="/learning/my-purchase-history" element={<Navigate to="/student/purchase-history" replace />} />

            {/* ══════════════════════════════════════════════
                STUDENT ROUTES
            ══════════════════════════════════════════════ */}
            <Route element={<RoleGuard roles={['STUDENT', 'TEACHER', 'ADMIN']} />}>
              {/* Đã port */}
              <Route path="/student/dashboard"         element={<StudentDashboardPage />} />
              <Route path="/student/progress"          element={<StudentProgressPage />} />
              <Route path="/student/schedule"          element={<StudentSchedulePage />} />
              <Route path="/student/my-courses"        element={<StudentMyCoursesPage />} />
              <Route path="/student/teachers"          element={<StudentMyTeachersPage />} />
              <Route path="/student/purchase-history"  element={<StudentPurchaseHistoryPage />} />
              <Route path="/student/wishlist"          element={<StudentWishlistPage />} />
              <Route path="/student/certificate/:courseId" element={<StudentCertificatePage />} />

              {/* Đã port */}
              <Route path="/student/agent-settings"           element={<StudentAgentSettingsPage />} />
              <Route path="/student/ai-tutor"                 element={<StudentAiTutorPage />} />
              <Route path="/student/career"                   element={<StudentCareerPage />} />
              <Route path="/student/exam-prep"                element={<StudentExamPrepPage />} />
              <Route path="/student/exam/:examId"             element={<ExamModesPage />} />
              <Route path="/student/exams"                    element={<StudentExamsPage />} />
              <Route path="/student/self-study"               element={<StudentSelfStudyPage />} />
              <Route path="/student/kids-progress"            element={<StudentKidsProgressPage />} />
              <Route path="/student/stem-projects"            element={<StudentStemProjects />} />
              <Route path="/student/stem-projects/:id"        element={<StudentStemProjects />} />
              <Route path="/student/for-you"                  element={<ForYouPage />} />
              <Route path="/student/daily"                    element={<StudentDailyPage />} />
              <Route path="/student/english"                  element={<EnglishLearnPage />} />
              <Route path="/student/english/flashcards"       element={<EnglishFlashcardsPage />} />
              <Route path="/student/english/:lessonId"        element={<EnglishLessonPage />} />
              <Route path="/student/games"                    element={<CareerGamesPage />} />
              <Route path="/student/career-world"             element={<CareerWorldOdysseyPage />} />
              <Route path="/student/video-transcript/history" element={<StudentVideoTranscriptHistoryPage />} />
              <Route path="/student/video-transcript"         element={<StudentVideoTranscriptPage />} />
            </Route>

            {/* ══════════════════════════════════════════════
                TEACHER ROUTES
            ══════════════════════════════════════════════ */}
            <Route element={<RoleGuard roles={['TEACHER', 'ADMIN']} />}>
              {/* Đã port */}
              <Route path="/teacher/dashboard"              element={<TeacherDashboard />} />
              <Route path="/teacher/stem-projects"          element={<TeacherStemProjects />} />
              <Route path="/teacher/stem-projects/:id"      element={<TeacherStemProjectDetail />} />{/* Tabs: tasks/logs/feedback/milestones */}
              <Route path="/teacher/sprint"                 element={<TeacherSprintPage />} />
              <Route path="/teacher/news/create"            element={<TeacherNewsComposePage />} />
              <Route path="/teacher/news"                   element={<TeacherNewsComposePage />} />
              <Route path="/teacher/my-courses"             element={<TeacherMyCoursesPage />} />
              <Route path="/teacher/way-arena"              element={<TeacherWayArena />} />
              <Route path="/teacher/way-arena/:code"        element={<TeacherWayArena />} />
              <Route path="/teacher/course/create"          element={<TeacherCourseEditorPage />} />
              <Route path="/teacher/course/:courseId/edit"  element={<TeacherCourseEditorPage />} />
              <Route path="/teacher/course/:courseId/videos" element={<TeacherCourseVideosPage />} />
              <Route path="/teacher/course/:courseId/assets" element={<TeacherCourseAssetsPage />} />
              <Route path="/teacher/exam-matrix"            element={<ExamMatrixPage />} />
              <Route path="/teacher/question-bank"          element={<QuestionBankPage />} />
              <Route path="/teacher/exams"                  element={<ExamsPage />} />
              <Route path="/teacher/online-exam-room"       element={<OnlineExamRoomPage />} />
              <Route path="/teacher/exam-grading"           element={<ExamGradingPage />} />
              <Route path="/teacher/transcript"             element={<TranscriptPage />} />
              <Route path="/teacher/create-module"          element={<CreateModulePage />} />
              <Route path="/teacher/latex-documents"        element={<LaTeXEditorPage />} />

              {/* Chưa port → PageFallback (specific trước, wildcard sau) */}
              <Route path="/teacher/agents"                        element={<AgentsPage />} />
              <Route path="/teacher/ai-dashboard"                  element={<AiDashboardPage />} />
              <Route path="/teacher/analytics"                     element={<TeacherAnalyticsPage />} />
              <Route path="/teacher/assignments"                   element={<TeacherAssignmentsPage />} />
              <Route path="/teacher/calendar"                      element={<TeacherCalendarPage />} />
              <Route path="/teacher/camera-management"             element={<CameraManagementPage />} />
              <Route path="/teacher/classes"                       element={<TeacherClassesPage />} />
              <Route path="/teacher/classes/:id"                   element={<ClassDetailPage />} />
              <Route path="/teacher/student-requests"              element={<TeacherStudentRequestsPage />} />
              <Route path="/teacher/gradebook"                     element={<GradeBookPage />} />
              <Route path="/teacher/document-digitization"         element={<DocumentDigitizationPage />} />
              <Route path="/teacher/document-digitization/:id/review" element={<DocumentDigitizationReviewPage />} />
              <Route path="/teacher/emotion-map"                   element={<EmotionMapPage />} />
              <Route path="/teacher/environment-monitoring"        element={<EnvironmentMonitoringPage />} />
              <Route path="/teacher/exam-edit/:examId/:questionId" element={<PageFallback />} />
              <Route path="/teacher/exam-generator"                element={<Navigate to="/teacher/taodethi" replace />} />
              <Route path="/teacher/exam-matrix/create"            element={<ExamMatrixCreatePage />} />
              <Route path="/teacher/exam-matrix/:id"               element={<ExamMatrixDetailPage />} />
              <Route path="/teacher/exam-matrix/:id/edit"          element={<ExamMatrixCreatePage />} />
              <Route path="/teacher/exam-matrix/:id/review"        element={<ExamMatrixCreatePage />} />
              <Route path="/teacher/exam-preview/:examId"          element={<PageFallback />} />
              <Route path="/teacher/exam-reports"                  element={<ExamReportsPage />} />
              <Route path="/teacher/exams/create"                  element={<CreateExamPage />} />
              <Route path="/teacher/taodethi"                      element={<WaygroundCreatePage />} />
              <Route path="/teacher/taodethi/create"                element={<WaygroundCreatePage />} />
              {/* Legacy redirects — link cũ vẫn dùng được */}
              <Route path="/teacher/wayground"                     element={<Navigate to="/teacher/taodethi" replace />} />
              <Route path="/teacher/wayground/create"               element={<Navigate to="/teacher/taodethi" replace />} />
              <Route path="/teacher/exams/:id"                     element={<ExamDetailPage />} />
              <Route path="/teacher/exams/:id/edit"                element={<ExamDetailPage />} />
              <Route path="/teacher/exams/:id/play"                element={<ExamHostPage />} />
              <Route path="/teacher/grading"                       element={<PageFallback />} />
              <Route path="/teacher/interaction-center"            element={<InteractionCenterPage />} />
              <Route path="/teacher/latex-documents/:id"           element={<LaTeXEditorDocumentPage />} />
              <Route path="/teacher/learning-path-builder"         element={<LearningPathBuilderPage />} />
              <Route path="/teacher/lesson-plans"                  element={<LessonPlansPage />} />
              <Route path="/teacher/lesson-plans/:id"              element={<LessonPlanEditorPage />} />
              <Route path="/teacher/meeting-notes"                 element={<MeetingNotesPage />} />
              <Route path="/teacher/meeting-notes/history"         element={<PageFallback />} />
              <Route path="/teacher/multi-disciplinary-paths"      element={<PageFallback />} />
              <Route path="/teacher/online-exam-room/:id/take"     element={<PageFallback />} />
              <Route path="/teacher/question-bank/add"             element={<PageFallback />} />
              <Route path="/teacher/question-bank/create"          element={<PageFallback />} />
              <Route path="/teacher/question-bank/edit/:id"        element={<PageFallback />} />
              <Route path="/teacher/question-bank/list"            element={<PageFallback />} />
              <Route path="/teacher/student/:studentId"            element={<StudentInsightPage />} />
              <Route path="/teacher/scrumboard"                    element={<TeacherScrumboardPage />} />
              <Route path="/teacher/knowledge-graph"              element={<ProfessionalKGPage />} />
              <Route path="/teacher/api-keys"                     element={<ApiKeysPage />} />
              <Route path="/teacher/system-flow"                   element={<PageFallback />} />
              <Route path="/teacher/transcript/library"            element={<PageFallback />} />
              <Route path="/teacher/transcript/recording"          element={<TranscriptRecordingPage />} />
              <Route path="/teacher/transcript/upload"             element={<PageFallback />} />
              <Route path="/teacher/vision/object-detection"       element={<PageFallback />} />
            </Route>

            {/* ══════════════════════════════════════════════
                ADMIN ROUTES
            ══════════════════════════════════════════════ */}
            <Route element={<RoleGuard roles={['ADMIN']} />}>
              <Route path="/admin"         element={<Navigate to="/admin/overview" replace />} />
              {/* Đã port */}
              <Route path="/admin/overview"            element={<AdminOverview />} />
              <Route path="/admin/news/review"         element={<AdminNewsReviewPage />} />
              <Route path="/admin/users"               element={<AdminUsersPage />} />
              <Route path="/admin/students"            element={<AdminStudents />} />
              <Route path="/admin/teachers"            element={<AdminTeachers />} />
              <Route path="/admin/camera-management"   element={<AdminCameraManagement />} />
              <Route path="/admin/iot-management"      element={<AdminIoTManagement />} />
              <Route path="/admin/models"              element={<AdminModels />} />
              <Route path="/admin/settings"            element={<AdminSettings />} />
              <Route path="/admin/payments"            element={<AdminPaymentsPage />} />

              {/* Chưa port → PageFallback */}
              <Route path="/admin/agents"              element={<PageFallback />} />
              <Route path="/admin/agents/chat"         element={<PageFallback />} />
              <Route path="/admin/alerts"              element={<PageFallback />} />
              <Route path="/admin/at-risk"             element={<AdminAtRiskPage />} />
              <Route path="/admin/content"             element={<AdminContentPage />} />
              <Route path="/admin/english-editor"      element={<AdminEnglishEditorPage />} />
              <Route path="/admin/emotion"             element={<AdminEmotionPage />} />
              <Route path="/admin/operations"          element={<AdminOperationsPage />} />
              <Route path="/admin/categories"          element={<AdminCategoriesPage />} />
              <Route path="/admin/analytics"           element={<AdminAnalyticsPage />} />
              <Route path="/admin/insights"            element={<AdminInsightsPage />} />
              <Route path="/admin/scrumboard"          element={<AdminScrumboardPage />} />
              <Route path="/admin/rs-experiments"      element={<AdminRsExperimentsPage />} />
              <Route path="/admin/knowledge-graph"     element={<ProfessionalKGPage />} />
              <Route path="/admin/api-keys"            element={<ApiKeysPage />} />
            </Route>

          </Route>{/* /DashboardLayout */}
        </Route>{/* /ProtectedRoute */}

        {/* ══════════════════════════════════════════════════
            MISC / DEBUG / TOOLS (không cần layout)
        ══════════════════════════════════════════════════ */}
        <Route path="/blocking"       element={<PageFallback />} />
        <Route path="/clear-session"  element={<PageFallback />} />
        <Route path="/debug-auth"     element={<PageFallback />} />
        <Route path="/grading-system" element={<PageFallback />} />
        <Route path="/hand-tracking"  element={<PageFallback />} />
        <Route path="/labtwin-circuit" element={<PageFallback />} />
        <Route path="/streaming"      element={<PageFallback />} />
        <Route path="/test-r3f"       element={<PageFallback />} />
        <Route path="/competition"    element={<PageFallback />} />

        {/* ── 404 fallback ─────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />

        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  )
}
