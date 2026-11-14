"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QuizSchema } from "@/lib/quiz-schema";
import { DEMO_PERSONAS, type DemoPersona } from "@/lib/fixtures";
import type { QuizInput } from "@/lib/engine/types";
import type { DecodedDenial } from "@/lib/decoder/decode";
import { store } from "./store";

export type CaseState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "invalid"; message: string }
  | { status: "ready"; input: QuizInput; demo: DemoPersona | null; decoded: DecodedDenial | null; decodedIsDemo: boolean };

/** Resolves the case from ?demo=jessica|sam (DEMO fixture input) or the quiz saved in this browser. */
export function useCase(): CaseState {
  const params = useSearchParams();
  const demo = params.get("demo");
  const [state, setState] = useState<CaseState>({ status: "loading" });

  useEffect(() => {
    const saved = store.getDecoded();
    if (demo === "jessica" || demo === "sam") {
      const decoded = saved && saved.demo && demo === "jessica" ? saved.decoded : null;
      setState({ status: "ready", input: DEMO_PERSONAS[demo].input, demo, decoded, decodedIsDemo: Boolean(decoded) });
      return;
    }
    const q = store.getQuiz();
    if (!q || !q.product_id || !q.start_month) return setState({ status: "empty" });
    const parsed = QuizSchema.safeParse(q);
    if (!parsed.success) return setState({ status: "invalid", message: "Your saved answers are incomplete. Please finish the quiz." });
    const decoded = saved && !saved.demo ? saved.decoded : null;
    setState({ status: "ready", input: { ...parsed.data, start_month: q.start_month }, demo: null, decoded, decodedIsDemo: false });
  }, [demo]);

  return state;
}
