/**
 * Seeded DEMO Guardian case and reminder emails: the numbers in the watch list and
 * in the rendered email come from the engine over /data.
 * Provenance: LillyDirect KwikPen 10 mg $449 (lilly.com); Zepbound card as low as $25 (zepbound.lilly.com);
 * Wegovy pen intro $199 for 2 fills to 2026-12-31, then $349 (wegovy.com).
 */
import { describe, expect, it } from "vitest";
import { demoWatchList } from "@/lib/guardian/watch";
import { renderReminderEmail, ReminderPayload } from "@/lib/email/templates";
import { landingView } from "@/lib/views/landing";
import { buildAppealPack } from "@/lib/appeal/pack";
import { decodeExtraction } from "@/lib/decoder/decode";
import { pickInsurerRule } from "@/lib/engine/coverage";
import { bestPath } from "@/lib/engine/path";
import { DEMO_CASE, DEMO_LETTER, DEMO_PERSONAS } from "@/lib/fixtures";
import { data } from "./helpers";

const w = demoWatchList(data, DEMO_CASE, DEMO_PERSONAS.sam.input, DEMO_PERSONAS.jessica.input);
const byKind = (k: string) => w.items.find((i) => i.kind === k)!;

describe("seeded DEMO Guardian case", () => {
  it("PA renewal in 23 days; $449 − $25 = $424 a month at stake if it lapses", () => {
    const r = byKind("pa_renewal");
    expect(r.days_until).toBe(23);
    expect(r.payload).toMatchObject({ kind: "pa_renewal", at_stake_monthly_usd: 424 });
  });

  it("intro price ends after the next fill: $199 → $349, 12 months $4,038", () => {
    const p = byKind("promo_ending");
    expect(p.payload).toMatchObject({ kind: "promo_ending", intro_usd: 199, then_usd: 349, intro_fills_left: 1, projected_12mo_usd: 4038, alternative_from_usd: 149 });
  });

  it("appeal decision due Dec 20, 2026 and filing deadline Apr 26, 2027", () => {
    expect(w.appeal_decision_due).toBe("2026-12-20");
    expect(byKind("appeal_deadline").due_on).toBe("2027-04-26");
  });
});

describe("reminder email template (same renderer for preview and cron)", () => {
  it("renders the promo email with engine numbers and the disclaimer", () => {
    const e = renderReminderEmail(byKind("promo_ending").payload, "https://dosecost.test");
    expect(e.subject).toBe("Your $199 intro price ends after your next fill");
    expect(e.html).toContain("$349");
    expect(e.html).toContain("Not medical, legal or financial advice");
    expect(e.html).toContain("DEMO EMAIL");
    expect(e.text).toContain("https://dosecost.test/result");
  });

  it("is deterministic: preview and send produce identical HTML", () => {
    const p = byKind("pa_renewal").payload;
    expect(renderReminderEmail(p, "https://a.test").html).toBe(renderReminderEmail(p, "https://a.test").html);
  });

  it("uses the per-reminder unsubscribe link when the cron provides one", () => {
    const e = renderReminderEmail(byKind("refill_window").payload, "https://a.test", { unsubscribeUrl: "https://a.test/api/unsubscribe?token=x" });
    expect(e.html).toContain("token=x");
    expect(e.subject).toContain("$449");
  });

  it("every watch payload validates against the API schema", () => {
    for (const i of w.items) expect(ReminderPayload.safeParse(i.payload).success).toBe(true);
  });
});

describe("landing numbers", () => {
  const v = landingView(data, { cases: DEMO_CASE, jessica: DEMO_PERSONAS.jessica.input, sam: DEMO_PERSONAS.sam.input, letter: DEMO_LETTER });
  it("hero: $449 top LillyDirect price vs $25 card floor", () => {
    expect(v.hero).toEqual({ high_usd: 449, low_usd: 25 });
  });
  it("example card: missing documentation, $5,038 at stake, worth it", () => {
    expect(v.example).toMatchObject({ category: "missing_documentation", at_stake_usd: 5038, worth_it: true, file_by: "2027-04-26" });
  });
  it("guardian strip: 23 days, $199 → $349, +$150 overpaid", () => {
    expect(v.guardian).toMatchObject({ renewal_days: 23, promo_intro_usd: 199, promo_then_usd: 349, overpaid_usd: 150 });
  });
});

describe("appeal pack", () => {
  const decoded = decodeExtraction(
    {
      is_denial_letter: true,
      plan_name: "Meridian Health Plan of Texas (Fictional)",
      plan_type: "employer_self_funded",
      drug_name: "Zepbound 5 mg",
      decision: "prior_authorization_denied",
      request_type: "initial",
      claim_timing: "pre_service",
      reason_text: DEMO_LETTER.reason,
      notice_date: DEMO_LETTER.notice_date,
      stated_appeal_window_days: 180,
      reference_number: DEMO_LETTER.reference,
      appeal_contact: null,
      low_confidence_fields: [],
    },
    data,
    DEMO_CASE.today,
  );
  const rule = pickInsurerRule(data, "aetna", "zepbound-pen").rule;
  const pack = buildAppealPack({ decoded, rule, path: bestPath(DEMO_PERSONAS.jessica.input, data), today: DEMO_CASE.today, demo: true }, data);

  it("quotes the denial reason verbatim and cites the policy and decision window", () => {
    expect(pack.letter.paragraphs[0]).toContain(DEMO_LETTER.reason);
    expect(pack.letter.paragraphs[1]).toContain("6450-C");
    expect(pack.letter.paragraphs[3]).toContain("30 days");
  });

  it("never asserts clinical facts: every clinical section of the LMN is a bracket for the doctor", () => {
    for (const s of pack.lmn.sections.slice(1)) expect(s.body.startsWith("[")).toBe(true);
  });
});
