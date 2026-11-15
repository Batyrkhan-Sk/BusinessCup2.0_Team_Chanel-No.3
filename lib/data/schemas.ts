/**
 * Zod schemas for every versioned data file in /data.
 * Rule: every record carries `source_url` and `verified_at`.
 * The engine (lib/engine) only ever sees data that passed these schemas.
 */
import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const usd = z.number().nonnegative();
/** A real URL, or `internal:<id>` for our own product decisions (e.g. our pricing). */
const sourceUrl = z
  .string()
  .refine((s) => s.startsWith("internal:") || /^https?:\/\//.test(s), "source_url must be http(s) or internal:");

export const Verification = z.enum(["primary", "secondary", "editorial", "unverified"]);

export const Provenance = z.object({
  source_url: sourceUrl,
  verified_at: isoDate,
  verification: Verification.default("primary"),
  source_note: z.string().optional(),
});

/* ------------------------------------------------------------------ drugs */

export const DrugSchema = z.object({
  product_id: z.string(),
  medicine_id: z.string(),
  brand: z.string(),
  generic: z.string(),
  form: z.enum(["pen", "vial", "pill"]),
  device: z.string(),
  labeler: z.string(),
  dose_unit: z.literal("mg"),
  dose_steps_mg: z.array(z.number().positive()).min(1),
  escalation_interval_weeks: z.number().int().positive().nullable(),
  escalation_note: z.string(),
  weight_management_indication: z.boolean().nullable(),
  product_ndcs: z.array(z.string()).min(1),
  package_ndcs: z.array(z.string()),
  label_set_id: z.string().nullable(),
  label_effective_date: isoDate.nullable(),
  source_url: sourceUrl,
  label_source_url: z.string().nullable(),
  verified_at: isoDate,
});
export type Drug = z.infer<typeof DrugSchema>;

export const DrugsFileSchema = z.object({
  generated_at: z.string(),
  source: z.string(),
  source_url: sourceUrl,
  verified_at: isoDate,
  drugs: z.array(DrugSchema).min(1),
});
export type DrugsFile = z.infer<typeof DrugsFileSchema>;

/* ----------------------------------------------------------------- shared */

export const CoverageType = z.enum(["employer", "marketplace", "medicare", "medicaid", "tricare_va", "none"]);
export type CoverageType = z.infer<typeof CoverageType>;

export const Eligibility = z.object({
  /** coverage types that may use this channel at all */
  coverage_types: z.array(CoverageType).min(1),
  /** true when the price is cash-only and cannot be run through insurance */
  cash_only: z.boolean(),
  /** "excluded" when the terms bar government beneficiaries; "unverified" when the page is silent */
  government_beneficiaries: z.enum(["allowed", "excluded", "unverified"]),
  /** requires an approved prior authorization / plan coverage of the drug */
  requires_plan_coverage: z.boolean(),
  notes: z.string().optional(),
});
export type Eligibility = z.infer<typeof Eligibility>;

/* ----------------------------------------------------------------- prices */

export const DosePrice = z.object({
  dose_mg: z.number().positive().nullable(), // null = every dose
  monthly_usd: usd,
  /** price when the refill-window condition is missed */
  late_refill_monthly_usd: usd.optional(),
  /** last day this price applies when the source marks it temporary and does not publish the regular price */
  temporary_through: isoDate.optional(),
  /** a refill-window condition applies to this dose, but the source does not publish the late-refill price */
  late_refill_unpublished: z.boolean().optional(),
});

export const Promo = z.object({
  label: z.string(),
  intro_monthly_usd: usd,
  intro_fills: z.number().int().positive(),
  doses_mg: z.array(z.number().positive()).min(1),
  valid_through: isoDate,
});
export type Promo = z.infer<typeof Promo>;

export const Channel = z.enum(["lillydirect", "novocare", "trumprx", "list"]);
export type Channel = z.infer<typeof Channel>;

export const PriceOfferSchema = Provenance.extend({
  id: z.string(),
  channel: Channel,
  channel_label: z.string(),
  product_id: z.string(),
  /** for listing-only channels (TrumpRx) the offer that actually fulfils the purchase */
  routes_to_offer_id: z.string().nullable(),
  dose_prices: z.array(DosePrice).min(1),
  refill_window_days: z.number().int().positive().nullable(),
  units_per_month: z.string(),
  promo: Promo.nullable(),
  eligibility: Eligibility,
  extra_costs_note: z.string().optional(),
  valid_from: isoDate.nullable(),
  valid_through: isoDate.nullable(),
});
export type PriceOffer = z.infer<typeof PriceOfferSchema>;

export const PricesFileSchema = z.object({
  verified_at: isoDate,
  currency: z.literal("USD"),
  offers: z.array(PriceOfferSchema).min(1),
});
export type PricesFile = z.infer<typeof PricesFileSchema>;

/* ----------------------------------------------------------- savings cards */

export const SavingsCardSchema = Provenance.extend({
  id: z.string(),
  label: z.string(),
  manufacturer: z.string(),
  product_ids: z.array(z.string()).min(1),
  /** "with_coverage": plan covers the drug; "without_coverage": commercial plan that does not cover it */
  applies_when: z.enum(["with_coverage", "without_coverage"]),
  as_low_as_monthly_usd: usd,
  /** max the card pays per month; null = "WAC minus the floor" style (no fixed cap) */
  max_monthly_benefit_usd: usd.nullable(),
  max_annual_benefit_usd: usd.nullable(),
  expires_on: isoDate.nullable(),
  eligibility: Eligibility,
});
export type SavingsCard = z.infer<typeof SavingsCardSchema>;

export const SavingsCardsFileSchema = z.object({
  verified_at: isoDate,
  cards: z.array(SavingsCardSchema).min(1),
});
export type SavingsCardsFile = z.infer<typeof SavingsCardsFileSchema>;

/* --------------------------------------------------------- medicare bridge */

export const MedicareBridgeSchema = Provenance.extend({
  id: z.literal("medicare-glp1-bridge"),
  label: z.string(),
  monthly_copay_usd: usd,
  starts_on: isoDate,
  ends_on: isoDate,
  eligible_coverage: z.array(CoverageType).min(1),
  requires_prior_authorization: z.boolean(),
  covered_product_ids: z.array(
    z.object({ product_id: z.string(), verification: Verification, source_url: sourceUrl, verified_at: isoDate }),
  ),
  counts_toward_part_d_oop: z.boolean(),
  low_income_subsidy_applies: z.boolean(),
  notes: z.array(z.string()),
});
export type MedicareBridge = z.infer<typeof MedicareBridgeSchema>;

/* ---------------------------------------------------------- insurer rules */

export const Criterion = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  /** what the patient or doctor sends to satisfy it */
  evidence: z.string(),
  source_page: z.string().nullable(),
});

export const InsurerRuleSchema = Provenance.extend({
  insurer_id: z.string(),
  insurer_label: z.string(),
  policy_id: z.string(),
  policy_title: z.string(),
  effective_date: isoDate.nullable(),
  pdf_url: z.string().nullable(),
  scope_note: z.string(),
  product_ids: z.array(z.string()),
  initial_criteria: z.array(Criterion),
  initial_approval_months: z.number().int().positive().nullable(),
  renewal_criteria: z.array(Criterion),
  renewal_min_weight_loss_pct: z.number().positive().nullable(),
  renewal_approval_months: z.number().int().positive().nullable(),
  comorbidities: z.array(z.string()),
});
export type InsurerRule = z.infer<typeof InsurerRuleSchema>;

export const InsurerRulesFileSchema = z.object({
  verified_at: isoDate,
  insurers: z.array(InsurerRuleSchema).min(1),
  generic_insurer_id: z.string(),
});
export type InsurerRulesFile = z.infer<typeof InsurerRulesFileSchema>;

/* ----------------------------------------------------------- appeal rules */

export const DenialCategory = z.enum([
  "missing_documentation",
  "diagnosis_code",
  "criteria_not_met",
  "step_therapy",
  "non_formulary",
  "quantity_limit",
  "plan_exclusion",
  "renewal_missing_baseline",
  "other",
]);
export type DenialCategory = z.infer<typeof DenialCategory>;

export const Winnability = z.enum(["high", "medium", "low"]);
export type Winnability = z.infer<typeof Winnability>;

export const AppealRulesSchema = z.object({
  verified_at: isoDate,
  deadlines: z.array(
    Provenance.extend({
      id: z.enum([
        "internal_appeal_filing_days",
        "pre_service_decision_days",
        "pre_service_decision_days_two_levels",
        "post_service_decision_days",
        "post_service_decision_days_two_levels",
        "urgent_decision_hours",
        "external_review_filing_months",
        "external_review_standard_decision_days",
        "external_review_expedited_decision_hours",
      ]),
      value: z.number().positive(),
      unit: z.enum(["days", "hours", "months"]),
      citation: z.string(),
    }),
  ),
  categories: z.array(
    Provenance.extend({
      id: DenialCategory,
      label: z.string(),
      plain_english: z.string(),
      winnability: Winnability,
      /** case-insensitive substrings matched against extracted denial reason text, in priority order */
      keywords: z.array(z.string()),
      checklist_ids: z.array(z.string()),
    }),
  ),
  /** editorial ranking weights per tier: NOT probabilities */
  winnability_weights: Provenance.extend({ high: z.number(), medium: z.number(), low: z.number() }),
  worth_appealing_min_score_usd: Provenance.extend({ value: usd }),
  checklist_items: z.array(
    Provenance.extend({ id: z.string(), label: z.string(), detail: z.string(), who: z.enum(["patient", "doctor", "dosecost"]) }),
  ),
  context_stats: z.array(Provenance.extend({ id: z.string(), value: z.number(), unit: z.string(), statement: z.string() })),
});
export type AppealRules = z.infer<typeof AppealRulesSchema>;

/* ------------------------------------------------------------ landing stats */

export const StatSchema = Provenance.extend({
  id: z.string(),
  value: z.number(),
  unit: z.enum(["percent", "count", "usd"]),
  display: z.string(),
  statement: z.string(),
  attribution: z.string(),
  published_on: isoDate.nullable(),
});
export const StatsFileSchema = z.object({ verified_at: isoDate, stats: z.array(StatSchema).min(1) });
export type StatsFile = z.infer<typeof StatsFileSchema>;

/* ---------------------------------------------------------- Guardian price */

export const PricingFileSchema = Provenance.extend({
  product: z.literal("guardian"),
  currency: z.literal("USD"),
  /** free trial before the first charge; the card is collected at checkout */
  trial_days: z.number().int().min(0).max(30),
  plans: z.array(
    z.object({
      id: z.enum(["monthly", "yearly"]),
      price_usd: usd,
      interval: z.enum(["month", "year"]),
      stripe_price_env: z.string(),
    }),
  ),
  free_features: z.array(z.string()),
  guardian_features: z.array(z.string()),
});
export type PricingFile = z.infer<typeof PricingFileSchema>;

/* --------------------------------------------------------- reminder rules */

export const ReminderRulesSchema = Provenance.extend({
  appeal_deadline_lead_days: z.array(z.number().int().positive()),
  refill_window_lead_days: z.number().int().positive(),
  renewal_lead_days: z.array(z.number().int().positive()),
  promo_ending_lead_days: z.number().int().positive(),
  plan_decision_overdue_grace_days: z.number().int().nonnegative(),
  january_plan_check_month: z.number().int().min(1).max(12),
  discount_ending_lead_days: z.number().int().positive(),
});
export type ReminderRules = z.infer<typeof ReminderRulesSchema>;

/* ------------------------------------------------------------- the bundle */

export interface DataBundle {
  drugs: DrugsFile;
  prices: PricesFile;
  savingsCards: SavingsCardsFile;
  medicareBridge: MedicareBridge;
  insurerRules: InsurerRulesFile;
  appealRules: AppealRules;
  stats: StatsFile;
  pricing: PricingFile;
  reminderRules: ReminderRules;
}
