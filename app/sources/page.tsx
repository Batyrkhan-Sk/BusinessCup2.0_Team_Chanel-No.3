import type { Metadata } from "next";
import { loadData } from "@/lib/data/load";
import { formatDate } from "@/lib/format";
import { Card, Eyebrow, Pill, Wrap } from "@/components/ds";
import { PageShell } from "@/components/site/chrome";

export const metadata: Metadata = { title: "Sources and verification" };

type Row = { label: string; source_url: string; verified_at: string; verification?: string; note?: string };

export default function SourcesPage() {
  const d = loadData();
  const groups: Array<{ title: string; rows: Row[] }> = [
    { title: "Cash prices and promos", rows: d.prices.offers.map((o) => ({ label: o.channel_label, source_url: o.source_url, verified_at: o.verified_at, verification: o.verification, note: o.source_note })) },
    { title: "Savings cards", rows: d.savingsCards.cards.map((c) => ({ label: c.label, source_url: c.source_url, verified_at: c.verified_at, verification: c.verification, note: c.source_note })) },
    {
      title: "Medicare GLP-1 Bridge",
      rows: [
        { label: d.medicareBridge.label, source_url: d.medicareBridge.source_url, verified_at: d.medicareBridge.verified_at, verification: d.medicareBridge.verification, note: d.medicareBridge.source_note },
        ...d.medicareBridge.covered_product_ids.map((c) => ({ label: `Covered: ${c.product_id}`, source_url: c.source_url, verified_at: c.verified_at, verification: c.verification })),
      ],
    },
    { title: "Insurer prior-authorization policies", rows: d.insurerRules.insurers.map((r) => ({ label: `${r.insurer_label} · ${r.policy_id}`, source_url: r.source_url, verified_at: r.verified_at, verification: r.verification, note: r.source_note })) },
    { title: "Appeal deadlines", rows: d.appealRules.deadlines.map((x) => ({ label: x.citation, source_url: x.source_url, verified_at: x.verified_at, verification: x.verification })) },
    { title: "Statistics", rows: d.stats.stats.map((s) => ({ label: `${s.display} ${s.statement}`, source_url: s.source_url, verified_at: s.verified_at, verification: s.verification, note: s.attribution })) },
    { title: "Drug catalog (openFDA, machine-ingested)", rows: d.drugs.drugs.map((x) => ({ label: `${x.brand} · ${x.device} · ${x.dose_steps_mg.join(", ")} mg`, source_url: x.source_url, verified_at: x.verified_at, verification: "primary" })) },
  ];
  const tone = (v?: string) => (v === "primary" ? "accent" : v === "secondary" ? "warn" : v === "editorial" ? "info" : "neutral");
  return (
    <PageShell>
      <Wrap className="flex flex-col gap-6 py-8">
        <div className="flex flex-col gap-2">
          <Eyebrow>Sources and verification</Eyebrow>
          <h1 className="text-3xl font-bold tracking-tight">Every number traces to a source and a date</h1>
          <p className="max-w-3xl text-ink-2">
            Primary means read on the owner&apos;s own page or document. Secondary means reporting or search excerpts, used where the primary page blocked automated access.
            Editorial means our own product decision, labelled as such. The full list of what could not be verified is in the repository (data/SOURCES.md).
          </p>
        </div>
        {groups.map((g) => (
          <Card key={g.title} className="overflow-x-auto">
            <h2 className="px-6 pt-5 pb-2 text-lg font-semibold">{g.title}</h2>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {g.rows.map((r, i) => (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="px-6 py-3">
                      {r.label}
                      {r.note && <span className="mt-0.5 block text-xs text-ink-3">{r.note}</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Pill tone={tone(r.verification)}>{r.verification ?? "—"}</Pill>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-ink-3">{formatDate(r.verified_at)}</td>
                    <td className="px-6 py-3 text-xs">
                      {r.source_url.startsWith("internal:") ? (
                        <span className="text-ink-3">our decision</span>
                      ) : (
                        <a href={r.source_url} target="_blank" rel="noreferrer" className="break-all text-brand">
                          {new URL(r.source_url).hostname}
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </Wrap>
    </PageShell>
  );
}
