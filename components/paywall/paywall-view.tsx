"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { ManagePlanButton } from "@/components/paywall/manage-plan";
import { track } from "@/lib/client/analytics";
import { store } from "@/lib/client/store";
import { loadData } from "@/lib/data/load";
import { formatUsd } from "@/lib/format";
import { btn, Card, Check, Eyebrow, Notice, Num, Pill, Wrap } from "@/components/ds";
import { cn } from "@/lib/utils";

const data = loadData();

const TEST_CARD = "4242 4242 4242 4242";

/** Headline per entry point, so the page continues what the visitor was doing. */
const CONTEXT: Record<string, { eyebrow: string; title: string }> = {
  appeal: { eyebrow: "Your appeal pack is ready", title: "Unlock the full appeal pack, then let us watch every deadline." },
  overpay: { eyebrow: "Monthly overpayment check", title: "Check every fill, and let us watch every price, deadline and renewal." },
  reminders: { eyebrow: "More reminders", title: "Get an email before every date, not just one." },
};
const DEFAULT_CONTEXT = { eyebrow: "DoseCost Guardian", title: "Build your appeal, then let us watch every price, deadline and renewal." };

export function PaywallView() {
  const plans = data.pricing.plans;
  const monthly = plans.find((p) => p.id === "monthly")!;
  const yearly = plans.find((p) => p.id === "yearly")!;
  const saving = Math.round((monthly.price_usd * 12 - yearly.price_usd) * 100) / 100;
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");
  const [state, setState] = useState<{ kind: "idle" | "busy" } | { kind: "error"; message: string; missing?: string[] }>({ kind: "idle" });
  const [member, setMember] = useState(false);
  const params = useSearchParams();
  const ctx = CONTEXT[params.get("from") ?? ""] ?? DEFAULT_CONTEXT;
  const canceled = params.get("canceled") === "1";

  useEffect(() => {
    track("paywall_view", {});
    setMember(Boolean(store.getGuardian()?.active));
  }, []);

  async function checkout() {
    setState({ kind: "busy" });
    track("checkout_start", { plan });
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) });
      const json = (await res.json().catch(() => ({}))) as { url?: string; message?: string; missing?: string[] };
      if (res.ok && json.url) {
        window.location.assign(json.url);
        return;
      }
      setState({ kind: "error", message: json.message ?? "Checkout is unavailable right now.", missing: json.missing });
    } catch {
      setState({ kind: "error", message: "Network problem. Try again." });
    }
  }

  return (
    <Wrap className="flex flex-col gap-8 pt-6 pb-16">
      <div className="flex flex-col items-center gap-2.5 text-center">
        <Eyebrow>{ctx.eyebrow}</Eyebrow>
        <h1 className="max-w-3xl text-[30px] leading-tight font-bold tracking-tight md:text-[44px]">{ctx.title}</h1>
        <p className="max-w-2xl text-lg text-ink-2">You pay us, not a drugmaker, pharmacy or telehealth company. That is why we can be neutral.</p>
      </div>

      {canceled && !member && (
        <Notice tone="warn" title="Checkout cancelled" className="mx-auto w-full max-w-[880px]">
          Nothing was charged. Your free tools still work, and you can start the trial any time.
        </Notice>
      )}

      {!member && <JuryCard />}

      <fieldset className="mx-auto grid w-full max-w-[880px] gap-6 md:grid-cols-2">
        <legend className="sr-only">Choose a plan</legend>
        {[
          { p: monthly, label: "Monthly", note: "Cancel any time. Good while your appeal is open.", unit: "/month" },
          { p: yearly, label: "Yearly", note: "Covers renewals, the January plan check and a full year of overpayment checks.", unit: "/year" },
        ].map(({ p, label, note, unit }) => {
          const on = plan === p.id;
          return (
            <label key={p.id} className={cn("flex cursor-pointer flex-col gap-4 rounded-[var(--dc-r-lg)] border p-8 transition-colors focus-within:shadow-[var(--dc-focus)]", on ? "border-transparent bg-brand text-white shadow-md" : "border-border bg-surface")}>
              <input type="radio" name="plan" value={p.id} checked={on} onChange={() => setPlan(p.id)} className="sr-only" />
              <div className="flex items-center justify-between">
                <Eyebrow onDark={on}>{label}</Eyebrow>
                {p.id === "yearly" && <Pill tone="accent" className={cn(on && "bg-white")}>Save {formatUsd(saving)}</Pill>}
              </div>
              <div className="flex items-baseline gap-2">
                <Num className="text-[64px]">{formatUsd(p.price_usd)}</Num>
                <span className={on ? "text-white/80" : "text-ink-2"}>{unit}</span>
              </div>
              <p className={cn("text-sm", on ? "text-white/80" : "text-ink-2")}>{note}</p>
            </label>
          );
        })}
      </fieldset>

      <div className="mx-auto flex w-full max-w-[880px] flex-col items-center gap-3">
        {member ? (
          <>
            <Link className={btn({ size: "lg", className: "w-full sm:w-auto sm:px-10" })} href="/guardian">
              Open my Guardian timeline
            </Link>
            <ManagePlanButton />
          </>
        ) : (
          <button type="button" className={btn({ size: "lg", className: "w-full sm:w-auto sm:px-10" })} onClick={checkout} disabled={state.kind === "busy"}>
            {state.kind === "busy" ? "Opening secure checkout…" : data.pricing.trial_days > 0 ? `Start your ${data.pricing.trial_days}-day free trial` : `Start ${plan} with Stripe`}
          </button>
        )}
        {!member && data.pricing.trial_days > 0 && (
          <p className="text-center text-sm text-ink-2">
            Free for {data.pricing.trial_days} days, then {formatUsd(plan === "yearly" ? yearly.price_usd : monthly.price_usd)} {plan === "yearly" ? "a year" : "a month"}. Cancel before the trial ends and you pay nothing.
          </p>
        )}
        {state.kind === "error" && (
          <Notice tone="warn" title="Checkout not configured yet">
            {state.message}
            {state.missing?.length ? <span className="mt-1 block text-xs">Missing on the server: {state.missing.join(", ")}</span> : null}
          </Notice>
        )}
      </div>

      <section className="mx-auto grid w-full max-w-[880px] items-start gap-6 md:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <Eyebrow>Guardian adds</Eyebrow>
          {data.pricing.guardian_features.map((f) => (
            <div key={f} className="flex items-start gap-2.5 text-sm">
              <Check on />
              {f}
            </div>
          ))}
        </Card>
        <Card className="flex flex-col gap-3 p-6">
          <Eyebrow>Always free</Eyebrow>
          {data.pricing.free_features.map((f) => (
            <div key={f} className="flex items-start gap-2.5 text-sm">
              <Check on />
              {f}
            </div>
          ))}
        </Card>
      </section>
      <p className="text-center text-xs text-ink-3">Secure checkout by Stripe. We store your email and case dates; never your diagnosis, weight or symptoms. Not medical, legal or financial advice.</p>
    </Wrap>
  );
}

/** Test-mode instructions, placed where the jury looks first. */
function JuryCard() {
  async function copy() {
    try {
      await navigator.clipboard.writeText(TEST_CARD.replace(/ /g, ""));
      toast.success("Test card number copied");
    } catch {
      toast.error("Could not copy. Type 4242 four times.");
    }
  }
  return (
    <section aria-label="For the hackathon jury" className="mx-auto flex w-full max-w-[880px] flex-col gap-4 rounded-[var(--dc-r-lg)] border-2 border-dashed border-info/40 bg-info-soft p-5 md:flex-row md:items-center md:justify-between md:p-6">
      <div className="flex flex-col gap-1.5">
        <Eyebrow className="text-info">For the hackathon jury</Eyebrow>
        <p className="text-sm text-info">Stripe test mode, no real charge. Use this card with any future date and any CVC.</p>
        <button type="button" onClick={copy} className="mt-1 inline-flex w-fit cursor-pointer items-center gap-2 rounded-[var(--dc-r-md)] border border-info/30 bg-surface px-3 py-1.5 font-mono text-base font-semibold tracking-wider text-ink outline-none hover:bg-surface-2 focus-visible:shadow-[var(--dc-focus)]">
          {TEST_CARD}
          <Copy className="size-4 text-ink-2" aria-hidden="true" />
          <span className="sr-only">Copy test card number</span>
        </button>
      </div>
      <Link className={btn({ variant: "secondary", className: "flex-none" })} href="/guardian">
        Or skip payment: explore the DEMO case
      </Link>
    </section>
  );
}
