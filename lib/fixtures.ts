/**
 * DEMO fixture INPUTS, typed for the app. They run through the same live engine
 * and decoder as real input; no outputs are stored in /fixtures.
 */
import jessicaJson from "@/fixtures/jessica.quiz.json";
import samJson from "@/fixtures/sam.quiz.json";
import demoCaseJson from "@/fixtures/guardian-demo-case.json";
import { DEMO_LETTER_NOTICE_DATE, DEMO_LETTER_REASON, DEMO_LETTER_REFERENCE } from "@/fixtures/demo-letter-content";
import type { QuizInput } from "@/lib/engine/types";
import type { DemoCaseFile } from "@/lib/guardian/watch";

function strip(o: Record<string, unknown>): QuizInput {
  const rest = { ...o };
  delete rest._demo;
  delete rest._persona;
  return rest as unknown as QuizInput;
}

export const DEMO_PERSONAS = {
  jessica: { input: strip(jessicaJson), label: "Jessica, 34, Texas", blurb: "Employer plan, Zepbound, prior authorization denied" },
  sam: { input: strip(samJson), label: "Sam, 41, Ohio", blurb: "Self-pay Wegovy pen, intro price ends after the next fill" },
} as const;
export type DemoPersona = keyof typeof DEMO_PERSONAS;

export const DEMO_CASE = demoCaseJson as DemoCaseFile;
export const DEMO_LETTER = { reason: DEMO_LETTER_REASON, notice_date: DEMO_LETTER_NOTICE_DATE, reference: DEMO_LETTER_REFERENCE };
