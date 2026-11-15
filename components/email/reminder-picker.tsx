"use client";

import { ArrowRight, ArrowDown } from "lucide-react";
import { formatDate, todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PickerItem = { id: string; title: string; sendDates?: string[] };

export const REMINDER_TITLE: Record<string, string> = {
  pa_renewal: "Approval renewal (PA)",
  promo_ending: "Promo ending",
  refill_window: "Refill window",
  appeal_deadline: "Appeal deadline",
  monthly_check: "Monthly check",
  discount_ending: "Discount ending",
  plan_year: "Plan-year check",
};

/** The next send on or after today; if every send is in the past, the last one. */
function nextSend(dates: string[] | undefined): { date: string; past: boolean } | null {
  if (!dates?.length) return null;
  const today = todayIso();
  const sorted = [...dates].sort();
  const next = sorted.find((d) => d >= today);
  return next ? { date: next, past: false } : { date: sorted[sorted.length - 1], past: true };
}

/** List of reminders; the selected one is the email shown next to it. Arrows point at the preview (right on desktop, down on mobile). */
export function ReminderPicker({ items, value, onChange }: { items: PickerItem[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-ink">Pick a reminder to see its email</p>
      <div role="radiogroup" aria-label="Pick a reminder to see its email" className="flex flex-col gap-1.5">
        {items.map((i) => {
          const on = i.id === value;
          const send = nextSend(i.sendDates);
          return (
            <button
              key={i.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(i.id)}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--dc-r-md)] border px-3.5 py-2.5 text-left transition-colors outline-none focus-visible:shadow-[var(--dc-focus)]",
                on ? "border-brand bg-surface shadow-sm" : "border-border/70 bg-surface/50 hover:border-border hover:bg-surface",
              )}
            >
              <span className="flex flex-col">
                <span className={cn("text-sm font-semibold", on ? "text-brand-ink" : "text-ink")}>{i.title}</span>
                {send && <span className="text-xs text-ink-2">{send.past ? "Sent" : "Sends"} {formatDate(send.date)}</span>}
              </span>
              <span aria-hidden="true" className={cn("flex-none", on ? "text-brand" : "invisible")}>
                <ArrowRight className="hidden size-4 md:block" />
                <ArrowDown className="size-4 md:hidden" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
