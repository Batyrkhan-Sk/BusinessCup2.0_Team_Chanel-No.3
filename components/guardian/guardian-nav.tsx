"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { store } from "@/lib/client/store";
import { Pill } from "@/components/ds";
import { cn } from "@/lib/utils";

export function GuardianNav({ active }: { active: "timeline" | "overpay" | "appeal" }) {
  const [member, setMember] = useState(false);
  useEffect(() => setMember(Boolean(store.getGuardian()?.active)), []);
  const links = [
    { id: "timeline", href: "/guardian", label: "Timeline" },
    { id: "overpay", href: "/guardian/overpay", label: "Overpayment check" },
    { id: "appeal", href: "/appeal?demo=jessica", label: "Appeal pack" },
  ] as const;
  return (
    <nav aria-label="Guardian" className="flex flex-wrap items-center gap-4 border-b border-border pb-3">
      {links.map((l) => (
        <Link
          key={l.id}
          href={l.href}
          aria-current={active === l.id ? "page" : undefined}
          className={cn("pb-1 text-[15px] font-medium no-underline", active === l.id ? "border-b-2 border-brand text-brand-ink" : "text-ink-2 hover:text-ink")}
        >
          {l.label}
        </Link>
      ))}
      <span className="ml-auto">{member ? <Pill tone="accent">Guardian member</Pill> : <Link href="/paywall" className="text-sm font-semibold text-brand">Get Guardian</Link>}</span>
    </nav>
  );
}
