import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site/chrome";
import { DecodedView } from "@/components/decode/decoded-view";
import { Skeleton, Wrap } from "@/components/ds";

export const metadata: Metadata = { title: "Your decoded denial" };

export default function DecodedPage() {
  return (
    <PageShell>
      <Suspense fallback={<Wrap className="py-8"><Skeleton className="h-96" /></Wrap>}>
        <DecodedView />
      </Suspense>
    </PageShell>
  );
}
