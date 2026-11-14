import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site/chrome";
import { DecodeView } from "@/components/decode/decode-view";
import { Skeleton, Wrap } from "@/components/ds";

export const metadata: Metadata = { title: "Decode a denial letter" };

export default function DecodePage() {
  return (
    <PageShell>
      <Suspense fallback={<Wrap className="py-8"><Skeleton className="h-96" /></Wrap>}>
        <DecodeView />
      </Suspense>
    </PageShell>
  );
}
