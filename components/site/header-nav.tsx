"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { store } from "@/lib/client/store";
import { btn } from "@/components/ds";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/decode", label: "Decode a denial", match: ["/decode", "/decoded"] },
  { href: "/quiz", label: "Cheapest path", match: ["/quiz", "/result", "/coverage"] },
  { href: "/guardian", label: "Guardian", match: ["/guardian", "/appeal", "/paywall"] },
] as const;

const inSection = (path: string, prefixes: readonly string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/** Main-nav links with the current section highlighted, plus a right-side action that fits the page. Renders two grid cells for SiteHeader. */
export function HeaderNav() {
  const path = usePathname() ?? "/";
  const [member, setMember] = useState(false);
  useEffect(() => setMember(Boolean(store.getGuardian()?.active)), []);

  const guardianSection = inSection(path, SECTIONS[2].match);
  const onPaywall = inSection(path, ["/paywall"]);

  return (
    <>
      <div className="hidden items-center gap-1 text-[15px] font-medium md:flex">
        {SECTIONS.map((s) => {
          const active = inSection(path, s.match);
          return (
            <Link
              key={s.href}
              href={s.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-[var(--dc-r-sm)] px-3 py-1.5 no-underline transition-colors",
                active ? "bg-brand-soft text-brand-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {s.label}
            </Link>
          );
        })}
      </div>
      <div className="justify-self-end">
        {guardianSection ? (
          !member && !onPaywall ? (
            <Link className={btn({ size: "sm" })} href="/paywall">
              Get Guardian
            </Link>
          ) : null
        ) : (
          <Link className={btn({ variant: "secondary", size: "sm" })} href="/guardian">
            Open my case
          </Link>
        )}
      </div>
    </>
  );
}
