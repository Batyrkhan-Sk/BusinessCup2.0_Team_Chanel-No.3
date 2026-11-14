/**
 * SPEC section 8: six engine scenarios with independently worked numbers.
 *
 * Provenance of every expected number (data/*.json, verified 2026-11-14):
 *   LillyDirect Zepbound vial  : 2.5 mg $299, 5 mg $399, 7.5–15 mg $449 if refilled within 45 days;
 *                                late: 7.5 mg $499, 10–15 mg $699          (lilly.com/lillydirect/zepbound)
 *   Zepbound list price        : $1,087/mo                                  (trumprx.gov "Original Price")
 *   Zepbound Savings Card      : as low as $25, max $100/mo, $1,300/yr, ends 2026-12-31 (zepbound.lilly.com)
 *   Zepbound card, no coverage : as low as $499/mo (pen)                    (zepbound.lilly.com)
 *   Wegovy pen self-pay        : $199 first 2 fills at 0.25/0.5 mg through 2026-12-31, then $349 (wegovy.com)
 *   Wegovy list price          : $1,349/mo                                  (trumprx.gov)
 *   Medicare GLP-1 Bridge      : $50/mo, 2026-07-01 → 2027-12-31            (cms.gov)
 * The hand arithmetic is written next to each assertion.
 */
import { describe, expect, it } from "vitest";
import { bestPath, coverageCheck, mapDenialCategory, worthAppealing, promoEndingAlert } from "@/lib/engine";
import { data, JESSICA, SAM, option, with_ } from "./helpers";

describe("1 · covered with PA (Jessica, PA approved)", () => {
  const input = with_(JESSICA, { status: "pa_approved" });
  const r = bestPath(input, data);

  it("coverage check says likely covered with PA, using Aetna's policy", () => {
    const c = coverageCheck(input, data);
    expect(c.status).toBe("likely_covered_with_pa");
    expect(c.insurer_rule?.insurer_id).toBe("aetna");
    expect(c.generic_template).toBe(false);
  });

  it("best path is plan + Zepbound Savings Card at the $25 floor: 12 × $25 = $300", () => {
    expect(r.best?.id).toBe("zepbound-savings-card-covered");
    expect(r.best?.total_usd).toBe(300);
    // card expires 2026-12-31: Jan–Nov 2027 are flagged as an assumed renewal, not hidden
    expect(r.best?.months.filter((m) => m.note === "assumed_program_renewal")).toHaveLength(11);
    expect(r.best?.caveats).toContain("assumes_card_renewed_after_expiry");
  });

  it("with a known $150 copay the card pays $100/mo: 12 × ($150 − $100) = $600", () => {
    const withCopay = bestPath(with_(input, { plan_copay_usd: 150 }), data);
    expect(option(withCopay, "zepbound-savings-card-covered").total_usd).toBe(600);
  });
});

describe("2 · excluded by plan", () => {
  const input = with_(JESSICA, { status: "plan_excludes" });
  const r = bestPath(input, data);

  it("coverage check says excluded by plan", () => {
    expect(coverageCheck(input, data).status).toBe("excluded_by_plan");
  });

  it("the covered savings card is ineligible; the no-coverage card is eligible at $499 × 12 = $5,988", () => {
    expect(option(r, "zepbound-savings-card-covered").status).toBe("ineligible");
    const noCov = option(r, "zepbound-savings-card-not-covered");
    expect(noCov.status).toBe("eligible");
    expect(noCov.total_usd).toBe(5988);
  });

  it("best path is LillyDirect vials: $399 + $449 + 10 × $449 = $5,338; no conditional path exists", () => {
    expect(r.best?.id).toBe("lillydirect-zepbound-vial");
    expect(r.best?.total_usd).toBe(5338);
    expect(r.best_conditional).toBeNull();
    expect(r.at_stake_usd).toBeNull();
  });
});

describe("3 · Medicare (Wegovy pen, Part D enrollee)", () => {
  const input = with_(SAM, {
    coverage: "medicare",
    status: "pa_approved",
    current_dose_mg: 1,
    intro_fills_used: 0,
    current_monthly_cost_usd: null,
  });
  const r = bestPath(input, data);

  it("best path is the Medicare GLP-1 Bridge: 12 × $50 = $600 (Dec 2026–Nov 2027 inside the window)", () => {
    expect(r.best?.id).toBe("medicare-glp1-bridge");
    expect(r.best?.total_usd).toBe(600);
  });

  it("commercial savings cards and TrumpRx are excluded for government beneficiaries", () => {
    expect(option(r, "wegovy-savings-offer-covered").status).toBe("ineligible");
    expect(option(r, "wegovy-savings-offer-covered").reasons).toContain("government_beneficiary_excluded");
    expect(option(r, "trumprx-wegovy-pen").status).toBe("ineligible");
  });

  it("manufacturer cash stays available but is flagged: 12 × $349 = $4,188", () => {
    const cash = option(r, "novocare-wegovy-pen");
    expect(cash.status).toBe("eligible");
    expect(cash.total_usd).toBe(4188);
    expect(cash.caveats).toContain("government_eligibility_unverified");
  });

  it("coverage check routes through the Bridge", () => {
    const c = coverageCheck(input, data);
    expect(c.status).toBe("likely_covered_with_pa");
    expect(c.via_medicare_bridge).toBe(true);
  });
});

describe("4 · self-pay intro price ending (Sam)", () => {
  const r = bestPath(SAM, data);

  it("projects the last $199 intro fill, then $349: $199 + 11 × $349 = $4,038", () => {
    const pen = option(r, "novocare-wegovy-pen");
    expect(pen.months[0]).toMatchObject({ month: "2026-12", price_usd: 199, note: "intro" });
    expect(pen.months[1]).toMatchObject({ month: "2027-01", price_usd: 349, note: null });
    expect(pen.total_usd).toBe(4038);
    expect(r.best?.id).toBe("novocare-wegovy-pen");
  });

  it("shows the year costs more than today's price: 12 × $199 − $4,038 = −$1,650", () => {
    expect(r.current_12mo_usd).toBe(2388);
    expect(r.savings_vs_current_usd).toBe(-1650);
  });

  it("raises the 'intro price ends after the next fill' alert ($199 → $349)", () => {
    const a = promoEndingAlert("novocare-wegovy-pen", 0.5, 1, "2026-12-02", data);
    expect(a).toMatchObject({ ends_after_next_fill: true, intro_usd: 199, then_usd: 349, valid_through: "2026-12-31" });
  });

  it("lists the Wegovy pill only as 'ask your doctor', never as the best path ($149–$299/mo)", () => {
    const pill = r.ask_your_doctor.find((o) => o.id === "novocare-wegovy-pill");
    expect(pill?.rx_change).toBe("medicine");
    expect(pill?.monthly_range_usd).toEqual([149, 299]);
    expect(pill?.total_usd).toBeNull();
  });

  it("no insurance → savings cards and the Bridge are ineligible", () => {
    expect(option(r, "wegovy-savings-offer-covered").status).toBe("ineligible");
    expect(option(r, "medicare-glp1-bridge").status).toBe("ineligible");
  });
});

describe("5 · dose escalation (Jessica, 5 mg → 10 mg on LillyDirect vials)", () => {
  const r = bestPath(JESSICA, data);
  const vial = option(r, "lillydirect-zepbound-vial");

  it("steps one label dose per monthly fill: 5, 7.5, then 10 mg", () => {
    expect(vial.months.map((m) => m.dose_mg)).toEqual([5, 7.5, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
  });

  it("$399 + $449 + 10 × $449 = $5,338; saves $13,044 − $5,338 = $7,706 vs the $1,087 quote", () => {
    expect(vial.total_usd).toBe(5338);
    expect(r.best?.id).toBe("lillydirect-zepbound-vial");
    expect(r.current_12mo_usd).toBe(13044);
    expect(r.savings_vs_current_usd).toBe(7706);
  });

  it("missing the 45-day refill window costs $399 + $499 + 10 × $699 = $7,888", () => {
    const late = option(bestPath(with_(JESSICA, { refills_on_time: false }), data), "lillydirect-zepbound-vial");
    expect(late.total_usd).toBe(7888);
  });

  it("staying on 5 mg (no planned change) is 12 × $399 = $4,788", () => {
    const stay = option(bestPath(with_(JESSICA, { target_dose_mg: null }), data), "lillydirect-zepbound-vial");
    expect(stay.total_usd).toBe(4788);
  });

  it("treats vials as a form change of the same medicine (needs a new prescription), not a different drug", () => {
    expect(vial.rx_change).toBe("form");
    expect(vial.reasons).toContain("new_prescription_for_form");
  });
});

describe("6 · denial worth appealing vs not", () => {
  const r = bestPath(JESSICA, data);

  it("Jessica: appeal-win path is plan + card $300, so $5,338 − $300 = $5,038 is at stake", () => {
    expect(r.best_conditional?.id).toBe("zepbound-savings-card-covered");
    expect(r.best_conditional?.total_usd).toBe(300);
    expect(r.at_stake_usd).toBe(5038);
  });

  it("missing documentation → high winnability → $5,038 × 1.0 ≥ $1,000 threshold → worth it", () => {
    const { category } = mapDenialCategory(
      {
        reason_text:
          "Documentation of participation in a comprehensive weight-management program for at least 6 months was not provided. Baseline BMI prior to therapy was not documented.",
        request_type: "initial",
      },
      data.appealRules,
    );
    expect(category).toBe("missing_documentation");
    const w = worthAppealing(category, r.at_stake_usd ?? 0, data.appealRules);
    expect(w).toMatchObject({ winnability: "high", score_usd: 5038, worth_it: true });
  });

  it("plan exclusion → low winnability → $5,038 × 0.1 = $503.80 < $1,000 → not worth it", () => {
    const { category } = mapDenialCategory(
      { reason_text: "Weight loss drugs are not covered under your plan. This medication is excluded from your pharmacy benefit.", request_type: "initial" },
      data.appealRules,
    );
    expect(category).toBe("plan_exclusion");
    const w = worthAppealing(category, r.at_stake_usd ?? 0, data.appealRules);
    expect(w).toMatchObject({ winnability: "low", score_usd: 503.8, worth_it: false });
  });
});
