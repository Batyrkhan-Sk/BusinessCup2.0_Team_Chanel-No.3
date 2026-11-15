/**
 * Plain-English copy for engine reason codes. No numbers here: anything numeric
 * is rendered from data next to these labels.
 */
import type { CoverageStatus, OptionStatus } from "@/lib/engine/types";

export const REASON_COPY: Record<string, string> = {
  coverage_type_not_allowed: "Not available for your type of coverage",
  government_beneficiary_excluded: "Terms exclude Medicare, Medicaid, TRICARE and VA members",
  different_medicine_ask_doctor: "A different medicine: ask your doctor whether it fits you",
  new_prescription_for_form: "Same medicine in a different form: your doctor sends a new prescription",
  plan_excludes_drug: "Your plan excludes this drug",
  if_appeal_wins: "Needs your plan to approve: if your appeal wins",
  if_pa_approved: "Needs an approved prior authorization",
  plan_covers_drug_use_covered_card: "Your plan covers it, so the covered-plan card applies instead",
  if_plan_does_not_cover: "Only if your plan does not cover it",
  medicare_only: "Medicare Part D enrollees only",
  requires_bridge_pa: "Your prescriber files a prior authorization with the program",
};

export const CAVEAT_COPY: Record<string, string> = {
  government_eligibility_unverified: "The program page does not say whether government-plan members can use it",
  cash_only_cannot_combine_with_insurance: "Cash price: cannot be combined with insurance and usually does not count toward your deductible",
  dose_not_offered_in_window: "Not every month in the projection is priced by this program",
  temporary_price_regular_unpublished:
    "Some prices here are temporary, and the manufacturer has not published the regular price yet, so later months may cost more than shown",
  late_refill_price_unpublished: "If you refill late, a higher regular price applies, and the manufacturer has not published it, so late months may cost more than shown",
  as_low_as_price: "\"As low as\" price: what you pay depends on your plan's copay",
  assumes_card_renewed_after_expiry: "The card's current terms end during this projection; later months assume it is renewed on the same terms",
  program_window_ends_in_projection: "The program ends during this projection",
  covered_drug_list_secondary_source: "This drug's place on the program list comes from secondary reporting",
};

export const STATUS_LABEL: Record<OptionStatus, string> = {
  eligible: "Available now",
  conditional: "If approved",
  ineligible: "Not eligible",
};

export const COVERAGE_COPY: Record<CoverageStatus, { title: string; accent: string; body: string; tone: "accent" | "danger" | "warn" | "info" }> = {
  likely_covered_with_pa: {
    title: "Likely covered",
    accent: "with prior authorization",
    body: "Your plan type normally covers this medicine when a prior authorization shows the criteria below.",
    tone: "accent",
  },
  excluded_by_plan: {
    title: "Excluded",
    accent: "by your plan",
    body: "When a plan writes weight-management drugs out of its benefit, the criteria do not matter and appeals rarely change it. Your lowest-cost option is self-pay.",
    tone: "danger",
  },
  needs_diagnosis_code_clarification: {
    title: "Needs",
    accent: "diagnosis code clarification",
    body: "Coverage depends on which diagnosis is on the prior authorization. Ask your doctor's office which code they used.",
    tone: "warn",
  },
  not_insured: {
    title: "No insurance:",
    accent: "cash paths only",
    body: "Without a plan, manufacturer self-pay programs are your legal options. Your path below shows the cheapest one.",
    tone: "info",
  },
  check_with_plan: {
    title: "Check",
    accent: "with your plan",
    body: "Coverage under Medicaid, TRICARE and VA varies by state and program. We show the cash paths you can use either way.",
    tone: "info",
  },
};

export const COVERAGE_LABELS: Record<string, string> = {
  employer: "Employer or union plan",
  marketplace: "Marketplace / individual plan",
  medicare: "Medicare",
  medicaid: "Medicaid",
  tricare_va: "TRICARE or VA",
  none: "No insurance / I pay cash",
};

export const STATUS_LABELS: Record<string, string> = {
  no_pa_yet: "Prescribed, nothing filed yet",
  pa_pending: "Prior authorization pending",
  pa_approved: "Prior authorization approved",
  pa_denied: "Prior authorization denied",
  plan_excludes: "My plan says it does not cover it",
  self_pay: "I pay cash today",
};

export const INSURERS: Array<{ id: string; label: string }> = [
  { id: "aetna", label: "Aetna" },
  { id: "cigna", label: "Cigna" },
  { id: "uhc", label: "UnitedHealthcare / Optum Rx" },
  { id: "other", label: "Another insurer" },
];

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export const DISCLAIMER = "Not medical, legal or financial advice.";
