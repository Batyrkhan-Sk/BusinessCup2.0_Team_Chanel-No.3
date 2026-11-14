import type { z } from "zod";
import type { StatSchema } from "@/lib/data/schemas";
import { Card, Num } from "@/components/ds";
import { formatDate } from "@/lib/format";

export function StatCard({ stat, extra }: { stat: z.infer<typeof StatSchema>; extra?: string }) {
  return (
    <Card className="flex flex-col gap-2 p-6">
      <Num className="text-5xl">{stat.display}</Num>
      <p>
        {stat.statement} {extra}
      </p>
      <a href={stat.source_url} className="text-xs text-ink-3 underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
        {stat.attribution}
        {stat.published_on ? `, ${formatDate(stat.published_on)}` : ""}
        {stat.verification !== "primary" ? " (secondary source)" : ""}
      </a>
    </Card>
  );
}
