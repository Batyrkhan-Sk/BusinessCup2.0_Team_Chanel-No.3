/** SERVER-ONLY. Sends a rendered reminder through Resend. */
import { Resend } from "resend";
import type { RenderedEmail } from "@/lib/email/templates";

/** True while sending from Resend's shared test address, which only delivers to the Resend account owner's inbox. */
export function senderIsSandbox(): boolean {
  return /@resend\.dev\b/i.test(process.env.RESEND_FROM ?? "");
}

export const SANDBOX_MESSAGE =
  "During the hackathon our email sender runs in test mode, so it can only deliver to the team's own inbox. The preview shows the exact email you would get.";

export async function sendEmail(to: string, email: RenderedEmail): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return { ok: false, error: "resend_not_configured" };
  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({ from, to, subject: email.subject, html: email.html, text: email.text });
  if (error || !data) return { ok: false, error: error?.message ?? "send_failed" };
  return { ok: true, id: data.id };
}
