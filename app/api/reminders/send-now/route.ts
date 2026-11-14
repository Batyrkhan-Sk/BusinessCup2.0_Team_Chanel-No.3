import { NextResponse } from "next/server";
import { z } from "zod";
import { ReminderPayload, renderReminderEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/server/mail";
import { appUrl, isConfigured, notConfigured } from "@/lib/server/env";

export const runtime = "nodejs";

const Body = z.object({ email: z.string().email(), payload: ReminderPayload });

/** Sends one reminder immediately, rendered by the same template the cron uses. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", message: "Enter a valid email address." }, { status: 400 });
  if (!isConfigured("resend"))
    return NextResponse.json({ ...notConfigured("resend"), message: "Email sending is not configured on this deployment (Resend key missing). Nothing was sent." }, { status: 503 });
  const r = await sendEmail(parsed.data.email, renderReminderEmail(parsed.data.payload, appUrl()));
  if (!r.ok) return NextResponse.json({ error: "send_failed", message: `The email provider rejected the send: ${r.error}` }, { status: 502 });
  return NextResponse.json({ sent: true, id: r.id });
}
