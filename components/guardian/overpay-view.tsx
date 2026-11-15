"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { loadData } from "@/lib/data/load";
import { checkOverpayment, type OverpaymentResult } from "@/lib/engine/overpay";
import { fulfilmentOffer, getDrug } from "@/lib/engine/catalog";
import { DEMO_CASE } from "@/lib/fixtures";
import { store } from "@/lib/client/store";
import { formatDate, formatUsd, todayIso } from "@/lib/format";
import { btn, Card, DemoBadge, Eyebrow, inputCls, Notice, Num, Pill, Wrap } from "@/components/ds";
import { GuardianNav } from "./guardian-nav";
import { useGuardianMember } from "@/lib/client/use-guardian";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/date-picker";
import { NumberStepper } from "@/components/number-stepper";
import { cn } from "@/lib/utils";

const data = loadData();
const OFFERS = data.prices.offers.filter((o) => o.channel === "lillydirect" || o.channel === "novocare");

const FillForm = z.object({
  offer_id: z.string().min(1),
  dose_mg: z.number().positive(),
  fill_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the fill date"),
  fill_number: z.number().int().min(1).max(60),
  paid_usd: z.number({ message: "Enter the amount you paid" }).min(0).max(100000),
  refilled_within_window: z.boolean(),
});
type Fill = z.infer<typeof FillForm>;

interface Row extends Fill {
  result: OverpaymentResult;
}

const promoCase = DEMO_CASE.cases.find((c) => c.id === "demo-promo") as unknown as { offer_id: string; fills: Omit<Fill, "offer_id">[] };

export function OverpayView() {
  const params = useSearchParams();
  const demo = params.get("demo") === "1";
  const member = useGuardianMember();
  const [rows, setRows] = useState<Row[]>([]);
  const [latest, setLatest] = useState<Row | null>(null);

  const form = useForm<Fill>({
    resolver: zodResolver(FillForm),
    defaultValues: { offer_id: promoCase.offer_id, dose_mg: promoCase.fills[promoCase.fills.length - 1].dose_mg, fill_date: todayIso(), fill_number: 1, refilled_within_window: true },
  });
  const offerId = form.watch("offer_id");
  const offer = OFFERS.find((o) => o.id === offerId);
  const doses = offer ? fulfilmentOffer(data, offer).dose_prices.map((p) => p.dose_mg).filter((d): d is number => d !== null) : [];

  useEffect(() => {
    const source: Fill[] = demo ? promoCase.fills.map((f) => ({ ...f, offer_id: promoCase.offer_id })) : (store.getFills() as Fill[]);
    const computed = source.map((f) => ({ ...f, result: checkOverpayment(f.paid_usd, f, data) }));
    setRows(computed);
    setLatest(computed[computed.length - 1] ?? null);
    if (demo && computed.length) {
      const last = computed[computed.length - 1];
      form.reset({ ...last });
    }
  }, [demo, form]);

  function onSubmit(f: Fill) {
    const row = { ...f, result: checkOverpayment(f.paid_usd, f, data) };
    setLatest(row);
    if (!demo) {
      const next = [...rows, row];
      setRows(next);
      store.setFills(
        next.map((x) => ({ offer_id: x.offer_id, dose_mg: x.dose_mg, fill_date: x.fill_date, fill_number: x.fill_number, paid_usd: x.paid_usd, refilled_within_window: x.refilled_within_window })),
      );
      toast.success("Fill logged");
    }
  }

  const script = useMemo(() => {
    if (!latest || latest.result.status !== "overpaid" || !latest.result.expected) return null;
    const o = OFFERS.find((x) => x.id === latest.offer_id)!;
    const basis = latest.result.expected.basis === "intro_price" ? `the ${formatUsd(latest.result.expected.expected_usd)} intro price (fill ${latest.fill_number} of ${o.promo?.intro_fills})` : `the ${formatUsd(latest.result.expected.expected_usd)} self-pay price for ${latest.dose_mg} mg`;
    return `Hello, I was charged ${formatUsd(latest.paid_usd)} for my ${getDrug(data, o.product_id).brand} fill on ${formatDate(latest.fill_date)}. Under ${o.channel_label}, this fill should be ${basis}. Please apply the correct price and refund the difference of ${formatUsd(latest.result.difference_usd)}.`;
  }, [latest]);

  if (!demo && member !== true) {
    return (
      <Wrap className="flex flex-col gap-6 pt-2 pb-16">
        <GuardianNav active="overpay" />
        {member === false && (
          <Card className="flex max-w-2xl flex-col gap-4 p-6 md:p-8">
            <div className="flex items-center gap-2">
              <Eyebrow>Monthly check</Eyebrow>
              <Pill tone="accent">Guardian</Pill>
            </div>
            <h1 className="text-[26px] leading-tight font-bold tracking-tight md:text-[28px]">Did the pharmacy charge you the right price?</h1>
            <p className="text-ink-2">
              Each month, enter what you paid. We compare it with the price the program&apos;s terms say you should pay, and if you were overcharged we write
              exactly what to say to get it fixed. This check is part of Guardian.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link className={btn()} href="/paywall">
                Get Guardian
              </Link>
              <Link className={btn({ variant: "secondary" })} href="/guardian/overpay?demo=1">
                <DemoBadge className="h-5 px-1.5 text-[10px]" />
                See it with sample data
              </Link>
            </div>
          </Card>
        )}
      </Wrap>
    );
  }

  return (
    <Wrap className="flex flex-col gap-6 pt-2 pb-16">
      <GuardianNav active="overpay" />
      <div className="grid items-start gap-8 lg:grid-cols-[5fr_7fr]">
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <Card className="flex flex-col gap-5 p-6">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Eyebrow>Monthly check</Eyebrow>
                {demo && <DemoBadge />}
              </div>
              <h1 className="text-[26px] leading-tight font-bold tracking-tight md:text-[28px]">What did the pharmacy charge for your last fill?</h1>
            </div>
            <Field label="Program" id="offer">
              <Controller
                control={form.control}
                name="offer_id"
                render={({ field }) => (
                  <Dropdown id="offer" value={field.value} onValueChange={field.onChange} options={OFFERS.map((o) => ({ value: o.id, label: o.channel_label }))} />
                )}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Dose on the box" id="dose">
                <Controller
                  control={form.control}
                  name="dose_mg"
                  render={({ field }) => (
                    <Dropdown
                      id="dose"
                      value={String(field.value)}
                      onValueChange={(d) => field.onChange(Number(d))}
                      options={doses.map((d) => ({ value: String(d), label: `${d} mg` }))}
                    />
                  )}
                />
              </Field>
              <Field label="Fill number" id="fn">
                <Controller
                  control={form.control}
                  name="fill_number"
                  render={({ field }) => <NumberStepper id="fn" value={field.value} onChange={field.onChange} min={1} max={24} label="fill number" />}
                />
              </Field>
            </div>
            <Field label="Fill date" id="fd" error={form.formState.errors.fill_date?.message}>
              <Controller
                control={form.control}
                name="fill_date"
                render={({ field }) => (
                  <DatePicker id="fd" value={field.value ?? ""} onChange={field.onChange} invalid={Boolean(form.formState.errors.fill_date)} placeholder="When you picked it up" noFuture />
                )}
              />
            </Field>
            {offer?.refill_window_days && (
              <label className="flex items-center gap-2.5 text-sm">
                <input type="checkbox" className="size-5 accent-[var(--dc-accent)]" {...form.register("refilled_within_window")} />
                Refilled within {offer.refill_window_days} days of the last delivery
              </label>
            )}
            <Field label="Amount you paid" id="paid" error={form.formState.errors.paid_usd?.message}>
              <div className="relative">
                <span aria-hidden="true" className="num absolute top-3.5 left-4 text-[32px] text-ink-3">
                  $
                </span>
                <input id="paid" inputMode="decimal" className={cn(inputCls, "num min-h-16 pl-10 text-[28px]")} {...form.register("paid_usd", { valueAsNumber: true })} />
              </div>
            </Field>
            <button type="submit" className={btn({ size: "md" })}>
              Check it
            </button>
            <span className="text-xs text-ink-3">We compare it with the price the program&apos;s published terms say you should pay.</span>
          </Card>
        </form>

        <section className="flex flex-col gap-4" aria-live="polite">
          {latest ? <ResultCard row={latest} script={script} /> : <Notice tone="info">Log a fill to see whether you paid the right price.</Notice>}
          {rows.length > 0 && (
            <Card className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
                    <th scope="col" className="px-4 py-2.5">Fill</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Paid</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Expected</th>
                    <th scope="col" className="px-4 py-2.5">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        {formatDate(r.fill_date)} · {r.dose_mg} mg
                      </td>
                      <td className="num px-4 py-3 text-right text-lg">{formatUsd(r.paid_usd)}</td>
                      <td className="num px-4 py-3 text-right text-lg">{formatUsd(r.result.expected?.expected_usd ?? null)}</td>
                      <td className="px-4 py-3">
                        <StatusPill r={r.result} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>
      </div>
      <p className="text-xs text-ink-3">Not medical, legal or financial advice. Program terms belong to the manufacturers and can change.</p>
    </Wrap>
  );
}

function StatusPill({ r }: { r: OverpaymentResult }) {
  if (r.status === "overpaid") return <Pill tone="danger">{formatUsd(r.difference_usd, { signed: true })}</Pill>;
  if (r.status === "matched") return <Pill tone="accent">Matched</Pill>;
  if (r.status === "underpaid") return <Pill tone="info">Below expected</Pill>;
  return <Pill tone="neutral">Not priced</Pill>;
}

function ResultCard({ row, script }: { row: Row; script: string | null }) {
  const r = row.result;
  const exp = r.expected;
  return (
    <Card className={cn("flex flex-col gap-4 p-6 shadow-lg md:p-8", r.status === "overpaid" && "border-danger-soft")}>
      <div className="flex items-center justify-between">
        <StatusPill r={r} />
        <span className="text-sm text-ink-2">Fill of {formatDate(row.fill_date)}</span>
      </div>
      <div className="flex flex-wrap items-end gap-8">
        <div>
          <span className="text-xs text-ink-3">You paid</span>
          <Num className="block text-5xl">{formatUsd(r.paid_usd)}</Num>
        </div>
        <div>
          <span className="text-xs text-ink-3">Expected</span>
          <Num className="block text-5xl text-brand">{formatUsd(exp?.expected_usd ?? null)}</Num>
        </div>
        {r.difference_usd !== null && r.difference_usd !== 0 && (
          <div>
            <span className="text-xs text-ink-3">Difference</span>
            <Num className={cn("block text-6xl", r.status === "overpaid" ? "text-danger" : "text-info")}>{formatUsd(r.difference_usd, { signed: true })}</Num>
          </div>
        )}
      </div>
      {exp && (
        <p className="text-sm">
          Basis: {exp.basis === "intro_price" ? "intro price for this fill" : exp.basis === "late_refill_price" ? "regular price after a late refill" : "regular self-pay price at this dose"}.{" "}
          <a href={exp.source_url} target="_blank" rel="noreferrer" className="text-brand">
            Source, verified {formatDate(exp.verified_at)}
          </a>
        </p>
      )}
      {r.status === "matched" && <Notice tone="accent">All good: that matches your expected price.</Notice>}
      {script && (
        <div className="flex flex-col gap-2 rounded-[var(--dc-r-md)] bg-background p-4">
          <strong className="text-sm">What to say to the pharmacy</strong>
          <p className="text-sm">{script}</p>
          <button
            type="button"
            className={btn({ size: "sm", className: "self-start" })}
            onClick={() => {
              void navigator.clipboard?.writeText(script).then(() => toast.success("Copied"));
            }}
          >
            Copy what to say
          </button>
        </div>
      )}
    </Card>
  );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
