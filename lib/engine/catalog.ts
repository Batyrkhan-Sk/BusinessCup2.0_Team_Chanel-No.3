import type { DataBundle, Drug, PriceOffer } from "@/lib/data/schemas";

export function getDrug(data: DataBundle, productId: string): Drug {
  const d = data.drugs.drugs.find((x) => x.product_id === productId);
  if (!d) throw new Error(`Unknown product ${productId}`);
  return d;
}

export function getOffer(data: DataBundle, offerId: string): PriceOffer {
  const o = data.prices.offers.find((x) => x.id === offerId);
  if (!o) throw new Error(`Unknown offer ${offerId}`);
  return o;
}

/** The offer whose dose ladder actually prices a purchase (follows listing → fulfilment routing). */
export function fulfilmentOffer(data: DataBundle, offer: PriceOffer): PriceOffer {
  return offer.routes_to_offer_id ? getOffer(data, offer.routes_to_offer_id) : offer;
}

export function basePriceForDose(offer: PriceOffer, doseMg: number, refillsOnTime: boolean): { price: number; late: boolean } | null {
  const row = offer.dose_prices.find((p) => p.dose_mg === doseMg) ?? offer.dose_prices.find((p) => p.dose_mg === null);
  if (!row) return null;
  if (!refillsOnTime && row.late_refill_monthly_usd !== undefined) return { price: row.late_refill_monthly_usd, late: true };
  return { price: row.monthly_usd, late: false };
}

/** List (no-program) price for a medicine, from any list offer whose product shares the medicine. */
export function listOfferFor(data: DataBundle, drug: Drug): PriceOffer | null {
  const sameProduct = data.prices.offers.find((o) => o.channel === "list" && o.product_id === drug.product_id);
  if (sameProduct) return sameProduct;
  return (
    data.prices.offers.find((o) => o.channel === "list" && getDrug(data, o.product_id).medicine_id === drug.medicine_id) ?? null
  );
}
