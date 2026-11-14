"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChannelOption } from "@/lib/engine/types";
import { formatMonth, formatUsd } from "@/lib/format";

export function CostChart({ best, conditional, currentMonthly }: { best: ChannelOption; conditional: ChannelOption | null; currentMonthly: number | null }) {
  const rows = best.months.map((m, i) => ({
    month: formatMonth(m.month),
    best: m.price_usd,
    conditional: conditional?.months[i]?.price_usd ?? null,
    current: currentMonthly,
    dose: m.dose_mg,
  }));
  const summary = `${best.label}: ${rows.map((r) => `${r.month} ${formatUsd(r.best)}`).join(", ")}${currentMonthly !== null ? `. Today's cost ${formatUsd(currentMonthly)} a month.` : ""}`;
  return (
    <figure className="flex flex-col gap-3">
      <div className="h-[240px] w-full" role="img" aria-label={summary}>
        <ResponsiveContainer /* lint-data-allow: layout size */ width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--dc-border)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--dc-ink-3)", fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: "var(--dc-ink-3)", fontSize: 12 }} tickFormatter={(v: number) => formatUsd(v)} />
            <Tooltip
              cursor={{ fill: "var(--dc-surface-2)" }}
              formatter={(v, name) => [formatUsd(Number(v)), name === "best" ? best.label : name === "current" ? "Today's cost" : conditional?.label ?? ""]}
              contentStyle={{ borderRadius: 12, border: "1px solid var(--dc-border)", fontSize: 13 }}
            />
            <Bar dataKey="best" fill="var(--dc-accent)" radius={[4, 4, 0, 0]} isAnimationActive />
            {conditional && <Bar dataKey="conditional" fill="var(--dc-accent-soft)" radius={[4, 4, 0, 0]} />}
            {currentMonthly !== null && <Line dataKey="current" stroke="var(--dc-danger)" strokeDasharray="6 4" dot={false} strokeWidth={2} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="flex flex-wrap gap-4 text-[13px] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-[3px] bg-brand" />
          {best.label}
        </span>
        {conditional && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-[3px] border border-border bg-brand-soft" />
            {conditional.label}
          </span>
        )}
        {currentMonthly !== null && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 bg-danger" />
            What you pay today
          </span>
        )}
      </figcaption>
    </figure>
  );
}
