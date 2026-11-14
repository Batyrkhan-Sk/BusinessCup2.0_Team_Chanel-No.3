"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload } from "lucide-react";
import { loadData } from "@/lib/data/load";
import { decodeExtraction, type DecodedDenial } from "@/lib/decoder/decode";
import { store } from "@/lib/client/store";
import { todayIso } from "@/lib/format";
import { btn, Card, DemoBadge, Eyebrow, inputCls, Notice, Pill, Skeleton } from "@/components/ds";
import { cn } from "@/lib/utils";

const data = loadData();

type Phase =
  | { kind: "idle" }
  | { kind: "reading"; demo: boolean; name: string }
  | { kind: "error"; title: string; message: string; missing?: string[]; demo: boolean };

const Manual = z.object({
  reason_text: z.string().min(10, "Copy the reason sentence from the letter"),
  notice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date printed on the letter"),
  reference_number: z.string().max(80).optional(),
  request_type: z.enum(["initial", "renewal", "unknown"]),
  claim_timing: z.enum(["pre_service", "post_service", "urgent", "unknown"]),
});
type ManualValues = z.infer<typeof Manual>;

export function DecodeView() {
  const router = useRouter();
  const params = useSearchParams();
  const autoDemo = params.get("demo") === "1";
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [manual, setManual] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  const finish = useCallback(
    (decoded: DecodedDenial, demo: boolean) => {
      store.setDecoded({ decoded, demo, saved_at: new Date().toISOString() });
      router.push(demo ? "/decoded?demo=1" : "/decoded");
    },
    [router],
  );

  const run = useCallback(
    async (file: File | null) => {
      const demo = file === null;
      setPhase({ kind: "reading", demo, name: file?.name ?? "DEMO letter" });
      try {
        const body = new FormData();
        if (file) body.set("file", file);
        const res = await fetch(demo ? "/api/decode?demo=1" : "/api/decode", { method: "POST", body: demo ? undefined : body });
        const json = (await res.json().catch(() => ({}))) as { decoded?: DecodedDenial; error?: string; message?: string; missing?: string[] };
        if (res.ok && json.decoded) return finish(json.decoded, demo);
        setPhase({
          kind: "error",
          demo,
          title: json.error === "not_configured" ? "Letter reading is not configured on this deployment" : "We could not read this letter",
          message:
            json.error === "not_configured"
              ? "The AI reading step needs an API key that has not been added yet. Nothing was faked. You can type the letter's facts below; the deadline, category and checklist are computed by the same code."
              : json.message ?? "Try a sharper photo of the page that states the reason, or type it in.",
          missing: json.missing,
        });
      } catch {
        setPhase({ kind: "error", demo, title: "Network problem", message: "Check your connection and try again." });
      }
    },
    [finish],
  );

  useEffect(() => {
    if (autoDemo && !started.current) {
      started.current = true;
      void run(null);
    }
  }, [autoDemo, run]);

  const form = useForm<ManualValues>({ resolver: zodResolver(Manual), defaultValues: { request_type: "initial", claim_timing: "pre_service" } });
  function submitManual(v: ManualValues) {
    const decoded = decodeExtraction(
      {
        is_denial_letter: true,
        plan_name: null,
        plan_type: "unknown",
        drug_name: null,
        decision: v.request_type === "renewal" ? "renewal_denied" : "prior_authorization_denied",
        request_type: v.request_type,
        claim_timing: v.claim_timing,
        reason_text: v.reason_text,
        notice_date: v.notice_date,
        stated_appeal_window_days: null,
        reference_number: v.reference_number || null,
        appeal_contact: null,
        low_confidence_fields: [],
      },
      data,
      todayIso(),
    );
    finish(decoded, false);
  }

  return (
    <div className="mx-auto grid w-full max-w-[1120px] items-start gap-12 px-4 py-8 md:grid-cols-2 md:px-6 md:py-12">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Eyebrow>Step 1 of 2</Eyebrow>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight md:text-4xl">Upload your denial letter</h1>
          <p className="text-lg text-ink-2">
            A photo or PDF. AI reads the reason, dates, plan type and reference number into a strict form. Then code works out your category, deadline, checklist and
            what is at stake.
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void run(f);
          }}
          className={cn("flex flex-col items-center gap-3 rounded-[var(--dc-r-lg)] border-2 border-dashed bg-surface px-6 py-10 text-center", drag ? "border-brand bg-brand-soft" : "border-border")}
        >
          <Upload aria-hidden="true" className="size-10 text-brand" strokeWidth={1.8} />
          <p className="font-semibold">Drop a photo or PDF here</p>
          <p className="text-sm text-ink-2">JPG, PNG, WebP or PDF · up to 10 MB · read once, not stored</p>
          <label htmlFor="letter" className={btn()}>
            Choose file or take a photo
          </label>
          <input
            ref={fileRef}
            id="letter"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void run(f);
              e.target.value = "";
            }}
            disabled={phase.kind === "reading"}
          />
        </div>

        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex max-w-sm flex-col gap-1">
            <div className="flex items-center gap-2">
              <DemoBadge />
              <strong>No letter handy?</strong>
            </div>
            <span className="text-sm text-ink-2">
              A fictional Zepbound PA denial from a made-up Texas plan, run through the same live pipeline.{" "}
              <a href="/api/demo-letter" target="_blank" rel="noreferrer" className="text-brand">
                View the letter
              </a>
            </span>
          </div>
          <button type="button" className={btn({ variant: "secondary" })} onClick={() => void run(null)} disabled={phase.kind === "reading"}>
            Try the sample letter
          </button>
        </Card>

        <Card className="flex flex-col gap-2.5 p-6">
          <Eyebrow>What AI does, and what code does</Eyebrow>
          <div className="flex items-start gap-2 text-sm">
            <Pill tone="info">AI</Pill>
            <span>Reads the letter and fills a strict form: reason text, dates, plan type, reference number. Nothing else.</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Pill tone="accent">Code</Pill>
            <span>Validates the form, maps the denial category, counts the appeal deadline, picks the checklist and scores whether appealing is worth it.</span>
          </div>
        </Card>
      </section>

      <aside className="flex flex-col gap-4" aria-live="polite">
        {phase.kind === "reading" && (
          <Card className="flex flex-col gap-4 p-6" aria-busy="true">
            <div className="flex items-center justify-between">
              <Eyebrow>Reading {phase.demo ? "the DEMO letter" : phase.name}</Eyebrow>
              {phase.demo && <DemoBadge />}
            </div>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="size-5 animate-spin rounded-full border-[3px] border-border border-t-brand" />
              <span className="text-sm">Extracting the denial reason and dates</span>
            </div>
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-12 w-full" />
          </Card>
        )}
        {phase.kind === "error" && (
          <Notice tone={phase.missing ? "warn" : "danger"} title={phase.title}>
            <p>{phase.message}</p>
            {phase.missing?.length ? <p className="mt-1 text-xs">Missing on the server: {phase.missing.join(", ")}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={btn({ variant: "secondary", size: "sm" })} onClick={() => (phase.demo ? void run(null) : fileRef.current?.click())}>
                Try again
              </button>
              <button type="button" className={btn({ variant: "secondary", size: "sm" })} onClick={() => setManual(true)}>
                Type it instead
              </button>
            </div>
          </Notice>
        )}

        {(manual || phase.kind === "idle") && (
          <Card className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <Eyebrow>Or type the letter&apos;s facts</Eyebrow>
              {!manual && (
                <button type="button" className={btn({ variant: "ghost", size: "sm" })} onClick={() => setManual(true)}>
                  Open
                </button>
              )}
            </div>
            {manual ? (
              <form onSubmit={form.handleSubmit(submitManual)} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-2">
                  <label htmlFor="reason" className="text-sm font-semibold">
                    The reason, copied from the letter
                  </label>
                  <textarea id="reason" rows={4} className={cn(inputCls, "py-3")} aria-invalid={Boolean(form.formState.errors.reason_text)} {...form.register("reason_text")} />
                  {form.formState.errors.reason_text && <p className="text-sm text-danger">{form.formState.errors.reason_text.message}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="date" className="text-sm font-semibold">
                      Date of the notice
                    </label>
                    <input id="date" type="date" className={inputCls} aria-invalid={Boolean(form.formState.errors.notice_date)} {...form.register("notice_date")} />
                    {form.formState.errors.notice_date && <p className="text-sm text-danger">{form.formState.errors.notice_date.message}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="ref" className="text-sm font-semibold">
                      Reference number (optional)
                    </label>
                    <input id="ref" className={inputCls} {...form.register("reference_number")} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="rt" className="text-sm font-semibold">
                      Was it a renewal?
                    </label>
                    <select id="rt" className={inputCls} {...form.register("request_type")}>
                      <option value="initial">First request</option>
                      <option value="renewal">Renewal</option>
                      <option value="unknown">Not sure</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="ct" className="text-sm font-semibold">
                      Before or after you got the drug?
                    </label>
                    <select id="ct" className={inputCls} {...form.register("claim_timing")}>
                      <option value="pre_service">Before (prior authorization)</option>
                      <option value="post_service">After (I already paid)</option>
                      <option value="urgent">Urgent</option>
                      <option value="unknown">Not sure</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className={btn()}>
                  Decode these facts
                </button>
              </form>
            ) : (
              <p className="text-sm text-ink-2">No upload needed: copy the reason sentence and the date. The same code computes everything else.</p>
            )}
          </Card>
        )}
        <p className="text-xs text-ink-3">Not medical or legal advice. Deadlines are computed from the dates on your letter under federal rules; your plan documents control.</p>
      </aside>
    </div>
  );
}
