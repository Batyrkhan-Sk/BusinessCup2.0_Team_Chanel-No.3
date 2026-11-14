import { readDemoLetter } from "@/lib/server/demo-letter";

export const runtime = "nodejs";

/** Serves the fictional DEMO denial letter so users can see exactly what is being decoded. */
export async function GET() {
  const bytes = await readDemoLetter();
  return new Response(Buffer.from(bytes), {
    headers: { "content-type": "application/pdf", "content-disposition": 'inline; filename="dosecost-demo-denial-letter-FICTIONAL.pdf"' },
  });
}
