"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { DayPicker } from "react-day-picker";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
/** Local-date conversions: ISO strings here are calendar dates, never instants, so no timezone shift. */
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (iso: string): Date | undefined => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
};

export function DatePicker({
  id,
  value,
  onChange,
  invalid,
  placeholder = "Pick a date",
  noFuture = false,
  "aria-describedby": describedBy,
}: {
  id: string;
  value: string;
  onChange: (iso: string) => void;
  invalid?: boolean;
  placeholder?: string;
  /** Disable days after today (for dates printed on a letter or a past fill). */
  noFuture?: boolean;
  "aria-describedby"?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = fromIso(value);
  const today = new Date();

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-haspopup="dialog"
        className={cn(
          "group flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--dc-r-md)] border border-border bg-surface px-4 text-left text-base outline-none transition-colors",
          "hover:border-ink-3 focus-visible:border-brand focus-visible:shadow-[var(--dc-focus)] data-popup-open:border-brand data-popup-open:shadow-[var(--dc-focus)]",
          "aria-invalid:border-danger",
        )}
      >
        <span className={cn("line-clamp-1 flex-1", selected ? "text-ink" : "text-ink-3")}>{selected ? formatDate(value) : placeholder}</span>
        <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-ink-3 group-data-popup-open:text-brand" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="isolate z-50">
          <Popover.Popup
            aria-label="Choose a date"
            className="origin-(--transform-origin) rounded-[var(--dc-r-lg)] border border-border bg-surface p-3 text-ink shadow-[var(--dc-sh-lg)] outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <DayPicker
              mode="single"
              autoFocus
              selected={selected}
              defaultMonth={selected ?? today}
              onSelect={(d) => {
                if (!d) return;
                onChange(toIso(d));
                setOpen(false);
              }}
              disabled={noFuture ? { after: today } : undefined}
              endMonth={noFuture ? today : undefined}
              showOutsideDays
              components={{
                Chevron: ({ orientation }) =>
                  orientation === "left" ? <ChevronLeft aria-hidden="true" className="size-5" /> : <ChevronRight aria-hidden="true" className="size-5" />,
              }}
              classNames={{
                root: "relative",
                months: "flex flex-col",
                month: "flex flex-col gap-3",
                month_caption: "flex h-9 items-center px-1",
                caption_label: "text-base font-semibold",
                nav: "absolute top-0 right-0 flex items-center gap-1",
                button_previous:
                  "inline-flex size-9 cursor-pointer items-center justify-center rounded-[var(--dc-r-sm)] text-ink-2 outline-none hover:bg-surface-2 focus-visible:shadow-[var(--dc-focus)] disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent",
                button_next:
                  "inline-flex size-9 cursor-pointer items-center justify-center rounded-[var(--dc-r-sm)] text-ink-2 outline-none hover:bg-surface-2 focus-visible:shadow-[var(--dc-focus)] disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent",
                month_grid: "border-collapse",
                weekdays: "flex",
                weekday: "flex size-10 items-center justify-center text-xs font-semibold tracking-[0.04em] text-ink-3 uppercase",
                week: "flex",
                day: "group/day relative size-10 p-0.5 text-center text-sm",
                day_button:
                  "inline-flex size-full cursor-pointer items-center justify-center rounded-[var(--dc-r-sm)] text-ink outline-none transition-colors hover:bg-surface-2 focus-visible:shadow-[var(--dc-focus)] disabled:cursor-not-allowed disabled:hover:bg-transparent",
                today: "font-bold [&>button]:text-brand [&>button]:shadow-[inset_0_0_0_1px_var(--dc-border)]",
                selected: "[&>button]:bg-brand [&>button]:font-semibold [&>button]:!text-white [&>button]:hover:bg-brand [&>button]:shadow-none",
                outside: "[&>button]:text-ink-3/60",
                disabled: "[&>button]:text-ink-3/40",
                hidden: "invisible",
              }}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
