/**
 * POST /api/payment/webhook
 *
 * SePay IPN (Instant Payment Notification) endpoint.
 * Receives payment status updates from SePay and activates subscriptions.
 *
 * SePay sends JSON body with transaction details.
 * Configure this URL in SePay dashboard: https://my.sepay.vn/pg/ipn
 *
 * IPN payload (typical):
 * {
 *   "gateway": "sepay",
 *   "transactionDate": "2025-01-15 10:30:00",
 *   "accountNumber": "...",
 *   "transferType": "in",
 *   "transferAmount": 49000,
 *   "content": "SUB-STUDENT_PRO-abc123-...",
 *   "referenceCode": "FT25001...",
 *   "code": "00",   // "00" = success
 *   "desc": "success",
 *   "id": 12345
 * }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SubscriptionPlan } from "@/lib/ai-permissions";

export async function POST(req: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[SEPAY_IPN] Received:", JSON.stringify(payload));

  // Extract order ID from transfer content
  // SePay puts the order_invoice_number in the `content` field
  const content = (payload.content as string) || "";
  const transferAmount = Number(payload.transferAmount) || 0;
  const code = (payload.code as string) || "";
  const referenceCode = (payload.referenceCode as string) || "";

  // Find the order ID in content — format: SUB-PLAN-USERID-TIMESTAMP
  const orderIdMatch = content.match(/SUB-[A-Z_]+-[A-Z0-9]+-[A-Z0-9]+/i);
  const orderId = orderIdMatch?.[0];

  if (!orderId) {
    console.warn("[SEPAY_IPN] No valid orderId found in content:", content);
    // Return 200 to acknowledge — SePay doesn't retry on 200
    return NextResponse.json({ status: "ignored", reason: "no_order_id" });
  }

  // Look up payment
  const payment = await db.payment.findUnique({
    where: { orderId },
  });

  if (!payment) {
    console.warn("[SEPAY_IPN] Payment not found for orderId:", orderId);
    return NextResponse.json({ status: "ignored", reason: "payment_not_found" });
  }

  // Already processed?
  if (payment.status === "completed") {
    return NextResponse.json({ status: "already_processed" });
  }

  // Check if payment is successful
  const isSuccess = code === "00" && transferAmount >= payment.amount;

  if (!isSuccess) {
    // Mark as failed
    await db.payment.update({
      where: { orderId },
      data: {
        status: "failed",
        gatewayRef: referenceCode,
        gatewayData: payload,
      },
    });

    console.log(`[SEPAY_IPN] Payment failed for ${orderId}: code=${code} amount=${transferAmount}`);
    return NextResponse.json({ status: "payment_failed" });
  }

  // ─── Payment Success → Activate Subscription ─────────────────────

  const now = new Date();
  const periodEnd = new Date(now);
  if (payment.billingCycle === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Upsert subscription
  const subscription = await db.subscription.upsert({
    where: { userId: payment.userId },
    create: {
      userId: payment.userId,
      plan: payment.plan,
      status: "active",
      gateway: "sepay",
      billingCycle: payment.billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      plan: payment.plan,
      status: "active",
      gateway: "sepay",
      billingCycle: payment.billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
  });

  // Update payment record
  await db.payment.update({
    where: { orderId },
    data: {
      status: "completed",
      gatewayRef: referenceCode,
      gatewayData: payload,
      paidAt: now,
      subscriptionId: subscription.id,
    },
  });

  console.log(
    `[SEPAY_IPN] Subscription activated: user=${payment.userId} plan=${payment.plan} until=${periodEnd.toISOString()}`
  );

  return NextResponse.json({ status: "success" });
}
