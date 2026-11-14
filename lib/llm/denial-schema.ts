/**
 * What the LLM is allowed to return from a denial letter: facts printed on the
 * letter, nothing else. Code (lib/decoder) turns these facts into a category,
 * deadlines and a checklist.
 *
 * Two schemas:
 *  - DenialExtractionOutput: sent to the model as the structured-output format
 *    (kept to plain JSON-schema features so the API accepts it).
 *  - DenialExtraction: stricter validation applied to whatever comes back.
 */
import { z } from "zod";

export const PLAN_TYPES = [
  "employer_self_funded",
  "employer_fully_insured",
  "employer_unknown",
  "marketplace_individual",
  "medicare",
  "medicaid",
  "tricare_va",
  "unknown",
] as const;

export const DenialExtractionOutput = z.object({
  is_denial_letter: z.boolean().describe("true only if the document is a health plan or PBM coverage denial / adverse benefit determination"),
  plan_name: z.string().nullable().describe("health plan or PBM name exactly as printed, else null"),
  plan_type: z.enum(PLAN_TYPES).describe("only what the letter states; 'unknown' if not stated"),
  drug_name: z.string().nullable().describe("medication named in the letter, with strength if printed"),
  decision: z.enum(["prior_authorization_denied", "renewal_denied", "claim_denied", "other", "unknown"]),
  request_type: z.enum(["initial", "renewal", "unknown"]),
  claim_timing: z
    .enum(["pre_service", "post_service", "urgent", "unknown"])
    .describe("pre_service = decided before the drug was dispensed (prior authorization); post_service = a claim already paid out of pocket"),
  reason_text: z.string().describe("the denial reason quoted verbatim from the letter; empty string if none is printed"),
  notice_date: z.string().nullable().describe("date of the notice as YYYY-MM-DD, else null"),
  stated_appeal_window_days: z.number().nullable().describe("appeal window in days if the letter states one, else null"),
  reference_number: z.string().nullable().describe("case, reference or claim number as printed, else null"),
  appeal_contact: z.string().nullable().describe("where to send an appeal (address, fax or portal) as printed, else null"),
  low_confidence_fields: z.array(z.string()).describe("names of fields that were hard to read or ambiguous"),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const DenialExtraction = DenialExtractionOutput.extend({
  notice_date: isoDate.nullable(),
  stated_appeal_window_days: z.number().int().positive().max(3650).nullable(),
  reason_text: z.string().max(4000),
});
export type DenialExtraction = z.infer<typeof DenialExtraction>;

export const ACCEPTED_MEDIA_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type AcceptedMediaType = (typeof ACCEPTED_MEDIA_TYPES)[number];
