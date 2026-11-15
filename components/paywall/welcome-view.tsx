"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { store } from "@/lib/client/store";
import { btn, Card, Notice, Skeleton, Wrap } from "@/components/ds";

/** Stripe success landing: verifies the Checkout Session server-side before unlocking Guardian. */
export function WelcomeView() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ok"; plan: string | null; trial: boolean } | { kind: "error"; message: string }>({ kind: "loading" });

  useEffect(() => {
    if (!sessionId) return setState({ kind: "error", message: "No checkout session was found in the link." });
    fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (r) => ({ ok: r.ok, json: (await r.json().catch(() => ({}))) as { active?: boolean; trial?: boolean; plan?: string | null; email?: string | null; message?: string } }))
      .then(({ ok, json }) => {
        if (ok && json.active) {
          store.setGuardian({ active: true, plan: json.plan ?? null, email: json.email ?? null, session_id: sessionId, verified_at: new Date().toISOString() });
          setState({ kind: "ok", plan: json.plan ?? null, trial: Boolean(json.trial) });
        } else setState({ kind: "error", message: json.message ?? "We could not confirm this payment." });
      })
      .catch(() => setState({ kind: "error", message: "Network problem while confirming the payment." }));
  }, [sessionId]);

  return (
    <Wrap className="py-16">
      <Card className="mx-auto flex max-w-xl flex-col gap-4 p-8">
        {state.kind === "loading" && (
          <div aria-busy="true" className="flex flex-col gap-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}
        {state.kind === "ok" && (
          <>
            <h1 className="text-2xl font-bold">Welcome to Guardian</h1>
            <p className="text-ink-2">
              {state.trial ? "Your free trial has started" : `Your ${state.plan ?? ""} plan is active`} in this browser. Build your appeal pack and turn on reminders.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link className={btn()} href="/appeal">
                Open my appeal pack
              </Link>
              <Link className={btn({ variant: "secondary" })} href="/guardian">
                Go to my timeline
              </Link>
            </div>
          </>
        )}
        {state.kind === "error" && (
          <>
            <h1 className="text-2xl font-bold">We could not confirm the payment</h1>
            <Notice tone="warn">{state.message}</Notice>
            <Link className={btn({ variant: "secondary", className: "self-start" })} href="/paywall">
              Back to plans
            </Link>
          </>
        )}
      </Card>
    </Wrap>
  );
}
