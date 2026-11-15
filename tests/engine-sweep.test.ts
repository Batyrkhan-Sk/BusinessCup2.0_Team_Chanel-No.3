/**
 * Exhaustive engine sweep: every priceable medicine × coverage × case status × dose × refill timing × current cost.
 * Asserts the arithmetic and eligibility invariants hold everywhere, and that no combination is left without a price.
 */
import { describe, expect, it } from "vitest";
import { loadData } from "@/lib/data/load";
import { bestPath } from "@/lib/engine/path";
import type { ChannelOption, QuizInput } from "@/lib/engine/types";

const data = loadData();
const COVERAGES = ["employer", "marketplace", "medicare", "medicaid", "tricare_va", "none"] as const;
const STATUSES = ["no_pa_yet", "pa_pending", "pa_approved", "pa_denied", "plan_excludes", "self_pay"] as const;
const GOVERNMENT = new Set(["medicare", "medicaid", "tricare_va"]);

const priceable = (id: string) =>
  data.prices.offers.some((o) => o.product_id === id && o.channel !== "list") || data.savingsCards.cards.some((c) => c.product_ids.includes(id));
const offerBehind = (o: ChannelOption) => {
  const direct = data.prices.offers.find((x) => o.id === x.id || o.id.includes(x.id));
  return direct?.routes_to_offer_id ? data.prices.offers.find((y) => y.id === direct.routes_to_offer_id) : direct;
};

function sweep() {
  const violations: string[] = [];
  const unpriced = new Set<string>();
  let runs = 0;
  for (const d of data.drugs.drugs.filter((x) => priceable(x.product_id))) {
    const steps = d.dose_steps_mg;
    for (const coverage of COVERAGES)
      for (const status of STATUSES)
        for (const dose of [steps[0], steps[Math.floor(steps.length / 2)], steps[steps.length - 1]])
          for (const target of [null, steps[steps.length - 1]])
            for (const refills_on_time of [true, false])
              for (const current of [null, d.dose_steps_mg.length * 50]) {
                runs++;
                const input = {
                  coverage,
                  insurer_id: coverage === "employer" || coverage === "marketplace" ? "generic" : null,
                  state: null,
                  product_id: d.product_id,
                  current_dose_mg: dose,
                  target_dose_mg: target,
                  diagnosis_on_file: true,
                  status,
                  current_monthly_cost_usd: current,
                  plan_copay_usd: null,
                  intro_fills_used: 0,
                  refills_on_time,
                  start_month: "2026-12",
                } as QuizInput;
                const tag = `${d.product_id}|${coverage}|${status}`;
                const r = bestPath(input, data);
                if (!r.best && !r.best_conditional) unpriced.add(tag);
                for (const o of r.options) {
                  if (o.months.length && o.months.length !== 12) violations.push(`months≠12 ${tag} ${o.id}`);
                  const paid = o.months.map((m) => m.price_usd);
                  if (o.total_usd !== null) {
                    const sum = Math.round(paid.reduce<number>((a, b) => a + (b ?? 0), 0) * 100) / 100;
                    if (paid.some((p) => p === null) || Math.abs(sum - o.total_usd) > 0.01) violations.push(`total≠sum ${tag} ${o.id}`);
                    const nums = paid.filter((p): p is number => p !== null);
                    if (o.monthly_range_usd && (o.monthly_range_usd[0] !== Math.min(...nums) || o.monthly_range_usd[1] !== Math.max(...nums)))
                      violations.push(`range≠paid ${tag} ${o.id}`);
                  }
                  const cardKind = o.kind === "plan_with_card" || o.kind === "card_without_coverage";
                  if (cardKind && o.status !== "ineligible" && (GOVERNMENT.has(coverage) || coverage === "none")) violations.push(`card on ${coverage} ${tag}`);
                  if (o.kind === "plan_with_card" && o.status === "eligible" && status !== "pa_approved") violations.push(`card without approval ${tag}`);
                  if (o.kind === "plan_with_card" && o.status !== "ineligible" && status === "plan_excludes") violations.push(`card despite exclusion ${tag}`);
                  if (o.kind === "medicare_bridge" && o.status !== "ineligible" && coverage !== "medicare") violations.push(`bridge on ${coverage} ${tag}`);
                  const offer = offerBehind(o);
                  const intro = o.months.filter((m) => m.note === "intro");
                  if (intro.length && (!offer?.promo || intro.length > offer.promo.intro_fills || intro.some((m) => !offer.promo!.doses_mg.includes(m.dose_mg) || m.fill_date > offer.promo!.valid_through)))
                    violations.push(`promo misuse ${tag} ${o.id}`);
                  if (target !== null && o.rx_change === "none" && o.months.some((m, i) => i > 0 && m.dose_mg < o.months[i - 1].dose_mg)) violations.push(`dose decreases ${tag} ${o.id}`);
                  if (offer && o.kind === "manufacturer_cash")
                    for (const m of o.months)
                      if (m.note === null && m.price_usd !== null) {
                        const row = offer.dose_prices.find((p) => p.dose_mg === m.dose_mg) ?? offer.dose_prices.find((p) => p.dose_mg === null);
                        if (row && m.price_usd !== row.monthly_usd) violations.push(`off-ladder price ${tag} ${o.id} ${m.dose_mg}mg`);
                      }
                }
                const choosable = r.options.filter((o) => o.status === "eligible" && o.rx_change !== "medicine" && o.total_usd !== null);
                if (r.best && choosable.some((o) => (o.total_usd as number) < (r.best!.total_usd as number))) violations.push(`best is not the minimum ${tag}`);
                if (r.current_12mo_usd !== null && r.best?.total_usd != null && Math.abs(r.current_12mo_usd - r.best.total_usd - (r.savings_vs_current_usd as number)) > 0.01)
                  violations.push(`savings≠current−best ${tag}`);
              }
  }
  return { runs, violations: [...new Set(violations)], unpriced: [...unpriced] };
}

describe("engine sweep", () => {
  const result = sweep();
  it(`covers thousands of combinations (${result.runs})`, () => expect(result.runs).toBeGreaterThan(3000));
  it("holds every arithmetic and eligibility invariant", () => expect(result.violations).toEqual([]));
  it("prices every quiz-selectable medicine for every coverage and status", () => expect(result.unpriced).toEqual([]));
});
