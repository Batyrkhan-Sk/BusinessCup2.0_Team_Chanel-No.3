/**
 * Validating loader for /data. Every file is parsed with its zod schema and
 * cross-checked (every referenced product, offer and checklist id must exist).
 * Throws on the first problem so bad data never reaches the engine or the UI.
 */
import drugsJson from "@/data/drugs.json";
import pricesJson from "@/data/prices.json";
import savingsCardsJson from "@/data/savings_cards.json";
import medicareBridgeJson from "@/data/medicare_bridge.json";
import insurerRulesJson from "@/data/insurer_rules.json";
import appealRulesJson from "@/data/appeal_rules.json";
import statsJson from "@/data/stats.json";
import pricingJson from "@/data/pricing.json";
import reminderRulesJson from "@/data/reminder_rules.json";
import {
  AppealRulesSchema,
  DrugsFileSchema,
  InsurerRulesFileSchema,
  MedicareBridgeSchema,
  PricesFileSchema,
  PricingFileSchema,
  ReminderRulesSchema,
  SavingsCardsFileSchema,
  StatsFileSchema,
  type DataBundle,
} from "./schemas";

export class DataIntegrityError extends Error {
  constructor(public problems: string[]) {
    super(`Data integrity check failed:\n- ${problems.join("\n- ")}`);
    this.name = "DataIntegrityError";
  }
}

export function parseBundle(raw: Record<keyof DataBundle, unknown>): DataBundle {
  const bundle: DataBundle = {
    drugs: DrugsFileSchema.parse(raw.drugs),
    prices: PricesFileSchema.parse(raw.prices),
    savingsCards: SavingsCardsFileSchema.parse(raw.savingsCards),
    medicareBridge: MedicareBridgeSchema.parse(raw.medicareBridge),
    insurerRules: InsurerRulesFileSchema.parse(raw.insurerRules),
    appealRules: AppealRulesSchema.parse(raw.appealRules),
    stats: StatsFileSchema.parse(raw.stats),
    pricing: PricingFileSchema.parse(raw.pricing),
    reminderRules: ReminderRulesSchema.parse(raw.reminderRules),
  };
  const problems = crossCheck(bundle);
  if (problems.length) throw new DataIntegrityError(problems);
  return bundle;
}

export function crossCheck(b: DataBundle): string[] {
  const problems: string[] = [];
  const productIds = new Set(b.drugs.drugs.map((d) => d.product_id));
  const offerIds = new Set(b.prices.offers.map((o) => o.id));
  const checklistIds = new Set(b.appealRules.checklist_items.map((c) => c.id));

  for (const o of b.prices.offers) {
    if (!productIds.has(o.product_id)) problems.push(`prices: offer ${o.id} references unknown product ${o.product_id}`);
    if (o.routes_to_offer_id && !offerIds.has(o.routes_to_offer_id))
      problems.push(`prices: offer ${o.id} routes to unknown offer ${o.routes_to_offer_id}`);
    const drug = b.drugs.drugs.find((d) => d.product_id === o.product_id);
    for (const dp of o.dose_prices) {
      if (dp.dose_mg !== null && drug && !drug.dose_steps_mg.includes(dp.dose_mg))
        problems.push(`prices: offer ${o.id} prices dose ${dp.dose_mg} mg not in openFDA dose steps for ${o.product_id}`);
    }
  }
  for (const c of b.savingsCards.cards)
    for (const p of c.product_ids) if (!productIds.has(p)) problems.push(`savings_cards: ${c.id} references unknown product ${p}`);
  for (const p of b.medicareBridge.covered_product_ids)
    if (!productIds.has(p.product_id)) problems.push(`medicare_bridge: unknown product ${p.product_id}`);
  for (const r of b.insurerRules.insurers)
    for (const p of r.product_ids) if (!productIds.has(p)) problems.push(`insurer_rules: ${r.insurer_id} references unknown product ${p}`);
  if (!b.insurerRules.insurers.some((r) => r.insurer_id === b.insurerRules.generic_insurer_id))
    problems.push("insurer_rules: generic insurer template missing");
  for (const c of b.appealRules.categories)
    for (const id of c.checklist_ids) if (!checklistIds.has(id)) problems.push(`appeal_rules: category ${c.id} uses unknown checklist item ${id}`);
  return problems;
}

let cached: DataBundle | null = null;

/** The validated data bundle (cached per process). */
export function loadData(): DataBundle {
  if (!cached) {
    cached = parseBundle({
      drugs: drugsJson,
      prices: pricesJson,
      savingsCards: savingsCardsJson,
      medicareBridge: medicareBridgeJson,
      insurerRules: insurerRulesJson,
      appealRules: appealRulesJson,
      stats: statsJson,
      pricing: pricingJson,
      reminderRules: reminderRulesJson,
    });
  }
  return cached;
}

/** Oldest verification date across the price-bearing files, for "Prices verified on {date}". */
export function pricesVerifiedOn(b: DataBundle): string {
  return [b.prices.verified_at, b.savingsCards.verified_at, b.medicareBridge.verified_at].sort()[0];
}
