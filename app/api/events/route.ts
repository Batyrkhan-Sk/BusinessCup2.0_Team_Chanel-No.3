import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";

export const runtime = "nodejs";

const Event = z.object({
  name: z.enum(["quiz_start", "result_view", "paywall_view", "checkout_start", "reminder_set"]),
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  session_id: z.string().max(64).optional(),
});

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Analytics sink for the five spec events. Stored when DATABASE_URL is set, otherwise logged. */
export async function POST(req: Request) {
  const parsed = Event.safeParse(parseJson(await req.text()));
  if (!parsed.success) return NextResponse.json({ error: "bad_event" }, { status: 400 });
  const db = getDb();
  let stored = false;
  if (db) {
    stored = await db
      .insert(schema.events)
      .values({ name: parsed.data.name, props: parsed.data.props, session_id: parsed.data.session_id ?? null })
      .then(() => true)
      .catch((e: unknown) => {
        console.error("[analytics] insert failed", e);
        return false;
      });
  } else console.info("[analytics]", parsed.data.name, JSON.stringify(parsed.data.props));
  return NextResponse.json({ ok: true, stored }, { status: 202 });
}
