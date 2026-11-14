import { describe, expect, it } from "vitest";
import { loadData, pricesVerifiedOn } from "@/lib/data/load";

/** Walk any JSON value and collect objects that look like records (have an id-ish key). */
function records(v: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(v)) v.forEach((x) => records(x, out));
  else if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("source_url" in o) out.push(o);
    Object.values(o).forEach((x) => records(x, out));
  }
  return out;
}

describe("data integrity", () => {
  const b = loadData();

  it("loads and cross-checks every data file", () => {
    expect(b.drugs.drugs.length).toBeGreaterThan(0);
    expect(pricesVerifiedOn(b)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("every record with a source_url also has a verified_at date (and every file is dated)", () => {
    for (const f of [b.drugs, b.prices, b.savingsCards, b.insurerRules, b.appealRules, b.stats]) expect(f.verified_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const rs = records(b);
    expect(rs.length).toBeGreaterThan(40);
    for (const r of rs) {
      expect(r.source_url, JSON.stringify(r).slice(0, 120)).toBeTruthy();
      expect(r.verified_at, JSON.stringify(r).slice(0, 120)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every price offer, card and insurer rule set carries provenance", () => {
    for (const o of [...b.prices.offers, ...b.savingsCards.cards, ...b.insurerRules.insurers, ...b.stats.stats]) {
      expect(o.source_url).toBeTruthy();
      expect(o.verified_at).toBeTruthy();
    }
  });

  it("drug dose steps come from openFDA in ascending order", () => {
    for (const d of b.drugs.drugs) {
      expect([...d.dose_steps_mg].sort((x, y) => x - y)).toEqual(d.dose_steps_mg);
      expect(d.source_url).toContain("api.fda.gov");
    }
  });
});
