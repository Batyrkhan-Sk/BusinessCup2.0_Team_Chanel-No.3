/**
 * Detector for hard-coded money and percent figures in UI source.
 * Factual numbers must render from /data via the engine, never from literals.
 *
 * Flags:  "$449", "$ 25", "$1,087", "$7.99", "12%", "0.5 %", "1,087 dollars"
 * Allows: template holes like `${price}`, `${pct}%`, and lines carrying the
 *         escape comment `lint-data-allow` (for non-factual layout values, with a reason).
 */
export interface LiteralHit {
  file: string;
  line: number;
  column: number;
  match: string;
  kind: "currency" | "percent";
}

const ALLOW = "lint-data-allow";
const PATTERNS: Array<{ kind: LiteralHit["kind"]; re: RegExp }> = [
  { kind: "currency", re: /\$\s?\d[\d,]*(\.\d+)?/g },
  { kind: "currency", re: /\b\d[\d,]*(\.\d+)?\s?(dollars|USD)\b/gi },
  { kind: "percent", re: /(?<![\w$}])\d+(\.\d+)?\s?%/g },
];

export function findLiterals(source: string, file = "<input>"): LiteralHit[] {
  const hits: LiteralHit[] = [];
  source.split(/\r?\n/).forEach((text, i) => {
    if (text.includes(ALLOW)) return;
    for (const { kind, re } of PATTERNS) {
      for (const m of text.matchAll(re)) {
        hits.push({ file, line: i + 1, column: (m.index ?? 0) + 1, match: m[0], kind });
      }
    }
  });
  return hits;
}
