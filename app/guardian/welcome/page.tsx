import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/site/chrome";
import { WelcomeView } from "@/components/paywall/welcome-view";
import { Skeleton, Wrap } from "@/components/ds";

export const metadata: Metadata = { title: "Welcome to Guardian" };

export default function Page() {
  return (
    <PageShell>
      <Suspense fallback={<Wrap className="py-8"><Skeleton className="h-96" /></Wrap>}>
        <WelcomeView />
      </Suspense>
    </PageShell>
  );
}
