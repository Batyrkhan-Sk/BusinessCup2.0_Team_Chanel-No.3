import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell, SiteHeader } from "@/components/site/chrome";
import { DecodeView } from "@/components/decode/decode-view";
import { Skeleton, Wrap } from "@/components/ds";

export const metadata: Metadata = { title: "Decode a denial letter" };

export default function DecodePage() {
  return (
    <PageShell header={<SiteHeader cta={<span className="text-sm text-ink-2">Denial letter decoder · free, no login</span>} />}>
      <Suspense fallback={<Wrap className="py-8"><Skeleton className="h-96" /></Wrap>}>
        <DecodeView />
      </Suspense>
    </PageShell>
  );
}
