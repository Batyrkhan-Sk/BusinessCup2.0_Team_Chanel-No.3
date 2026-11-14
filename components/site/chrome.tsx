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
      <span aria-hidden="true" className="num inline-flex size-7 items-center justify-center rounded-lg bg-brand text-lg text-white">
        $
      </span>
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
