/**
 * Reminder email templates. ONE renderer, used by:
 *  - the instant preview on the result / timeline screens (rendered in a sandboxed iframe), and
 *  - the Vercel Cron job and "send now" route (sent through Resend).
 * So the preview is byte-for-byte what arrives. Every number in a payload comes from the engine.
 */
import { z } from "zod";
import { formatDate, formatUsd } from "@/lib/format";

export const ReminderKind = z.enum(["promo_ending", "pa_renewal", "refill_window", "appeal_deadline", "monthly_check"]);
export type ReminderKind = z.infer<typeof ReminderKind>;

const base = {
  first_name: z.string().max(60).nullable().optional(),
  prices_verified_on: z.string(),
  source_label: z.string(),
  demo: z.boolean().optional(),
};

export const ReminderPayload = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("promo_ending"),
    ...base,
    product_label: z.string(),
    intro_usd: z.number(),
    then_usd: z.number(),
    valid_through: z.string(),
    intro_fills_left: z.number().int(),
    projected_12mo_usd: z.number().nullable(),
    alternative_label: z.string().nullable(),
    alternative_from_usd: z.number().nullable(),
  }),
  z.object({
    kind: z.literal("pa_renewal"),
    ...base,
    product_label: z.string(),
    approval_ends_on: z.string(),
    days_until: z.number().int(),
    baseline_label: z.string().nullable(),
    at_stake_monthly_usd: z.number().nullable(),
  }),
  z.object({
    kind: z.literal("refill_window"),
    ...base,
    product_label: z.string(),
    window_closes_on: z.string(),
    days_left: z.number().int(),
    keep_price_usd: z.number(),
    late_price_usd: z.number(),
    appeal_file_by: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("appeal_deadline"),
    ...base,
    product_label: z.string(),
    file_by: z.string(),
    days_left: z.number().int(),
    reference_number: z.string().nullable(),
    at_stake_12mo_usd: z.number().nullable(),
  }),
  z.object({
    kind: z.literal("monthly_check"),
    ...base,
    product_label: z.string(),
    expected_usd: z.number().nullable(),
  }),
]);
export type ReminderPayload = z.infer<typeof ReminderPayload>;

export interface RenderedEmail {
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const C = {
  ground: "#f6f5f1",
  surface: "#ffffff",
  ink: "#16201f",
  ink2: "#4b5654",
  ink3: "#6b7573",
  border: "#e1ded6",
  accent: "#0e6b5e",
  accentSoft: "#e1f0ec",
};

interface Body {
  subject: string;
  preheader: string;
  headline: string;
  paragraphs: string[];
  stats: Array<{ label: string; value: string; accent?: boolean }>;
  cta: { label: string; path: string };
  secondary?: { label: string; path: string };
  reason: string;
}

function hi(p: ReminderPayload) {
  return p.first_name ? `Hi ${p.first_name}, ` : "";
}

/** "Hi Sam, your …" with a name; "Your …" without one. */
function greet(p: ReminderPayload, rest: string) {
  const h = hi(p);
  return h ? h + rest : rest.charAt(0).toUpperCase() + rest.slice(1);
}

function compose(p: ReminderPayload): Body {
  switch (p.kind) {
    case "promo_ending": {
      const ends = p.intro_fills_left === 1;
      return {
        subject: ends ? `Your ${formatUsd(p.intro_usd)} intro price ends after your next fill` : `${p.intro_fills_left} intro fills left at ${formatUsd(p.intro_usd)}`,
        preheader: `After that, ${p.product_label} self-pay is ${formatUsd(p.then_usd)} a month.`,
        headline: greet(p, `your next ${p.product_label} fill is ${ends ? "the last one" : "one of the last"} at ${formatUsd(p.intro_usd)}.`),
        paragraphs: [
          `The self-pay intro offer runs through ${formatDate(p.valid_through)}. After it, the self-pay price is ${formatUsd(p.then_usd)} a month.`,
          ...(p.alternative_label && p.alternative_from_usd !== null
            ? [`If cost is a concern, you can ask your doctor whether another option fits you. For reference, ${p.alternative_label} self-pay starts at ${formatUsd(p.alternative_from_usd)} a month. DoseCost does not recommend medicines or doses; that is your doctor's call.`]
            : []),
        ],
        stats: [
          { label: "Next fill", value: formatUsd(p.intro_usd), accent: true },
          { label: "Then, per month", value: formatUsd(p.then_usd) },
          ...(p.projected_12mo_usd !== null ? [{ label: "Next 12 months", value: formatUsd(p.projected_12mo_usd) }] : []),
        ],
        cta: { label: "See your updated 12-month path", path: "/result" },
        secondary: { label: `After your fill: check you were charged ${formatUsd(p.intro_usd)}`, path: "/guardian/overpay" },
        reason: "You get this because you turned on promo alerts.",
      };
    }
    case "pa_renewal":
      return {
        subject: `Your approval renewal is in ${p.days_until} days`,
        preheader: `${p.product_label} approval ends ${formatDate(p.approval_ends_on)}.`,
        headline: greet(p, `your ${p.product_label} approval ends ${formatDate(p.approval_ends_on)}.`),
        paragraphs: [
          "Renewals are often denied when the plan cannot see your starting point. Ask your doctor's office to submit the renewal this week and to attach your baseline record.",
          ...(p.baseline_label ? [`Stored in your case: ${p.baseline_label}.`] : []),
        ],
        stats: [
          { label: "Days left", value: String(p.days_until), accent: true },
          ...(p.at_stake_monthly_usd !== null ? [{ label: "At stake if it lapses, per month", value: formatUsd(p.at_stake_monthly_usd) }] : []),
        ],
        cta: { label: "Open the renewal checklist", path: "/guardian" },
        reason: "You get this because you turned on approval renewal reminders.",
      };
    case "refill_window":
      return {
        subject: `${p.days_left} days left to keep your ${formatUsd(p.keep_price_usd)} ${p.product_label} price`,
        preheader: `Refill by ${formatDate(p.window_closes_on)}.`,
        headline: greet(p, `refill by ${formatDate(p.window_closes_on)} to keep ${formatUsd(p.keep_price_usd)}.`),
        paragraphs: [
          `Your refill window closes on ${formatDate(p.window_closes_on)}. After that, the regular self-pay price at your dose is ${formatUsd(p.late_price_usd)}.`,
        ],
        stats: [
          { label: "Expected next charge", value: formatUsd(p.keep_price_usd), accent: true },
          ...(p.appeal_file_by ? [{ label: "Appeal filing deadline", value: formatDate(p.appeal_file_by) }] : []),
        ],
        cta: { label: "Log what you paid", path: "/guardian/overpay" },
        reason: "You get this because you turned on refill reminders.",
      };
    case "appeal_deadline":
      return {
        subject: `${p.days_left} days left to appeal your ${p.product_label} denial`,
        preheader: `File by ${formatDate(p.file_by)}.`,
        headline: greet(p, `file your appeal by ${formatDate(p.file_by)}.`),
        paragraphs: [
          `That is the last day for the internal appeal${p.reference_number ? ` on reference ${p.reference_number}` : ""}. Your appeal pack and checklist are in your case.`,
        ],
        stats: [
          { label: "Days left", value: String(p.days_left), accent: true },
          ...(p.at_stake_12mo_usd !== null ? [{ label: "At stake over 12 months", value: formatUsd(p.at_stake_12mo_usd) }] : []),
        ],
        cta: { label: "Open your appeal pack", path: "/appeal" },
        reason: "You get this because you turned on appeal deadline reminders.",
      };
    case "monthly_check":
      return {
        subject: "Did you overpay for this month's fill?",
        preheader: "It takes 10 seconds.",
        headline: greet(p, `did you pay the right price for ${p.product_label} this month?`),
        paragraphs: ["Enter what the pharmacy charged. We compare it with your expected price from the program terms and tell you exactly what to ask for if it is wrong."],
        stats: p.expected_usd !== null ? [{ label: "Expected this month", value: formatUsd(p.expected_usd), accent: true }] : [],
        cta: { label: "Log my last fill", path: "/guardian/overpay" },
        reason: "You get this because you turned on the monthly overpayment check.",
      };
  }
}

export function renderReminderEmail(payload: ReminderPayload, appUrl: string, opts: { unsubscribeUrl?: string } = {}): RenderedEmail {
  const b = compose(payload);
  const url = (path: string) => `${appUrl.replace(/\/$/, "")}${path}`;
  const footer = `Not medical, legal or financial advice. ${b.reason}`;
  const demo = payload.demo ? `<p style="margin:0 0 12px;font:600 11px/1.4 Arial,sans-serif;letter-spacing:.06em;color:${C.ink3}">DEMO EMAIL · FICTIONAL CASE</p>` : "";

  const stats = b.stats
    .map(
      (s) =>
        `<td style="padding:12px 16px;background:${C.ground};border-radius:12px;vertical-align:top"><div style="font:12px/1.4 Arial,sans-serif;color:${C.ink2}">${esc(s.label)}</div><div style="font:400 30px/1.1 Georgia,'Times New Roman',serif;color:${s.accent ? C.accent : C.ink};margin-top:4px">${esc(s.value)}</div></td>`,
    )
    .join(`<td style="width:8px"></td>`);

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(b.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.ground}">
<span style="display:none;max-height:0;overflow:hidden">${esc(b.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ground}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 16px;font:700 16px/1 Arial,sans-serif;color:${C.ink}"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:7px;background:${C.accent};color:#fff;font:400 15px/24px Georgia,serif;margin-right:8px">$</span>DoseCost Guardian</td></tr>
<tr><td style="background:${C.surface};border:1px solid ${C.border};border-radius:16px;padding:28px">
${demo}<h1 style="margin:0 0 16px;font:600 21px/1.3 Arial,sans-serif;color:${C.ink}">${esc(b.headline)}</h1>
${b.paragraphs.map((p) => `<p style="margin:0 0 14px;font:15px/1.6 Arial,sans-serif;color:${C.ink}">${esc(p)}</p>`).join("")}
${b.stats.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr>${stats}</tr></table>` : ""}
<a href="${esc(url(b.cta.path))}" style="display:inline-block;background:${C.accent};color:#fff;text-decoration:none;font:600 15px/1 Arial,sans-serif;padding:14px 20px;border-radius:12px">${esc(b.cta.label)}</a>
${b.secondary ? `<p style="margin:16px 0 0"><a href="${esc(url(b.secondary.path))}" style="font:14px/1.4 Arial,sans-serif;color:${C.accent}">${esc(b.secondary.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 4px;font:12px/1.5 Arial,sans-serif;color:${C.ink3}">${esc(footer)} <a href="${esc(opts.unsubscribeUrl ?? url("/guardian?unsubscribe=1"))}" style="color:${C.ink3}">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    payload.demo ? "DEMO EMAIL · FICTIONAL CASE\n" : "",
    b.headline,
    "",
    ...b.paragraphs,
    "",
    ...b.stats.map((s) => `${s.label}: ${s.value}`),
    "",
    `${b.cta.label}: ${url(b.cta.path)}`,
    b.secondary ? `${b.secondary.label}: ${url(b.secondary.path)}` : "",
    "",
    footer,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  return { subject: b.subject, preheader: b.preheader, html, text };
}
