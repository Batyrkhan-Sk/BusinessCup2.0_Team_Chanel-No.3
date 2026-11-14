"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { loadData } from "@/lib/data/load";
import { store } from "@/lib/client/store";
import { buildAppealPack } from "@/lib/appeal/pack";
import { appealPackPdf } from "@/lib/appeal/pdf";
import { pickInsurerRule } from "@/lib/engine/coverage";
import { bestPath } from "@/lib/engine/path";
import { QuizSchema } from "@/lib/quiz-schema";
import { DEMO_PERSONAS } from "@/lib/fixtures";
import type { DecodedDenial } from "@/lib/decoder/decode";
import type { QuizInput } from "@/lib/engine/types";
import { formatUsd, todayIso } from "@/lib/format";
import { btn, Card, Check, DemoBadge, Eyebrow, Notice, Pill, Skeleton, Wrap } from "@/components/ds";
import { GuardianNav } from "@/components/guardian/guardian-nav";
import { cn } from "@/lib/utils";

const data = loadData();

export function AppealView() {
  const params = useSearchParams();
  const wantDemo = params.get("demo") === "jessica";
  const [state, setState] = useState<{ loading: true } | { loading: false; decoded: DecodedDenial | null; demo: boolean; input: QuizInput | null; member: boolean }>({ loading: true });
  const [tab, setTab] = useState<"letter" | "lmn" | "list">("letter");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = store.getDecoded();
    const member = Boolean(store.getGuardian()?.active);
    if (wantDemo) {
      setState({ loading: false, decoded: saved?.demo ? saved.decoded : null, demo: true, input: DEMO_PERSONAS.jessica.input, member });
      return;
    }
    const q = store.getQuiz();
    const parsed = q?.start_month ? QuizSchema.safeParse(q) : null;
    setState({ loading: false, decoded: saved && !saved.demo ? saved.decoded : null, demo: false, input: parsed?.success && q?.start_month ? { ...parsed.data, start_month: q.start_month } : null, member });
  }, [wantDemo]);

  const pack = useMemo(() => {
    if (state.loading || !state.decoded) return null;
    const rule = state.input ? pickInsurerRule(data, state.input.insurer_id, state.input.product_id).rule : null;
    const path = state.input ? bestPath(state.input, data) : null;
    return buildAppealPack({ decoded: state.decoded, rule, path, today: todayIso(), demo: state.demo }, data);
  }, [state]);

  if (state.loading)
    return (
      <Wrap className="py-8" aria-busy="true">
        <Skeleton className="h-[600px]" />
      </Wrap>
    );

  const unlocked = !state.loading && (state.member || state.demo);
  const monthly = data.pricing.plans.find((p) => p.id === "monthly")!;

  if (!pack)
    return (
      <Wrap className="flex flex-col gap-6 pt-2 pb-16">
        <GuardianNav active="appeal" />
        <Card className="mx-auto flex max-w-xl flex-col gap-4 p-8 text-center">
          <h1 className="text-2xl font-bold">Decode a letter first</h1>
          <p className="text-ink-2">The appeal pack is built from your decoded denial: its reason, dates and reference.</p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Link className={btn()} href="/decode">
              Decode my letter
            </Link>
            <Link className={btn({ variant: "secondary" })} href="/decode?demo=1">
              Decode the DEMO letter
            </Link>
          </div>
        </Card>
      </Wrap>
    );

  async function exportPdf() {
    if (!pack) return;
    setBusy(true);
    try {
      const bytes = await appealPackPdf(pack);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `dosecost-appeal-pack${pack.demo ? "-DEMO" : ""}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Could not build the PDF");
    } finally {
      setBusy(false);
    }
  }
  const letterText = [pack.letter.re, "", ...pack.letter.paragraphs, "", `Enclosures: ${pack.letter.enclosures.join("; ")}.`, "", ...pack.letter.signoff].join("\n");

  return (
    <Wrap className="flex flex-col gap-6 pt-2 pb-16">
      <GuardianNav active="appeal" />
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="accent">Guardian</Pill>
        <Pill tone="neutral">{pack.title}</Pill>
        {pack.demo && <DemoBadge />}
        {unlocked && (
          <button type="button" className={btn({ size: "sm", className: "ml-auto" })} onClick={exportPdf} disabled={busy}>
            {busy ? "Building PDF…" : "Export PDF"}
          </button>
        )}
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <Eyebrow>Appeal pack</Eyebrow>
              <h1 className="text-[22px] font-semibold">3 documents, 1 PDF</h1>
            </div>
            <div role="tablist" aria-label="Pack contents" className="flex flex-col">
              {(
                [
                  ["letter", "1 · Patient appeal letter"],
                  ["lmn", "2 · Letter of medical necessity (draft for your doctor)"],
                  ["list", "3 · Document checklist"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn("px-6 py-3 text-left text-sm outline-none focus-visible:shadow-[inset_var(--dc-focus)]", tab === id ? "border-l-[3px] border-brand bg-brand-soft font-semibold text-brand-ink" : "text-ink hover:bg-surface-2")}
                >
                  {label}
                </button>
              ))}
            </div>
          </Card>
          <Card className="flex flex-col gap-3 p-6">
            <Eyebrow>Filled from your case</Eyebrow>
            <dl className="flex flex-col divide-y divide-border">
              {pack.summary.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-baseline gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Notice tone="warn" title="Before you send">
            Fill the bracketed fields. The medical-necessity draft contains no clinical claims until your doctor adds them and signs.
          </Notice>
        </aside>

        <section className="relative flex flex-col gap-6">
          {tab === "letter" && (
            <article className="flex flex-col gap-4 rounded-[var(--dc-r-lg)] border border-border bg-surface p-6 text-[15px] leading-relaxed shadow-lg md:p-12" aria-label="Patient appeal letter preview">
              <div className="flex flex-wrap justify-between gap-4">
                <div className="flex flex-col">
                  {pack.letter.header.slice(0, -1).map((l) => (
                    <span key={l} className={l === pack.letter.header[0] ? "font-semibold" : "text-ink-2"}>
                      {l}
                    </span>
                  ))}
                </div>
                <span className="text-ink-2">{pack.letter.header[pack.letter.header.length - 1]}</span>
              </div>
              <div className="flex flex-col">
                {pack.letter.to.map((l, i) => (
                  <span key={l} className={i === 0 ? "font-semibold" : "text-ink-2"}>
                    {l}
                  </span>
                ))}
              </div>
              <p className="font-semibold">{pack.letter.re}</p>
              {pack.letter.paragraphs.map((p, i) => (
                <p key={i} className={cn(!unlocked && i > 0 && "blur-[5px] select-none")} aria-hidden={!unlocked && i > 0}>
                  {p}
                </p>
              ))}
              <p className={cn(!unlocked && "blur-[5px] select-none")}>Enclosures: {pack.letter.enclosures.join("; ")}.</p>
              <p>
                {pack.letter.signoff[0]}
                <br />
                {pack.letter.signoff[1]}
              </p>
              <div className="flex justify-between border-t border-border pt-3 text-xs text-ink-3">
                <span>Generated by DoseCost from your decoded letter and plan policy data. Not legal advice.</span>
              </div>
            </article>
          )}
          {tab === "lmn" && (
            <Card className={cn("flex flex-col gap-4 p-6 md:p-10", !unlocked && "blur-[4px] select-none")} aria-hidden={!unlocked}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{pack.lmn.title}</h2>
                <Pill tone="warn">Doctor reviews and signs</Pill>
              </div>
              <p className="text-sm text-ink-2">{pack.lmn.note}</p>
              {pack.lmn.sections.map((s) => (
                <div key={s.heading}>
                  <strong className="text-sm">{s.heading}</strong>
                  <p className="text-sm">{s.body}</p>
                </div>
              ))}
            </Card>
          )}
          {tab === "list" && (
            <Card className="flex flex-col gap-3 p-6 md:p-10">
              <h2 className="text-lg font-semibold">Document checklist</h2>
              <ul className="flex flex-col gap-2.5">
                {pack.checklist.map((c) => (
                  <li key={c.label} className="flex items-start gap-2.5">
                    <Check on={false} />
                    <span>
                      <strong className="text-sm">{c.label}</strong>
                      <span className="block text-xs text-ink-3">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {!unlocked && (
            <Card className="flex flex-col items-start gap-3 p-6 shadow-lg">
              <Eyebrow>Unlock the full pack</Eyebrow>
              <p className="text-sm">
                Guardian ({formatUsd(monthly.price_usd)}/month) unlocks the full letter, the medical-necessity draft and the PDF export, plus reminders for every deadline.
              </p>
              <Link className={btn()} href="/paywall">
                See Guardian
              </Link>
            </Card>
          )}

          {unlocked && (
            <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex flex-col gap-0.5">
                <strong>Download the pack as one PDF</strong>
                <span className="text-sm text-ink-2">Letter, draft, checklist and your case summary. Regenerate any time your case changes.</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={btn({ variant: "secondary" })}
                  onClick={() => void navigator.clipboard?.writeText(letterText).then(() => toast.success("Letter copied"))}
                >
                  Copy letter text
                </button>
                <button type="button" className={btn()} onClick={exportPdf} disabled={busy}>
                  Export PDF
                </button>
              </div>
              {pack.demo && !state.member && <span className="w-full text-xs text-ink-3">DEMO case: unlocked for evaluation, watermarked DEMO.</span>}
            </Card>
          )}
        </section>
      </div>
    </Wrap>
  );
}
