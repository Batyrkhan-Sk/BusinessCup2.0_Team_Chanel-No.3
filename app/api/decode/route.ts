import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { loadData } from "@/lib/data/load";
import { decodeExtraction } from "@/lib/decoder/decode";
import {
  extractDenialLetter,
  ExtractionInvalidError,
  ExtractionRefusedError,
  LlmNotConfiguredError,
  MAX_UPLOAD_BYTES,
  NotADenialLetterError,
  UnsupportedFileError,
} from "@/lib/llm/extract-denial";
import { readDemoLetter } from "@/lib/server/demo-letter";
import { notConfigured } from "@/lib/server/env";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/decode            multipart/form-data with "file" (photo or PDF)
 * POST /api/decode?demo=1     the fictional DEMO letter, through the same pipeline
 */
export async function POST(req: Request) {
  const demo = new URL(req.url).searchParams.get("demo") === "1";
  let bytes: Uint8Array;
  let mediaType: string;
  if (demo) {
    bytes = await readDemoLetter();
    mediaType = "application/pdf";
  } else {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "no_file", message: "Attach a photo or PDF of the letter." }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "too_large", message: "The file is larger than 10 MB." }, { status: 413 });
    bytes = new Uint8Array(await file.arrayBuffer());
    mediaType = file.type || "application/octet-stream";
  }

  try {
    const r = await extractDenialLetter({ bytes, mediaType });
    const today = new Date().toISOString().slice(0, 10);
    const decoded = decodeExtraction(r.extraction, loadData(), today);
    return NextResponse.json({ demo, decoded, model: r.model, served_by_fallback: r.served_by_fallback });
  } catch (e) {
    if (e instanceof LlmNotConfiguredError) return NextResponse.json(notConfigured("anthropic"), { status: 503 });
    if (e instanceof UnsupportedFileError) return NextResponse.json({ error: e.code, message: e.message }, { status: 415 });
    if (e instanceof NotADenialLetterError || e instanceof ExtractionRefusedError) return NextResponse.json({ error: e.code, message: e.message }, { status: 422 });
    if (e instanceof ExtractionInvalidError) return NextResponse.json({ error: e.code, message: e.message }, { status: 502 });
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "rate_limited", message: "The reading service is busy. Try again in a minute." }, { status: 429 });
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "llm_auth", message: "The reading service rejected this deployment's API key." }, { status: 502 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: "llm_error", message: `The reading service returned an error (${e.status ?? "network"}).` }, { status: 502 });
    console.error("decode failed", e);
    return NextResponse.json({ error: "internal", message: "Something went wrong reading the letter." }, { status: 500 });
  }
}
