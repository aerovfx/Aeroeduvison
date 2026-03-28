/**
 * PayPal REST API Client — for international payments.
 *
 * Uses PayPal REST v2 Orders API (no SDK dependency, pure fetch).
 *
 * Config via environment variables:
 *   PAYPAL_CLIENT_ID=xxx
 *   PAYPAL_CLIENT_SECRET=xxx
 *   PAYPAL_ENV=sandbox|production
 *   NEXT_PUBLIC_APP_URL=https://your-domain.com
 *
 * PayPal flow:
 *   1. POST /api/payment/paypal/create-order  → returns { orderId, approvalUrl }
 *   2. User approves on PayPal
 *   3. POST /api/payment/paypal/capture-order → captures payment, activates subscription
 */

// ─── Config ─────────────────────────────────────────────────────────

const PAYPAL_BASE_URL =
  process.env.PAYPAL_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// ─── Auth ───────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get an OAuth2 access token from PayPal (cached until expiry).
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal auth failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

// ─── Types ──────────────────────────────────────────────────────────

export interface PayPalOrderResult {
  paypalOrderId: string;
  approvalUrl: string;
}

export interface PayPalCaptureResult {
  paypalOrderId: string;
  status: string;
  captureId: string;
  amount: string;
  currency: string;
}

// ─── Create Order ───────────────────────────────────────────────────

/**
 * Create a PayPal order for a subscription purchase.
 * Returns the PayPal order ID and approval URL for redirect.
 */
export async function createPayPalOrder(params: {
  orderId: string;       // Internal order ID (SUB-xxx)
  amount: number;        // Amount in USD
  description: string;
  plan: string;
  billingCycle: string;
  userId: string;
}): Promise<PayPalOrderResult> {
  const token = await getAccessToken();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": params.orderId, // Idempotency key
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.orderId,
          description: params.description,
          custom_id: JSON.stringify({
            userId: params.userId,
            plan: params.plan,
            billingCycle: params.billingCycle,
          }),
          amount: {
            currency_code: "USD",
            value: params.amount.toFixed(2),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "AeroEdu",
            locale: "vi-VN",
            landing_page: "LOGIN",
            user_action: "PAY_NOW",
            return_url: `${baseUrl}/pricing?success=true&order=${params.orderId}&gateway=paypal`,
            cancel_url: `${baseUrl}/pricing?canceled=true&order=${params.orderId}`,
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal create order failed: ${res.status} ${err}`);
  }

  const order = await res.json();
  const approvalLink = order.links?.find(
    (l: { rel: string }) => l.rel === "payer-action"
  );

  return {
    paypalOrderId: order.id,
    approvalUrl: approvalLink?.href || "",
  };
}

// ─── Capture Order ──────────────────────────────────────────────────

/**
 * Capture a PayPal order after user approval.
 * This finalizes the payment.
 */
export async function capturePayPalOrder(
  paypalOrderId: string
): Promise<PayPalCaptureResult> {
  const token = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal capture failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    paypalOrderId: data.id,
    status: data.status, // "COMPLETED"
    captureId: capture?.id || "",
    amount: capture?.amount?.value || "0",
    currency: capture?.amount?.currency_code || "USD",
  };
}

// ─── USD Pricing ────────────────────────────────────────────────────

export const PLAN_PRICES_USD: Record<
  string,
  { monthly: number; yearly: number }
> = {
  STUDENT_PRO: {
    monthly: 1.99,
    yearly: 19.90,
  },
  TEACHER_PRO: {
    monthly: 7.99,
    yearly: 79.90,
  },
  SCHOOL: {
    monthly: 119.99,
    yearly: 1199.90,
  },
};
