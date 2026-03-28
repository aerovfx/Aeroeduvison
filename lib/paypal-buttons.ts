/**
 * PayPal Hosted Button IDs configuration.
 *
 * Each plan + billing cycle combination needs a separate hosted button
 * created in the PayPal Business dashboard:
 *   https://www.paypal.com/buttons/
 *
 * Steps to create:
 *   1. Go to PayPal Business → Pay & Get Paid → PayPal buttons
 *   2. Create a "Buy Now" or "Subscribe" button for each plan/cycle
 *   3. Set the price (USD) matching PLAN_PRICES_USD in lib/paypal.ts
 *   4. Copy the hosted button ID and paste below
 *
 * Format: PLAN_BILLINGCYCLE → hostedButtonId
 */

export const PAYPAL_HOSTED_BUTTON_IDS: Record<string, string> = {
  // ─── Student Pro ────────────────────────────────────────────
  'STUDENT_PRO_monthly': 'R22MSTKWT7FB2',   // same hosted button for both plans
  'STUDENT_PRO_yearly': '',                  // $19.90/year

  // ─── Teacher Pro ────────────────────────────────────────────
  'TEACHER_PRO_monthly': 'R22MSTKWT7FB2',   // same hosted button as Student Pro monthly
  'TEACHER_PRO_yearly': '',                  // $79.90/year

  // ─── School ─────────────────────────────────────────────────
  // School plan uses "contact sales" flow, but if you want PayPal:
  'SCHOOL_monthly': '',        // $119.99/month
  'SCHOOL_yearly': '',         // $1199.90/year
};

/**
 * PayPal SDK client ID for hosted buttons.
 * This is a sandbox client ID — replace with production when going live.
 */
export const PAYPAL_CLIENT_ID =
  'BAASZpUpjg_WX6dyvxSzhvT6uKD_kPkDTq861VIeqDptfQw-80yZWmt6p7kMbXwxGYBX3d3GNs0PYpAGS0';

/**
 * Get the hosted button ID for a plan + billing cycle.
 * Returns empty string if not configured.
 */
export function getHostedButtonId(
  plan: string,
  billingCycle: 'monthly' | 'yearly'
): string {
  return PAYPAL_HOSTED_BUTTON_IDS[`${plan}_${billingCycle}`] || '';
}
