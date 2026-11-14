import Stripe from "stripe";
import { readFileSync } from "node:fs";
const key = process.env.STRIPE_SECRET_KEY;
if (!key?.startsWith("sk_test_")) { console.error("refusing: not a test key"); process.exit(1); }
const stripe = new Stripe(key);
const pricing = JSON.parse(readFileSync("data/pricing.json", "utf8"));
const existing = await stripe.products.search({ query: "metadata['app']:'dosecost' AND metadata['product']:'guardian'" });
const product = existing.data[0] ?? await stripe.products.create({ name: "DoseCost Guardian", metadata: { app: "dosecost", product: "guardian" } });
const out = {};
for (const p of pricing.plans) {
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 20 });
  const amount = Math.round(p.price_usd * 100);
  let price = prices.data.find((x) => x.unit_amount === amount && x.recurring?.interval === p.interval);
  if (!price) price = await stripe.prices.create({ product: product.id, currency: "usd", unit_amount: amount, recurring: { interval: p.interval }, metadata: { app: "dosecost", plan: p.id } });
  out[p.stripe_price_env] = price.id;
}
console.log(JSON.stringify({ product: product.id, livemode: product.livemode, ...out }));
