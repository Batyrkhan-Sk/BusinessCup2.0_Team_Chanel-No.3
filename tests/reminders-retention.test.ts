/**
 * Long-range return reminders for real (non-demo) users: approval renewal, refill window,
 * expiring discounts and the yearly plan check, plus send-date refresh of "days left".
 */
import { describe, expect, it } from "vitest";
import { loadData } from "@/lib/data/load";
import { bestPath } from "@/lib/engine/path";
import { addDays } from "@/lib/engine/dates";
import { reminderOptions } from "@/lib/views/reminders";
import { payloadForSendDate } from "@/lib/email/templates";
import { DEMO_CASE, DEMO_PERSONAS } from "@/lib/fixtures";
import type { QuizInput } from "@/lib/engine/types";

const data = loadData();
const TODAY = "2026-11-15";
const base = { coverage: "none", insurer_id: null, state: null, target_dose_mg: null, diagnosis_on_file: true, status: "self_pay", current_monthly_cost_usd: null, plan_copay_usd: null, intro_fills_used: 0, refills_on_time: true, start_month: "2026-12" };
const options = (over: Partial<QuizInput>) => {
  const input = { ...base, ...over } as QuizInput;
  return reminderOptions(data, {
    input,
    path: bestPath(input, data),
    decoded: null,
    demo: null,
    demoCase: DEMO_CASE,
    personas: { jessica: DEMO_PERSONAS.jessica.input, sam: DEMO_PERSONAS.sam.input },
    today: TODAY,
  });
};

describe("retention reminders for real users", () => {
  it("approval renewal: emails 23 and 7 days before the approval end date", () => {
    const ends = "2027-06-30";
    const o = options({ product_id: "zepbound-pen", current_dose_mg: 5, coverage: "employer", insurer_id: "generic", status: "pa_approved", approval_ends_on: ends });
    const renewal = o.find((x) => x.payload.kind === "pa_renewal");
    expect(renewal?.remind_on).toEqual(data.reminderRules.renewal_lead_days.map((d) => addDays(ends, -d)));
  });

  it("no renewal reminder without an approval end date", () => {
    const o = options({ product_id: "zepbound-pen", current_dose_mg: 5, coverage: "employer", insurer_id: "generic", status: "pa_approved" });
    expect(o.some((x) => x.payload.kind === "pa_renewal")).toBe(false);
  });

  it("refill window: one reminder per fill once the dose has a late-refill price", () => {
    const o = options({ product_id: "zepbound-vial", current_dose_mg: 2.5, target_dose_mg: 15 });
    const refill = o.find((x) => x.payload.kind === "refill_window");
    // 2.5 and 5 mg have no late price; 7.5 mg starts in month 3 (Feb 2027), so 10 of 12 fills are watched.
    expect(refill?.remind_on).toHaveLength(10);
    expect(refill?.remind_on[0]).toBe(addDays("2027-02-01", 45 - data.reminderRules.refill_window_lead_days));
  });

  it("refill emails quote the late price for that month's dose: $499 at 7.5 mg, $699 at 10 mg and up", () => {
    const o = options({ product_id: "zepbound-vial", current_dose_mg: 2.5, target_dose_mg: 15 });
    const refill = o.find((x) => x.payload.kind === "refill_window")!;
    const lateByItem = refill.schedule!.map((s) => (s.payload.kind === "refill_window" ? s.payload.late_price_usd : null));
    expect(lateByItem).toEqual([499, 699, 699, 699]);
    expect(refill.schedule!.flatMap((s) => s.remind_on)).toHaveLength(10);
  });

  it("discount ending: the Zepbound savings card on Dec 31 is flagged two weeks ahead", () => {
    const o = options({ product_id: "zepbound-pen", current_dose_mg: 5, coverage: "employer", insurer_id: "generic", status: "pa_approved", plan_copay_usd: 150 });
    const d = o.find((x) => x.payload.kind === "discount_ending");
    expect(d?.remind_on).toEqual([addDays("2026-12-31", -data.reminderRules.discount_ending_lead_days)]);
    expect(d?.payload.kind === "discount_ending" && d.payload.discount_label).toBe("Zepbound Savings Card");
  });

  it("new plan year: one check on January 1 of next year", () => {
    const o = options({ product_id: "foundayo-pill", current_dose_mg: 0.8 });
    expect(o.find((x) => x.payload.kind === "plan_year")?.remind_on).toEqual(["2027-01-01"]);
  });
});

describe("days left are recomputed for each send date", () => {
  it("a renewal email sent 7 days before says 7, not the signup-time 23", () => {
    const p = { kind: "pa_renewal", prices_verified_on: "2026-11-14", source_label: "x", product_label: "Zepbound", approval_ends_on: "2027-06-30", days_until: 23, baseline_label: null, at_stake_monthly_usd: null } as const;
    const out = payloadForSendDate(p, "2027-06-23", data.reminderRules.refill_window_lead_days);
    expect(out.kind === "pa_renewal" && out.days_until).toBe(7);
  });

  it("a refill email names the window that closes after the lead days", () => {
    const p = { kind: "refill_window", prices_verified_on: "2026-11-14", source_label: "x", product_label: "Zepbound", window_closes_on: "2027-03-18", days_left: 5, keep_price_usd: 449, late_price_usd: 499, appeal_file_by: null } as const;
    const out = payloadForSendDate(p, "2027-04-12", data.reminderRules.refill_window_lead_days);
    expect(out.kind === "refill_window" && out.window_closes_on).toBe(addDays("2027-04-12", data.reminderRules.refill_window_lead_days));
  });
});
