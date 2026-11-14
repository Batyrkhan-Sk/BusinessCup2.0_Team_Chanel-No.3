/** pnpm data:validate — parse every /data file with its zod schema and cross-check references. */
import { loadData, pricesVerifiedOn } from "../lib/data/load";

try {
  const b = loadData();
  console.log(
    `data OK: ${b.drugs.drugs.length} products, ${b.prices.offers.length} price offers, ${b.savingsCards.cards.length} savings cards, ` +
      `${b.insurerRules.insurers.length} insurer rule sets, ${b.appealRules.categories.length} denial categories, ${b.stats.stats.length} stats. ` +
      `Prices verified on ${pricesVerifiedOn(b)}.`,
  );
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
