/**
 * Subscription service — checks user plan & enforces AI usage limits.
 * Used by API routes to gate AI features.
 */

import { db } from "@/lib/db";
import {
  type AiFeature,
  type SubscriptionPlan,
  canAccessFeature,
  getDailyLimit,
  getFeatureForRoute,
  PLAN_CONFIGS,
} from "@/lib/ai-permissions";

// ─── Types ──────────────────────────────────────────────────────────

export interface SubscriptionCheck {
  allowed: boolean;
  plan: SubscriptionPlan;
  feature: AiFeature;
  reason?: string;
  dailyUsed?: number;
  dailyLimit?: number;
  upgradeUrl?: string;
}

// ─── Core Functions ─────────────────────────────────────────────────

/**
 * Get the current subscription plan for a user.
 * Falls back to FREE if no subscription record exists.
 */
export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  try {
    const subscription = await db.subscription.findUnique({
      where: { userId },
      select: { plan: true, status: true },
    });

    if (!subscription || subscription.status !== "active") {
      return "FREE";
    }

    return subscription.plan as SubscriptionPlan;
  } catch {
    return "FREE";
  }
}

/**
 * Get full subscription details for a user.
 */
export async function getUserSubscription(userId: string) {
  return db.subscription.findUnique({
    where: { userId },
  });
}

/**
 * Count how many times a user has used a specific AI feature today.
 */
export async function getDailyUsageCount(
  userId: string,
  feature: AiFeature
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const result = await db.aiUsageLog.aggregate({
    where: {
      userId,
      feature,
      createdAt: { gte: startOfDay },
    },
    _sum: { count: true },
  });

  return result._sum.count ?? 0;
}

/**
 * Log an AI feature usage event.
 */
export async function logAiUsage(
  userId: string,
  feature: AiFeature,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.aiUsageLog.create({
    data: {
      userId,
      feature,
      action,
      metadata: metadata ?? undefined,
    },
  });
}

/**
 * Full subscription check for an AI feature.
 * Returns whether the user is allowed to use the feature,
 * with details about remaining quota.
 */
export async function checkAiAccess(
  userId: string,
  feature: AiFeature
): Promise<SubscriptionCheck> {
  const plan = await getUserPlan(userId);

  // Check if feature is enabled for this plan
  if (!canAccessFeature(plan, feature)) {
    const featureLabel = PLAN_CONFIGS[plan]?.features[feature]?.label ?? feature;
    return {
      allowed: false,
      plan,
      feature,
      reason: `Gói ${PLAN_CONFIGS[plan].name} không bao gồm ${featureLabel}. Vui lòng nâng cấp để sử dụng.`,
      upgradeUrl: "/pricing",
    };
  }

  // Check daily usage limit
  const limit = getDailyLimit(plan, feature);

  if (limit === -1) {
    // Unlimited
    return { allowed: true, plan, feature, dailyLimit: -1 };
  }

  const dailyUsed = await getDailyUsageCount(userId, feature);

  if (dailyUsed >= limit) {
    return {
      allowed: false,
      plan,
      feature,
      reason: `Bạn đã dùng hết ${limit} lượt ${PLAN_CONFIGS[plan].features[feature].label} hôm nay. Nâng cấp để có thêm.`,
      dailyUsed,
      dailyLimit: limit,
      upgradeUrl: "/pricing",
    };
  }

  return {
    allowed: true,
    plan,
    feature,
    dailyUsed,
    dailyLimit: limit,
  };
}

/**
 * Middleware-style check for API routes.
 * Pass the pathname and userId, returns the check result.
 */
export async function checkRouteAiAccess(
  pathname: string,
  userId: string
): Promise<SubscriptionCheck | null> {
  const feature = getFeatureForRoute(pathname);
  if (!feature) return null; // Not an AI-gated route

  return checkAiAccess(userId, feature);
}
