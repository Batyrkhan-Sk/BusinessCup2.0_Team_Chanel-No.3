"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loadData } from "@/lib/data/load";
import { store } from "@/lib/client/store";
import { appealWatch } from "@/lib/guardian/watch";
import { formatDate, formatUsd, todayIso } from "@/lib/format";
import type { DecodedDenial } from "@/lib/decoder/decode";
import { DEMO_PERSONAS } from "@/lib/fixtures";
import { bestPath } from "@/lib/engine/path";
import { btn, Card, Check, DemoBadge, Eyebrow, Notice, Num, Pill, Skeleton, Wrap } from "@/components/ds";
import { ReminderSignup } from "@/components/email/reminder-signup";

const data = loadData();
const CHECK_KEY = "dosecost.checklist.v1";

function readChecks(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(CHECK_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function DecodedView() {
  const params = useSearchParams();
  const [state, setState] = useState<{ loading: true } | { loading: false; decoded: DecodedDenial | null; demo: boolean }>({ loading: true });
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const s = store.getDecoded();
    setState({ loading: false, decoded: s?.decoded ?? null, demo: s?.demo ?? params.get("demo") === "1" });
    setChecks(readChecks());
  }, [params]);

  const extras = useMemo(() => {
    if (state.loading || !state.decoded) return null;
    const d = state.decoded;
    const quiz = state.demo ? DEMO_PERSONAS.jessica.input : store.getQuiz();
    const productId = quiz?.product_id ?? (state.demo ? DEMO_PERSONAS.jessica.input.product_id : null);
    let atStake: number | null = null;
    if (state.demo) atStake = bestPath(DEMO_PERSONAS.jessica.input, data).at_stake_usd;
    const watch =
      d.facts.notice_date && productId
        ? appealWatch(data, {
            notice_date: d.facts.notice_date,
            product_id: productId,
            reference_number: d.facts.reference_number,
            at_stake_12mo_usd: atStake,
            stated_appeal_window_days: d.facts.stated_appeal_window_days,
            today: todayIso(),
            demo: state.demo,
          })
        : null;
    return { watch, atStake };
  }, [state]);

  if (state.loading)
    return (
      <Wrap className="flex flex-col gap-6 py-8" aria-busy="true">
        <Skeleton className="h-12 w-3/4" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <Skeleton className="h-96" />
      </Wrap>
    );
  if (!state.decoded)
    return (
      <Wrap className="py-16">
        <Card className="mx-auto flex max-w-xl flex-col gap-4 p-8 text-center">
          <h1 className="text-2xl font-bold">No decoded letter yet</h1>
          <p className="text-ink-2">Upload a denial letter or try the DEMO letter.</p>
          <Link className={btn({ className: "self-center" })} href="/decode">
            Decode a letter
          </Link>
        </Card>
      </Wrap>
    );

  const d = state.decoded;
  const f = d.facts;
  const dl = d.deadlines;
  const monthly = data.pricing.plans.find((p) => p.id === "monthly")!;
  const toggle = (id: string) => {
    const nextChecks = { ...checks, [id]: !checks[id] };
    setChecks(nextChecks);
    try {
      localStorage.setItem(CHECK_KEY, JSON.stringify(nextChecks));
    } catch {
      /* ignore */
    }
  };
  const done = d.checklist.filter((i) => checks[i.id]).length;
  const winTone = d.winnability === "high" ? "accent" : d.winnability === "medium" ? "warn" : "danger";
  const demoQ = state.demo ? "?demo=jessica" : "";

  return (
    <Wrap className="flex flex-col gap-6 pt-4 pb-16">
      <div className="flex flex-wrap items-center gap-2">
        {f.notice_date && <Pill tone="neutral">Letter dated {formatDate(f.notice_date)}</Pill>}
        {f.reference_number && <Pill tone="neutral">Ref. {f.reference_number}</Pill>}
        {state.demo && <DemoBadge />}
        <Link className={btn({ variant: "secondary", size: "sm", className: "ml-auto" })} href="/decode">
          Upload another
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <Eyebrow>Step 2 of 2 · decoded</Eyebrow>
        <h1 className="text-[26px] leading-tight font-bold tracking-tight md:text-4xl">
          Denied for <span className={d.category === "plan_exclusion" ? "text-danger" : "text-brand"}>{d.category_label.toLowerCase()}</span>
          {d.category !== "plan_exclusion" ? ", not because the drug is excluded." : "."}
        </h1>
        <p className="max-w-3xl text-lg text-ink-2">
          {d.plain_english}
          {dl ? ` You have until ${formatDate(dl.file_by)} to file an internal appeal.` : ""}
        </p>
      </div>

      {dl ? (
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="flex flex-col gap-1.5 p-6">
            <Eyebrow>Appeal deadline</Eyebrow>
            <Num className="text-4xl md:text-5xl">{formatDate(dl.file_by)}</Num>
            <span className="text-sm text-ink-2">
              {dl.filing_window_days} days from {formatDate(dl.notice_date)} (29 CFR 2560.503-1). {dl.days_left >= 0 ? `${dl.days_left} days left.` : "This date has passed."}
            </span>
          </Card>
          <Card className="flex flex-col gap-1.5 p-6">
            <Eyebrow>Plan must decide in</Eyebrow>
            <Num className="text-4xl md:text-5xl">
              {dl.decision_window.value} {dl.decision_window.unit}
            </Num>
            <span className="text-sm text-ink-2">After it receives your appeal ({f.claim_timing.replace("_", "-")}, one level of appeal).</span>
          </Card>
          <Card className="flex flex-col gap-1.5 p-6">
            <Eyebrow>Then</Eyebrow>
            <Num className="text-4xl md:text-5xl">External review</Num>
            <span className="text-sm text-ink-2">
              Request within {dl.external_review_filing_months} months of the final denial; decided in {dl.external_review_standard_days} days ({dl.external_review_expedited_hours} hours
              expedited).
            </span>
          </Card>
        </section>
      ) : (
        <Notice tone="warn" title="No date found">
          We could not read the date of the notice, so we cannot compute the deadline. Check the letter and type the date in.
        </Notice>
      )}

      <section className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-[22px] font-semibold">What the letter says</h2>
            <span className="text-sm text-ink-2">Extracted by AI into a strict form, validated by code.</span>
          </div>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ["Plan", f.plan_name ?? "—"],
                ["Medicine", f.drug_name ?? "—"],
                ["Decision", f.decision.replace(/_/g, " ")],
                ["Reason quoted", f.reason_text ? `“${f.reason_text}”` : "—"],
                ["Date of notice", formatDate(f.notice_date)],
                ["Reference", f.reference_number ?? "—"],
              ].map(([k, val]) => (
                <tr key={k} className="border-b border-border align-top">
                  <th scope="row" className="w-36 px-4 py-3 text-left text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
                    {k}
                  </th>
                  <td className="px-4 py-3">{val}</td>
                </tr>
              ))}
              <tr className="border-b border-border">
                <th scope="row" className="px-4 py-3 text-left text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Category (code)
                </th>
                <td className="px-4 py-3">
                  <Pill tone={winTone}>{d.category_label}</Pill>
                </td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 text-left text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  Winnability (code)
                </th>
                <td className="px-4 py-3">
                  <Pill tone={winTone}>{d.winnability}</Pill>
                </td>
              </tr>
            </tbody>
          </table>
          {d.needs_user_confirmation.length > 0 && (
            <Notice tone="warn" className="m-4">
              Please double-check: {d.needs_user_confirmation.join(", ")}.
            </Notice>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-semibold">Your checklist</h2>
            <span className="text-sm text-ink-2">
              {done} of {d.checklist.length} done
            </span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {d.checklist.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" className="peer sr-only" checked={Boolean(checks[item.id])} onChange={() => toggle(item.id)} />
                  <span className="rounded-md peer-focus-visible:shadow-[var(--dc-focus)]">
                    <Check on={Boolean(checks[item.id])} />
                  </span>
                  <span>
                    <strong className="text-sm">{item.label}</strong>
                    <span className="block text-xs text-ink-3">
                      {item.detail} · {item.who === "doctor" ? "your doctor" : item.who === "dosecost" ? "DoseCost adds it" : "you"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 rounded-[var(--dc-r-md)] bg-brand-soft p-4">
            <div className="flex items-center justify-between">
              <Eyebrow className="text-brand-ink">Appeal pack · Guardian</Eyebrow>
              <Num className="text-[22px] text-brand-ink">{formatUsd(monthly.price_usd)}</Num>
            </div>
            <p className="text-sm text-brand-ink">Patient appeal letter, a medical-necessity draft for your doctor, this checklist and a PDF, prefilled from this decode.</p>
            <Link className={btn({ className: "self-start" })} href={`/appeal${demoQ}`}>
              Preview the appeal pack
            </Link>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {extras?.watch && (
          <Card className="flex flex-col gap-3 p-6">
            <Eyebrow>Free deadline reminders</Eyebrow>
            <p className="text-sm">We email you ahead of {formatDate(extras.watch.due_on)} and when the plan&apos;s decision window runs out.</p>
            <ReminderSignup compact options={[{ id: extras.watch.id, label: "Appeal deadline", payload: extras.watch.payload, remind_on: extras.watch.remind_on }]} snapshot={{ decoded: d }} />
          </Card>
        )}
        <Card className="flex flex-col gap-3 p-6">
          <Eyebrow>Meanwhile</Eyebrow>
          <p className="text-sm">Appeals take weeks. See the cheapest legal way to keep filling your prescription while you wait{extras?.atStake ? `, and why ${formatUsd(extras.atStake)} a year is at stake` : ""}.</p>
          <Link className={btn({ variant: "secondary", className: "self-start" })} href={state.demo ? "/result?demo=jessica" : "/result"}>
            See my cheapest path
          </Link>
        </Card>
      </section>

      <p className="text-xs text-ink-3">
        Not legal advice. Deadlines use the federal minimums for employer plans (29 CFR 2560.503-1) and HealthCare.gov&apos;s external review rules; your plan&apos;s notice may
        allow more time and always controls.
      </p>
    </Wrap>
  );
}
