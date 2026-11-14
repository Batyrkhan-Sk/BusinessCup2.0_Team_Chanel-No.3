import { loadData } from "@/lib/data/load";
import type { QuizInput } from "@/lib/engine";
import jessica from "@/fixtures/jessica.quiz.json";
import sam from "@/fixtures/sam.quiz.json";

export const data = loadData();

function strip<T extends Record<string, unknown>>(o: T): QuizInput {
  const { _demo, _persona, ...rest } = o as Record<string, unknown>;
  void _demo;
  void _persona;
  return rest as unknown as QuizInput;
}

export const JESSICA: QuizInput = strip(jessica);
export const SAM: QuizInput = strip(sam);

export const with_ = (base: QuizInput, patch: Partial<QuizInput>): QuizInput => ({ ...base, ...patch });

export const option = (r: { options: { id: string }[] }, id: string) => {
  const o = r.options.find((x) => x.id === id);
  if (!o) throw new Error(`option ${id} not found`);
  return o as ReturnType<typeof import("@/lib/engine").enumerateOptions>[number];
};
