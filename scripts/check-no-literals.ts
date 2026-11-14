/**
 * pnpm lint:data — fails if app/ or components/ contain currency or percent literals.
 * components/ui/ (vendored shadcn primitives, no product copy) is excluded.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { findLiterals, type LiteralHit } from "../lib/lint/literals";

const ROOTS = ["app", "components"];
const EXCLUDE = [join("components", "ui")];
const EXT = /\.(tsx?|jsx?|mdx?)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (EXCLUDE.some((e) => relative(e, p) === "" || !relative(e, p).startsWith(".."))) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.test(name)) out.push(p);
  }
  return out;
}

const files = ROOTS.flatMap((r) => {
  try {
    return walk(r);
  } catch {
    return [];
  }
});
const hits: LiteralHit[] = files.flatMap((f) => findLiterals(readFileSync(f, "utf8"), f));

if (hits.length) {
  console.error(`lint:data failed: ${hits.length} hard-coded money/percent literal(s). Render these from /data instead.`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}:${h.column}  ${h.kind}  ${JSON.stringify(h.match)}`);
  process.exit(1);
}
console.log(`lint:data OK: scanned ${files.length} files in ${ROOTS.join(", ")}; no currency or percent literals.`);
