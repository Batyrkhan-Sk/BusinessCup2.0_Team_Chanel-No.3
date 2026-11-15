"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { loadData, pricesVerifiedOn } from "@/lib/data/load";
import { bestPath } from "@/lib/engine/path";
import { worthAppealing } from "@/lib/engine/denial";
import { getDrug } from "@/lib/engine/catalog";
import type { ChannelOption, PathResult } from "@/lib/engine/types";
import { useCase } from "@/lib/client/use-case";
import { track } from "@/lib/client/analytics";
import { reminderOptions } from "@/lib/views/reminders";
import { DEMO_CASE, DEMO_PERSONAS } from "@/lib/fixtures";
import { CAVEAT_COPY, COVERAGE_LABELS, REASON_COPY, STATUS_LABEL, WINNABILITY_LABEL } from "@/lib/content";
import { formatDate, formatUsd, formatUsdRange, todayIso } from "@/lib/format";
import { btn, Card, DemoBadge, Eyebrow, Notice, Num, Pill, Skeleton, Wrap, type PillTone } from "@/components/ds";
import { CostChart } from "./cost-chart";
import { EmailPreview } from "@/components/email/email-preview";
import { ReminderSignup } from "@/components/email/reminder-signup";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const data = loadData();

export function ResultView() {
  const c = useCase();
  const reduce = useReducedMotion();
  const [previewIdx, setPreviewIdx] = useState(0);

  const computed = useMemo(() => {
    if (c.status !== "ready") return null;
    try {
      const path = bestPath(c.input, data);
      const options = reminderOptions(data, {
        input: c.input,
        path,
        decoded: c.decoded,
        demo: c.demo,
        demoCase: DEMO_CASE,
        personas: { jessica: DEMO_PERSONAS.jessica.input, sam: DEMO_PERSONAS.sam.input },
        today: c.demo ? DEMO_CASE.today : todayIso(),
      });
      const worth = c.decoded && path.at_stake_usd !== null ? worthAppealing(c.decoded.category, path.at_stake_usd, data.appealRules) : null;
      return { path, options, worth, error: null as string | null };
    } catch (e) {
      return { path: null, options: [], worth: null, error: e instanceof Error ? e.message : "Could not compute your path." };
    }
  }, [c]);

  useEffect(() => {
    if (c.status === "ready" && computed?.path) track("result_view", { demo: c.demo ?? "none", best: computed.path.best?.id ?? "none" });
  }, [c, computed]);

  if (c.status === "loading") return <ResultSkeleton />;
  if (c.status === "empty" || c.status === "invalid")
    return (
      <Wrap className="py-16">
        <Card className="mx-auto flex max-w-xl flex-col gap-4 p-8 text-center">
          <h1 className="text-2xl font-bold">{c.status === "empty" ? "No answers yet" : "Let's finish your answers"}</h1>
          <p className="text-ink-2">{c.status === "invalid" ? c.message : "Answer 8 quick questions and we find your lowest price. Or run a DEMO persona."}</p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Link className={btn()} href="/quiz">
              Start the quiz
            </Link>
            <Link className={btn({ variant: "secondary" })} href="/result?demo=jessica">
              DEMO: Jessica
            </Link>
          </div>
        </Card>
      </Wrap>
    );
  if (!computed?.path) return <Wrap className="py-16"><Notice tone="danger" title="Something went wrong">{computed?.error}</Notice></Wrap>;

  const { path, options, worth } = computed;
  const input = c.input;
  const drug = getDrug(data, input.product_id);
  const best = path.best;
  const reveal = reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: "easeOut" as const } };
  const preview = options[Math.min(previewIdx, options.length - 1)];

  return (
    <Wrap className="flex flex-col gap-8 pt-4 pb-16">
      <div className="flex flex-wrap items-center gap-2">
        {c.demo && <Pill tone="neutral">{DEMO_PERSONAS[c.demo].label}</Pill>}
        <Pill tone="neutral">{COVERAGE_LABELS[input.coverage]}</Pill>
        <Pill tone="neutral">
          {drug.brand} · {input.current_dose_mg ?? drug.dose_steps_mg[0]} mg{input.target_dose_mg && input.target_dose_mg !== input.current_dose_mg ? ` → ${input.target_dose_mg} mg` : ""}
        </Pill>
        {c.demo && <DemoBadge />}
        <Link href="/quiz" className={btn({ variant: "secondary", size: "sm", className: "ml-auto" })}>
          Edit answers
        </Link>
      </div>

      {best ? (
        <motion.section {...reveal} className="grid items-center gap-8 rounded-[var(--dc-r-lg)] bg-brand p-6 text-white shadow-md md:grid-cols-[1fr_420px] md:p-10">
          <div className="flex flex-col gap-3">
            <Eyebrow onDark>Your lowest price today</Eyebrow>
            <h1 className="text-[28px] leading-tight font-bold tracking-tight md:text-[40px]">{best.label}</h1>
            <p className="max-w-[560px] text-lg text-white/80">
              {(best.reasons.map((r) => REASON_COPY[r]).filter(Boolean).join(". ") || "Available with what you told us").replace(/\.?$/, ".")}
              {best.caveats.includes("cash_only_cannot_combine_with_insurance") ? ` ${CAVEAT_COPY.cash_only_cannot_combine_with_insurance}.` : ""}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {path.best_conditional && (
                <Link className={btn({ variant: "onDark", size: "lg" })} href={c.demo ? `/coverage?demo=${c.demo}` : "/coverage"}>
                  How to get it to {formatUsd(path.best_conditional.monthly_range_usd?.[0] ?? null)}
                </Link>
              )}
              {input.status === "pa_denied" && (
                <Link className={btn({ variant: "outlineOnDark", size: "lg" })} href={c.demo ? "/decode?demo=1" : "/decode"}>
                  Decode my denial
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-[var(--dc-r-lg)] bg-white/10 p-6">
            {path.savings_vs_current_usd !== null ? (
              <div>
                <Eyebrow onDark>{path.savings_vs_current_usd >= 0 ? "You save over 12 months" : "Next 12 months cost more than today"}</Eyebrow>
                <Num className="block text-[64px] md:text-[88px]">{formatUsd(Math.abs(path.savings_vs_current_usd))}</Num>
                {path.savings_vs_current_usd < 0 && (
                  <div className="mt-2 flex flex-col gap-3">
                    <p className="text-sm text-white/90">
                      Your price is going up, for example because an intro offer ends. This is still the lowest official option we found. Here&apos;s how to keep it
                      as low as possible:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a className={btn({ variant: "onDark", size: "sm" })} href="#preview-h">
                        Remind me before it changes
                      </a>
                      <Link className={btn({ variant: "outlineOnDark", size: "sm" })} href={c.demo ? `/coverage?demo=${c.demo}` : "/coverage"}>
                        Check if insurance could cover it
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Eyebrow onDark>Your 12-month total</Eyebrow>
                <Num className="block text-[64px] md:text-[88px]">{formatUsd(best.total_usd)}</Num>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-white/80">Your path</span>
                <Num className="block text-[32px]">{formatUsd(best.total_usd)}</Num>
                <span className="text-xs text-white/80">{formatUsdRange(best.monthly_range_usd)}/mo</span>
              </div>
              {path.current_12mo_usd !== null && (
                <div>
                  <span className="text-xs text-white/80">At today&apos;s price</span>
                  <Num className="block text-[32px]">{formatUsd(path.current_12mo_usd)}</Num>
                  <span className="text-xs text-white/80">{formatUsd(input.current_monthly_cost_usd)}/mo</span>
                </div>
              )}
            </div>
          </div>
        </motion.section>
      ) : (
        <Notice tone="warn" title="No path we can price">
          None of the options we track can price this medicine for your coverage. The table below shows why.
        </Notice>
      )}

      <section className={cn("grid gap-6", best && "lg:grid-cols-2")}>
        {best && (
          <Card className="flex flex-col gap-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[22px] font-semibold">12-month cost path</h2>
              <span className="text-xs text-ink-3">Monthly, with your dose steps</span>
            </div>
            <CostChart best={best} conditional={path.best_conditional} currentMonthly={input.current_monthly_cost_usd} />
            {best.caveats
              .filter((k) => k !== "cash_only_cannot_combine_with_insurance")
              .map((k) => (
                <Notice key={k} tone="warn">
                  {CAVEAT_COPY[k] ?? k}
                </Notice>
              ))}
            <RefillNote option={best} />
          </Card>
        )}
        <ChannelTable path={path} rows={path.options.filter((o) => o.rx_change !== "medicine")} />
      </section>
      <AskDoctorSection options={path.options.filter((o) => o.rx_change === "medicine")} />

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col gap-3 p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[22px] font-semibold">Worth appealing?</h2>
            {worth ? (
              <Pill tone={worth.worth_it ? "accent" : "danger"}>
                {worth.worth_it ? "Yes" : "Probably not"} · {WINNABILITY_LABEL[worth.winnability].toLowerCase()}
              </Pill>
            ) : (
              <Pill tone="neutral">{input.status === "pa_denied" ? "Decode your letter to score it" : "No denial on file"}</Pill>
            )}
          </div>
          {path.at_stake_usd !== null ? (
            <div className="flex flex-wrap items-end gap-8">
              <div>
                <span className="text-xs text-ink-3">At stake over 12 months</span>
                <Num className="block text-5xl text-brand">{formatUsd(path.at_stake_usd)}</Num>
                <span className="text-xs text-ink-3">your path minus the approved-plan path</span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                {worth ? (
                  <p className="text-sm">
                    Your denial reason maps to <strong>{c.decoded?.category_label.toLowerCase()}</strong>. {c.decoded?.plain_english}
                  </p>
                ) : (
                  <p className="text-sm">Upload the denial letter and we estimate how fixable it is from the type of denial: missing paperwork is often fixable, a plan exclusion rarely is.</p>
                )}
                <span className="text-xs text-ink-3">
                  Score = money at stake × an editorial weight for the denial type (not a probability). Context: insurers upheld most appeals that were filed in
                  2024 marketplace data, with no breakdown by reason.
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-2">There is no approval-dependent path that would beat your current best path, so there is nothing to win by appealing.</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link className={btn()} href={c.demo ? "/decode?demo=1" : "/decode"}>
              Decode my denial letter
            </Link>
            <Link className={btn({ variant: "secondary" })} href={c.demo ? `/appeal?demo=${c.demo}` : "/appeal"}>
              Build the appeal pack
            </Link>
          </div>
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <Eyebrow>What we will watch for you</Eyebrow>
          {options.length ? (
            options.map((o) => (
              <div key={o.id} className="flex items-start gap-2.5 text-sm">
                <Pill tone={toneFor(o.payload.kind)}>{shortKind(o.payload.kind)}</Pill>
                <span>{o.label}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-2">Nothing time-sensitive yet. We will add items as your case changes.</p>
          )}
          <span className="text-xs text-ink-3">Prices verified on {formatDate(pricesVerifiedOn(data))}</span>
        </Card>
      </section>

      {preview && (
        <section className="grid items-start gap-8 rounded-[var(--dc-r-lg)] border border-border bg-surface p-6 shadow-sm md:grid-cols-[5fr_7fr] md:p-8" aria-labelledby="preview-h">
          <div className="flex flex-col gap-4">
            <Eyebrow>Reminder email preview</Eyebrow>
            <h2 id="preview-h" className="text-[24px] leading-tight font-bold tracking-tight md:text-[28px]">
              This is the email you will get before each date.
            </h2>
            <p className="text-ink-2">The actual message, with your numbers filled in.</p>
            {options.length > 1 && (
              <Tabs value={String(previewIdx)} onValueChange={(v) => setPreviewIdx(Number(v))}>
                <TabsList aria-label="Preview which reminder" className="h-auto w-fit max-w-full flex-wrap justify-start gap-1 bg-surface-2 p-1">
                  {options.map((o, i) => (
                    <TabsTrigger key={o.id} value={String(i)} className="h-8 flex-none px-2.5 text-[13px] data-active:bg-surface data-active:text-ink data-active:shadow-sm">
                      {shortKind(o.payload.kind)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            <ReminderSignup options={options} snapshot={{ input, demo: c.demo }} demo={Boolean(c.demo)} />
          </div>
          <div className="rounded-[var(--dc-r-lg)] bg-surface-2 p-4 md:p-6">
            <EmailPreview payload={preview.payload} />
          </div>
        </section>
      )}

      <p className="text-xs text-ink-3">
        Not medical, legal or financial advice. Dose steps come from the FDA label and your answers; we never suggest a dose or a medicine. Program terms belong to
        the manufacturers, CMS and your plan, and can change.
      </p>
    </Wrap>
  );
}

function shortKind(k: string) {
  return ({ promo_ending: "Promo", pa_renewal: "Renewal", refill_window: "Refill", appeal_deadline: "Appeal", monthly_check: "Monthly", discount_ending: "Discount", plan_year: "New year" } as Record<string, string>)[k] ?? k;
}
function toneFor(k: string): PillTone {
  return ({ promo_ending: "danger", pa_renewal: "warn", refill_window: "warn", appeal_deadline: "info", monthly_check: "accent", discount_ending: "danger", plan_year: "info" } as Record<string, PillTone>)[k] ?? "neutral";
}

function RefillNote({ option }: { option: ChannelOption }) {
  const offer = data.prices.offers.find((o) => o.id === option.id);
  const late = offer?.dose_prices.filter((p) => p.late_refill_monthly_usd !== undefined) ?? [];
  if (!offer?.refill_window_days || !late.length) return null;
  const lateRange: [number, number] = [Math.min(...late.map((p) => p.late_refill_monthly_usd!)), Math.max(...late.map((p) => p.late_refill_monthly_usd!))];
  return (
    <Notice tone="warn">
      From {late[0].dose_mg} mg up, {formatUsd(late[0].monthly_usd)} holds only when you refill within {offer.refill_window_days} days of your last delivery. A late refill
      is {formatUsdRange(lateRange)}. We will remind you.
    </Notice>
  );
}

function statusTone(o: ChannelOption, best: ChannelOption | null): { tone: PillTone; text: string } {
  if (best && o.id === best.id) return { tone: "accent", text: "Best now" };
  if (o.rx_change === "medicine") return { tone: "info", text: "Ask your doctor" };
  if (o.status === "conditional") return { tone: "warn", text: o.reasons.includes("if_appeal_wins") ? "If appeal wins" : STATUS_LABEL.conditional };
  if (o.status === "ineligible") return { tone: "danger", text: STATUS_LABEL.ineligible };
  if (best && o.total_usd !== null && best.total_usd !== null && o.total_usd > best.total_usd) return { tone: "neutral", text: "Costs more" };
  return { tone: "neutral", text: STATUS_LABEL.eligible };
}

function ChannelTable({ path, rows: input }: { path: PathResult; rows: ChannelOption[] }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...input].sort((a, b) => rank(a, path) - rank(b, path));
  /** Options that cost more or are not available are folded away, so the table stays as tall as the chart beside it. */
  const secondary = (o: ChannelOption) => o.status === "ineligible" || statusTone(o, path.best).text === "Costs more";
  const hidden = path.best ? sorted.filter(secondary).length : 0;
  const rows = showAll || hidden === 0 ? sorted : sorted.filter((o) => !secondary(o));
  return (
    <Card className="overflow-hidden">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-[22px] font-semibold">Your options for this medicine</h2>
        <span className="text-sm text-ink-2">Every way to buy it, checked against your answers</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
              <th scope="col" className="px-4 py-2.5">Option</th>
              <th scope="col" className="px-4 py-2.5">Status</th>
              <th scope="col" className="px-4 py-2.5 text-right">12 months</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const s = statusTone(o, path.best);
              const why = [...o.reasons.map((r) => REASON_COPY[r]), ...o.caveats.filter((k) => k === "government_eligibility_unverified" || k === "as_low_as_price").map((k) => CAVEAT_COPY[k])].filter(Boolean);
              return (
                <tr key={o.id} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-3">
                    <strong>{o.label}</strong>
                    {why.length > 0 && <span className="mt-0.5 block text-xs text-ink-3">{why.join(" · ")}</span>}
                    <span className="mt-0.5 block text-xs text-ink-3">{formatUsdRange(o.monthly_range_usd)}/mo</span>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={s.tone}>{s.text}</Pill>
                  </td>
                  <td className="num px-4 py-3 text-right text-[22px] whitespace-nowrap">{o.status === "ineligible" || o.total_usd === null ? <span className="text-ink-3">—</span> : formatUsd(o.total_usd)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hidden > 0 && (
        <div className="border-t border-border px-4 py-3">
          <button type="button" className={btn({ variant: "ghost", size: "sm", className: "px-0" })} onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
            {showAll ? "Show fewer options" : `Show ${hidden} more ${hidden === 1 ? "option" : "options"} (cost more or not available)`}
            <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", showAll && "rotate-180")} />
          </button>
        </div>
      )}
    </Card>
  );
}

/** Other medicines or forms, collapsed by default: only a doctor can decide whether one fits, so we show monthly prices only. */
function AskDoctorSection({ options }: { options: ChannelOption[] }) {
  if (options.length === 0) return null;
  return (
    <details className="group rounded-[var(--dc-r-lg)] border border-border bg-surface shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--dc-r-lg)] p-6 outline-none focus-visible:shadow-[var(--dc-focus)] [&::-webkit-details-marker]:hidden">
        <span className="flex flex-col gap-1">
          <span className="text-[18px] font-semibold">Other medicines to ask your doctor about ({options.length})</span>
          <span className="text-sm text-ink-2">A different medicine or form. Only your doctor can decide whether one fits you, so we show monthly prices, not a 12-month total.</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-3 border-t border-border p-6 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((o) => (
          <div key={o.id} className="flex flex-col gap-1.5 rounded-[var(--dc-r-md)] bg-background p-4">
            <span className="text-sm font-semibold">{o.label}</span>
            <span className="num text-[22px]">{formatUsdRange(o.monthly_range_usd)}<span className="text-sm text-ink-3">/mo</span></span>
            {o.status === "ineligible" && <Pill tone="neutral" className="self-start">{STATUS_LABEL.ineligible}</Pill>}
          </div>
        ))}
      </div>
    </details>
  );
}

function rank(o: ChannelOption, p: PathResult) {
  if (p.best && o.id === p.best.id) return 0;
  if (o.status === "conditional") return 1;
  if (o.status === "eligible" && o.rx_change !== "medicine") return 2;
  if (o.rx_change === "medicine") return 3;
  return 4;
}

export function ResultSkeleton() {
  return (
    <Wrap className="flex flex-col gap-8 pt-4 pb-16" aria-busy="true" aria-label="Loading your result">
      <Skeleton className="h-8 w-80" />
      <Skeleton className="h-72 w-full rounded-[var(--dc-r-lg)]" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </Wrap>
  );
}
