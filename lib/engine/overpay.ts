/**
 * Monthly "did you overpay?" check: the user enters what the pharmacy charged;
 * code computes the expected price for that fill from the offer terms.
 */
import type { DataBundle } from "@/lib/data/schemas";
import { basePriceForDose, fulfilmentOffer, getOffer } from "./catalog";
import { cents } from "./dates";

export interface FillFacts {
  offer_id: string;
  dose_mg: number;
  fill_date: string; // YYYY-MM-DD
  /** 1-based count of fills on this offer, including this one */
  fill_number: number;
  refilled_within_window: boolean;
}

export interface ExpectedFill {
  expected_usd: number;
  basis: "intro_price" | "regular_price" | "late_refill_price";
  source_url: string;
  verified_at: string;
}

export function expectedFillPrice(f: FillFacts, data: DataBundle): ExpectedFill | null {
  const offer = fulfilmentOffer(data, getOffer(data, f.offer_id));
  const p = offer.promo;
  if (p && p.doses_mg.includes(f.dose_mg) && f.fill_number <= p.intro_fills && f.fill_date <= p.valid_through) {
    return { expected_usd: p.intro_monthly_usd, basis: "intro_price", source_url: offer.source_url, verified_at: offer.verified_at };
  }
  const base = basePriceForDose(offer, f.dose_mg, f.refilled_within_window);
  if (!base) return null;
  return {
    expected_usd: base.price,
    basis: base.late ? "late_refill_price" : "regular_price",
    source_url: offer.source_url,
    verified_at: offer.verified_at,
  };
}

export interface OverpaymentResult {
  status: "overpaid" | "matched" | "underpaid" | "unknown";
  paid_usd: number;
  expected: ExpectedFill | null;
  difference_usd: number | null; // paid - expected
}

export function checkOverpayment(paidUsd: number, f: FillFacts, data: DataBundle): OverpaymentResult {
  const expected = expectedFillPrice(f, data);
  if (!expected) return { status: "unknown", paid_usd: paidUsd, expected: null, difference_usd: null };
  const diff = cents(paidUsd - expected.expected_usd);
  return {
    status: diff > 0 ? "overpaid" : diff < 0 ? "underpaid" : "matched",
    paid_usd: paidUsd,
    expected,
    difference_usd: diff,
  };
}
