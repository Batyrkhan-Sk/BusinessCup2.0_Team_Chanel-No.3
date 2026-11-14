/**
 * Runs fixtures/demo-denial-letter.pdf through the live pipeline:
 * Claude vision extraction (zod-validated) → code decode (category, deadlines, checklist).
 *
 *   pnpm extract:demo            (needs ANTHROPIC_API_KEY in the environment or .env.local)
 *
 * Without a key it exits with code 2 and a clear message. It never prints a made-up result.
 */
import { readFileSync, existsSync } from "node:fs";
import { loadData } from "../lib/data/load";
import { decodeExtraction } from "../lib/decoder/decode";
import { extractDenialLetter, LlmNotConfiguredError } from "../lib/llm/extract-denial";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnvLocal();
  const bytes = readFileSync("fixtures/demo-denial-letter.pdf");
  const today = new Date().toISOString().slice(0, 10);
  try {
    const r = await extractDenialLetter({ bytes, mediaType: "application/pdf" });
    const decoded = decodeExtraction(r.extraction, loadData(), today);
    console.log(JSON.stringify({ model: r.model, served_by_fallback: r.served_by_fallback, usage: r.usage, decoded }, null, 2));
  } catch (e) {
    if (e instanceof LlmNotConfiguredError) {
      console.error(e.message);
      process.exit(2);
    }
    throw e;
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? `${e.name}: ${e.message}` : e);
  process.exit(1);
});
