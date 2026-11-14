/**
 * Everything numeric on the landing page, computed from /data and DEMO fixture inputs.
 * Pure; the page only formats these values.
 */
import type { DataBundle } from "@/lib/data/schemas";
import { bestPath } from "@/lib/engine/path";
import { computeAppealDeadlines, mapDenialCategory, worthAppealing } from "@/lib/engine/denial";
import { checkOverpayment } from "@/lib/engine/overpay";
import { getOffer } from "@/lib/engine/catalog";
import type { QuizInput } from "@/lib/engine/types";
import { demoWatchList, type DemoCaseFile } from "@/lib/guardian/watch";

const range = (xs: number[]): [number, number] => [Math.min(...xs), Math.max(...xs)];

export function landingView(
  data: DataBundle,
  demo: { cases: DemoCaseFile; jessica: QuizInput; sam: QuizInput; letter: { reason: string; notice_date: string } },
) {
  const vial = getOffer(data, "lillydirect-zepbound-vial");
  const pen = getOffer(data, "novocare-wegovy-pen");
  const pill = getOffer(data, "novocare-wegovy-pill");
  const coveredCards = data.savingsCards.cards.filter((c) => c.applies_when === "with_coverage");
  const cardFloor = Math.min(...coveredCards.map((c) => c.as_low_as_monthly_usd));
  const vialTop = Math.max(...vial.dose_prices.map((p) => p.monthly_usd));
  const lists = data.prices.offers.filter((o) => o.channel === "list").flatMap((o) => o.dose_prices.map((p) => p.monthly_usd));

  // Example decoded denial: the DEMO letter's printed reason + notice date, run through the decoder rules.
  const path = bestPath(demo.jessica, data);
  const { category } = mapDenialCategory({ reason_text: demo.letter.reason, request_type: "initial" }, data.appealRules);
  const worth = worthAppealing(category, path.at_stake_usd ?? 0, data.appealRules);
  const deadline = computeAppealDeadlines({ notice_date: demo.letter.notice_date, claim_timing: "pre_service", stated_appeal_window_days: null }, data.appealRules, demo.cases.today);
  const catLabel = data.appealRules.categories.find((c) => c.id === category)?.label ?? category;

  const watch = demoWatchList(data, demo.cases, demo.sam, demo.jessica);
  const renewal = watch.items.find((i) => i.kind === "pa_renewal");
  const promo = watch.items.find((i) => i.kind === "promo_ending");
  const lastFill = watch.fills[watch.fills.length - 1];
  const overpay = checkOverpayment(lastFill.paid_usd, { offer_id: watch.promo_offer_id, ...lastFill }, data);

  const bridge = data.medicareBridge;
  return {
    hero: { high_usd: vialTop, low_usd: cardFloor },
    example: {
      category,
      category_label: catLabel,
      file_by: deadline?.file_by ?? null,
      filing_window_days: deadline?.filing_window_days ?? null,
      at_stake_usd: path.at_stake_usd,
      winnability: worth.winnability,
      worth_it: worth.worth_it,
      best_label: path.best?.label ?? null,
      best_monthly_top_usd: path.best?.monthly_range_usd?.[1] ?? null,
      current_monthly_usd: demo.jessica.current_monthly_cost_usd,
    },
    guardian: {
      renewal_days: renewal?.days_until ?? null,
      renewal_ends_on: renewal?.due_on ?? null,
      promo_intro_usd: promo?.payload.kind === "promo_ending" ? promo.payload.intro_usd : null,
      promo_then_usd: promo?.payload.kind === "promo_ending" ? promo.payload.then_usd : null,
      promo_valid_through: promo?.payload.kind === "promo_ending" ? promo.payload.valid_through : null,
      overpaid_usd: overpay.difference_usd,
    },
    channels: [
      { label: "Plan + savings card", who: "Commercial plan that covers the drug", price: { as_low_as: cardFloor } },
      {
        label: bridge.label,
        who: `Part D, prior authorization required`,
        window: [bridge.starts_on, bridge.ends_on] as [string, string],
        price: { flat: bridge.monthly_copay_usd },
      },
      { label: "Wegovy pill, self-pay", who: "Price rises with the dose step", price: { range: range(pill.dose_prices.map((p) => p.monthly_usd)) } },
      {
        label: "Wegovy pen, self-pay",
        who: pen.promo ? `Intro price for the first ${pen.promo.intro_fills} fills` : "Self-pay",
        promo_through: pen.promo?.valid_through ?? null,
        price: { range: range([...(pen.promo ? [pen.promo.intro_monthly_usd] : []), ...pen.dose_prices.map((p) => p.monthly_usd)]) },
      },
      {
        label: "Zepbound vials, LillyDirect",
        who: vial.refill_window_days ? `Top price needs a refill within ${vial.refill_window_days} days` : "Self-pay",
        price: { range: range(vial.dose_prices.map((p) => p.monthly_usd)) },
      },
      { label: "List price", who: "No program applied", price: { range: range(lists) }, danger: true },
    ],
  };
}
export type LandingView = ReturnType<typeof landingView>;
