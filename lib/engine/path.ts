/**
 * Cheapest-legal-path engine. Pure: (QuizInput, DataBundle) → PathResult.
 * Every number comes from the data bundle; nothing here is a price.
 */
import type { CoverageType, DataBundle, Drug, Eligibility, PriceOffer, SavingsCard } from "@/lib/data/schemas";
import { basePriceForDose, fulfilmentOffer, getDrug, listOfferFor } from "./catalog";
import { cents, monthStart, nextMonth } from "./dates";
import type { ChannelOption, MonthLine, OptionStatus, PathResult, QuizInput, RxChange } from "./types";

export const PROJECTION_MONTHS = 12;

const GOVERNMENT: CoverageType[] = ["medicare", "medicaid", "tricare_va"];
const COMMERCIAL: CoverageType[] = ["employer", "marketplace"];

/* ----------------------------------------------------------- dose schedule */

/**
 * Dose per monthly fill. Starts at the user's current label step (first step if unknown) and,
 * only if the user says their doctor planned a different dose, moves one label step per fill
 * toward it. We never choose a dose.
 */
export function doseSchedule(drug: Drug, current: number | null, target: number | null, months: number): number[] {
  const steps = drug.dose_steps_mg;
  const startIdx = current === null ? 0 : steps.indexOf(current);
  if (startIdx < 0) throw new Error(`${current} mg is not a label dose step for ${drug.product_id}`);
  const targetIdx = target === null ? startIdx : steps.indexOf(target);
  if (targetIdx < 0) throw new Error(`${target} mg is not a label dose step for ${drug.product_id}`);
  const out: number[] = [];
  let idx = startIdx;
  for (let i = 0; i < months; i++) {
    out.push(steps[idx]);
    if (idx < targetIdx) idx++;
    else if (idx > targetIdx) idx--;
  }
  return out;
}

export function projectionMonths(startMonth: string, months: number): string[] {
  return Array.from({ length: months }, (_, i) => nextMonth(startMonth, i));
}

/* ------------------------------------------------------------- eligibility */

export function checkEligibility(e: Eligibility, coverage: CoverageType): { ok: boolean; reasons: string[]; caveats: string[] } {
  const reasons: string[] = [];
  const caveats: string[] = [];
  if (!e.coverage_types.includes(coverage)) reasons.push("coverage_type_not_allowed");
  const gov = GOVERNMENT.includes(coverage);
  if (gov && e.government_beneficiaries === "excluded") reasons.push("government_beneficiary_excluded");
  if (gov && e.government_beneficiaries === "unverified") caveats.push("government_eligibility_unverified");
  if (e.cash_only && coverage !== "none") caveats.push("cash_only_cannot_combine_with_insurance");
  return { ok: reasons.length === 0, reasons, caveats };
}

function rxChange(prescribed: Drug, candidate: Drug): RxChange {
  if (candidate.product_id === prescribed.product_id) return "none";
  if (candidate.medicine_id === prescribed.medicine_id) return "form";
  return "medicine";
}

function total(months: MonthLine[]): number | null {
  if (months.some((m) => m.price_usd === null)) return null;
  return cents(months.reduce((s, m) => s + (m.price_usd ?? 0), 0));
}

function range(prices: number[]): [number, number] | null {
  return prices.length ? [Math.min(...prices), Math.max(...prices)] : null;
}

/** Range of what the user actually pays across the projection; falls back to the program ladder when no month is priced. */
function paidRange(lines: MonthLine[], ladder: number[]): [number, number] | null {
  const paid = lines.map((l) => l.price_usd).filter((p): p is number => p !== null);
  return paid.length ? range(paid) : range(ladder);
}

/* --------------------------------------------------------- price an offer */

export function projectOffer(
  data: DataBundle,
  offer: PriceOffer,
  doses: number[],
  months: string[],
  opts: { introFillsUsed: number; refillsOnTime: boolean },
): MonthLine[] {
  const f = fulfilmentOffer(data, offer);
  let introUsed = opts.introFillsUsed;
  return months.map((month, i) => {
    const fill_date = monthStart(month);
    const dose = doses[i];
    const inWindow = (!f.valid_from || fill_date >= f.valid_from) && (!f.valid_through || fill_date <= f.valid_through);
    const base = inWindow ? basePriceForDose(f, dose, opts.refillsOnTime) : null;
    if (!base) return { month, fill_date, dose_mg: dose, price_usd: null, note: null };
    const p = f.promo;
    if (p && p.doses_mg.includes(dose) && introUsed < p.intro_fills && fill_date <= p.valid_through) {
      introUsed++;
      return { month, fill_date, dose_mg: dose, price_usd: p.intro_monthly_usd, note: "intro" };
    }
    return { month, fill_date, dose_mg: dose, price_usd: base.price, note: base.late ? "late_refill" : null };
  });
}

/** Commercial plan + manufacturer savings card. Copay known → exact; unknown → the card's "as low as" floor. */
export function projectCard(card: SavingsCard, doses: number[], months: string[], planCopay: number | null): MonthLine[] {
  let usedThisYear = 0;
  let year = months[0]?.slice(0, 4);
  return months.map((month, i) => {
    const fill_date = monthStart(month);
    if (month.slice(0, 4) !== year) {
      year = month.slice(0, 4);
      usedThisYear = 0;
    }
    const expired = card.expires_on !== null && fill_date > card.expires_on;
    let price: number;
    let note: MonthLine["note"] = expired ? "assumed_program_renewal" : "card_applied";
    if (planCopay === null) {
      price = card.as_low_as_monthly_usd;
    } else {
      const wanted = Math.max(0, planCopay - card.as_low_as_monthly_usd);
      const monthlyCap = card.max_monthly_benefit_usd ?? wanted;
      const annualLeft = card.max_annual_benefit_usd === null ? wanted : Math.max(0, card.max_annual_benefit_usd - usedThisYear);
      const benefit = Math.min(wanted, monthlyCap, annualLeft);
      usedThisYear += benefit;
      price = cents(planCopay - benefit);
      if (benefit < Math.min(wanted, monthlyCap) && !expired) note = "card_cap_reached";
    }
    return { month, fill_date, dose_mg: doses[i], price_usd: price, note };
  });
}

/* ------------------------------------------------------- enumerate options */

export function enumerateOptions(input: QuizInput, data: DataBundle): ChannelOption[] {
  const prescribed = getDrug(data, input.product_id);
  const months = projectionMonths(input.start_month, PROJECTION_MONTHS);
  const doses = doseSchedule(prescribed, input.current_dose_mg, input.target_dose_mg, PROJECTION_MONTHS);
  const refillsOnTime = input.refills_on_time ?? true;
  const options: ChannelOption[] = [];
  const commercial = COMMERCIAL.includes(input.coverage);

  // 1) Manufacturer cash + listing channels (TrumpRx), same medicine or alternatives.
  for (const offer of data.prices.offers) {
    if (offer.channel === "list") continue;
    const drug = getDrug(data, offer.product_id);
    const change = rxChange(prescribed, drug);
    const elig = checkEligibility(offer.eligibility, input.coverage);
    const isCurrentOffer = input.status === "self_pay" && offer.product_id === input.product_id && offer.channel !== "trumprx";
    const base = {
      id: offer.id,
      kind: offer.channel === "trumprx" ? ("listing" as const) : ("manufacturer_cash" as const),
      label: offer.channel_label,
      product_id: offer.product_id,
      medicine_id: drug.medicine_id,
      rx_change: change,
      status: (elig.ok ? "eligible" : "ineligible") as OptionStatus,
      reasons: [...elig.reasons, ...(change === "medicine" ? ["different_medicine_ask_doctor"] : change === "form" ? ["new_prescription_for_form"] : [])],
      caveats: elig.caveats,
      source_urls: [offer.source_url, ...(offer.routes_to_offer_id ? [fulfilmentOffer(data, offer).source_url] : [])],
      verified_at: offer.verified_at,
    };
    const f = fulfilmentOffer(data, offer);
    const prices = f.dose_prices.map((p) => p.monthly_usd).concat(f.promo ? [f.promo.intro_monthly_usd] : []);
    if (change === "medicine") {
      options.push({ ...base, months: [], total_usd: null, monthly_range_usd: range(prices) });
      continue;
    }
    const lines = projectOffer(data, offer, doses, months, { introFillsUsed: isCurrentOffer ? input.intro_fills_used ?? 0 : 0, refillsOnTime });
    if (lines.some((l) => l.price_usd === null)) base.caveats.push("dose_not_offered_in_window");
    const ladder = fulfilmentOffer(data, offer).dose_prices;
    const rowFor = (dose: number) => ladder.find((p) => p.dose_mg === dose);
    if (lines.some((l) => { const t = rowFor(l.dose_mg)?.temporary_through; return t !== undefined && l.fill_date > t; })) base.caveats.push("temporary_price_regular_unpublished");
    if (!refillsOnTime && lines.some((l) => rowFor(l.dose_mg)?.late_refill_unpublished)) base.caveats.push("late_refill_price_unpublished");
    options.push({ ...base, months: lines, total_usd: total(lines), monthly_range_usd: paidRange(lines, prices) });
  }

  // 2) Savings cards.
  for (const card of data.savingsCards.cards) {
    const cardProduct = card.product_ids.includes(prescribed.product_id)
      ? prescribed
      : card.product_ids.map((p) => getDrug(data, p)).find((d) => d.medicine_id === prescribed.medicine_id);
    if (!cardProduct) continue;
    const change = rxChange(prescribed, cardProduct);
    const elig = checkEligibility(card.eligibility, input.coverage);
    let status: OptionStatus = elig.ok ? "eligible" : "ineligible";
    const reasons = [...elig.reasons];
    if (change === "form") reasons.push("new_prescription_for_form");
    if (card.applies_when === "with_coverage" && status === "eligible") {
      if (input.status === "plan_excludes") {
        status = "ineligible";
        reasons.push("plan_excludes_drug");
      } else if (input.status === "pa_denied") {
        status = "conditional";
        reasons.push("if_appeal_wins");
      } else if (input.status !== "pa_approved") {
        status = "conditional";
        reasons.push("if_pa_approved");
      }
    }
    if (card.applies_when === "without_coverage" && status === "eligible") {
      if (input.status === "pa_approved") {
        status = "ineligible";
        reasons.push("plan_covers_drug_use_covered_card");
      } else if (input.status !== "pa_denied" && input.status !== "plan_excludes") {
        status = "conditional";
        reasons.push("if_plan_does_not_cover");
      }
    }
    const lines =
      card.applies_when === "with_coverage"
        ? projectCard(card, doses, months, input.plan_copay_usd ?? null)
        : months.map((month, i) => ({ month, fill_date: monthStart(month), dose_mg: doses[i], price_usd: card.as_low_as_monthly_usd, note: null }));
    const caveats = [...elig.caveats, "as_low_as_price"];
    if (lines.some((l) => l.note === "assumed_program_renewal")) caveats.push("assumes_card_renewed_after_expiry");
    options.push({
      id: card.id,
      kind: card.applies_when === "with_coverage" ? "plan_with_card" : "card_without_coverage",
      label: card.label,
      product_id: cardProduct.product_id,
      medicine_id: cardProduct.medicine_id,
      rx_change: change,
      status: commercial ? status : "ineligible",
      reasons: commercial ? reasons : [...new Set([...reasons, "coverage_type_not_allowed"])],
      caveats,
      months: lines,
      total_usd: total(lines),
      monthly_range_usd: paidRange(lines, []),
      source_urls: [card.source_url],
      verified_at: card.verified_at,
    });
  }

  // 3) Medicare GLP-1 Bridge.
  const mb = data.medicareBridge;
  const bridgeProduct = mb.covered_product_ids
    .map((c) => getDrug(data, c.product_id))
    .find((d) => d.product_id === prescribed.product_id) ??
    mb.covered_product_ids.map((c) => getDrug(data, c.product_id)).find((d) => d.medicine_id === prescribed.medicine_id);
  if (bridgeProduct) {
    const lines: MonthLine[] = months.map((month, i) => {
      const fill_date = monthStart(month);
      const open = fill_date >= mb.starts_on && fill_date <= mb.ends_on;
      return { month, fill_date, dose_mg: doses[i], price_usd: open ? mb.monthly_copay_usd : null, note: null };
    });
    const eligible = mb.eligible_coverage.includes(input.coverage);
    const reasons = eligible ? [] : ["medicare_only"];
    if (eligible && mb.requires_prior_authorization && input.status !== "pa_approved") reasons.push("requires_bridge_pa");
    const change = rxChange(prescribed, bridgeProduct);
    if (change === "form") reasons.push("new_prescription_for_form");
    const coverageEntry = mb.covered_product_ids.find((c) => c.product_id === bridgeProduct.product_id);
    options.push({
      id: mb.id,
      kind: "medicare_bridge",
      label: mb.label,
      product_id: bridgeProduct.product_id,
      medicine_id: bridgeProduct.medicine_id,
      rx_change: change,
      status: eligible ? "eligible" : "ineligible",
      reasons,
      caveats: [
        ...(lines.some((l) => l.price_usd === null) ? ["program_window_ends_in_projection"] : []),
        ...(coverageEntry?.verification !== "primary" ? ["covered_drug_list_secondary_source"] : []),
      ],
      months: lines,
      total_usd: total(lines),
      monthly_range_usd: [mb.monthly_copay_usd, mb.monthly_copay_usd],
      source_urls: [mb.source_url, ...(coverageEntry ? [coverageEntry.source_url] : [])],
      verified_at: mb.verified_at,
    });
  }

  // 4) List price baseline.
  const list = listOfferFor(data, prescribed);
  if (list) {
    const lines = projectOffer(data, list, doses, months, { introFillsUsed: 0, refillsOnTime: true });
    options.push({
      id: list.id,
      kind: "list_price",
      label: list.channel_label,
      product_id: prescribed.product_id,
      medicine_id: prescribed.medicine_id,
      rx_change: "none",
      status: "eligible",
      reasons: [],
      caveats: [],
      months: lines,
      total_usd: total(lines),
      monthly_range_usd: paidRange(lines, list.dose_prices.map((p) => p.monthly_usd)),
      source_urls: [list.source_url],
      verified_at: list.verified_at,
    });
  }
  return options;
}

/* ---------------------------------------------------------------- best path */

const pickMin = (xs: ChannelOption[]) =>
  xs.reduce<ChannelOption | null>((best, o) => (best === null || (o.total_usd as number) < (best.total_usd as number) ? o : best), null);

export function bestPath(input: QuizInput, data: DataBundle): PathResult {
  const options = enumerateOptions(input, data);
  const choosable = (o: ChannelOption) => o.rx_change !== "medicine" && o.total_usd !== null;
  const best = pickMin(options.filter((o) => o.status === "eligible" && choosable(o)));
  const best_conditional = pickMin(options.filter((o) => o.status === "conditional" && choosable(o)));
  const current_12mo_usd =
    input.current_monthly_cost_usd === null ? null : cents(input.current_monthly_cost_usd * PROJECTION_MONTHS);
  const savings_vs_current_usd =
    current_12mo_usd !== null && best?.total_usd != null ? cents(current_12mo_usd - best.total_usd) : null;
  const at_stake_usd =
    best?.total_usd != null && best_conditional?.total_usd != null
      ? cents(Math.max(0, best.total_usd - best_conditional.total_usd))
      : null;
  return {
    options,
    best,
    best_conditional,
    ask_your_doctor: options.filter((o) => o.rx_change === "medicine" && o.status !== "ineligible"),
    current_12mo_usd,
    savings_vs_current_usd,
    at_stake_usd,
  };
}
