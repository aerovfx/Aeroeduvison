/**
 * POST /api/subscription/checkout
 * Creates a Stripe Checkout session for a subscription plan.
 *
 * Body: { plan: "STUDENT_PRO" | "TEACHER_PRO" | "SCHOOL", billingCycle: "monthly" | "yearly" }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import type { SubscriptionPlan } from "@/lib/ai-permissions";

// Stripe Price IDs — set these in environment variables
const STRIPE_PRICES: Record<string, { monthly: string; yearly: string }> = {
  STUDENT_PRO: {
    monthly: process.env.STRIPE_PRICE_STUDENT_PRO_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_STUDENT_PRO_YEARLY || "",
  },
  TEACHER_PRO: {
    monthly: process.env.STRIPE_PRICE_TEACHER_PRO_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_TEACHER_PRO_YEARLY || "",
  },
  SCHOOL: {
    monthly: process.env.STRIPE_PRICE_SCHOOL_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_SCHOOL_YEARLY || "",
  },
};

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

  // Validate plan
  if (!["STUDENT_PRO", "TEACHER_PRO", "SCHOOL"].includes(plan)) {
    return NextResponse.json(
      { error: "Invalid plan. Choose STUDENT_PRO, TEACHER_PRO, or SCHOOL." },
      { status: 400 }
    );
  }

  // Get or create Stripe customer
  let stripeCustomer = await db.stripeCustomer.findUnique({
    where: { userId: session.user.id },
  });

  if (!stripeCustomer) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      name: session.user.name ?? undefined,
      metadata: { userId: session.user.id },
    });

    stripeCustomer = await db.stripeCustomer.create({
      data: {
        id: customer.id,
        userId: session.user.id,
        stripeCustomerId: customer.id,
        updatedAt: new Date(),
      },
    });
  }

  const priceId = STRIPE_PRICES[plan]?.[billingCycle];
  if (!priceId) {
    return NextResponse.json(
      { error: `Price not configured for ${plan} / ${billingCycle}. Please set STRIPE_PRICE_* env vars.` },
      { status: 500 }
    );
  }

  // Create Stripe Checkout Session
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomer.stripeCustomerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/pricing?success=true&plan=${plan}`,
    cancel_url: `${baseUrl}/pricing?canceled=true`,
    metadata: {
      userId: session.user.id,
      plan,
      billingCycle,
    },
    subscription_data: {
      metadata: {
        userId: session.user.id,
        plan,
      },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
