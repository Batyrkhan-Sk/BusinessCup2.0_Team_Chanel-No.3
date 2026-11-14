import type { Metadata } from "next";
import { PageShell } from "@/components/site/chrome";
import { TimelineView } from "@/components/guardian/timeline-view";

export const metadata: Metadata = { title: "Guardian: case timeline" };

export default function GuardianPage() {
  return (
    <PageShell>
      <TimelineView />
    </PageShell>
  );
}
