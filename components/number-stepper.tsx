"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const stepBtn =
  "inline-flex size-12 shrink-0 cursor-pointer items-center justify-center text-ink-2 outline-none transition-colors hover:bg-surface-2 hover:text-ink focus-visible:shadow-[var(--dc-focus)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent";

/** A typed whole-number field with − / + buttons, replacing the browser's native number spinner. */
export function NumberStepper({
  id,
  value,
  onChange,
  min = 1,
  max = 99,
  label,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  /** Used for the buttons' accessible names, e.g. "fill number". */
  label: string;
}) {
  const n = Number.isFinite(value) ? value : min;
  const clamp = (x: number) => Math.min(max, Math.max(min, x));
  return (
    <div className="flex min-h-12 w-full items-stretch overflow-hidden rounded-[var(--dc-r-md)] border border-border bg-surface focus-within:border-brand">
      <button type="button" className={cn(stepBtn, "border-r border-border")} onClick={() => onChange(clamp(n - 1))} disabled={n <= min} aria-label={`Decrease ${label}`}>
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <input
        id={id}
        inputMode="numeric"
        pattern="[0-9]*"
        className="w-full min-w-0 bg-transparent text-center text-base text-ink tabular-nums outline-none"
        value={String(n)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          if (digits) onChange(clamp(Number(digits)));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") (e.preventDefault(), onChange(clamp(n + 1)));
          if (e.key === "ArrowDown") (e.preventDefault(), onChange(clamp(n - 1)));
        }}
      />
      <button type="button" className={cn(stepBtn, "border-l border-border")} onClick={() => onChange(clamp(n + 1))} disabled={n >= max} aria-label={`Increase ${label}`}>
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
