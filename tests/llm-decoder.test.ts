/**
 * LLM boundary: without a key the extractor fails loudly; with a (test-double) client
 * the returned JSON is validated and then decoded by code. No real API calls here.
 */
import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import {
  extractDenialLetter,
  ExtractionInvalidError,
  ExtractionRefusedError,
  LlmNotConfiguredError,
  NotADenialLetterError,
  UnsupportedFileError,
} from "@/lib/llm/extract-denial";
import { decodeExtraction } from "@/lib/decoder/decode";
import type { DenialExtraction } from "@/lib/llm/denial-schema";
import { data } from "./helpers";

const pdf = { bytes: readFileSync("fixtures/demo-denial-letter.pdf"), mediaType: "application/pdf" };
const KEY = { ANTHROPIC_API_KEY: "test-key" } as unknown as NodeJS.ProcessEnv;

/** Facts as printed on fixtures/demo-denial-letter.pdf (the DEMO letter text, not a precomputed result). */
const LETTER_FACTS: DenialExtraction = {
  is_denial_letter: true,
  plan_name: "Meridian Health Plan of Texas (Fictional)",
  plan_type: "employer_self_funded",
  drug_name: "Zepbound (tirzepatide) 5 mg/0.5 mL single-dose pen",
  decision: "prior_authorization_denied",
  request_type: "initial",
  claim_timing: "pre_service",
  reason_text:
    "Documentation of participation in a comprehensive weight-management program for at least 6 months was not provided. Baseline BMI prior to therapy was not documented.",
  notice_date: "2026-10-28",
  stated_appeal_window_days: 180,
  reference_number: "DEMO-2026-48213",
  appeal_contact: "Meridian Health Plan of Texas, Appeals Unit, P.O. Box 0001, Austin, TX 78700, fax (555) 010-0198",
  low_confidence_fields: [],
};

function fakeClient(response: Record<string, unknown>): Anthropic {
  return { beta: { messages: { parse: async () => response } } } as unknown as Anthropic;
}
const ok = (parsed: unknown) => ({
  stop_reason: "end_turn",
  stop_details: null,
  parsed_output: parsed,
  model: "claude-opus-5-5",
  usage: { input_tokens: 1, output_tokens: 1, iterations: [] },
});

describe("extractDenialLetter", () => {
  it("fails clearly without ANTHROPIC_API_KEY (no fake output)", async () => {
    await expect(extractDenialLetter(pdf, { env: {} as unknown as NodeJS.ProcessEnv })).rejects.toBeInstanceOf(LlmNotConfiguredError);
  });

  it("rejects unsupported file types before any API call", async () => {
    await expect(extractDenialLetter({ bytes: new Uint8Array([1]), mediaType: "text/plain" }, { env: KEY })).rejects.toBeInstanceOf(UnsupportedFileError);
  });

  it("returns validated facts from a well-formed response", async () => {
    const r = await extractDenialLetter(pdf, { env: KEY, client: fakeClient(ok(LETTER_FACTS)) });
    expect(r.extraction.reference_number).toBe("DEMO-2026-48213");
  });

  it("rejects malformed dates instead of passing them on", async () => {
    await expect(
      extractDenialLetter(pdf, { env: KEY, client: fakeClient(ok({ ...LETTER_FACTS, notice_date: "Oct 28" })) }),
    ).rejects.toBeInstanceOf(ExtractionInvalidError);
  });

  it("surfaces refusals and non-denial documents as typed errors", async () => {
    await expect(
      extractDenialLetter(pdf, { env: KEY, client: fakeClient({ ...ok(null), stop_reason: "refusal", stop_details: { category: null } }) }),
    ).rejects.toBeInstanceOf(ExtractionRefusedError);
    await expect(
      extractDenialLetter(pdf, { env: KEY, client: fakeClient(ok({ ...LETTER_FACTS, is_denial_letter: false })) }),
    ).rejects.toBeInstanceOf(NotADenialLetterError);
  });
});

describe("decodeExtraction (code half of the decoder)", () => {
  const d = decodeExtraction(LETTER_FACTS, data, "2026-11-14", { appeal_filed_on: "2026-11-20" });

  it("maps the DEMO letter to missing documentation with high winnability", () => {
    expect(d.category).toBe("missing_documentation");
    expect(d.winnability).toBe("high");
  });

  it("computes the deadline Apr 26, 2027 (163 days left) and a Dec 20, 2026 decision date", () => {
    expect(d.deadlines?.file_by).toBe("2027-04-26");
    expect(d.deadlines?.days_left).toBe(163);
    expect(d.deadlines?.decision_due).toBe("2026-12-20");
  });

  it("picks the 6-item documentation checklist", () => {
    expect(d.checklist).toHaveLength(6);
  });
});
