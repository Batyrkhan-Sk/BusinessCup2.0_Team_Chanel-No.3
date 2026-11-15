import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";
import { getStripe } from "@/lib/server/stripe";
import { appUrl, notConfigured } from "@/lib/server/env";

export const runtime = "nodejs";

const Body = z.object({ session_id: z.string().regex(/^cs_[A-Za-z0-9_]+$/) });

/** Stripe only opens the portal with a saved configuration; reuse an active one or create it once. */
async function portalConfiguration(stripe: Stripe): Promise<string> {
  const existing = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 10,
  });
  const pick = existing.data.find((c) => c.is_default) ?? existing.data[0];
  if (pick) return pick.id;
  const created = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "DoseCost Guardian: manage or cancel your plan",
    },
    features: {
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
    },
  });
  return created.id;
}

/** Opens Stripe's hosted billing page for the subscription bought in this browser, where it can be cancelled. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "bad_request", message: "No plan found in this browser." },
      { status: 400 },
    );
  const stripe = getStripe();
  if (!stripe)
    return NextResponse.json(notConfigured("stripe"), { status: 503 });
  try {
    const s = await stripe.checkout.sessions.retrieve(parsed.data.session_id);
    const customer =
      typeof s.customer === "string" ? s.customer : s.customer?.id;
    if (!customer)
      return NextResponse.json(
        {
          error: "no_customer",
          message: "This plan has no billing account yet.",
        },
        { status: 404 },
      );
    const portal = await stripe.billingPortal.sessions.create({
      customer,
      configuration: await portalConfiguration(stripe),
      return_url: `${appUrl()}/guardian`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    console.error("billing portal failed:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      {
        error: "portal_failed",
        message: "Could not open billing right now. Please try again.",
      },
      { status: 502 },
    );
  }
}
