"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { ReminderPayload } from "@/lib/email/templates";
import { track } from "@/lib/client/analytics";
import { btn, Check, inputCls, Notice } from "@/components/ds";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useGuardianMember } from "@/lib/client/use-guardian";

export interface ReminderOption {
  id: string;
  label: string;
  payload: ReminderPayload;
  remind_on: string[];
  /** when different send dates need different content (e.g. prices that change with the dose); payload above is the preview */
  schedule?: Array<{ payload: ReminderPayload; remind_on: string[] }>;
}

const Form = z.object({ email: z.string().email("Enter a valid email address") });

type ApiResult = { ok: true; scheduled?: number; sent?: boolean } | { ok: false; error: string; message?: string; missing?: string[] };

/** Without Guardian one reminder is free; Guardian (or DEMO data) unlocks every reminder. */
export function ReminderSignup({ options, snapshot, compact, demo }: { options: ReminderOption[]; snapshot?: unknown; compact?: boolean; demo?: boolean }) {
  const member = useGuardianMember();
  const unlimited = Boolean(demo) || member === true;
  const [picked, setPicked] = useState<Record<string, boolean>>(() => Object.fromEntries(options.map((o, i) => [o.id, i === 0])));
  const toggle = (id: string, on: boolean) =>
    setPicked((p) => (unlimited ? { ...p, [id]: on } : on ? Object.fromEntries(options.map((o) => [o.id, o.id === id])) : { ...p, [id]: false }));
  const lockedMore = !unlimited && options.length > 1;
  const [state, setState] = useState<{ kind: "idle" | "busy" } | { kind: "done"; text: string } | { kind: "error"; text: string; missing?: string[] }>({ kind: "idle" });
  const form = useForm<z.infer<typeof Form>>({ resolver: zodResolver(Form) });

  async function call(path: string, body: unknown): Promise<ApiResult> {
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, error: String(json.error ?? res.status), message: json.message as string | undefined, missing: json.missing as string[] | undefined };
    return { ok: true, ...(json as object) } as ApiResult;
  }

  const chosen = options.filter((o) => picked[o.id]);

  async function schedule({ email }: { email: string }) {
    setState({ kind: "busy" });
    const r = await call("/api/reminders", { email, items: chosen.flatMap((o) => o.schedule ?? [{ payload: o.payload, remind_on: o.remind_on }]), snapshot });
    if (r.ok) {
      track("reminder_set", { count: chosen.length });
      setState({ kind: "done", text: `Scheduled ${r.scheduled ?? 0} reminder email${r.scheduled === 1 ? "" : "s"}.${r.sent ? " The first one was just sent to your inbox." : ""}` });
      toast.success("Reminders scheduled");
    } else setState({ kind: "error", text: r.message ?? "Could not schedule reminders.", missing: r.missing });
  }

  async function sendNow() {
    const ok = await form.trigger("email");
    if (!ok || !chosen[0]) return;
    setState({ kind: "busy" });
    const r = await call("/api/reminders/send-now", { email: form.getValues("email"), payload: chosen[0].payload });
    if (r.ok) {
      track("reminder_set", { count: 1, send_now: true });
      setState({ kind: "done", text: "Sent. Check your inbox (and spam folder) in a minute." });
      toast.success("Email sent");
    } else setState({ kind: "error", text: r.message ?? "Could not send the email.", missing: r.missing });
  }

  return (
    <form onSubmit={form.handleSubmit(schedule)} className="flex flex-col gap-4" noValidate>
      {!compact && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Remind me about</legend>
          {options.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={picked[o.id] ?? false}
                onChange={(e) => toggle(o.id, e.target.checked)}
              />
              <span className="rounded-md peer-focus-visible:shadow-[var(--dc-focus)]">
                <Check on={picked[o.id] ?? false} />
              </span>
              {o.label}
            </label>
          ))}
          {lockedMore && (
            <p className="mt-1 text-xs text-ink-2">
              One reminder is free. <Link href="/paywall" className="font-semibold text-brand">Guardian</Link> reminds you before every date.
            </p>
          )}
        </fieldset>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="remind-email" className="sr-only">
          Email
        </label>
        <input id="remind-email" type="email" autoComplete="email" placeholder="you@example.com" className={inputCls} aria-invalid={Boolean(form.formState.errors.email)} {...form.register("email")} />
        <button type="submit" className={btn({ className: "flex-none" })} disabled={state.kind === "busy" || chosen.length === 0}>
          {state.kind === "busy" ? "Working…" : "Set reminders"}
        </button>
      </div>
      {form.formState.errors.email && <p className="text-sm text-danger">{form.formState.errors.email.message}</p>}
      <button type="button" className={cn(btn({ variant: "ghost", size: "sm" }), "self-start px-0")} onClick={sendNow} disabled={state.kind === "busy" || chosen.length === 0}>
        Send me this email now
      </button>
      {state.kind === "done" && <Notice tone="accent">{state.text}</Notice>}
      {state.kind === "error" && (
        <Notice tone="warn" title="Not configured yet">
          {state.text}
          {state.missing?.length ? <span className="mt-1 block text-xs">Missing on the server: {state.missing.join(", ")}</span> : null}
        </Notice>
      )}
      <span className="text-xs text-ink-3">Your email is the only thing we store, and only for reminders. Unsubscribe in one click.</span>
    </form>
  );
}
