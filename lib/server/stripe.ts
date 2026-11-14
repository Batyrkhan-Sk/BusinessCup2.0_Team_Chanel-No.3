/** SERVER-ONLY. Stripe client (test mode). Null when STRIPE_SECRET_KEY is not set. */
import Stripe from "stripe";

let cached: Stripe | null = null;
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) cached = new Stripe(key);
  return cached;
}
