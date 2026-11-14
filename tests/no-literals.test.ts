import { describe, expect, it } from "vitest";
import { findLiterals } from "@/lib/lint/literals";

describe("no-literals detector", () => {
  it("flags currency and percent literals in JSX text and strings", () => {
    const src = [
      "<p>Starting at $449/month</p>",
      'const s = "as low as $ 25";',
      "<span>$1,087</span>",
      "<b>56% of users</b>",
      "const t = '12.5 %';",
      "<i>1,087 dollars</i>",
    ].join("\n");
    const hits = findLiterals(src);
    expect(hits.map((h) => h.match)).toEqual(["$449", "$ 25", "$1,087", "56%", "12.5 %", "1,087 dollars"]);
    expect(hits.map((h) => h.line)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("allows data-driven template holes", () => {
    expect(findLiterals("const a = `${formatUsd(price)}`; const w = `${pct}%`;")).toEqual([]);
  });

  it("honours the explicit escape comment", () => {
    expect(findLiterals('<div style={{ width: "100%" }} /> {/* lint-data-allow: layout */}')).toEqual([]);
  });

  it("ignores numbers that are neither money nor percent", () => {
    expect(findLiterals("<h2>Step 3 of 8</h2> <p>180 days</p>")).toEqual([]);
  });
});
