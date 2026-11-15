"use client";

import { useMemo, useSyncExternalStore } from "react";
import { renderReminderEmail, type ReminderPayload } from "@/lib/email/templates";

const subscribe = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

/**
 * Renders the exact HTML the cron sends (same renderReminderEmail call) inside a sandboxed iframe.
 */
export function EmailPreview({ payload, title = "Email preview", height = 520 }: { payload: ReminderPayload; title?: string; height?: number }) {
  const origin = useSyncExternalStore(subscribe, getOrigin, getServerOrigin);
  const email = useMemo(() => renderReminderEmail(payload, origin || process.env.NEXT_PUBLIC_APP_URL || ""), [payload, origin]);
  return (
    <div className="overflow-hidden rounded-[var(--dc-r-md)] bg-surface shadow-md">
      <div className="flex flex-col gap-1 border-b border-border px-5 py-3 text-[13px]">
        <div className="flex flex-wrap justify-between gap-2">
          <span>
            <strong>DoseCost</strong> <span className="text-ink-2">&lt;reminders@…&gt;</span>
          </span>
          <span className="text-ink-2">Preview</span>
        </div>
        <strong className="text-base">{email.subject}</strong>
      </div>
      <iframe title={title} sandbox="" srcDoc={email.html} className="block w-full border-0 bg-background" style={{ height }} />
    </div>
  );
}
