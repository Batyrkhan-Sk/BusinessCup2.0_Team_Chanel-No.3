import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { loadData } from "@/lib/data/load";
import { landingView } from "@/lib/views/landing";
import { DEMO_CASE, DEMO_LETTER, DEMO_PERSONAS } from "@/lib/fixtures";
import { formatDate, formatUsd, formatUsdRange } from "@/lib/format";
import { btn, Card, Check, DemoBadge, Eyebrow, Num, Pill, Wrap } from "@/components/ds";
import { PageShell, VerifiedLine } from "@/components/site/chrome";
import { StatCard } from "@/components/site/stat-card";
import { EndingSoon } from "@/components/site/ending-soon";
import { WINNABILITY_LABEL } from "@/lib/content";

/** Re-render hourly so the "days left" count on expiring discounts stays current. */
export const revalidate = 3600;

export default function LandingPage() {
  const data = loadData();
  const v = landingView(data, { cases: DEMO_CASE, jessica: DEMO_PERSONAS.jessica.input, sam: DEMO_PERSONAS.sam.input, letter: DEMO_LETTER });
  const stat = (id: string) => data.stats.stats.find((s) => s.id === id)!;
  const guardian = data.pricing.plans;
  const monthly = guardian.find((p) => p.id === "monthly")!;
  const yearly = guardian.find((p) => p.id === "yearly")!;

  return (
    <PageShell>
      {/* Hero: the price moves without warning; two doors by situation */}
      <Wrap className="grid items-center gap-12 pt-8 pb-14 md:grid-cols-2 md:pt-12">
        <div className="flex flex-col gap-6">
          <Eyebrow>GLP-1 Cost Guardian · Zepbound, Wegovy and more</Eyebrow>
          <h1 className="text-[34px] leading-[1.06] font-bold tracking-tight md:text-[52px]">
            Your GLP-1 can cost <Num className="text-[42px] text-brand md:text-[60px]">{formatUsd(v.hero.low_usd)}</Num> or{" "}
            <Num className="text-[42px] text-danger md:text-[60px]">{formatUsd(v.hero.high_usd)}</Num> a month.
          </h1>
          <p className="max-w-[540px] text-lg text-ink-2 md:text-xl">
            The price jumps without warning: a denial, an approval that expires, a refill one day late, an intro offer that ends. We find your lowest price
            today from official sources only (no compounded copies) and warn you before the next jump.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/decode"
              className="group flex flex-col gap-1 rounded-[var(--dc-r-lg)] bg-brand p-4 text-white no-underline shadow-md transition-colors hover:bg-brand-ink focus-visible:shadow-[var(--dc-focus)]"
            >
              <span className="text-sm text-white/80">Insurance said no?</span>
              <span className="flex items-center justify-between gap-2 text-base font-semibold md:text-[17px]">
                Decode my denial letter
                <ArrowRight aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <Link
              href="/quiz"
              className="group flex flex-col gap-1 rounded-[var(--dc-r-lg)] border border-border bg-surface p-4 text-ink no-underline shadow-sm transition-colors hover:border-brand focus-visible:shadow-[var(--dc-focus)]"
            >
              <span className="text-sm text-ink-2">Paying cash, or about to start?</span>
              <span className="flex items-center justify-between gap-2 text-base font-semibold md:text-[17px]">
                Check my lowest price
                <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-brand transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
          <Link href="/decode?demo=1" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-brand">
            <DemoBadge className="min-h-[22px] px-2 text-[11px]" />
            No letter? Try a sample one
          </Link>
          <div className="flex flex-wrap gap-5">
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
              <span aria-hidden="true" className="inline-block size-2 rounded-full bg-brand" />
              No login. No drug sales. No pharma money.
            </span>
            <VerifiedLine />
          </div>
        </div>

        <Card className="flex flex-col gap-4 p-5 shadow-lg md:p-6" aria-label="Example decoded denial (DEMO)">
          <div className="flex items-center justify-between">
            <Eyebrow>Example: the sample letter, decoded</Eyebrow>
            <DemoBadge />
          </div>
          <p className="text-lg leading-snug font-semibold md:text-[22px]">
            Denied for <span className="text-brand">{v.example.category_label.toLowerCase()}</span>, not because the drug is excluded.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--dc-r-md)] bg-background p-4">
              <span className="text-xs text-ink-3">Appeal by</span>
              <div className="num text-[26px] md:text-[32px]">{formatDate(v.example.file_by)}</div>
              <span className="text-xs text-ink-3">{v.example.filing_window_days} days from the notice</span>
            </div>
            <div className="rounded-[var(--dc-r-md)] bg-background p-4">
              <span className="text-xs text-ink-3">Worth appealing?</span>
              <div className="num text-[26px] text-brand md:text-[32px]">{formatUsd(v.example.at_stake_usd)}</div>
              <span className="text-xs text-ink-3">a year at stake · {WINNABILITY_LABEL[v.example.winnability].toLowerCase()}</span>
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {["Baseline chart note from your doctor", "Weight-program records for the period your plan requires", "Letter of medical necessity, doctor-signed"].map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-sm">
                <Check on={false} />
                {t}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <span className="text-sm text-ink-2">
              Meanwhile: {v.example.best_label}, <strong className="text-ink">{formatUsd(v.example.best_monthly_top_usd)}/mo</strong> at most, not{" "}
              {formatUsd(v.example.current_monthly_usd)}
            </span>
            <Link className="text-sm font-semibold text-brand" href="/decode?demo=1">
              Run the sample
            </Link>
          </div>
        </Card>
      </Wrap>

      <EndingSoon data={data} />

      {/* Guardian tracking surfaces */}
      <Wrap className="pb-16">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>Guardian keeps watch, every month</Eyebrow>
            <h2 className="text-[26px] font-bold tracking-tight md:text-[32px]">Prices change. Approvals expire. We tell you first.</h2>
          </div>
          <Link className={btn({ variant: "secondary" })} href="/guardian">
            See a live case
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="flex flex-col gap-2.5 p-6">
            <div className="flex items-center justify-between">
              <Pill tone="warn">Approval renewal (PA)</Pill>
              <span className="text-xs text-ink-3">DEMO case</span>
            </div>
            <Num className="text-[44px]">in {v.guardian.renewal_days} days</Num>
            <p className="text-sm text-ink-2">
              The Zepbound approval ends {formatDate(v.guardian.renewal_ends_on)}. The baseline chart note is stored, so the renewal does not fail for missing data.
            </p>
          </Card>
          <Card className="flex flex-col gap-2.5 p-6">
            <div className="flex items-center justify-between">
              <Pill tone="danger">Promo ending</Pill>
              <span className="text-xs text-ink-3">DEMO · Wegovy pen</span>
            </div>
            <Num className="text-[44px]">
              {formatUsd(v.guardian.promo_intro_usd)} → {formatUsd(v.guardian.promo_then_usd)}
            </Num>
            <p className="text-sm text-ink-2">
              The intro price ends after the next fill. The offer runs through {formatDate(v.guardian.promo_valid_through)}; we remind you before the price
              changes, not after.
            </p>
          </Card>
          <Card className="flex flex-col gap-2.5 p-6">
            <div className="flex items-center justify-between">
              <Pill tone="accent">Did you overpay?</Pill>
              <span className="text-xs text-ink-3">Monthly check</span>
            </div>
            <Num className="text-[44px] text-danger">{formatUsd(v.guardian.overpaid_usd, { signed: true })}</Num>
            <p className="text-sm text-ink-2">Enter what the pharmacy charged. We compare it with the price you should pay and tell you exactly what to ask for.</p>
          </Card>
        </div>
      </Wrap>

      {/* Stats */}
      <Wrap className="pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard stat={stat("hard_to_afford")} extra={`${stat("hard_to_afford_insured").display} of insured users say the same.`} />
          <StatCard stat={stat("appeal_rate")} extra="Most people never find out a denial was fixable." />
          <StatCard stat={stat("employers_cover_2026")} extra={`Only ${stat("employers_continue_2027").display} of them say they are likely to keep it in 2027.`} />
        </div>
      </Wrap>

      {/* Channels */}
      <Wrap className="grid items-start gap-12 pb-16 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Eyebrow>Many prices for one drug</Eyebrow>
          <h2 className="text-[26px] leading-tight font-bold tracking-tight md:text-[32px]">Same medicine. Six official prices. Each with rules.</h2>
          <p className="text-ink-2">
            Cash prices change with your dose step and when promos expire. Cash offers cannot be combined with insurance or government plans. We model all of it
            over 12 months, not just today&apos;s sticker.
          </p>
          <Link className={btn({ variant: "secondary", className: "self-start" })} href="/quiz">
            Find my cheapest path
          </Link>
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
                <th scope="col" className="px-3 py-2.5">Option</th>
                <th scope="col" className="px-3 py-2.5">Who qualifies</th>
                <th scope="col" className="px-3 py-2.5 text-right">Per month</th>
              </tr>
            </thead>
            <tbody>
              {v.channels.map((c) => (
                <tr key={c.label} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 align-top">{c.label}</td>
                  <td className="px-3 py-3 align-top text-ink-2">
                    {c.who}
                    {"window" in c && c.window ? `, ${formatDate(c.window[0])}–${formatDate(c.window[1])}` : ""}
                    {"promo_through" in c && c.promo_through ? ` (to ${formatDate(c.promo_through)})` : ""}
                  </td>
                  <td className={`num px-3 py-3 text-right align-top text-xl whitespace-nowrap ${"danger" in c && c.danger ? "text-danger" : ""}`}>
                    {"as_low_as" in c.price ? `as low as ${formatUsd(c.price.as_low_as)}` : "flat" in c.price ? formatUsd(c.price.flat) : formatUsdRange(c.price.range)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Wrap>

      {/* Pricing */}
      <Wrap className="pb-16">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col gap-3 p-6">
            <Eyebrow>Free, no login</Eyebrow>
            <Num className="text-5xl">{formatUsd(0)}</Num>
            <p className="text-ink-2">{data.pricing.free_features.join(" · ")}.</p>
            <Link className={btn({ variant: "secondary", className: "self-start" })} href="/decode">
              Decode a letter
            </Link>
          </Card>
          <Card accent className="flex flex-col gap-3 p-6">
            <Eyebrow onDark>Guardian</Eyebrow>
            <div className="flex items-baseline gap-2">
              <Num className="text-5xl">{formatUsd(monthly.price_usd)}</Num>
              <span className="text-white/80">/month, or {formatUsd(yearly.price_usd)}/year</span>
            </div>
            <p className="text-white/80">{data.pricing.guardian_features.join(" · ")}.</p>
            <Link className={btn({ variant: "onDark", className: "self-start" })} href="/paywall">
              See Guardian
            </Link>
          </Card>
        </div>
      </Wrap>
    </PageShell>
  );
}
