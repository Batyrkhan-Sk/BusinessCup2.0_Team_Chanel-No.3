import { NextResponse } from "next/server";
import { getStripe } from "@/lib/server/stripe";
import { getDb, schema } from "@/lib/db/client";
import { notConfigured } from "@/lib/server/env";

export const runtime = "nodejs";

/** Stripe webhook: records Guardian entitlements. Signature-verified with STRIPE_WEBHOOK_SECRET. */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ ...notConfigured("stripe"), missing: [!stripe ? "STRIPE_SECRET_KEY" : null, !secret ? "STRIPE_WEBHOOK_SECRET" : null].filter(Boolean) }, { status: 503 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  const db = getDb();
  const upsert = async (row: typeof schema.entitlements.$inferInsert) => {
    if (!db) return;
    await db
      .insert(schema.entitlements)
      .values(row)
      .onConflictDoUpdate({ target: schema.entitlements.stripe_checkout_session_id, set: { status: row.status, updated_at: new Date(), email: row.email, stripe_subscription_id: row.stripe_subscription_id } });
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      await upsert({
        stripe_checkout_session_id: s.id,
        stripe_customer_id: typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null),
        stripe_subscription_id: typeof s.subscription === "string" ? s.subscription : (s.subscription?.id ?? null),
        email: s.customer_details?.email ?? null,
        plan: s.metadata?.plan ?? null,
        status: s.payment_status === "paid" || s.payment_status === "no_payment_required" ? "active" : "pending",
        livemode: s.livemode,
      });
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      if (db) {
        const { eq } = await import("drizzle-orm");
        await db.update(schema.entitlements).set({ status: sub.status, updated_at: new Date() }).where(eq(schema.entitlements.stripe_subscription_id, sub.id));
      }
      break;
    }
    default:
      break;
  }
  return NextResponse.json({ received: true, stored: Boolean(db) });
}
