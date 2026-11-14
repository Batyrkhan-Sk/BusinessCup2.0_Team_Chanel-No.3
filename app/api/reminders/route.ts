import { NextResponse } from "next/server";
import { z } from "zod";
import { ReminderPayload, renderReminderEmail } from "@/lib/email/templates";
import { getDb, schema } from "@/lib/db/client";
import { sendEmail } from "@/lib/server/mail";
import { appUrl, isConfigured, notConfigured } from "@/lib/server/env";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  items: z
    .array(z.object({ payload: ReminderPayload, remind_on: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(24) }))
    .min(1)
    .max(10),
  snapshot: z.unknown().optional(),
});

/** Schedules reminder emails (Neon) and sends the first one right away (Resend) so the user sees a real email. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", message: "Check the email address and reminder choices." }, { status: 400 });
  const db = getDb();
  if (!db)
    return NextResponse.json(
      {
        ...notConfigured("database"),
        message: "Reminder storage is not configured on this deployment (DATABASE_URL missing). Nothing was scheduled.",
      },
      { status: 503 },
    );

  const { email, items, snapshot } = parsed.data;
  const today = new Date().toISOString().slice(0, 10);
  const rows = items.flatMap((it) =>
    [...new Set(it.remind_on)].filter((d) => d >= today).map((send_on) => ({ email, kind: it.payload.kind, send_on, payload: it.payload })),
  );
  try {
    if (rows.length) await db.insert(schema.reminders).values(rows);
    if (snapshot !== undefined) await db.insert(schema.caseSnapshots).values({ email, snapshot: snapshot as object });
  } catch (e) {
    console.error("[reminders] insert failed", e);
    return NextResponse.json({ error: "storage_failed", message: "Could not save your reminders. Run the database migration (pnpm db:migrate) and try again." }, { status: 500 });
  }

  let sent = false;
  if (isConfigured("resend")) {
    const r = await sendEmail(email, renderReminderEmail(items[0].payload, appUrl()));
    sent = r.ok;
  }
  return NextResponse.json({ scheduled: rows.length, sent, email_configured: isConfigured("resend") });
}
