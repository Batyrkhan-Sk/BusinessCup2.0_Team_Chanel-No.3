"use client";
/**
 * Browser-only persistence. Everything the user enters lives here by default
 * (no login). Every access is wrapped: private windows and blocked storage must not break the app.
 */
import type { QuizInput } from "@/lib/engine/types";
import type { DecodedDenial } from "@/lib/decoder/decode";

const KEYS = {
  quiz: "dosecost.quiz.v1",
  decoded: "dosecost.decoded.v1",
  guardian: "dosecost.guardian.v1",
  fills: "dosecost.fills.v1",
  sessionId: "dosecost.session.v1",
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the session still works in memory */
  }
}

export type QuizDraft = Partial<QuizInput> & { step?: number; started_at?: string; demo?: "jessica" | "sam" | null };

export const store = {
  getQuiz: () => read<QuizDraft>(KEYS.quiz),
  setQuiz: (q: QuizDraft | null) => write(KEYS.quiz, q),
  getDecoded: () => read<{ decoded: DecodedDenial; demo: boolean; saved_at: string }>(KEYS.decoded),
  setDecoded: (d: { decoded: DecodedDenial; demo: boolean; saved_at: string } | null) => write(KEYS.decoded, d),
  getGuardian: () => read<{ active: boolean; plan: string | null; email: string | null; session_id: string; verified_at: string }>(KEYS.guardian),
  setGuardian: (g: { active: boolean; plan: string | null; email: string | null; session_id: string; verified_at: string } | null) => write(KEYS.guardian, g),
  getFills: () => read<Array<{ offer_id: string; dose_mg: number; fill_date: string; fill_number: number; paid_usd: number; refilled_within_window: boolean }>>(KEYS.fills) ?? [],
  setFills: (f: unknown[]) => write(KEYS.fills, f),
  sessionId: (): string => {
    let id = read<string>(KEYS.sessionId);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      write(KEYS.sessionId, id);
    }
    return id;
  },
};
