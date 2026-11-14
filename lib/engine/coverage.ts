/**
 * Coverage check: rules, not LLM. Uses only coverage type, insurer, product,
 * case status and "diagnosis on file" (yes/no). Never evaluates BMI or any
 * clinical value; it lists what the insurer's policy asks the doctor to document.
 */
import type { DataBundle, InsurerRule } from "@/lib/data/schemas";
import { getDrug } from "./catalog";
import type { CoverageStatus, QuizInput } from "./types";

export interface CoverageResult {
  status: CoverageStatus;
  reasons: string[];
  insurer_rule: InsurerRule | null;
  /** true when we fell back to the generic template */
  generic_template: boolean;
  via_medicare_bridge: boolean;
}

export function pickInsurerRule(data: DataBundle, insurerId: string | null, productId: string): { rule: InsurerRule; generic: boolean } {
  const specific = data.insurerRules.insurers.find(
    (r) => r.insurer_id === insurerId && r.insurer_id !== data.insurerRules.generic_insurer_id && r.product_ids.includes(productId),
  );
  if (specific) return { rule: specific, generic: false };
  const generic = data.insurerRules.insurers.find((r) => r.insurer_id === data.insurerRules.generic_insurer_id);
  if (!generic) throw new Error("generic insurer template missing");
  return { rule: generic, generic: true };
}

export function coverageCheck(input: QuizInput, data: DataBundle): CoverageResult {
  const drug = getDrug(data, input.product_id);
  const none = { insurer_rule: null, generic_template: false, via_medicare_bridge: false };

  if (input.coverage === "none") return { status: "not_insured", reasons: ["no_insurance_cash_paths_only"], ...none };

  if (input.status === "plan_excludes") return { status: "excluded_by_plan", reasons: ["user_reports_plan_exclusion"], ...none };

  if (input.coverage === "medicare") {
    const mb = data.medicareBridge;
    const covered = mb.covered_product_ids.some(
      (c) => c.product_id === drug.product_id || getDrug(data, c.product_id).medicine_id === drug.medicine_id,
    );
    if (covered) return { status: "likely_covered_with_pa", reasons: ["medicare_glp1_bridge_requires_pa"], ...none, via_medicare_bridge: true };
    return { status: "excluded_by_plan", reasons: ["not_on_medicare_bridge_list"], ...none };
  }

  if (input.coverage === "medicaid" || input.coverage === "tricare_va") {
    return { status: "check_with_plan", reasons: ["coverage_varies_by_state_or_program"], ...none };
  }

  // Commercial (employer / marketplace)
  const { rule, generic } = pickInsurerRule(data, input.insurer_id, drug.product_id);
  const reasons: string[] = [];
  if (drug.weight_management_indication === false) {
    reasons.push("label_indication_not_weight_management");
    return { status: "needs_diagnosis_code_clarification", reasons, insurer_rule: rule, generic_template: generic, via_medicare_bridge: false };
  }
  if (input.diagnosis_on_file !== true) {
    reasons.push(input.diagnosis_on_file === false ? "no_diagnosis_on_file" : "diagnosis_unknown");
    return { status: "needs_diagnosis_code_clarification", reasons, insurer_rule: rule, generic_template: generic, via_medicare_bridge: false };
  }
  reasons.push("policy_allows_with_pa");
  return { status: "likely_covered_with_pa", reasons, insurer_rule: rule, generic_template: generic, via_medicare_bridge: false };
}
