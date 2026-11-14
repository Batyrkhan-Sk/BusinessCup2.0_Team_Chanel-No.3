import { NextResponse } from "next/server";
import { and, eq, lte, sql } from "drizzle-orm";
import { ReminderPayload, renderReminderEmail } from "@/lib/email/templates";
import { getDb, schema } from "@/lib/db/client";
import { sendEmail } from "@/lib/server/mail";
import { appUrl, isConfigured, missingEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron (vercel.json) calls GET /api/cron/reminders with "Authorization: Bearer $CRON_SECRET".
 * Sends every scheduled reminder due today or earlier, with the same renderer as the in-app preview.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured", missing: ["CRON_SECRET"] }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getDb();
  if (!db || !isConfigured("resend")) return NextResponse.json({ error: "not_configured", missing: [...missingEnv("database"), ...missingEnv("resend")] }, { status: 503 });

  const today = new Date().toISOString().slice(0, 10);
  const due = await db
    .select()
    .from(schema.reminders)
    .where(and(eq(schema.reminders.status, "scheduled"), lte(schema.reminders.send_on, today)))
    .limit(100);

  const base = appUrl();
  let sent = 0;
  let failed = 0;
  for (const r of due) {
    const payload = ReminderPayload.safeParse(r.payload);
    if (!payload.success) {
      await db.update(schema.reminders).set({ status: "failed", last_error: "invalid payload" }).where(eq(schema.reminders.id, r.id));
      failed++;
      continue;
    }
    const email = renderReminderEmail(payload.data, base, { unsubscribeUrl: `${base}/api/unsubscribe?token=${r.unsubscribe_token}` });
    const res = await sendEmail(r.email, email);
    const attempts = sql`${schema.reminders.attempts} + 1`;
    await db
      .update(schema.reminders)
      .set(
        res.ok
          ? { status: "sent", sent_at: new Date(), attempts }
          : { last_error: res.error, attempts, status: Number(r.attempts) >= 2 ? "failed" : "scheduled" },
      )
      .where(eq(schema.reminders.id, r.id));
    if (res.ok) sent++;
    else failed++;
  }
  return NextResponse.json({ date: today, due: due.length, sent, failed });
}
