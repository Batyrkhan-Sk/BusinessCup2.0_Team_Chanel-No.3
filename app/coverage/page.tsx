import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site/chrome";
import { CoverageView } from "@/components/coverage/coverage-view";
import { Skeleton, Wrap } from "@/components/ds";

export const metadata: Metadata = { title: "Coverage check" };

export default function CoveragePage() {
  return (
    <PageShell>
      <Suspense fallback={<Wrap className="py-8"><Skeleton className="h-96" /></Wrap>}>
        <CoverageView />
      </Suspense>
    </PageShell>
  );
}
