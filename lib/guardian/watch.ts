/**
 * Guardian watch list: turns a case (seeded DEMO or the user's own) into alerts and
 * reminder-email payloads. Pure: every number comes from lib/engine over /data.
 */
import type { DataBundle } from "@/lib/data/schemas";
import { pricesVerifiedOn } from "@/lib/data/load";
import { bestPath } from "@/lib/engine/path";
import { promoEndingAlert, refillWindowAlert, renewalAlert } from "@/lib/engine/alerts";
import { computeAppealDeadlines } from "@/lib/engine/denial";
import { expectedFillPrice } from "@/lib/engine/overpay";
import { addDays, daysBetween } from "@/lib/engine/dates";
import { basePriceForDose, fulfilmentOffer, getDrug, getOffer } from "@/lib/engine/catalog";
import type { QuizInput } from "@/lib/engine/types";
import type { ReminderPayload } from "@/lib/email/templates";

export interface WatchItem {
  id: string;
  kind: ReminderPayload["kind"];
  title: string;
  headline: string;
  body: string;
  due_on: string | null;
  days_until: number | null;
  payload: ReminderPayload;
  /** dates the cron should send this reminder */
  remind_on: string[];
}

export interface DemoFill { fill_date: string; dose_mg: number; fill_number: number; paid_usd: number; refilled_within_window: boolean }
interface DemoRenewal { product_id: string; dose_mg: number; self_pay_offer_id: string; covered_card_id: string; approval_ends_on: string; baseline_document: { label: string; dated: string } }
interface DemoPromo { offer_id: string; dose_mg: number; intro_fills_used: number; next_fill_date: string; fills: DemoFill[] }
interface DemoAppeal { denial_notice_date: string; appeal_filed_on: string; lillydirect_offer_id: string; last_delivery_date: string; dose_mg: number }

export interface DemoCaseFile {
  today: string;
  cases: Array<Record<string, unknown> & { id: string; label: string }>;
}

function sourceLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "our data files";
  }
}

const productLabel = (data: DataBundle, productId: string) => getDrug(data, productId).brand;

export function promoWatch(
  data: DataBundle,
  args: { offer_id: string; dose_mg: number; intro_fills_used: number; next_fill_date: string; quiz?: QuizInput | null; today: string; demo?: boolean },
): WatchItem | null {
  const a = promoEndingAlert(args.offer_id, args.dose_mg, args.intro_fills_used, args.next_fill_date, data);
  if (!a) return null;
  const offer = fulfilmentOffer(data, getOffer(data, args.offer_id));
  const drug = getDrug(data, offer.product_id);
  let projected: number | null = null;
  let alt: { label: string; from: number } | null = null;
  if (args.quiz) {
    const r = bestPath(args.quiz, data);
    projected = r.options.find((o) => o.id === offer.id)?.total_usd ?? null;
    const cheapestAlt = r.ask_your_doctor.filter((o) => o.monthly_range_usd).sort((x, y) => x.monthly_range_usd![0] - y.monthly_range_usd![0])[0];
    if (cheapestAlt) alt = { label: `${getDrug(data, cheapestAlt.product_id).brand} ${getDrug(data, cheapestAlt.product_id).form}`, from: cheapestAlt.monthly_range_usd![0] };
  }
  const payload: ReminderPayload = {
    kind: "promo_ending",
    prices_verified_on: pricesVerifiedOn(data),
    source_label: sourceLabel(offer.source_url),
    demo: args.demo,
    product_label: `${drug.brand} ${drug.form}`,
    intro_usd: a.intro_usd,
    then_usd: a.then_usd,
    valid_through: a.valid_through,
    intro_fills_left: a.intro_fills_left,
    projected_12mo_usd: projected,
    alternative_label: alt?.label ?? null,
    alternative_from_usd: alt?.from ?? null,
  };
  return {
    id: `promo:${offer.id}`,
    kind: "promo_ending",
    title: "Promo ending",
    headline: `${a.intro_usd} → ${a.then_usd}`,
    body: a.ends_after_next_fill ? "Your intro price ends after the next fill." : `${a.intro_fills_left} intro fills left.`,
    due_on: args.next_fill_date,
    days_until: daysBetween(args.today, args.next_fill_date),
    payload,
    remind_on: [addDays(args.next_fill_date, -data.reminderRules.promo_ending_lead_days)],
  };
}

export function renewalWatch(
  data: DataBundle,
  args: { product_id: string; dose_mg: number; approval_ends_on: string; self_pay_offer_id: string; covered_card_id: string; baseline_label: string | null; today: string; demo?: boolean },
): WatchItem {
  const a = renewalAlert(args.approval_ends_on, args.today, data);
  const selfPay = basePriceForDose(fulfilmentOffer(data, getOffer(data, args.self_pay_offer_id)), args.dose_mg, true)?.price ?? null;
  const card = data.savingsCards.cards.find((c) => c.id === args.covered_card_id);
  const atStake = selfPay !== null && card ? selfPay - card.as_low_as_monthly_usd : null;
  return {
    id: `renewal:${args.product_id}`,
    kind: "pa_renewal",
    title: "PA renewal",
    headline: `in ${a.days_until} days`,
    body: `Approval ends ${args.approval_ends_on}.`,
    due_on: args.approval_ends_on,
    days_until: a.days_until,
    remind_on: a.remind_on,
    payload: {
      kind: "pa_renewal",
      prices_verified_on: pricesVerifiedOn(data),
      source_label: card ? sourceLabel(card.source_url) : "our data files",
      demo: args.demo,
      product_label: productLabel(data, args.product_id),
      approval_ends_on: args.approval_ends_on,
      days_until: a.days_until,
      baseline_label: args.baseline_label,
      at_stake_monthly_usd: atStake,
    },
  };
}

export function refillWatch(
  data: DataBundle,
  args: { offer_id: string; dose_mg: number; last_delivery_date: string; appeal_file_by: string | null; today: string; demo?: boolean },
): WatchItem | null {
  const a = refillWindowAlert(args.offer_id, args.dose_mg, args.last_delivery_date, data);
  if (!a) return null;
  const offer = getOffer(data, a.offer_id);
  return {
    id: `refill:${a.offer_id}`,
    kind: "refill_window",
    title: "Refill window",
    headline: `by ${a.window_closes_on}`,
    body: "Refill in time to keep your price.",
    due_on: a.window_closes_on,
    days_until: daysBetween(args.today, a.window_closes_on),
    remind_on: [a.remind_on],
    payload: {
      kind: "refill_window",
      prices_verified_on: pricesVerifiedOn(data),
      source_label: sourceLabel(offer.source_url),
      demo: args.demo,
      product_label: productLabel(data, offer.product_id),
      window_closes_on: a.window_closes_on,
      days_left: daysBetween(a.remind_on, a.window_closes_on),
      keep_price_usd: a.keep_price_usd,
      late_price_usd: a.late_price_usd,
      appeal_file_by: args.appeal_file_by,
    },
  };
}

export function appealWatch(
  data: DataBundle,
  args: { notice_date: string; product_id: string; reference_number: string | null; at_stake_12mo_usd: number | null; stated_appeal_window_days: number | null; today: string; demo?: boolean },
): WatchItem | null {
  const d = computeAppealDeadlines({ notice_date: args.notice_date, claim_timing: "pre_service", stated_appeal_window_days: args.stated_appeal_window_days }, data.appealRules, args.today);
  if (!d) return null;
  const leads = data.reminderRules.appeal_deadline_lead_days;
  return {
    id: `appeal:${args.reference_number ?? args.notice_date}`,
    kind: "appeal_deadline",
    title: "Appeal deadline",
    headline: d.file_by,
    body: `${d.days_left} days left to file.`,
    due_on: d.file_by,
    days_until: d.days_left,
    remind_on: leads.map((l) => addDays(d.file_by, -l)),
    payload: {
      kind: "appeal_deadline",
      prices_verified_on: pricesVerifiedOn(data),
      source_label: "law.cornell.edu (29 CFR 2560.503-1)",
      demo: args.demo,
      product_label: productLabel(data, args.product_id),
      file_by: d.file_by,
      days_left: d.days_left,
      reference_number: args.reference_number,
      at_stake_12mo_usd: args.at_stake_12mo_usd,
    },
  };
}

export function monthlyCheckPayload(
  data: DataBundle,
  args: { offer_id: string; dose_mg: number; fill_date: string; fill_number: number; demo?: boolean },
): ReminderPayload {
  const offer = fulfilmentOffer(data, getOffer(data, args.offer_id));
  const exp = expectedFillPrice({ ...args, refilled_within_window: true }, data);
  return {
    kind: "monthly_check",
    prices_verified_on: pricesVerifiedOn(data),
    source_label: sourceLabel(offer.source_url),
    demo: args.demo,
    product_label: productLabel(data, offer.product_id),
    expected_usd: exp?.expected_usd ?? null,
  };
}

/** Everything the seeded DEMO Guardian case shows ("PA renewal in 23 days", "intro price ends after the next fill", ...). */
export function demoWatchList(data: DataBundle, demo: DemoCaseFile, samQuiz: QuizInput, jessicaQuiz: QuizInput) {
  const today = demo.today;
  const byId = <T,>(id: string): T => {
    const c = demo.cases.find((x) => x.id === id);
    if (!c) throw new Error(`demo case ${id} missing`);
    return c as unknown as T;
  };
  const renewal = byId<DemoRenewal>("demo-renewal");
  const promo = byId<DemoPromo>("demo-promo");
  const appeal = byId<DemoAppeal>("demo-appeal");
  const jessicaPath = bestPath(jessicaQuiz, data);
  const items: WatchItem[] = [];
  items.push(
    renewalWatch(data, {
      product_id: renewal.product_id,
      dose_mg: renewal.dose_mg,
      approval_ends_on: renewal.approval_ends_on,
      self_pay_offer_id: renewal.self_pay_offer_id,
      covered_card_id: renewal.covered_card_id,
      baseline_label: `${renewal.baseline_document.label} (${renewal.baseline_document.dated})`,
      today,
      demo: true,
    }),
  );
  const p = promoWatch(data, { offer_id: promo.offer_id, dose_mg: promo.dose_mg, intro_fills_used: promo.intro_fills_used, next_fill_date: promo.next_fill_date, quiz: samQuiz, today, demo: true });
  if (p) items.push(p);
  const ap = appealWatch(data, {
    notice_date: appeal.denial_notice_date,
    product_id: jessicaQuiz.product_id,
    reference_number: "DEMO-2026-48213",
    at_stake_12mo_usd: jessicaPath.at_stake_usd,
    stated_appeal_window_days: null,
    today,
    demo: true,
  });
  const rf = refillWatch(data, { offer_id: appeal.lillydirect_offer_id, dose_mg: appeal.dose_mg, last_delivery_date: appeal.last_delivery_date, appeal_file_by: ap?.due_on ?? null, today, demo: true });
  if (rf) items.push(rf);
  if (ap) items.push(ap);
  const decision = computeAppealDeadlines({ notice_date: appeal.denial_notice_date, claim_timing: "pre_service", stated_appeal_window_days: null }, data.appealRules, today, { appeal_filed_on: appeal.appeal_filed_on });
  return { today, items, appeal_decision_due: decision?.decision_due ?? null, appeal_filed_on: appeal.appeal_filed_on, jessicaPath, fills: promo.fills, promo_offer_id: promo.offer_id };
}
