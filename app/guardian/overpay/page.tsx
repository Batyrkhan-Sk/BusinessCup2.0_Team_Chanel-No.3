import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site/chrome";
import { OverpayView } from "@/components/guardian/overpay-view";
import { Skeleton, Wrap } from "@/components/ds";

export const metadata: Metadata = { title: "Did you overpay?" };

export default function OverpayPage() {
  return (
    <PageShell>
      <Suspense fallback={<Wrap className="py-8"><Skeleton className="h-96" /></Wrap>}>
        <OverpayView />
      </Suspense>
    </PageShell>
  );
}
