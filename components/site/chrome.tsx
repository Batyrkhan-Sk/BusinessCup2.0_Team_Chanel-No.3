import Link from "next/link";
import { loadData, pricesVerifiedOn } from "@/lib/data/load";
import { formatDate } from "@/lib/format";
import { DISCLAIMER } from "@/lib/content";
import { Wrap } from "@/components/ds";
import { cn } from "@/lib/utils";
import { HeaderNav } from "./header-nav";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-ink no-underline">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="size-7 shrink-0">
        <rect width="32" height="32" rx="7" className="fill-brand" />
        <path fill="#fff" fillRule="evenodd" d="M16 4.5C24.6 8.6 24.6 23.4 16 27.5C7.4 23.4 7.4 8.6 16 4.5ZM16 7.9C21.3 11 21.3 21 16 24.1C10.7 21 10.7 11 16 7.9Z" />
        <g transform="rotate(-9 16 16)">
          <path className="fill-brand" d="M6 13.4H12.4V15H6ZM19.6 17H26V18.6H19.6Z" />
          <path fill="#fff" d="M16 10.2Q16.5 14.4 18.8 15H22V17H18.8Q16.5 17.6 16 21.8Q15.5 17.6 13.2 17H10V15H13.2Q15.5 14.4 16 10.2Z" />
        </g>
      </svg>
      DoseCost
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header>
      <Wrap>
        <nav aria-label="Main" className="grid grid-cols-[1fr_auto] items-center gap-4 py-4 md:grid-cols-[1fr_auto_1fr]">
          <div className="justify-self-start">
            <Logo />
          </div>
          <HeaderNav />
        </nav>
      </Wrap>
    </header>
  );
}

export function VerifiedLine({ className }: { className?: string }) {
  const date = pricesVerifiedOn(loadData());
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-ink-3", className)}>
      <span aria-hidden="true" className="inline-block size-2 rounded-full bg-brand" />
      Prices verified on {formatDate(date)}
    </span>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <Wrap className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 py-8">
        <div className="flex max-w-2xl flex-col gap-2 text-xs text-ink-3">
          <p>
            <strong className="font-semibold text-ink-2">{DISCLAIMER}</strong> DoseCost sells no medication, takes no money from drugmakers, pharmacies or
            telehealth companies, and never gives dosing guidance. Ask your doctor about any change to your prescription.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 text-xs text-ink-3">
          <VerifiedLine />
          <Link href="/sources" className="text-brand">
            Sources and verification
          </Link>
        </div>
      </Wrap>
    </footer>
  );
}

export function PageShell({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {header ?? <SiteHeader />}
      <main id="main" className="flex-1">
        <div className="dc-page-in">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
