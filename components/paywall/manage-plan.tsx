"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { store } from "@/lib/client/store";
import { btn } from "@/components/ds";
import { cn } from "@/lib/utils";

/** "Manage or cancel" for a Guardian plan bought in this browser. Renders nothing for non-members. */
export function ManagePlanButton({ className }: { className?: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const g = store.getGuardian();
    setSessionId(g?.active ? g.session_id : null);
  }, []);
  if (!sessionId) return null;

  async function open() {
    setBusy(true);
    const res = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      url?: string;
      message?: string;
    };
    if (res.ok && json.url) {
      window.location.href = json.url;
      return;
    }
    setBusy(false);
    toast.error(json.message ?? "Could not open billing right now.");
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className={cn(btn({ variant: "ghost", size: "sm" }), className)}
    >
      {busy ? "Opening billing…" : "Manage or cancel plan"}
    </button>
  );
}
