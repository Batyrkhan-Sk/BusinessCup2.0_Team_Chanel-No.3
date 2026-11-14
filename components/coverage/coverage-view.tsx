"use client";

import Link from "next/link";
import { useMemo } from "react";
import { loadData } from "@/lib/data/load";
import { coverageCheck } from "@/lib/engine/coverage";
import { bestPath } from "@/lib/engine/path";
import { getDrug } from "@/lib/engine/catalog";
import { useCase } from "@/lib/client/use-case";
import { COVERAGE_COPY, COVERAGE_LABELS, INSURERS } from "@/lib/content";
import { formatDate, formatUsd } from "@/lib/format";
import { btn, Card, DemoBadge, Eyebrow, Notice, Pill, Skeleton, Wrap } from "@/components/ds";

const data = loadData();

export function CoverageView() {
  const c = useCase();
  const result = useMemo(() => {
    if (c.status !== "ready") return null;
    return { cov: coverageCheck(c.input, data), path: bestPath(c.input, data) };
  }, [c]);

  if (c.status === "loading")
    return (
      <Wrap className="flex flex-col gap-6 py-8" aria-busy="true">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-96" />
      </Wrap>
    );
  if (c.status !== "ready" || !result)
    return (
      <Wrap className="py-16">
        <Card className="mx-auto flex max-w-xl flex-col gap-4 p-8 text-center">
          <h1 className="text-2xl font-bold">Answer the quiz first</h1>
          <p className="text-ink-2">The coverage check uses your coverage type, insurer and medicine.</p>
          <Link className={btn({ className: "self-center" })} href="/quiz">
            Start the quiz
          </Link>
        </Card>
      </Wrap>
    );

  const { cov, path } = result;
  const copy = COVERAGE_COPY[cov.status];
  const drug = getDrug(data, c.input.product_id);
  const rule = cov.insurer_rule;
  const decodedMissing = (c.decoded?.facts.reason_text ?? "").toLowerCase();
  const card = path.best_conditional;
  const demoQ = c.demo ? `?demo=${c.demo}` : "";

  return (
    <Wrap className="grid items-start gap-8 pt-4 pb-16 lg:grid-cols-[7fr_5fr]">
      <section className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="neutral">{COVERAGE_LABELS[c.input.coverage]}</Pill>
          {c.input.insurer_id && <Pill tone="neutral">{INSURERS.find((i) => i.id === c.input.insurer_id)?.label}</Pill>}
          <Pill tone="neutral">{drug.brand}</Pill>
          {c.demo && <DemoBadge />}
        </div>
        <div className="flex flex-col gap-2">
          <Eyebrow>Coverage check</Eyebrow>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight md:text-4xl">
            {copy.title} <span className={copy.tone === "danger" ? "text-danger" : copy.tone === "warn" ? "text-warn" : "text-brand"}>{copy.accent}</span>
          </h1>
          <p className="text-lg text-ink-2">{copy.body}</p>
          {cov.via_medicare_bridge && <p className="text-ink-2">Route: {data.medicareBridge.label}, {formatUsd(data.medicareBridge.monthly_copay_usd)} a month with a prior authorization.</p>}
        </div>

        {rule && (
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-6 pb-3">
              <h2 className="text-[22px] font-semibold">What {cov.generic_template ? "plans commonly ask" : `${rule.insurer_label}'s policy asks`} for</h2>
              {rule.pdf_url ? (
                <a className="text-sm text-brand" href={rule.pdf_url} target="_blank" rel="noreferrer">
                  {rule.policy_id}
                  {rule.effective_date ? `, effective ${formatDate(rule.effective_date)}` : ""}
                </a>
              ) : (
                <span className="text-sm text-ink-3">Generic template</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold tracking-[0.06em] text-ink-3 uppercase">
                    <th scope="col" className="px-4 py-2.5">Criterion</th>
                    <th scope="col" className="px-4 py-2.5">What to send</th>
                    <th scope="col" className="px-4 py-2.5">Page</th>
                  </tr>
                </thead>
                <tbody>
                  {rule.initial_criteria.map((cr) => {
                    const flagged = decodedMissing && cr.label.split(" ").some((w) => w.length > 4 && decodedMissing.includes(w.toLowerCase()));
                    return (
                      <tr key={cr.id} className="border-b border-border align-top last:border-0">
                        <td className="px-4 py-3">
                          <strong>{cr.label}</strong>
                          {flagged && <Pill tone="danger" className="ml-2">Cited in your denial</Pill>}
                          <span className="mt-0.5 block text-xs text-ink-3">{cr.detail}</span>
                        </td>
                        <td className="px-4 py-3">{cr.evidence}</td>
                        <td className="px-4 py-3 text-xs text-ink-3">{cr.source_page ?? "—"}</td>
                      </tr>
                    );
                  })}
                  {rule.renewal_criteria.map((cr) => (
                    <tr key={`r-${cr.id}`} className="border-b border-border align-top last:border-0">
                      <td className="px-4 py-3">
                        <strong>Renewal: {cr.label}</strong>
                        <Pill tone="info" className="ml-2">
                          Store your baseline now
                        </Pill>
                        <span className="mt-0.5 block text-xs text-ink-3">{cr.detail}</span>
                      </td>
                      <td className="px-4 py-3">{cr.evidence}</td>
                      <td className="px-4 py-3 text-xs text-ink-3">{cr.source_page ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-6 pb-5 text-xs text-ink-3">
              {rule.scope_note} {rule.verification !== "primary" ? `Source status: ${rule.verification}.` : ""}
            </p>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col gap-2 p-6">
            <Eyebrow>If your plan said &quot;excluded&quot;</Eyebrow>
            <p className="text-sm text-ink-2">{COVERAGE_COPY.excluded_by_plan.body}</p>
          </Card>
          <Card className="flex flex-col gap-2 p-6">
            <Eyebrow>If we could not tell</Eyebrow>
            <p className="text-sm text-ink-2">{COVERAGE_COPY.needs_diagnosis_code_clarification.body}</p>
          </Card>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className={btn({ size: "lg" })} href={c.demo ? "/decode?demo=1" : "/decode"}>
            Decode my denial letter
          </Link>
          <Link className={btn({ variant: "secondary", size: "lg" })} href={`/appeal${demoQ}`}>
            Preview the appeal pack
          </Link>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        {card?.total_usd != null && path.best?.total_usd != null && (
          <Card className="flex flex-col gap-2 border-brand-soft bg-brand-soft p-6">
            <Eyebrow className="text-brand-ink">Why this matters</Eyebrow>
            <p className="text-sm text-brand-ink">
              With an approval, {card.label.toLowerCase()} brings it to as low as {formatUsd(card.monthly_range_usd?.[0] ?? null)} a month: {formatUsd(card.total_usd)} over 12 months
              against {formatUsd(path.best.total_usd)} on your best path today.
            </p>
          </Card>
        )}
        <Card className="flex flex-col gap-3 p-6">
          <Eyebrow>Insurer policies we read</Eyebrow>
          {data.insurerRules.insurers.map((r) => (
            <div key={r.insurer_id} className="flex justify-between gap-3 text-sm">
              <span>
                <strong>{r.insurer_label}</strong> · {r.policy_id}
              </span>
              <span className="text-xs text-ink-3">{r.verification}</span>
            </div>
          ))}
          <p className="text-xs text-ink-3">Your plan document always overrides a published policy.</p>
        </Card>
        <Notice tone="info">We read policy documents and your yes/no answers. We never see or store your diagnosis.</Notice>
        <Link className={btn({ variant: "secondary" })} href={`/result${demoQ}`}>
          Back to my path
        </Link>
      </aside>
    </Wrap>
  );
}
