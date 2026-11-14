/**
 * Denial decoding, after the LLM has extracted facts: category mapping,
 * appeal deadlines, checklist selection and the "worth appealing?" score.
 * Pure functions over appeal_rules.json.
 */
import type { AppealRules, DenialCategory } from "@/lib/data/schemas";
import { addDays, addMonths, daysBetween } from "./dates";
import type { WorthAppealing } from "./types";

export interface DenialFacts {
  reason_text: string;
  request_type: "initial" | "renewal" | "unknown";
  notice_date: string | null; // YYYY-MM-DD
  claim_timing: "pre_service" | "post_service" | "urgent" | "unknown";
  /** appeal window the letter itself states, if any */
  stated_appeal_window_days: number | null;
}

export function mapDenialCategory(facts: Pick<DenialFacts, "reason_text" | "request_type">, rules: AppealRules): { category: DenialCategory; matched: string | null } {
  const text = facts.reason_text.toLowerCase();
  for (const c of rules.categories) {
    if (c.id === "other") continue;
    if (c.id === "renewal_missing_baseline" && facts.request_type !== "renewal" && !/renewal|reauthori[sz]ation|continuation/.test(text)) continue;
    const hit = c.keywords.find((k) => text.includes(k.toLowerCase()));
    if (hit) return { category: c.id, matched: hit };
  }
  return { category: "other", matched: null };
}

function deadline(rules: AppealRules, id: AppealRules["deadlines"][number]["id"]): number {
  const d = rules.deadlines.find((x) => x.id === id);
  if (!d) throw new Error(`appeal_rules: missing deadline ${id}`);
  return d.value;
}

export interface AppealDeadlines {
  notice_date: string;
  file_by: string;
  days_left: number;
  filing_window_days: number;
  /** when the plan must decide, if the appeal has been filed */
  decision_due: string | null;
  decision_window: { value: number; unit: "days" | "hours" };
  external_review_filing_months: number;
  external_review_standard_days: number;
  external_review_expedited_hours: number;
}

export function computeAppealDeadlines(
  facts: Pick<DenialFacts, "notice_date" | "claim_timing" | "stated_appeal_window_days">,
  rules: AppealRules,
  today: string,
  opts: { appeal_filed_on?: string | null; appeal_levels?: 1 | 2 } = {},
): AppealDeadlines | null {
  if (!facts.notice_date) return null;
  const federalMin = deadline(rules, "internal_appeal_filing_days");
  // A plan may give more time than the federal minimum, never less.
  const window = Math.max(federalMin, facts.stated_appeal_window_days ?? 0);
  const file_by = addDays(facts.notice_date, window);
  const levels = opts.appeal_levels ?? 1;
  let decision_window: AppealDeadlines["decision_window"];
  if (facts.claim_timing === "urgent") decision_window = { value: deadline(rules, "urgent_decision_hours"), unit: "hours" };
  else if (facts.claim_timing === "post_service")
    decision_window = { value: deadline(rules, levels === 2 ? "post_service_decision_days_two_levels" : "post_service_decision_days"), unit: "days" };
  else decision_window = { value: deadline(rules, levels === 2 ? "pre_service_decision_days_two_levels" : "pre_service_decision_days"), unit: "days" };

  let decision_due: string | null = null;
  if (opts.appeal_filed_on) {
    decision_due =
      decision_window.unit === "days"
        ? addDays(opts.appeal_filed_on, decision_window.value)
        : addDays(opts.appeal_filed_on, Math.ceil(decision_window.value / 24));
  }
  return {
    notice_date: facts.notice_date,
    file_by,
    days_left: daysBetween(today, file_by),
    filing_window_days: window,
    decision_due,
    decision_window,
    external_review_filing_months: deadline(rules, "external_review_filing_months"),
    external_review_standard_days: deadline(rules, "external_review_standard_decision_days"),
    external_review_expedited_hours: deadline(rules, "external_review_expedited_decision_hours"),
  };
}

/** Last day to request external review after a final internal denial. */
export function externalReviewFileBy(finalDenialDate: string, rules: AppealRules): string {
  return addMonths(finalDenialDate, deadline(rules, "external_review_filing_months"));
}

export function selectChecklist(category: DenialCategory, rules: AppealRules) {
  const cat = rules.categories.find((c) => c.id === category);
  if (!cat) throw new Error(`appeal_rules: unknown category ${category}`);
  return cat.checklist_ids.map((id) => {
    const item = rules.checklist_items.find((c) => c.id === id);
    if (!item) throw new Error(`appeal_rules: unknown checklist item ${id}`);
    return item;
  });
}

/** Savings × winnability (editorial tier weight), compared to the editorial threshold in data. */
export function worthAppealing(category: DenialCategory, atStakeUsd: number, rules: AppealRules): WorthAppealing {
  const cat = rules.categories.find((c) => c.id === category);
  if (!cat) throw new Error(`appeal_rules: unknown category ${category}`);
  const weight = rules.winnability_weights[cat.winnability];
  const score = Math.round(atStakeUsd * weight * 100) / 100;
  const threshold = rules.worth_appealing_min_score_usd.value;
  return {
    category,
    winnability: cat.winnability,
    weight,
    at_stake_usd: atStakeUsd,
    score_usd: score,
    threshold_usd: threshold,
    worth_it: atStakeUsd > 0 && score >= threshold,
  };
}
