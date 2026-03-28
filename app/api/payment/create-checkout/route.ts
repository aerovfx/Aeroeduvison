/**
 * POST /api/payment/create-checkout
 *
 * Creates a SePay checkout session and returns the form data
 * needed to redirect the user to SePay's payment page.
 *
 * Body: { plan: "STUDENT_PRO" | "TEACHER_PRO" | "SCHOOL", billingCycle: "monthly" | "yearly" }
 *
 * Returns: { checkoutUrl, formFields, orderId }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createCheckout,
  generateOrderId,
  PLAN_PRICES_VND,
} from "@/lib/payment";
import { PLAN_CONFIGS, type SubscriptionPlan } from "@/lib/ai-permissions";

const VALID_PLANS = ["STUDENT_PRO", "TEACHER_PRO", "SCHOOL"];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { plan, billingCycle = "monthly" } = body as {
    plan: SubscriptionPlan;
    billingCycle: "monthly" | "yearly";
  };

  // Validate
  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json(
      { error: "Gói không hợp lệ. Chọn STUDENT_PRO, TEACHER_PRO, hoặc SCHOOL." },
      { status: 400 }
    );
  }

  const prices = PLAN_PRICES_VND[plan];
  if (!prices) {
    return NextResponse.json({ error: "Giá không được cấu hình" }, { status: 500 });
  }

  const amount = billingCycle === "yearly" ? prices.yearly : prices.monthly;
  const planName = PLAN_CONFIGS[plan]?.name ?? plan;
  const orderId = generateOrderId(plan, session.user.id);

  // Create payment record in DB (pending)
  await db.payment.create({
    data: {
      orderId,
      userId: session.user.id,
      gateway: "sepay",
      amount,
      currency: "VND",
      status: "pending",
      plan,
      billingCycle,
    },
  });

  // Build SePay checkout
  const { checkoutUrl, formFields } = createCheckout({
    orderId,
    amount,
    description: `AeroEdu ${planName} - ${billingCycle === "yearly" ? "Năm" : "Tháng"}`,
    userId: session.user.id,
    plan,
    billingCycle,
  });

  return NextResponse.json({
    checkoutUrl,
    formFields,
    orderId,
    amount,
    plan,
    billingCycle,
  });
}
