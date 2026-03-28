/**
 * AI Feature Permissions — Subscription-based access control
 *
 * Defines which AI features are available for each subscription plan,
 * daily usage limits, and role-specific overrides.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type SubscriptionPlan = "FREE" | "STUDENT_PRO" | "TEACHER_PRO" | "SCHOOL";

export type AiFeature =
  | "ai_chat"
  | "ai_question_bank"
  | "ai_content_validation"
  | "ai_vision";

export interface FeatureLimit {
  enabled: boolean;
  dailyLimit: number;      // -1 = unlimited
  description: string;
  label: string;
}

export interface PlanConfig {
  name: string;
  features: Record<AiFeature, FeatureLimit>;
}

// ─── Plan Definitions ───────────────────────────────────────────────

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  FREE: {
    name: "Miễn phí",
    features: {
      ai_chat: {
        enabled: true,
        dailyLimit: 5,
        label: "AI Trợ giảng",
        description: "Chat AI hỗ trợ học tập — 5 tin nhắn/ngày",
      },
      ai_question_bank: {
        enabled: false,
        dailyLimit: 0,
        label: "Ngân hàng đề AI",
        description: "Tạo đề thi tự động bằng AI",
      },
      ai_content_validation: {
        enabled: false,
        dailyLimit: 0,
        label: "Kiểm duyệt nội dung AI",
        description: "Kiểm tra và đánh giá nội dung bài học",
      },
      ai_vision: {
        enabled: false,
        dailyLimit: 0,
        label: "AI Vision / Lab",
        description: "Nhận diện hình ảnh, camera, thí nghiệm ảo",
      },
    },
  },

  STUDENT_PRO: {
    name: "Học sinh Pro",
    features: {
      ai_chat: {
        enabled: true,
        dailyLimit: 50,
        label: "AI Trợ giảng",
        description: "Chat AI hỗ trợ học tập — 50 tin nhắn/ngày",
      },
      ai_question_bank: {
        enabled: true,
        dailyLimit: 10,
        label: "Ngân hàng đề AI",
        description: "Tạo đề luyện tập — 10 đề/ngày",
      },
      ai_content_validation: {
        enabled: false,
        dailyLimit: 0,
        label: "Kiểm duyệt nội dung AI",
        description: "Chỉ dành cho giáo viên",
      },
      ai_vision: {
        enabled: true,
        dailyLimit: 20,
        label: "AI Vision / Lab",
        description: "Thí nghiệm ảo và nhận diện — 20 lần/ngày",
      },
    },
  },

  TEACHER_PRO: {
    name: "Giáo viên Pro",
    features: {
      ai_chat: {
        enabled: true,
        dailyLimit: -1,
        label: "AI Trợ giảng",
        description: "Chat AI không giới hạn",
      },
      ai_question_bank: {
        enabled: true,
        dailyLimit: -1,
        label: "Ngân hàng đề AI",
        description: "Tạo đề thi tự động không giới hạn",
      },
      ai_content_validation: {
        enabled: true,
        dailyLimit: -1,
        label: "Kiểm duyệt nội dung AI",
        description: "Kiểm tra bài học không giới hạn",
      },
      ai_vision: {
        enabled: true,
        dailyLimit: -1,
        label: "AI Vision / Lab",
        description: "Thí nghiệm ảo không giới hạn",
      },
    },
  },

  SCHOOL: {
    name: "Trường học",
    features: {
      ai_chat: {
        enabled: true,
        dailyLimit: -1,
        label: "AI Trợ giảng",
        description: "Chat AI không giới hạn cho toàn trường",
      },
      ai_question_bank: {
        enabled: true,
        dailyLimit: -1,
        label: "Ngân hàng đề AI",
        description: "Tạo đề thi không giới hạn cho toàn trường",
      },
      ai_content_validation: {
        enabled: true,
        dailyLimit: -1,
        label: "Kiểm duyệt nội dung AI",
        description: "Kiểm tra bài học không giới hạn",
      },
      ai_vision: {
        enabled: true,
        dailyLimit: -1,
        label: "AI Vision / Lab",
        description: "Thí nghiệm ảo không giới hạn cho toàn trường",
      },
    },
  },
};

// ─── Route → Feature Mapping ────────────────────────────────────────

/** Maps API route prefixes to their AI feature key */
export const ROUTE_FEATURE_MAP: Record<string, AiFeature> = {
  "/api/ai-chat": "ai_chat",
  "/api/ai-tutor-chat": "ai_chat",
  "/api/ai-intelligent": "ai_chat",
  "/api/ai-generate-lesson": "ai_chat",
  "/api/ai-grade-lesson": "ai_chat",
  "/api/question-bank": "ai_question_bank",
  "/api/ai-content": "ai_content_validation",
  "/api/ai-analytics": "ai_content_validation",
  "/api/vision": "ai_vision",
  "/api/emotion-capture": "ai_vision",
  "/api/lab": "ai_vision",
  "/api/stem": "ai_vision",
};

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Get the AI feature key for a given API route path.
 * Returns undefined if the route is not an AI-gated route.
 */
export function getFeatureForRoute(pathname: string): AiFeature | undefined {
  for (const [prefix, feature] of Object.entries(ROUTE_FEATURE_MAP)) {
    if (pathname.startsWith(prefix)) {
      return feature;
    }
  }
  return undefined;
}

/**
 * Check if a plan allows access to a specific AI feature.
 */
export function canAccessFeature(
  plan: SubscriptionPlan,
  feature: AiFeature
): boolean {
  return PLAN_CONFIGS[plan]?.features[feature]?.enabled ?? false;
}

/**
 * Get the daily usage limit for a feature on a given plan.
 * Returns -1 for unlimited, 0 for disabled.
 */
export function getDailyLimit(
  plan: SubscriptionPlan,
  feature: AiFeature
): number {
  return PLAN_CONFIGS[plan]?.features[feature]?.dailyLimit ?? 0;
}

// ─── Pricing Data (for /pricing page) ───────────────────────────────

export const PRICING_PLANS = [
  {
    id: "FREE" as SubscriptionPlan,
    name: "Miễn phí",
    description: "Bắt đầu học với AI cơ bản",
    monthlyPrice: 0,
    yearlyPrice: 0,
    targetRole: "STUDENT" as const,
    badge: null,
    features: [
      "AI Trợ giảng — 5 tin nhắn/ngày",
      "Truy cập bài giảng cơ bản",
      "Theo dõi tiến độ học tập",
    ],
    limitations: [
      "Không có ngân hàng đề AI",
      "Không có kiểm duyệt nội dung",
      "Không có thí nghiệm ảo",
    ],
  },
  {
    id: "STUDENT_PRO" as SubscriptionPlan,
    name: "Học sinh Pro",
    description: "Học tập hiệu quả với AI đầy đủ",
    monthlyPrice: 49000,
    yearlyPrice: 490000,
    targetRole: "STUDENT" as const,
    badge: "Phổ biến",
    features: [
      "AI Trợ giảng — 50 tin nhắn/ngày",
      "Ngân hàng đề AI — 10 đề/ngày",
      "Thí nghiệm ảo AI Vision — 20 lần/ngày",
      "Phân tích kết quả chi tiết",
      "Lộ trình học tập cá nhân hóa",
    ],
    limitations: [],
  },
  {
    id: "TEACHER_PRO" as SubscriptionPlan,
    name: "Giáo viên Pro",
    description: "Công cụ AI toàn diện cho giáo viên",
    monthlyPrice: 199000,
    yearlyPrice: 1990000,
    targetRole: "TEACHER" as const,
    badge: "Dành cho GV",
    features: [
      "AI Trợ giảng — không giới hạn",
      "Ngân hàng đề AI — không giới hạn",
      "Kiểm duyệt nội dung AI — không giới hạn",
      "Thí nghiệm ảo AI Vision — không giới hạn",
      "Quản lý lớp học nâng cao",
      "Báo cáo & phân tích AI",
    ],
    limitations: [],
  },
  {
    id: "SCHOOL" as SubscriptionPlan,
    name: "Trường học",
    description: "Giải pháp toàn diện cho trường học",
    monthlyPrice: 2990000,
    yearlyPrice: 29900000,
    targetRole: "TEACHER" as const,
    badge: "Enterprise",
    features: [
      "Tất cả tính năng Giáo viên Pro",
      "Tài khoản không giới hạn cho GV & HS",
      "Quản lý toàn trường",
      "API tích hợp LMS",
      "Hỗ trợ kỹ thuật ưu tiên",
    ],
    limitations: [],
  },
];
