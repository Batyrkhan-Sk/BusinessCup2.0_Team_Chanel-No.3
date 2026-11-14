/** SERVER-ONLY. Reads the fictional DEMO letter fixture from disk. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const DEMO_LETTER_PATH = join(process.cwd(), "fixtures", "demo-denial-letter.pdf");
export async function readDemoLetter(): Promise<Uint8Array> {
  return new Uint8Array(await readFile(DEMO_LETTER_PATH));
}
