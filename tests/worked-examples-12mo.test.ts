/**
 * Hand-computed 12-month totals, starting December 2026. Each expected number is written out from the
 * published prices in data/prices.json, data/savings_cards.json and data/medicare_bridge.json, not from the engine.
 */
import { describe, expect, it } from "vitest";
import { loadData } from "@/lib/data/load";
import { bestPath } from "@/lib/engine/path";
import type { QuizInput } from "@/lib/engine/types";

const data = loadData();
const base = { coverage: "none", insurer_id: null, state: null, target_dose_mg: null, diagnosis_on_file: true, status: "self_pay", current_monthly_cost_usd: null, plan_copay_usd: null, intro_fills_used: 0, refills_on_time: true, start_month: "2026-12" };
const run = (over: Partial<QuizInput>, optionId: string) => {
  const r = bestPath({ ...base, ...over } as QuizInput, data);
  const o = r.options.find((x) => x.id === optionId || x.id.includes(optionId));
  if (!o) throw new Error(`option ${optionId} missing`);
  return { r, o };
};

describe("12-month worked examples", () => {
  it("Zepbound vial 2.5 → 15 mg, refills on time: 299 + 399 + 449 × 10 = 5,188", () => {
    const { o } = run({ product_id: "zepbound-vial", current_dose_mg: 2.5, target_dose_mg: 15 }, "lillydirect-zepbound-vial");
    expect(o.total_usd).toBe(299 + 399 + 449 * 10);
    expect(o.monthly_range_usd).toEqual([299, 449]);
  });

  it("Same, refills late: 299 + 399 + 499 + 699 × 9 = 7,488", () => {
    const { o } = run({ product_id: "zepbound-vial", current_dose_mg: 2.5, target_dose_mg: 15, refills_on_time: false }, "lillydirect-zepbound-vial");
    expect(o.total_usd).toBe(299 + 399 + 499 + 699 * 9);
  });

  it("Staying at 2.5 mg shows what you pay, not the program ladder: 299 × 12, range 299–299", () => {
    const { o } = run({ product_id: "zepbound-vial", current_dose_mg: 2.5, target_dose_mg: null }, "lillydirect-zepbound-vial");
    expect(o.total_usd).toBe(299 * 12);
    expect(o.monthly_range_usd).toEqual([299, 299]);
  });

  it("Wegovy pen 0.25 → 2.4 mg, new patient: one $199 intro fill before the Dec 31 end date, then 349 × 11 = 4,038", () => {
    const { o } = run({ product_id: "wegovy-pen", current_dose_mg: 0.25, target_dose_mg: 2.4 }, "novocare-wegovy-pen");
    expect(o.months.filter((m) => m.note === "intro")).toHaveLength(1);
    expect(o.total_usd).toBe(199 + 349 * 11);
  });

  it("Foundayo 0.8 → 17.2 mg: 149 + 149 + 199 + 299 × 9 = 3,188, flagged because two prices are temporary", () => {
    const { o } = run({ product_id: "foundayo-pill", current_dose_mg: 0.8, target_dose_mg: 17.2 }, "lillydirect-foundayo-pill");
    expect(o.total_usd).toBe(149 + 149 + 199 + 299 * 9);
    expect(o.caveats).toContain("temporary_price_regular_unpublished");
  });

  it("Foundayo at 0.8 mg only: 149 × 12 = 1,788, no temporary-price caveat", () => {
    const { o } = run({ product_id: "foundayo-pill", current_dose_mg: 0.8, target_dose_mg: null }, "lillydirect-foundayo-pill");
    expect(o.total_usd).toBe(149 * 12);
    expect(o.monthly_range_usd).toEqual([149, 149]);
    expect(o.caveats).not.toContain("temporary_price_regular_unpublished");
  });

  it("Foundayo top dose refilled late is flagged: the late price is not published", () => {
    const { o } = run({ product_id: "foundayo-pill", current_dose_mg: 17.2, target_dose_mg: null, refills_on_time: false }, "lillydirect-foundayo-pill");
    expect(o.caveats).toContain("late_refill_price_unpublished");
  });

  it("Zepbound pen, employer plan, approval granted, $150 copay: card pays up to $100, so 50 × 12 = 600", () => {
    const { o } = run({ product_id: "zepbound-pen", current_dose_mg: 5, coverage: "employer", insurer_id: "generic", status: "pa_approved", plan_copay_usd: 150 }, "zepbound-savings-card-covered");
    expect(o.status).toBe("eligible");
    expect(o.total_usd).toBe(50 * 12);
  });

  it("Wegovy pen on Medicare with approval: Bridge copay 50 × 12 = 600", () => {
    const r = bestPath({ ...base, product_id: "wegovy-pen", current_dose_mg: 1, coverage: "medicare", status: "pa_approved" } as QuizInput, data);
    const bridge = r.options.find((o) => o.kind === "medicare_bridge")!;
    expect(bridge.total_usd).toBe(50 * 12);
    expect(r.best?.kind).toBe("medicare_bridge");
  });
});
