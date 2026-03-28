/**
 * Payment Gateway — SePay integration for Vietnamese market.
 *
 * Wraps the SePay PG Node SDK for subscription checkout.
 * Config via environment variables:
 *   SEPAY_ENV=sandbox|production
 *   SEPAY_MERCHANT_ID=YOUR_MERCHANT_ID
 *   SEPAY_SECRET_KEY=YOUR_MERCHANT_SECRET_KEY
 *   NEXT_PUBLIC_APP_URL=https://your-domain.com
 *
 * Usage:
 *   import { sepay, createCheckout } from "@/lib/payment";
 */

import { SePayPgClient } from "@/lib/sepay-stub";

// ─── SePay Client Singleton ─────────────────────────────────────────

const globalForSePay = globalThis as unknown as { sepay: SePayPgClient };

export const sepay =
  globalForSePay.sepay ??
  new SePayPgClient({
    env: (process.env.SEPAY_ENV as "sandbox" | "production") || "sandbox",
    merchant_id: process.env.SEPAY_MERCHANT_ID || "",
    secret_key: process.env.SEPAY_SECRET_KEY || "",
  });

if (process.env.NODE_ENV !== "production") {
  globalForSePay.sepay = sepay;
}

// ─── Types ──────────────────────────────────────────────────────────

export type PaymentMethod = "BANK_TRANSFER" | "CREDIT_CARD" | "E_WALLET";

export interface CheckoutParams {
  orderId: string;
  amount: number;
  description: string;
  userId: string;
  plan: string;
  billingCycle: string;
  paymentMethod?: PaymentMethod;
}

export interface CheckoutResult {
  checkoutUrl: string;
  formFields: Record<string, string>;
}

// ─── Checkout Builder ───────────────────────────────────────────────

/**
 * Create a SePay checkout URL + hidden form fields for a subscription purchase.
 */
export function createCheckout(params: CheckoutParams): CheckoutResult {
  const {
    orderId,
    amount,
    description,
    userId,
    plan,
    billingCycle,
    paymentMethod = "BANK_TRANSFER",
  } = params;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const checkoutUrl = sepay.checkout.initCheckoutUrl();

  const formFields = sepay.checkout.initOneTimePaymentFields({
    operation: "PURCHASE",
    payment_method: paymentMethod,
    order_invoice_number: orderId,
    order_amount: amount,
    currency: "VND",
    order_description: description,
    success_url: `${baseUrl}/pricing?success=true&order=${orderId}&plan=${plan}`,
    error_url: `${baseUrl}/pricing?error=true&order=${orderId}`,
    cancel_url: `${baseUrl}/pricing?canceled=true&order=${orderId}`,
  });

  return { checkoutUrl, formFields };
}

// ─── Plan Pricing (VND) ─────────────────────────────────────────────

export const PLAN_PRICES_VND: Record<
  string,
  { monthly: number; yearly: number }
> = {
  STUDENT_PRO: {
    monthly: 49_000,
    yearly: 490_000,
  },
  TEACHER_PRO: {
    monthly: 199_000,
    yearly: 1_990_000,
  },
  SCHOOL: {
    monthly: 2_990_000,
    yearly: 29_900_000,
  },
};

/**
 * Generate a unique order ID for a subscription purchase.
 * Format: SUB-{plan}-{userId short}-{timestamp}
 */
export function generateOrderId(
  plan: string,
  userId: string
): string {
  const ts = Date.now().toString(36);
  const userShort = userId.slice(-6);
  return `SUB-${plan}-${userShort}-${ts}`.toUpperCase();
}
