/**
 * The code half of the denial decoder ("code computes, LLM explains").
 * Pure: takes validated LLM facts + data, returns category, deadlines, checklist.
 * The DEMO letter and real uploads go through exactly this function.
 */
import type { DataBundle } from "@/lib/data/schemas";
import { computeAppealDeadlines, mapDenialCategory, selectChecklist } from "@/lib/engine/denial";
import type { DenialExtraction } from "@/lib/llm/denial-schema";

export function decodeExtraction(x: DenialExtraction, data: DataBundle, today: string, opts: { appeal_filed_on?: string | null } = {}) {
  const requestType = x.decision === "renewal_denied" ? "renewal" : x.request_type;
  const { category, matched } = mapDenialCategory({ reason_text: x.reason_text, request_type: requestType }, data.appealRules);
  const cat = data.appealRules.categories.find((c) => c.id === category)!;
  return {
    facts: x,
    category,
    category_label: cat.label,
    plain_english: cat.plain_english,
    winnability: cat.winnability,
    matched_keyword: matched,
    deadlines: computeAppealDeadlines(
      { notice_date: x.notice_date, claim_timing: x.claim_timing, stated_appeal_window_days: x.stated_appeal_window_days },
      data.appealRules,
      today,
      { appeal_filed_on: opts.appeal_filed_on ?? null },
    ),
    checklist: selectChecklist(category, data.appealRules),
    needs_user_confirmation: x.low_confidence_fields,
  };
}
export type DecodedDenial = ReturnType<typeof decodeExtraction>;
