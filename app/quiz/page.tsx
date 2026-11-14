import type { Metadata } from "next";
import { loadData, pricesVerifiedOn } from "@/lib/data/load";
import { formatDate, formatUsd } from "@/lib/format";
import { Quiz, type QuizProduct } from "@/components/quiz/quiz";
import { PageShell, SiteHeader } from "@/components/site/chrome";

export const metadata: Metadata = { title: "Find your cheapest path" };

export default function QuizPage() {
  const data = loadData();
  const products: QuizProduct[] = data.drugs.drugs.map((d) => {
    const offer = data.prices.offers.find((o) => o.product_id === d.product_id && (o.channel === "lillydirect" || o.channel === "novocare"));
    const ladder = offer?.dose_prices.filter((p) => p.dose_mg !== null) ?? [];
    const price_note =
      ladder.length > 1
        ? `${offer!.channel_label}: ${ladder.map((p) => `${formatUsd(p.monthly_usd)} at ${p.dose_mg} mg`).join(", ")}. Your step changes the whole 12-month picture.`
        : null;
    return {
      product_id: d.product_id,
      brand: d.brand,
      generic: d.generic,
      device: d.device,
      form: d.form,
      dose_steps_mg: d.dose_steps_mg,
      promo: offer?.promo ? { intro_monthly_usd: offer.promo.intro_monthly_usd, intro_fills: offer.promo.intro_fills, offer_label: offer.channel_label } : null,
      refill_window_days: offer?.refill_window_days ?? null,
      price_note,
    };
  });
  return (
    <PageShell header={<SiteHeader cta={<span className="text-sm text-ink-2">About 2 minutes · no login</span>} />}>
      <Quiz products={products} verifiedOn={formatDate(pricesVerifiedOn(data))} />
    </PageShell>
  );
}
