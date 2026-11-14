/**
 * Generates fixtures/demo-denial-letter.pdf: a realistic but clearly FICTIONAL
 * prior-authorization denial used by the "Try DEMO letter" button. It goes
 * through the same extraction pipeline as a real upload.
 *
 *   pnpm fixtures:letter
 */
import { writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { DEMO_LETTER_LINES as LINES } from "../fixtures/demo-letter-content";


async function main() {
  const pdf = await PDFDocument.create();
  pdf.setTitle("DEMO denial letter (fictional)");
  pdf.setAuthor("DoseCost (DEMO fixture)");
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText("DEMO · FICTIONAL", {
    x: 150, y: 330, size: 64, font: bold, color: rgb(0.85, 0.85, 0.85), rotate: degrees(35), opacity: 0.5,
  });

  let y = 740;
  for (const l of LINES) {
    const size = l.size ?? 10.5;
    page.drawText(l.text.replace(/·/g, "-").replace(/–/g, "-"), { x: 56, y, size, font: l.bold ? bold : font, color: rgb(0.1, 0.12, 0.12) });
    y -= size + 4 + (l.gap ?? 0);
  }
  const bytes = await pdf.save();
  writeFileSync("fixtures/demo-denial-letter.pdf", bytes);
  console.log(`wrote fixtures/demo-denial-letter.pdf (${bytes.byteLength} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
