import { db } from "@/lib/db"

export interface SubscriptionCheckResult {
  allowed: boolean
  plan: string
  message?: string
}

/**
 * Check if a user has an active paid subscription for AI features.
 * Both STUDENT and TEACHER must have a paid plan (STUDENT_PRO, TEACHER_PRO, or SCHOOL).
 * FREE plan does not include AI access.
 */
export async function checkAISubscription(userId: string): Promise<SubscriptionCheckResult> {
  // Bypass subscription check in development mode
  if (process.env.NODE_ENV === "development" || process.env.BYPASS_SUBSCRIPTION === "true") {
    return { allowed: true, plan: "DEV_MODE" }
  }

  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: {
      plan: true,
      status: true,
      currentPeriodEnd: true,
    },
  })

  // No subscription record at all
  if (!subscription) {
    return {
      allowed: false,
      plan: "FREE",
      message:
        "Bạn cần đăng ký gói hàng tháng để sử dụng tính năng AI. Vui lòng truy cập trang Đăng ký để chọn gói phù hợp.",
    }
  }

  // Free plan — not allowed for AI
  if (subscription.plan === "FREE") {
    return {
      allowed: false,
      plan: "FREE",
      message:
        "Gói miễn phí không bao gồm tính năng AI. Vui lòng nâng cấp lên gói STUDENT_PRO hoặc TEACHER_PRO để sử dụng.",
    }
  }

  // Check if subscription is active
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return {
      allowed: false,
      plan: subscription.plan,
      message: `Gói đăng ký của bạn (${subscription.plan}) hiện không hoạt động (${subscription.status}). Vui lòng gia hạn để tiếp tục sử dụng AI.`,
    }
  }

  // Check if subscription period has expired
  if (
    subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd) < new Date()
  ) {
    return {
      allowed: false,
      plan: subscription.plan,
      message:
        "Gói đăng ký của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng tính năng AI.",
    }
  }

  return { allowed: true, plan: subscription.plan }
}
