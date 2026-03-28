/**
 * withAiAccess — API route wrapper that enforces subscription-based AI access.
 *
 * Usage in any AI API route:
 *
 *   import { withAiAccess } from "@/lib/with-ai-access";
 *
 *   export async function POST(req: Request) {
 *     return withAiAccess(req, "ai_chat", async (userId, plan) => {
 *       // ... your route logic
 *       return NextResponse.json({ result: "..." });
 *     });
 *   }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAiAccess, logAiUsage } from "@/lib/subscription";
import type { AiFeature, SubscriptionPlan } from "@/lib/ai-permissions";

type AiRouteHandler = (
  userId: string,
  plan: SubscriptionPlan
) => Promise<NextResponse>;

/**
 * Wraps an AI API route handler with authentication + subscription checks.
 *
 * 1. Verifies user is authenticated
 * 2. Checks subscription plan allows the AI feature
 * 3. Checks daily usage quota
 * 4. Logs usage after successful execution
 * 5. Returns 403 with upgrade info if blocked
 */
export async function withAiAccess(
  req: Request,
  feature: AiFeature,
  handler: AiRouteHandler,
  options?: { action?: string; skipLog?: boolean }
): Promise<NextResponse> {
  // 1. Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Vui lòng đăng nhập" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  // 2. Subscription + quota check
  const access = await checkAiAccess(userId, feature);

  if (!access.allowed) {
    return NextResponse.json(
      {
        error: "SubscriptionRequired",
        message: access.reason,
        plan: access.plan,
        feature: access.feature,
        dailyUsed: access.dailyUsed,
        dailyLimit: access.dailyLimit,
        upgradeUrl: access.upgradeUrl,
      },
      { status: 403 }
    );
  }

  // 3. Execute the actual handler
  const response = await handler(userId, access.plan);

  // 4. Log usage (non-blocking, fire-and-forget)
  if (!options?.skipLog) {
    logAiUsage(userId, feature, options?.action ?? feature).catch((err) =>
      console.error("[AI_USAGE_LOG]", err)
    );
  }

  // 5. Add quota headers for client-side display
  if (access.dailyLimit && access.dailyLimit > 0) {
    response.headers.set("X-AI-Daily-Limit", String(access.dailyLimit));
    response.headers.set("X-AI-Daily-Used", String((access.dailyUsed ?? 0) + 1));
    response.headers.set("X-AI-Plan", access.plan);
  }

  return response;
}
