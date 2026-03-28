/**
 * GET /api/payment/status?orderId=SUB-xxx
 *
 * Check payment status for a specific order.
 * Used by frontend to poll after redirect from SePay.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId");

  if (orderId) {
    // Check specific order
    const payment = await db.payment.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        status: true,
        plan: true,
        billingCycle: true,
        amount: true,
        paidAt: true,
        createdAt: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(payment);
  }

  // Return latest payment + subscription for current user
  const [subscription, latestPayment] = await Promise.all([
    db.subscription.findUnique({
      where: { userId: session.user.id },
      select: {
        plan: true,
        status: true,
        gateway: true,
        billingCycle: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    }),
    db.payment.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        orderId: true,
        status: true,
        plan: true,
        amount: true,
        paidAt: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    subscription: subscription ?? { plan: "FREE", status: "active" },
    latestPayment,
  });
}
