import Link from "next/link";
import { CalendarClock } from "lucide-react";
import type { DataBundle } from "@/lib/data/schemas";
import { getDrug } from "@/lib/engine/catalog";
import { daysBetween } from "@/lib/engine/dates";
import { formatDate, formatUsd, todayIso } from "@/lib/format";
import { Wrap } from "@/components/ds";

type Ending = { date: string; text: string };

/** Discounts in the data that are about to expire. Built from savings cards and promo offers, so it disappears on its own once the dates pass. */
function upcomingEndings(data: DataBundle, today: string): Ending[] {
  const cards: Ending[] = data.savingsCards.cards
    .filter((c) => c.expires_on && c.applies_when === "with_coverage" && c.as_low_as_monthly_usd != null)
    .map((c) => ({ date: c.expires_on as string, text: `${c.label.split(" (")[0]}: as low as ${formatUsd(c.as_low_as_monthly_usd)} a month with coverage` }));
  const promos: Ending[] = data.prices.offers
    .filter((o) => o.promo?.valid_through)
    .map((o) => ({
      date: o.promo!.valid_through as string,
      text: `${getDrug(data, o.product_id).brand} intro price: ${formatUsd(o.promo!.intro_monthly_usd)} a month for the first ${o.promo!.intro_fills} fills`,
    }));
  return [...cards, ...promos].filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

export function EndingSoon({ data }: { data: DataBundle }) {
  const today = todayIso();
  const all = upcomingEndings(data, today);
  if (all.length === 0) return null;
  const date = all[0].date;
  const items = all.filter((e) => e.date === date);
  const days = daysBetween(today, date);

  return (
    <Wrap className="pb-14">
      <div className="flex flex-col gap-4 rounded-[var(--dc-r-lg)] border border-warn/30 bg-warn-soft p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-start gap-4">
          <CalendarClock aria-hidden="true" className="mt-0.5 size-7 shrink-0 text-warn" />
          <div className="flex flex-col gap-1.5">
            <p className="text-lg font-semibold text-ink">
              {items.length > 1 ? `${items.length} discounts end` : "A discount ends"} {formatDate(date)}{" "}
              <span className="text-warn">· {days === 0 ? "today" : days === 1 ? "1 day left" : `${days} days left`}</span>
            </p>
            <ul className="flex flex-col gap-0.5 text-sm text-ink-2">
              {items.map((e) => (
                <li key={e.text}>{e.text}</li>
              ))}
            </ul>
          </div>
        </div>
        <Link
          href="/quiz"
          className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-[var(--dc-r-md)] bg-ink px-4 text-sm font-semibold text-white no-underline hover:bg-ink/90 focus-visible:shadow-[var(--dc-focus)] md:self-center"
        >
          What it means for my price →
        </Link>
      </div>
    </Wrap>
  );
}
