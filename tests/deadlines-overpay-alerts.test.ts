/**
 * Deadline engine, overpayment check, watch-list alerts and the coverage-status branches.
 * Deadline provenance: 29 CFR 2560.503-1 (180-day filing; 30-day pre-service decision)
 * and HealthCare.gov (external review within 4 months).
 */
import { describe, expect, it } from "vitest";
import {
  appealReminderDates,
  checkOverpayment,
  computeAppealDeadlines,
  coverageCheck,
  externalReviewFileBy,
  mapDenialCategory,
  refillWindowAlert,
  renewalAlert,
  selectChecklist,
} from "@/lib/engine";
import demoCase from "@/fixtures/guardian-demo-case.json";
import { data, JESSICA, with_ } from "./helpers";

const TODAY = demoCase.today; // 2026-11-14

describe("appeal deadlines", () => {
  const d = computeAppealDeadlines(
    { notice_date: "2026-10-28", claim_timing: "pre_service", stated_appeal_window_days: null },
    data.appealRules,
    TODAY,
    { appeal_filed_on: "2026-11-20" },
  );

  it("files by Oct 28, 2026 + 180 days = Apr 26, 2027, with 163 days left on Nov 14", () => {
    // Nov 14→30: 16, Dec 31, Jan 31, Feb 28, Mar 31, Apr 26 → 163
    expect(d?.file_by).toBe("2027-04-26");
    expect(d?.days_left).toBe(163);
  });

  it("plan must decide a pre-service appeal filed Nov 20 within 30 days: Dec 20, 2026", () => {
    expect(d?.decision_due).toBe("2026-12-20");
    expect(d?.decision_window).toEqual({ value: 30, unit: "days" });
  });

  it("a longer window stated in the letter wins; a shorter one never does", () => {
    const longer = computeAppealDeadlines({ notice_date: "2026-10-28", claim_timing: "pre_service", stated_appeal_window_days: 365 }, data.appealRules, TODAY);
    const shorter = computeAppealDeadlines({ notice_date: "2026-10-28", claim_timing: "pre_service", stated_appeal_window_days: 60 }, data.appealRules, TODAY);
    expect(longer?.filing_window_days).toBe(365);
    expect(shorter?.file_by).toBe("2027-04-26");
  });

  it("external review: 4 months after a Dec 20, 2026 final denial = Apr 20, 2027", () => {
    expect(externalReviewFileBy("2026-12-20", data.appealRules)).toBe("2027-04-20");
  });

  it("reminds 30 and 7 days before the filing deadline", () => {
    expect(appealReminderDates("2027-04-26", data)).toEqual(["2027-03-27", "2027-04-19"]);
  });

  it("returns null without a notice date instead of guessing", () => {
    expect(computeAppealDeadlines({ notice_date: null, claim_timing: "unknown", stated_appeal_window_days: null }, data.appealRules, TODAY)).toBeNull();
  });
});

describe("denial category mapping and checklists", () => {
  it("renewal denials that cite baseline weight map to renewal_missing_baseline", () => {
    const r = mapDenialCategory(
      { reason_text: "Unable to verify a weight loss of at least 5% from baseline weight at the time the medication was started.", request_type: "renewal" },
      data.appealRules,
    );
    expect(r.category).toBe("renewal_missing_baseline");
  });

  it("unmatched reasons fall back to 'other' (ask the plan for the specific criteria)", () => {
    const r = mapDenialCategory({ reason_text: "Request reviewed.", request_type: "unknown" }, data.appealRules);
    expect(r.category).toBe("other");
    expect(selectChecklist(r.category, data.appealRules).map((i) => i.id)).toContain("ask_criteria");
  });

  it("missing documentation checklist has the 6 items shown in the design", () => {
    expect(selectChecklist("missing_documentation", data.appealRules).map((i) => i.id)).toEqual([
      "denial_copy",
      "baseline_note",
      "program_records",
      "diagnosis_code",
      "policy_excerpt",
      "lmn",
    ]);
  });
});

describe("monthly overpayment check (Sam's seeded fills)", () => {
  const promo = demoCase.cases.find((c) => c.id === "demo-promo")!;
  const fill = (n: number) => promo.fills![n];

  it("Nov 3 fill 1 at 0.25 mg: paid $199, expected intro $199 → matched", () => {
    const f = fill(0);
    const r = checkOverpayment(f.paid_usd, { offer_id: "novocare-wegovy-pen", ...f }, data);
    expect(r).toMatchObject({ status: "matched", difference_usd: 0 });
  });

  it("Dec 2 fill 2 at 0.5 mg: paid $349, expected intro $199 → overpaid $150", () => {
    const f = fill(1);
    const r = checkOverpayment(f.paid_usd, { offer_id: "novocare-wegovy-pen", ...f }, data);
    expect(r.status).toBe("overpaid");
    expect(r.expected?.expected_usd).toBe(199);
    expect(r.expected?.basis).toBe("intro_price");
    expect(r.difference_usd).toBe(150);
  });

  it("Jan fill 3: $349 is the correct regular price → matched", () => {
    const r = checkOverpayment(349, { offer_id: "novocare-wegovy-pen", dose_mg: 0.5, fill_date: "2027-01-02", fill_number: 3, refilled_within_window: true }, data);
    expect(r.status).toBe("matched");
  });

  it("LillyDirect 10 mg refilled late: $699 expected, so paying $449 is not flagged as overpaid", () => {
    const r = checkOverpayment(449, { offer_id: "lillydirect-zepbound-vial", dose_mg: 10, fill_date: "2027-01-20", fill_number: 4, refilled_within_window: false }, data);
    expect(r.status).toBe("underpaid");
    expect(r.expected?.basis).toBe("late_refill_price");
  });
});

describe("Guardian watch-list alerts (seeded DEMO case)", () => {
  it("PA renewal in 23 days: approval ends Dec 7, 2026", () => {
    const c = demoCase.cases.find((x) => x.id === "demo-renewal")!;
    const a = renewalAlert(c.approval_ends_on!, TODAY, data);
    expect(a.days_until).toBe(23);
    expect(a.remind_on).toEqual(["2026-11-14", "2026-11-30"]);
  });

  it("LillyDirect refill window: delivered Oct 30 → closes Dec 14, reminder Dec 9, keep $449 vs $699 late", () => {
    const c = demoCase.cases.find((x) => x.id === "demo-appeal")!;
    const a = refillWindowAlert(c.lillydirect_offer_id!, c.dose_mg!, c.last_delivery_date!, data);
    expect(a).toMatchObject({ window_closes_on: "2026-12-14", remind_on: "2026-12-09", keep_price_usd: 449, late_price_usd: 699 });
  });
});

describe("coverage status branches", () => {
  it("no diagnosis on file → needs diagnosis code clarification", () => {
    expect(coverageCheck(with_(JESSICA, { diagnosis_on_file: false }), data).status).toBe("needs_diagnosis_code_clarification");
  });
  it("diabetes-labelled product (Mounjaro) → needs diagnosis code clarification", () => {
    expect(coverageCheck(with_(JESSICA, { product_id: "mounjaro-pen" }), data).reasons).toContain("label_indication_not_weight_management");
  });
  it("unknown insurer falls back to the generic template", () => {
    const c = coverageCheck(with_(JESSICA, { insurer_id: "bcbs" }), data);
    expect(c.generic_template).toBe(true);
    expect(c.insurer_rule?.insurer_id).toBe("generic");
  });
  it("uninsured → not_insured", () => {
    expect(coverageCheck(with_(JESSICA, { coverage: "none" }), data).status).toBe("not_insured");
  });
});
