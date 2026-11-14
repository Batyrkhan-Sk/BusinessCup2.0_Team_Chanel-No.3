import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site/chrome";
import { ResultSkeleton, ResultView } from "@/components/result/result-view";

export const metadata: Metadata = { title: "Your lowest price" };

export default function ResultPage() {
  return (
    <PageShell>
      <Suspense fallback={<ResultSkeleton />}>
        <ResultView />
      </Suspense>
    </PageShell>
  );
}
