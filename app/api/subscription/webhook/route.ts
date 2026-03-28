/**
 * POST /api/subscription/webhook
 * Stripe webhook handler — updates subscription status in database.
 *
 * Events handled:
 * - checkout.session.completed → create subscription
 * - customer.subscription.updated → sync plan/status changes
 * - customer.subscription.deleted → mark canceled
 * - invoice.payment_failed → mark past_due
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[STRIPE_WEBHOOK] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const billingCycle = session.metadata?.billingCycle;

        if (!userId || !plan || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        await db.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan,
            status: "active",
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price.id,
            billingCycle: billingCycle ?? "monthly",
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
          update: {
            plan,
            status: "active",
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price.id,
            billingCycle: billingCycle ?? "monthly",
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: false,
          },
        });

        console.log(`[STRIPE_WEBHOOK] Subscription created for user ${userId}: ${plan}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) break;

        await db.subscription.update({
          where: { userId },
          data: {
            status: subscription.status === "active" ? "active" : subscription.status,
            stripePriceId: subscription.items.data[0]?.price.id,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });

        console.log(`[STRIPE_WEBHOOK] Subscription updated for user ${userId}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) break;

        await db.subscription.update({
          where: { userId },
          data: {
            status: "canceled",
            cancelAtPeriodEnd: false,
          },
        });

        console.log(`[STRIPE_WEBHOOK] Subscription canceled for user ${userId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const existingSub = await db.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
        });

        if (existingSub) {
          await db.subscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: "past_due" },
          });

          console.log(`[STRIPE_WEBHOOK] Payment failed for subscription ${subscriptionId}`);
        }
        break;
      }
    }
  } catch (err) {
    console.error("[STRIPE_WEBHOOK] Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
