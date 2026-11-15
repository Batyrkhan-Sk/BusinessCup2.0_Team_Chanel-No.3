"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QuizSchema, QUIZ_DEFAULTS, isCommercial, type QuizValues } from "@/lib/quiz-schema";
import { COVERAGE_LABELS, INSURERS, STATUS_LABELS, US_STATES } from "@/lib/content";
import { store } from "@/lib/client/store";
import { track } from "@/lib/client/analytics";
import { btn, Card, choiceCls, DemoBadge, Eyebrow, inputCls, Radio } from "@/components/ds";
import { Dropdown } from "@/components/dropdown";
import { formatUsd } from "@/lib/format";
import { nextMonth } from "@/lib/engine/dates";
import { cn } from "@/lib/utils";

export interface QuizProduct {
  product_id: string;
  brand: string;
  generic: string;
  device: string;
  form: string;
  dose_steps_mg: number[];
  promo: { intro_monthly_usd: number; intro_fills: number; offer_label: string } | null;
  refill_window_days: number | null;
  price_note: string | null;
}

type StepId = "coverage" | "plan" | "medicine" | "dose" | "diagnosis" | "status" | "cost" | "extras";
const ALL_STEPS: StepId[] = ["coverage", "plan", "medicine", "dose", "diagnosis", "status", "cost", "extras"];

export function Quiz({ products, verifiedOn }: { products: QuizProduct[]; verifiedOn: string }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [stepIdx, setStepIdx] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  /** Set on final submit so the draft autosave cannot overwrite the completed answers (which carry start_month) before navigation. */
  const submitted = useRef(false);

  const form = useForm<QuizValues>({ resolver: zodResolver(QuizSchema), defaultValues: QUIZ_DEFAULTS as QuizValues, mode: "onChange" });
  const { watch, setValue, trigger, handleSubmit, formState, register } = form;
  const v = watch();

  // restore draft
  useEffect(() => {
    const draft = store.getQuiz();
    if (draft && !draft.demo) {
      for (const [k, val] of Object.entries(draft)) {
        if (k in QuizSchema.shape) setValue(k as keyof QuizValues, val as never);
      }
      if (typeof draft.step === "number") setStepIdx(Math.min(draft.step, ALL_STEPS.length - 1));
    } else {
      track("quiz_start", {});
    }
    setHydrated(true);
  }, [setValue]);

  // persist draft
  useEffect(() => {
    if (!hydrated || submitted.current) return;
    store.setQuiz({ ...v, step: stepIdx, demo: null });
  }, [v, stepIdx, hydrated]);

  const product = products.find((p) => p.product_id === v.product_id) ?? null;
  const steps = useMemo(
    () =>
      ALL_STEPS.filter((s) => {
        if (s === "extras") return Boolean(product?.promo && v.status === "self_pay") || (isCommercial(v.coverage) && v.status === "pa_approved") || Boolean(product?.refill_window_days);
        return true;
      }),
    [product, v.status, v.coverage],
  );
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const isLast = stepIdx >= steps.length - 1;

  const fieldsFor: Record<StepId, (keyof QuizValues)[]> = {
    coverage: ["coverage"],
    plan: ["insurer_id", "state"],
    medicine: ["product_id"],
    dose: ["current_dose_mg", "target_dose_mg"],
    diagnosis: ["diagnosis_on_file"],
    status: ["status"],
    cost: ["current_monthly_cost_usd"],
    extras: ["intro_fills_used", "plan_copay_usd", "refills_on_time"],
  };

  const canContinue = (() => {
    switch (step) {
      case "coverage":
        return Boolean(v.coverage);
      case "medicine":
        return Boolean(v.product_id);
      case "status":
        return Boolean(v.status);
      default:
        return true;
    }
  })();

  async function next() {
    const ok = await trigger(fieldsFor[step]);
    if (!ok || !canContinue) return;
    if (isLast) return void handleSubmit(onSubmit)();
    setStepIdx((i) => i + 1);
  }
  function back() {
    setStepIdx((i) => Math.max(0, i - 1));
  }
  function onSubmit(values: QuizValues) {
    const start_month = nextMonth(new Date().toISOString().slice(0, 7));
    submitted.current = true;
    store.setQuiz({ ...values, start_month, step: stepIdx, demo: null });
    router.push("/result");
  }

  const progress = ((stepIdx + 1) / steps.length) * 100;
  const motionProps = reduce
    ? {}
    : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 }, transition: { duration: 0.2, ease: "easeOut" as const } };

  return (
    <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-4 py-8 md:grid-cols-[7fr_5fr] md:gap-16 md:px-6 md:py-14">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void next();
        }}
        className="flex min-h-[560px] flex-col gap-8"
        aria-labelledby="q-title"
        noValidate
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm text-ink-2">
            <span>
              Step {stepIdx + 1} of {steps.length}
            </span>
            <button type="button" className={btn({ variant: "ghost", size: "sm", className: "px-0" })} onClick={() => { store.setQuiz(null); form.reset(QUIZ_DEFAULTS as QuizValues); setStepIdx(0); }}>
              Start over
            </button>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={stepIdx + 1} aria-label="Quiz progress">
            <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} {...motionProps} className="flex flex-col gap-6">
            {step === "coverage" && (
              <Step eyebrow="Coverage" title="How do you pay for health care right now?" hint="This decides which ways of buying are open to you. Cash offers cannot be combined with insurance or government plans.">
                <ChoiceList
                  name="coverage"
                  value={v.coverage}
                  options={Object.entries(COVERAGE_LABELS).map(([id, label]) => ({ id, label }))}
                  onChange={(id) => setValue("coverage", id as QuizValues["coverage"], { shouldValidate: true })}
                />
              </Step>
            )}

            {step === "plan" && (
              <Step eyebrow="Your plan" title={isCommercial(v.coverage) ? "Who runs your pharmacy benefit?" : "Which state do you live in?"} hint="Insurer policies differ. We use their published prior-authorization criteria.">
                {isCommercial(v.coverage) && (
                  <ChoiceList name="insurer" value={v.insurer_id ?? undefined} options={INSURERS} onChange={(id) => setValue("insurer_id", id)} />
                )}
                <div className="flex flex-col gap-2">
                  <label htmlFor="state" className="text-sm font-semibold">
                    State
                  </label>
                  <Dropdown
                    id="state"
                    className="max-w-[240px]"
                    value={v.state ?? ""}
                    onValueChange={(s) => setValue("state", s || null)}
                    options={[{ value: "", label: "Prefer not to say" }, ...US_STATES.map((s) => ({ value: s, label: s }))]}
                  />
                </div>
              </Step>
            )}

            {step === "medicine" && (
              <Step eyebrow="Your prescription" title="Which medicine did your doctor prescribe?" hint="Catalog built from FDA label and NDC data. Pick what is on your prescription.">
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Medicine">
                  {products.map((p) => (
                    <button
                      key={p.product_id}
                      type="button"
                      role="radio"
                      aria-checked={v.product_id === p.product_id}
                      className={choiceCls(v.product_id === p.product_id)}
                      onClick={() => {
                        setValue("product_id", p.product_id, { shouldValidate: true });
                        setValue("current_dose_mg", null);
                        setValue("target_dose_mg", null);
                      }}
                    >
                      <Radio on={v.product_id === p.product_id} />
                      <span>
                        <strong>{p.brand}</strong>
                        <br />
                        <span className="text-sm text-ink-2">
                          {p.generic} · {p.device}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                {formState.errors.product_id && <p className="text-sm text-danger">{formState.errors.product_id.message}</p>}
              </Step>
            )}

            {step === "dose" && product && (
              <Step eyebrow="Dose step" title="Which dose step are you on now?" hint="Steps from the FDA label. The price changes at each step; we never suggest a dose.">
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Current dose">
                  {[...product.dose_steps_mg.map((d) => ({ id: String(d), label: `${d} mg` })), { id: "", label: "Not sure" }].map((o) => {
                    const on = (v.current_dose_mg === null && o.id === "") || String(v.current_dose_mg) === o.id;
                    return (
                      <button
                        key={o.label}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setValue("current_dose_mg", o.id ? Number(o.id) : null)}
                        className={cn("min-h-10 rounded-[var(--dc-r-md)] px-4 text-[15px] font-semibold outline-none focus-visible:shadow-[var(--dc-focus)]", on ? "bg-brand-soft text-brand-ink shadow-[inset_0_0_0_2px_var(--dc-accent)]" : "bg-surface-2 text-ink-2")}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="target" className="text-sm font-semibold">
                    Dose your doctor has planned, if you know it
                  </label>
                  <Dropdown
                    id="target"
                    className="max-w-[360px]"
                    value={v.target_dose_mg === null ? "" : String(v.target_dose_mg)}
                    onValueChange={(d) => setValue("target_dose_mg", d ? Number(d) : null)}
                    options={[
                      { value: "", label: "Stay at my current step / I don't know" },
                      ...product.dose_steps_mg.map((d) => ({ value: String(d), label: `${d} mg` })),
                    ]}
                  />
                  <span className="text-sm text-ink-2">Used only to project cost over 12 months. Your doctor decides dosing.</span>
                </div>
              </Step>
            )}

            {step === "diagnosis" && (
              <Step eyebrow="Diagnosis" title="Is a diagnosis on file with your doctor for this prescription?" hint="Yes or no only. We never ask which diagnosis, and we never store it.">
                <ChoiceList
                  name="diagnosis"
                  value={v.diagnosis_on_file === null ? "unknown" : v.diagnosis_on_file ? "yes" : "no"}
                  options={[
                    { id: "yes", label: "Yes" },
                    { id: "no", label: "No" },
                    { id: "unknown", label: "Not sure" },
                  ]}
                  onChange={(id) => setValue("diagnosis_on_file", id === "unknown" ? null : id === "yes")}
                />
              </Step>
            )}

            {step === "status" && (
              <Step eyebrow="Where things stand" title="What has happened with coverage so far?" hint="A denial is often fixable. We will check that next.">
                <ChoiceList
                  name="status"
                  value={v.status}
                  options={Object.entries(STATUS_LABELS).map(([id, label]) => ({ id, label }))}
                  onChange={(id) => setValue("status", id as QuizValues["status"], { shouldValidate: true })}
                />
              </Step>
            )}

            {step === "cost" && (
              <Step eyebrow="What you pay now" title={`What did your last month of ${product?.brand ?? "it"} cost you?`} hint="The amount you paid or were quoted at the pharmacy. Leave empty if you have not filled yet.">
                <MoneyInput id="cost" label="Out-of-pocket for one month" registration={register("current_monthly_cost_usd", { setValueAs: toNum })} error={formState.errors.current_monthly_cost_usd?.message} />
              </Step>
            )}

            {step === "extras" && product && (
              <Step eyebrow="Anything that changes the price" title="A few details that move the number" hint="Optional. Skip anything you do not know.">
                {product.promo && v.status === "self_pay" && (
                  <div className="flex flex-col gap-2">
                    <label htmlFor="intro" className="text-sm font-semibold">
                      How many {formatUsd(product.promo.intro_monthly_usd)} intro fills have you used? (offer covers {product.promo.intro_fills})
                    </label>
                    <Dropdown
                      id="intro"
                      className="max-w-[200px]"
                      value={String(v.intro_fills_used)}
                      onValueChange={(n) => setValue("intro_fills_used", Number(n))}
                      options={Array.from({ length: product.promo.intro_fills + 1 }, (_, i) => ({ value: String(i), label: String(i) }))}
                    />
                  </div>
                )}
                {isCommercial(v.coverage) && v.status === "pa_approved" && (
                  <MoneyInput id="copay" label="Your plan's copay before any savings card, if you know it" registration={register("plan_copay_usd", { setValueAs: toNum })} />
                )}
                {product.refill_window_days && (
                  <ChoiceList
                    name="refills"
                    value={v.refills_on_time ? "yes" : "no"}
                    options={[
                      { id: "yes", label: `I refill within ${product.refill_window_days} days of delivery` },
                      { id: "no", label: "I sometimes refill late" },
                    ]}
                    onChange={(id) => setValue("refills_on_time", id === "yes")}
                  />
                )}
              </Step>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-auto flex items-center justify-between pt-2">
          <button type="button" className={btn({ variant: "secondary" })} onClick={back} disabled={stepIdx === 0}>
            Back
          </button>
          <button type="submit" className={btn({ size: "lg" })} disabled={!canContinue}>
            {isLast ? "See my cheapest path" : "Continue"}
          </button>
        </div>
      </form>

      <aside className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3 p-6">
          <Eyebrow>What we have so far</Eyebrow>
          <Summary label="Coverage" value={v.coverage ? COVERAGE_LABELS[v.coverage] : null} />
          <Summary label="Insurer" value={INSURERS.find((i) => i.id === v.insurer_id)?.label ?? null} />
          <Summary label="State" value={v.state} />
          <Summary label="Medicine" value={product ? `${product.brand}${v.current_dose_mg ? ` · ${v.current_dose_mg} mg` : ""}` : null} />
          <Summary label="Status" value={v.status ? STATUS_LABELS[v.status] : null} />
        </Card>
        {product?.price_note && (
          <Card className="flex flex-col gap-2 border-brand-soft bg-brand-soft p-6">
            <Eyebrow className="text-brand-ink">Why we ask</Eyebrow>
            <p className="text-sm text-brand-ink">{product.price_note}</p>
            <span className="text-xs text-ink-3">Prices verified on {verifiedOn}</span>
          </Card>
        )}
        <Card className="flex flex-col gap-3 p-6">
          <div className="flex items-center justify-between">
            <Eyebrow>Just looking?</Eyebrow>
            <DemoBadge />
          </div>
          <p className="text-sm text-ink-2">Run a DEMO persona through the same live engine.</p>
          <div className="flex flex-col gap-2">
            <Link className={btn({ variant: "secondary", size: "sm", block: true })} href="/result?demo=jessica">
              Jessica: Zepbound, PA denied
            </Link>
            <Link className={btn({ variant: "secondary", size: "sm", block: true })} href="/result?demo=sam">
              Sam: Wegovy pen, intro ending
            </Link>
          </div>
        </Card>
      </aside>
    </div>
  );
}

function toNum(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function Step({ eyebrow, title, hint, children }: { eyebrow: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 id="q-title" className="text-[28px] leading-tight font-bold tracking-tight md:text-4xl">
          {title}
        </h1>
        {hint && <p className="text-ink-2">{hint}</p>}
      </div>
      {children}
    </>
  );
}

function ChoiceList({ name, value, options, onChange }: { name: string; value: string | undefined; options: Array<{ id: string; label: string }>; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={choiceCls(value === o.id)} onClick={() => onChange(o.id)}>
          <Radio on={value === o.id} />
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function MoneyInput({ id, label, registration, error }: { id: string; label: string; registration: ReturnType<ReturnType<typeof useForm<QuizValues>>["register"]>; error?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="relative max-w-[280px]">
        <span aria-hidden="true" className="num absolute top-3.5 left-4 text-[32px] text-ink-3">
          $
        </span>
        <input id={id} inputMode="decimal" className={cn(inputCls, "num min-h-16 pl-10 text-[28px]")} aria-invalid={Boolean(error)} {...registration} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-ink-2">{label}</span>
      <span className="text-right">{value ?? "—"}</span>
    </div>
  );
}
