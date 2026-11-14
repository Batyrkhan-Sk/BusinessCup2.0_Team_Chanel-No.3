import { NextResponse } from "next/server";
import { integrationStatus } from "@/lib/server/env";
import { loadData, pricesVerifiedOn } from "@/lib/data/load";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which integrations are configured. Reports names of missing variables only, never values. */
export function GET() {
  return NextResponse.json({ integrations: integrationStatus(), prices_verified_on: pricesVerifiedOn(loadData()) });
}
