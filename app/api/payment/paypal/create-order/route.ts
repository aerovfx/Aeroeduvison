/**
 * POST /api/payment/paypal/create-order
 *
 * Creates a PayPal order and returns the approval URL.
 * Body: { plan: "STUDENT_PRO" | "TEACHER_PRO" | "SCHOOL", billingCycle: "monthly" | "yearly" }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateOrderId } from "@/lib/payment";
import { createPayPalOrder, PLAN_PRICES_USD } from "@/lib/paypal";
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

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json(
      { error: "Gói không hợp lệ." },
      { status: 400 }
    );
  }

  const prices = PLAN_PRICES_USD[plan];
  if (!prices) {
    return NextResponse.json({ error: "Giá chưa cấu hình" }, { status: 500 });
  }

  const amount = billingCycle === "yearly" ? prices.yearly : prices.monthly;
  const planName = PLAN_CONFIGS[plan]?.name ?? plan;
  const orderId = generateOrderId(plan, session.user.id);

  // Create payment record
  await db.payment.create({
    data: {
      orderId,
      userId: session.user.id,
      gateway: "paypal",
      method: "PAYPAL",
      amount: Math.round(amount * 100), // Store in cents for USD
      currency: "USD",
      status: "pending",
      plan,
      billingCycle,
    },
  });

  try {
    const { paypalOrderId, approvalUrl } = await createPayPalOrder({
      orderId,
      amount,
      description: `AeroEdu ${planName} - ${billingCycle === "yearly" ? "Yearly" : "Monthly"}`,
      plan,
      billingCycle,
      userId: session.user.id,
    });

    // Save PayPal order ID to payment
    await db.payment.update({
      where: { orderId },
      data: { gatewayRef: paypalOrderId },
    });

    return NextResponse.json({
      paypalOrderId,
      approvalUrl,
      orderId,
    });
  } catch (error) {
    console.error("[PAYPAL] Create order error:", error);
    await db.payment.update({
      where: { orderId },
      data: { status: "failed" },
    });

    return NextResponse.json(
      { error: "Không thể tạo đơn hàng PayPal. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
