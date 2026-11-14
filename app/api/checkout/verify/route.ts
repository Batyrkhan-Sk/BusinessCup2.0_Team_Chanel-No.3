import { NextResponse } from "next/server";
import { getStripe } from "@/lib/server/stripe";
import { notConfigured } from "@/lib/server/env";

export const runtime = "nodejs";

/** Confirms a Checkout Session with Stripe before the browser unlocks Guardian. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("session_id");
  if (!id || !/^cs_[A-Za-z0-9_]+$/.test(id)) return NextResponse.json({ active: false, message: "Invalid session." }, { status: 400 });
  const stripe = getStripe();
  if (!stripe) return NextResponse.json(notConfigured("stripe"), { status: 503 });
  try {
    const s = await stripe.checkout.sessions.retrieve(id);
    const active = s.status === "complete" && (s.payment_status === "paid" || s.payment_status === "no_payment_required");
    return NextResponse.json({ active, plan: s.metadata?.plan ?? null, email: s.customer_details?.email ?? null, livemode: s.livemode });
  } catch {
    return NextResponse.json({ active: false, message: "Stripe could not find this checkout session." }, { status: 404 });
  }
}
