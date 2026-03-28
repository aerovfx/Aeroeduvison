/**
 * POST /api/payment/paypal/capture-order
 *
 * Captures (finalizes) a PayPal order after user approval.
 * Called by frontend after PayPal redirect back.
 *
 * Body: { paypalOrderId: string, orderId: string }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { capturePayPalOrder } from "@/lib/paypal";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { paypalOrderId, orderId } = await req.json();

  if (!paypalOrderId || !orderId) {
    return NextResponse.json(
      { error: "paypalOrderId and orderId required" },
      { status: 400 }
    );
  }

  // Find the payment
  const payment = await db.payment.findUnique({ where: { orderId } });

  if (!payment || payment.userId !== session.user.id) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.status === "completed") {
    return NextResponse.json({ status: "already_captured" });
  }

  try {
    const capture = await capturePayPalOrder(paypalOrderId);

    if (capture.status !== "COMPLETED") {
      await db.payment.update({
        where: { orderId },
        data: {
          status: "failed",
          gatewayData: capture as any,
        },
      });
      return NextResponse.json(
        { error: "Payment not completed", paypalStatus: capture.status },
        { status: 400 }
      );
    }

    // ─── Activate subscription ────────────────────────────────────
    const now = new Date();
    const periodEnd = new Date(now);
    if (payment.billingCycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const subscription = await db.subscription.upsert({
      where: { userId: payment.userId },
      create: {
        userId: payment.userId,
        plan: payment.plan,
        status: "active",
        gateway: "paypal",
        billingCycle: payment.billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        plan: payment.plan,
        status: "active",
        gateway: "paypal",
        billingCycle: payment.billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    });

    // Update payment
    await db.payment.update({
      where: { orderId },
      data: {
        status: "completed",
        gatewayRef: capture.captureId,
        gatewayData: capture as any,
        paidAt: now,
        subscriptionId: subscription.id,
      },
    });

    console.log(
      `[PAYPAL] Subscription activated: user=${payment.userId} plan=${payment.plan} captureId=${capture.captureId}`
    );

    return NextResponse.json({
      status: "success",
      plan: payment.plan,
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error("[PAYPAL] Capture error:", error);
    return NextResponse.json(
      { error: "Không thể xác nhận thanh toán. Vui lòng liên hệ hỗ trợ." },
      { status: 500 }
    );
  }
}
