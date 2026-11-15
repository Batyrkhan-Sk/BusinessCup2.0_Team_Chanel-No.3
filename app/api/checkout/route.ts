import { NextResponse } from "next/server";
import { z } from "zod";
import { loadData } from "@/lib/data/load";
import { getStripe } from "@/lib/server/stripe";
import { appUrl, isConfigured, notConfigured } from "@/lib/server/env";

export const runtime = "nodejs";

const Body = z.object({ plan: z.enum(["monthly", "yearly"]) });

/** Creates a Stripe Checkout Session (test mode) for a Guardian plan defined in data/pricing.json. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", message: "Choose monthly or yearly." }, { status: 400 });
  const stripe = getStripe();
  if (!stripe || !isConfigured("stripe")) return NextResponse.json(notConfigured("stripe"), { status: 503 });

  const pricing = loadData().pricing;
  const plan = pricing.plans.find((p) => p.id === parsed.data.plan)!;
  const price = process.env[plan.stripe_price_env];
  if (!price) return NextResponse.json(notConfigured("stripe"), { status: 503 });

  const base = appUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${base}/guardian/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/paywall?canceled=1`,
    allow_promotion_codes: false,
    metadata: { product: "guardian", plan: plan.id },
    payment_method_collection: "always",
    subscription_data: { metadata: { product: "guardian", plan: plan.id }, ...(pricing.trial_days > 0 ? { trial_period_days: pricing.trial_days } : {}) },
  });
  return NextResponse.json({ url: session.url });
}
