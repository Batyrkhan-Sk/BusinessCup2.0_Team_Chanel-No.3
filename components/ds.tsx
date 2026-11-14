/**
 * DoseCost design-system primitives, 1:1 with the approved design tokens
 * (design-canvas/project/dc.css → app/globals.css --dc-* variables).
 */
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const btn = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--dc-r-md)] border font-semibold no-underline transition-colors outline-none focus-visible:shadow-[var(--dc-focus)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        primary: "border-transparent bg-brand text-white hover:bg-brand-ink",
        secondary: "border-border bg-surface text-ink hover:bg-surface-2",
        ghost: "border-transparent bg-transparent text-brand hover:text-brand-ink",
        onDark: "border-transparent bg-white text-brand-ink hover:bg-brand-soft",
        outlineOnDark: "border-white/40 bg-transparent text-white hover:bg-white/10",
      },
      size: {
        sm: "min-h-10 px-3.5 text-sm",
        md: "min-h-12 px-5 text-base",
        lg: "min-h-14 px-7 text-lg",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
export type BtnProps = VariantProps<typeof btn>;

const pillTone = {
  accent: "bg-brand-soft text-brand-ink",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-surface-2 text-ink-2",
  demo: "bg-ink text-white tracking-[0.06em]",
} as const;
export type PillTone = keyof typeof pillTone;

export function Pill({ tone = "neutral", className, children }: { tone?: PillTone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap", pillTone[tone], className)}>
      {children}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Pill tone="demo" className={className}>
      DEMO
    </Pill>
  );
}

export function Card({ className, accent, children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { accent?: boolean }) {
  return (
    <div
      className={cn(
        accent
          ? "rounded-[var(--dc-r-lg)] bg-brand text-white shadow-md"
          : "rounded-[var(--dc-r-lg)] border border-border bg-surface shadow-sm",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ className, children, onDark }: { className?: string; children: React.ReactNode; onDark?: boolean }) {
  return <span className={cn("text-xs font-semibold tracking-[0.08em] uppercase", onDark ? "text-white/80" : "text-ink-3", className)}>{children}</span>;
}

export function Num({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("num", className)}>{children}</span>;
}

export function Wrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1120px] px-4 md:px-6", className)}>{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-surface-2", className)} />;
}

export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "warn" | "danger" | "accent"; title?: string; children: React.ReactNode; className?: string }) {
  const tones = {
    info: "bg-info-soft text-info",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    accent: "bg-brand-soft text-brand-ink",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-[var(--dc-r-lg)] p-4 text-sm", tones[tone], className)}>
      {title ? <p className="mb-1 text-xs font-semibold tracking-[0.08em] uppercase">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}

export const inputCls =
  "min-h-12 w-full rounded-[var(--dc-r-md)] border border-border bg-surface px-4 text-base text-ink outline-none focus-visible:shadow-[var(--dc-focus)] focus-visible:border-brand aria-invalid:border-danger";

export const choiceCls = (on: boolean) =>
  cn(
    "flex min-h-14 w-full items-center gap-3 rounded-[var(--dc-r-md)] border bg-surface px-4 py-3 text-left text-base outline-none transition-colors focus-visible:shadow-[var(--dc-focus)] cursor-pointer",
    on ? "border-brand bg-brand-soft shadow-[inset_0_0_0_1px_var(--dc-accent)]" : "border-border hover:bg-surface-2",
  );

export function Radio({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-5 flex-none rounded-full border-2", on ? "border-brand bg-[radial-gradient(circle,var(--dc-accent)_45%,transparent_50%)]" : "border-border")} /* lint-data-allow */
    />
  );
}

export function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-[22px] flex-none items-center justify-center rounded-md border-2 text-xs", on ? "border-brand bg-brand text-white" : "border-border")}
    >
      {on ? "✓" : null}
    </span>
  );
}
