/**
 * GET /api/subscription/status
 * Returns the current user's subscription plan, features, and daily usage.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserPlan, getDailyUsageCount } from "@/lib/subscription";
import { PLAN_CONFIGS, type AiFeature } from "@/lib/ai-permissions";

const AI_FEATURES: AiFeature[] = [
  "ai_chat",
  "ai_question_bank",
  "ai_content_validation",
  "ai_vision",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getUserPlan(session.user.id);
  const config = PLAN_CONFIGS[plan];

  // Get daily usage for all features in parallel
  const usageCounts = await Promise.all(
    AI_FEATURES.map(async (feature) => ({
      feature,
      dailyUsed: await getDailyUsageCount(session.user.id, feature),
      ...config.features[feature],
    }))
  );

  return NextResponse.json({
    plan,
    planName: config.name,
    features: usageCounts,
    role: session.user.role,
  });
}
