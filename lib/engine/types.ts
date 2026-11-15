import type { CoverageType, DenialCategory, Winnability } from "@/lib/data/schemas";

export type CaseStatus =
  | "no_pa_yet" // prescribed, nothing submitted
  | "pa_pending"
  | "pa_approved"
  | "pa_denied"
  | "plan_excludes" // the plan told the user GLP-1s for weight are not covered
  | "self_pay"; // paying cash today

/** Everything the quiz collects. Minimal health data: diagnosis on file is yes/no only. */
export interface QuizInput {
  coverage: CoverageType;
  insurer_id: string | null;
  state: string | null;
  product_id: string;
  current_dose_mg: number | null; // null = "not sure" → first label step
  target_dose_mg: number | null; // null = stay on the current step
  diagnosis_on_file: boolean | null;
  status: CaseStatus;
  current_monthly_cost_usd: number | null;
  /** plan copay before any savings card, if the user knows it */
  plan_copay_usd?: number | null;
  /** intro/promo fills already used on the current offer */
  intro_fills_used?: number;
  /** false = the user expects to miss refill windows (late-refill prices apply) */
  refills_on_time?: boolean;
  /** end date of an approved prior authorization, YYYY-MM-DD (from the approval letter) */
  approval_ends_on?: string | null;
  /** first projected fill month, YYYY-MM */
  start_month: string;
}

export type RxChange = "none" | "form" | "medicine";
export type OptionStatus = "eligible" | "conditional" | "ineligible";
export type OptionKind =
  | "plan_with_card"
  | "card_without_coverage"
  | "medicare_bridge"
  | "manufacturer_cash"
  | "listing"
  | "list_price";

export interface MonthLine {
  month: string; // YYYY-MM
  fill_date: string; // YYYY-MM-DD
  dose_mg: number;
  price_usd: number | null; // null = this offer does not price this dose
  note: "intro" | "late_refill" | "card_applied" | "card_cap_reached" | "assumed_program_renewal" | null;
}

export interface ChannelOption {
  id: string;
  kind: OptionKind;
  label: string;
  product_id: string;
  medicine_id: string;
  rx_change: RxChange;
  status: OptionStatus;
  /** machine-readable reason codes; UI maps them to copy */
  reasons: string[];
  caveats: string[];
  months: MonthLine[];
  total_usd: number | null;
  monthly_range_usd: [number, number] | null;
  source_urls: string[];
  verified_at: string;
}

export interface PathResult {
  options: ChannelOption[];
  best: ChannelOption | null;
  /** best option that depends on an approval or appeal (e.g. plan + savings card) */
  best_conditional: ChannelOption | null;
  /** options that need a different medicine: shown as "ask your doctor", never chosen */
  ask_your_doctor: ChannelOption[];
  current_12mo_usd: number | null;
  savings_vs_current_usd: number | null;
  /** best-now total minus best-conditional total: what an approval or appeal is worth */
  at_stake_usd: number | null;
}

export type CoverageStatus =
  | "likely_covered_with_pa"
  | "excluded_by_plan"
  | "needs_diagnosis_code_clarification"
  | "not_insured"
  | "check_with_plan";

export interface WorthAppealing {
  category: DenialCategory;
  winnability: Winnability;
  weight: number;
  at_stake_usd: number;
  score_usd: number;
  threshold_usd: number;
  worth_it: boolean;
}
