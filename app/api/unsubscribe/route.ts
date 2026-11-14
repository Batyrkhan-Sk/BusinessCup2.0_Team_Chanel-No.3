import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { appUrl } from "@/lib/server/env";

export const runtime = "nodejs";

/** One-click unsubscribe from the link in every cron-sent reminder. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const db = getDb();
  if (db && token && /^[0-9a-f-]{36}$/i.test(token)) {
    const [row] = await db.select({ email: schema.reminders.email }).from(schema.reminders).where(eq(schema.reminders.unsubscribe_token, token)).limit(1);
    if (row) await db.update(schema.reminders).set({ status: "cancelled" }).where(eq(schema.reminders.email, row.email));
  }
  return NextResponse.redirect(`${appUrl()}/guardian?unsubscribed=1`, 303);
}
