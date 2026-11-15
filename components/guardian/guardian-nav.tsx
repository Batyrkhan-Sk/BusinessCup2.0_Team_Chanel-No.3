"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ManagePlanButton } from "@/components/paywall/manage-plan";

/** Second-level navigation inside Guardian, styled as a segmented control so it reads as a sub-section of the main nav. */
export function GuardianNav({ active }: { active: "timeline" | "overpay" | "appeal" }) {
  const links = [
    { id: "timeline", href: "/guardian", label: "Timeline" },
    { id: "overpay", href: "/guardian/overpay", label: "Overpayment check" },
    { id: "appeal", href: "/appeal?demo=jessica", label: "Appeal pack" },
  ] as const;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
    <nav aria-label="Guardian sections" className="flex max-w-full overflow-x-auto">
      <div className="inline-flex items-center gap-1 rounded-[var(--dc-r-md)] bg-surface-2 p-1">
        {links.map((l) => (
          <Link
            key={l.id}
            href={l.href}
            aria-current={active === l.id ? "page" : undefined}
            className={cn(
              "rounded-[var(--dc-r-sm)] px-3 py-1.5 text-sm font-medium whitespace-nowrap no-underline transition-colors outline-none focus-visible:shadow-[var(--dc-focus)]",
              active === l.id ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink",
            )}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
    <ManagePlanButton className="px-0" />
    </div>
  );
}
