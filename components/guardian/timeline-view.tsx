"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadData } from "@/lib/data/load";
import { demoWatchList, type WatchItem } from "@/lib/guardian/watch";
import { DEMO_CASE, DEMO_PERSONAS } from "@/lib/fixtures";
import { addDays } from "@/lib/engine/dates";
import { formatDate, formatUsd, todayIso } from "@/lib/format";
import { store } from "@/lib/client/store";
import { bestPath } from "@/lib/engine/path";
import { reminderOptions } from "@/lib/views/reminders";
import { QuizSchema } from "@/lib/quiz-schema";
import { btn, Card, Check, DemoBadge, Eyebrow, Num, Pill, Wrap, type PillTone } from "@/components/ds";
import { EmailPreview } from "@/components/email/email-preview";
import { ReminderSignup, type ReminderOption } from "@/components/email/reminder-signup";
import { GuardianNav } from "./guardian-nav";
import { ReminderPicker, REMINDER_TITLE } from "@/components/email/reminder-picker";
import { cn } from "@/lib/utils";

const data = loadData();

const TONE: Record<WatchItem["kind"], PillTone> = { pa_renewal: "warn", promo_ending: "danger", refill_window: "warn", appeal_deadline: "info", monthly_check: "accent", discount_ending: "danger", plan_year: "info" };
const TITLE = REMINDER_TITLE as Record<WatchItem["kind"], string>;

export function TimelineView() {
  const demo = useMemo(() => demoWatchList(data, DEMO_CASE, DEMO_PERSONAS.sam.input, DEMO_PERSONAS.jessica.input), []);
  const [own, setOwn] = useState<ReminderOption[] | null>(null);
  const [previewId, setPreviewId] = useState<string>(demo.items[0]?.id ?? "");

  useEffect(() => {
    const q = store.getQuiz();
    const parsed = q && q.start_month ? QuizSchema.safeParse(q) : null;
    if (!parsed?.success || !q?.start_month) return setOwn([]);
    const input = { ...parsed.data, start_month: q.start_month };
    const saved = store.getDecoded();
    setOwn(
      reminderOptions(data, {
        input,
        path: bestPath(input, data),
        decoded: saved && !saved.demo ? saved.decoded : null,
        demo: null,
        demoCase: DEMO_CASE,
        personas: { jessica: DEMO_PERSONAS.jessica.input, sam: DEMO_PERSONAS.sam.input },
        today: todayIso(),
      }),
    );
  }, []);

  const renewal = demo.items.find((i) => i.kind === "pa_renewal");
  const promo = demo.items.find((i) => i.kind === "promo_ending");
  const appeal = demo.items.find((i) => i.kind === "appeal_deadline");
  const jp = demo.jessicaPath;
  const savedThisMonth = jp.best?.months[0]?.price_usd != null && DEMO_PERSONAS.jessica.input.current_monthly_cost_usd !== null ? DEMO_PERSONAS.jessica.input.current_monthly_cost_usd - jp.best.months[0].price_usd : null;
  const janCheck = `${Number(DEMO_CASE.today.slice(0, 4)) + 1}-${String(data.reminderRules.january_plan_check_month).padStart(2, "0")}-01`;
  const card = data.savingsCards.cards.find((c) => c.id === "zepbound-savings-card-covered");
  const previewItem = demo.items.find((i) => i.id === previewId) ?? demo.items[0];
  const [details, setDetails] = useState(false);

  const timeline = [
    { date: demo.items.length ? DEMO_CASE.cases.find((c) => c.id === "demo-appeal")?.denial_notice_date as string : null, title: "Insurance approval (PA) denied", body: "Missing documentation: weight-management program and baseline BMI", state: "bad" as const },
    { date: DEMO_CASE.today, title: "Letter decoded, switched to LillyDirect vials", body: jp.savings_vs_current_usd !== null ? `Saving ${formatUsd(jp.savings_vs_current_usd)} over 12 months against the pharmacy quote` : "", state: "done" as const },
    { date: demo.appeal_filed_on, title: "Send appeal pack", body: "Collect the documents on the checklist; the doctor reviews the necessity letter", state: "next" as const },
    { date: demo.appeal_decision_due, title: "Plan decision due", body: "Pre-service appeal window. We email you if it passes with no answer.", state: "future" as const },
    { date: janCheck, title: "Plan-change check", body: card?.expires_on ? `The savings card's current terms end ${formatDate(card.expires_on)}. We re-run your path with the new year's terms.` : "We re-run your path with the new year's terms.", state: "future" as const },
    { date: appeal?.due_on ?? null, title: "Last day to file the internal appeal", body: "After a final denial, external review is the next step.", state: "future" as const },
  ];

  const hasOwn = own !== null && own.length > 0;
  const today = todayIso();
  const upcomingReminders = [
    ...demo.items.flatMap((i) => i.remind_on.map((d) => ({ d, label: TITLE[i.kind] }))),
    ...(demo.appeal_decision_due ? [{ d: addDays(demo.appeal_decision_due, data.reminderRules.plan_decision_overdue_grace_days), label: "Plan decision overdue check" }] : []),
  ]
    .filter((r) => r.d >= today)
    .sort((x, y) => x.d.localeCompare(y.d));
  const nextReminder = upcomingReminders[0];
  const ownNext = hasOwn
    ? own
        .flatMap((o) => o.remind_on.map((d) => ({ d, label: o.label })))
        .filter((x) => x.d >= today)
        .sort((a, b) => a.d.localeCompare(b.d))[0]
    : undefined;
  const DemoHeading = hasOwn ? "h2" : "h1";

  return (
    <Wrap className="flex flex-col gap-6 pt-2 pb-16">
      <GuardianNav active="timeline" />

      {hasOwn && (
        <Card className="flex flex-col gap-4 p-6 shadow-md md:p-8">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>Your case</Eyebrow>
            <h1 className="text-[28px] font-bold tracking-tight md:text-4xl">
              {own.length === 1 ? "1 date to watch" : `${own.length} dates to watch`}
            </h1>
            {ownNext && (
              <p className="text-ink-2">
                Next: <strong className="text-ink">{ownNext.label}</strong> on {formatDate(ownNext.d)}.
              </p>
            )}
          </div>
          <ReminderSignup options={own} snapshot={{ source: "guardian" }} />
        </Card>
      )}

      {own !== null && !hasOwn && (
        <Card className="flex flex-col gap-3 border-brand/30 bg-brand-soft p-5 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-ink">
            <strong>Below is an example case.</strong> Start yours in a minute and your own dates show up here.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link className={btn({ size: "sm" })} href="/decode">
              Decode a letter
            </Link>
            <Link className={btn({ variant: "secondary", size: "sm" })} href="/quiz">
              Check my price
            </Link>
          </div>
        </Card>
      )}

      <div className={cn("flex flex-wrap items-end justify-between gap-3", hasOwn && "border-t border-border pt-8")}>
        <div className="flex flex-wrap items-center gap-3">
          <DemoHeading className="text-[28px] font-bold tracking-tight md:text-4xl">{demo.items.length} things need attention soon</DemoHeading>
          <DemoBadge />
        </div>
        <span className="text-xs text-ink-3">A fictional example, so you can see what Guardian watches.</span>
      </div>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Watch list">
        {renewal && (
          <WatchCard
            tone="warn"
            label="Approval renewal (PA)"
            sub="Zepbound · DEMO"
            action={
              <button type="button" className={btn({ variant: "secondary", size: "sm" })} onClick={() => setPreviewId(renewal.id)}>
                Preview the reminder
              </button>
            }
          >
            <Num className="text-5xl">in {renewal.days_until} days</Num>
            <p className="text-sm">
              Your approval ends <strong>{formatDate(renewal.due_on)}</strong>. Renewals fail when baseline data is missing. Yours is on file.
            </p>
            <div className="flex flex-col gap-1.5 rounded-[var(--dc-r-md)] bg-background p-3 text-sm">
              <span className="flex items-center gap-2">
                <Check on /> {renewal.payload.kind === "pa_renewal" ? renewal.payload.baseline_label : null}
              </span>
              <span className="flex items-center gap-2">
                <Check on={false} /> Ask your doctor to submit the renewal
              </span>
            </div>
          </WatchCard>
        )}
        {promo && promo.payload.kind === "promo_ending" && (
          <WatchCard
            tone="danger"
            label="Promo ending"
            sub="Wegovy pen · DEMO"
            action={
              <button type="button" className={btn({ variant: "secondary", size: "sm" })} onClick={() => setPreviewId(promo.id)}>
                Preview the reminder
              </button>
            }
          >
            <Num className="text-5xl">
              {formatUsd(promo.payload.intro_usd)} → {formatUsd(promo.payload.then_usd)}
            </Num>
            <p className="text-sm">
              {promo.payload.intro_fills_left === 1 ? "Your intro price ends after the next fill." : `${promo.payload.intro_fills_left} intro fills left.`} The offer runs through{" "}
              {formatDate(promo.payload.valid_through)}.
            </p>
            {promo.payload.projected_12mo_usd !== null && (
              <div className="flex justify-between rounded-[var(--dc-r-md)] bg-background p-3 text-sm">
                <span className="text-ink-2">Next 12 months on this path</span>
                <Num className="text-2xl">{formatUsd(promo.payload.projected_12mo_usd)}</Num>
              </div>
            )}
          </WatchCard>
        )}
        <WatchCard
          tone="accent"
          label="Monthly check"
          sub="Every fill"
          action={
            <Link className={btn({ size: "sm" })} href="/guardian/overpay?demo=1">
              Log my last fill
            </Link>
          }
        >
          <Num className="text-5xl">Did you overpay?</Num>
          <p className="text-sm">Enter what the pharmacy charged for your last fill. It takes 10 seconds; we compare it with the price you should pay.</p>
        </WatchCard>
      </section>

      <section className="grid items-start gap-6 lg:grid-cols-[7fr_5fr]">
        <Card className="flex flex-col gap-5 p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <Eyebrow>Case timeline</Eyebrow>
              <h2 className="text-[22px] font-semibold">Zepbound appeal</h2>
            </div>
            <span className="text-xs text-ink-3">Ref. DEMO-2026-48213</span>
          </div>
          <ol className="flex flex-col">
            {timeline.map((t, i) => {
              const next = t.state === "next";
              const past = t.state === "bad" || t.state === "done";
              const showBody = Boolean(t.body) && (next || details);
              return (
                <li key={t.title} className="relative flex gap-4 pb-3 last:pb-0">
                  {i < timeline.length - 1 && (
                    <span aria-hidden="true" className={cn("absolute top-5 bottom-0 left-[6px] w-0.5 rounded-full", past ? "bg-brand/35" : "bg-border")} />
                  )}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "relative mt-[5px] size-3.5 flex-none rounded-full",
                      t.state === "bad" && "bg-danger",
                      t.state === "done" && "bg-brand",
                      next && "border-[3px] border-brand bg-surface",
                      t.state === "future" && "border-2 border-border bg-surface",
                    )}
                  />
                  <div className={cn("flex min-w-0 flex-1 flex-col gap-1", next && "-mt-2 rounded-[var(--dc-r-md)] border border-brand/20 bg-brand-soft/50 px-3.5 py-2.5")}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span className={cn("flex items-center gap-2 text-sm font-semibold", t.state === "future" ? "text-ink-2" : "text-ink")}>
                        {t.title}
                        {next && <Pill tone="warn" className="h-5 px-1.5 text-[11px]">Next</Pill>}
                      </span>
                      <span className={cn("text-sm whitespace-nowrap", next ? "font-semibold text-brand-ink" : "text-ink-3")}>{formatDate(t.date)}</span>
                    </div>
                    {showBody && <p className="text-sm text-ink-2">{t.body}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          <button type="button" onClick={() => setDetails((v) => !v)} className={cn(btn({ variant: "ghost", size: "sm" }), "self-start px-0")} aria-expanded={details}>
            {details ? "Hide details" : "Show details for every step"}
          </button>
        </Card>

        <Card className="flex flex-col gap-5 p-6 md:p-8">
          <div className="flex flex-col gap-1">
            <Eyebrow>At stake over 12 months</Eyebrow>
            <Num className="text-5xl text-brand">{formatUsd(jp.at_stake_usd)}</Num>
            <p className="text-sm text-ink-2">What winning the appeal saves over the next year.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Saved this month" value={formatUsd(savedThisMonth)} />
            <Stat label="If the appeal wins" value={formatUsd(jp.best_conditional?.monthly_range_usd?.[0] ?? null)} unit="/month" />
          </div>
          {nextReminder && (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex min-w-0 flex-col">
                <span className="text-xs text-ink-2">Next reminder</span>
                <span className="truncate text-sm font-semibold">
                  {nextReminder.label} · {formatDate(nextReminder.d)}
                </span>
              </div>
              {upcomingReminders.length > 1 && (
                <a href="#email-h" className="flex-none text-sm font-semibold text-brand no-underline hover:text-brand-ink">
                  +{upcomingReminders.length - 1} more
                </a>
              )}
            </div>
          )}
        </Card>
      </section>

      {previewItem && (
        <section className="grid items-start gap-6 rounded-[var(--dc-r-lg)] bg-surface-2 p-4 md:grid-cols-[4fr_8fr] md:p-8" aria-labelledby="email-h">
          <div className="flex flex-col gap-3">
            <Eyebrow>Reminder email preview</Eyebrow>
            <h2 id="email-h" className="text-2xl font-bold tracking-tight">
              Every reminder, exactly as it arrives
            </h2>
            <p className="text-sm text-ink-2">Each date on the watch list gets its own email, with the numbers filled in.</p>
            <ReminderPicker items={demo.items.map((i) => ({ id: i.id, title: TITLE[i.kind], sendDates: i.remind_on }))} value={previewItem.id} onChange={setPreviewId} />
            <ReminderSignup key={previewItem.id} compact options={[{ id: previewItem.id, label: TITLE[previewItem.kind], payload: previewItem.payload, remind_on: previewItem.remind_on }]} snapshot={{ demo: true }} demo />
          </div>
          <EmailPreview payload={previewItem.payload} height={600} />
        </section>
      )}

    </Wrap>
  );
}

/** Equal-height watch card: content flows from the top, the action is pinned to the bottom so all cards line up. */
function WatchCard({ tone, label, sub, action, children }: { tone: PillTone; label: string; sub: string; action: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="flex h-full flex-col gap-3 p-6 shadow-md">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <Pill tone={tone}>{label}</Pill>
        <span className="text-xs text-ink-3">{sub}</span>
      </div>
      {children}
      <div className="mt-auto pt-2">{action}</div>
    </Card>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[var(--dc-r-md)] bg-surface-2 px-3.5 py-3">
      <span className="text-xs text-ink-2">{label}</span>
      <span className="flex items-baseline gap-1">
        <Num className="text-2xl">{value}</Num>
        {unit && <span className="text-xs text-ink-2">{unit}</span>}
      </span>
    </div>
  );
}
