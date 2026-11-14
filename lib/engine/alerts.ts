/**
 * Watch-list alerts and reminder dates for Guardian. Pure date math over data.
 * The cron (Phase 2) asks these functions "what is due today?".
 */
import type { DataBundle } from "@/lib/data/schemas";
import { fulfilmentOffer, getOffer } from "./catalog";
import { addDays, daysBetween } from "./dates";

export interface PromoEndingAlert {
  kind: "promo_ending";
  offer_id: string;
  intro_fills_left: number;
  ends_after_next_fill: boolean;
  intro_usd: number;
  then_usd: number;
  valid_through: string;
}

/** "Your $199 intro price ends after the next fill." */
export function promoEndingAlert(
  offerId: string,
  doseMg: number,
  introFillsUsed: number,
  nextFillDate: string,
  data: DataBundle,
): PromoEndingAlert | null {
  const offer = fulfilmentOffer(data, getOffer(data, offerId));
  const p = offer.promo;
  if (!p || !p.doses_mg.includes(doseMg) || nextFillDate > p.valid_through) return null;
  const left = Math.max(0, p.intro_fills - introFillsUsed);
  if (left === 0) return null;
  const regular = offer.dose_prices.find((d) => d.dose_mg === doseMg) ?? offer.dose_prices.find((d) => d.dose_mg === null);
  if (!regular) return null;
  return {
    kind: "promo_ending",
    offer_id: offer.id,
    intro_fills_left: left,
    ends_after_next_fill: left === 1,
    intro_usd: p.intro_monthly_usd,
    then_usd: regular.monthly_usd,
    valid_through: p.valid_through,
  };
}

export interface RenewalAlert {
  kind: "pa_renewal";
  approval_ends_on: string;
  days_until: number;
  remind_on: string[];
}

/** "PA renewal in 23 days." */
export function renewalAlert(approvalEndsOn: string, today: string, data: DataBundle): RenewalAlert {
  return {
    kind: "pa_renewal",
    approval_ends_on: approvalEndsOn,
    days_until: daysBetween(today, approvalEndsOn),
    remind_on: data.reminderRules.renewal_lead_days.map((d) => addDays(approvalEndsOn, -d)),
  };
}

export interface RefillWindowAlert {
  kind: "refill_window";
  offer_id: string;
  window_closes_on: string;
  remind_on: string;
  keep_price_usd: number;
  late_price_usd: number;
}

/** "Refill by {date} to keep $449." Null when the offer has no refill-window condition at this dose. */
export function refillWindowAlert(offerId: string, doseMg: number, lastDeliveryDate: string, data: DataBundle): RefillWindowAlert | null {
  const offer = fulfilmentOffer(data, getOffer(data, offerId));
  if (!offer.refill_window_days) return null;
  const row = offer.dose_prices.find((d) => d.dose_mg === doseMg);
  if (!row || row.late_refill_monthly_usd === undefined) return null;
  const closes = addDays(lastDeliveryDate, offer.refill_window_days);
  return {
    kind: "refill_window",
    offer_id: offer.id,
    window_closes_on: closes,
    remind_on: addDays(closes, -data.reminderRules.refill_window_lead_days),
    keep_price_usd: row.monthly_usd,
    late_price_usd: row.late_refill_monthly_usd,
  };
}

/** Reminder dates before an appeal filing deadline. */
export function appealReminderDates(fileBy: string, data: DataBundle): string[] {
  return data.reminderRules.appeal_deadline_lead_days.map((d) => addDays(fileBy, -d));
}
