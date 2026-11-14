# DoseCost: Milestone 1 (Phase 1, design gate)

**Design artifact:** https://claude.ai/artifact/Q9wihheEeVvupUWoCNReE3 (24 boards: tokens, plus landing, upload/DEMO, decoded denial, quiz ×3, cheapest path with reminder-email preview, Guardian timeline, overpayment check, reminder email, coverage, appeal pack, paywall, each for mobile and desktop). Status: **approved by the product owner**. The artifact is private until shared from its Share menu.

Incident: the first canvas (`UNHA1wFzevMnJQYTcnEgAk`) was lost. The RepayPath agent shared the same scratch folder and overwrote six of its source files, and the artifact itself then returned "not found". The design was rebuilt on a new canvas, with the source kept inside this repo (`design-canvas/`, git-ignored).

## Test results

```
Test Files  5 passed (5)
     Tests  58 passed (58)
```
Includes all six SPEC §8 scenarios (covered with PA, excluded by plan, Medicare, self-pay intro ending, dose escalation, worth appealing vs not), plus deadlines, overpayment, alerts, the LLM boundary, data integrity and the no-literals detector. `pnpm typecheck`, `pnpm data:validate` and `pnpm lint:data` are green.

Key worked numbers (each derivation is in `tests/scenarios.test.ts`):
- Jessica (Zepbound, PA denied): LillyDirect vials $399 + $449 + 10 × $449 = **$5,338**/yr vs $13,044 at the pharmacy quote, so she saves **$7,706**. If the appeal wins: plan + savings card, 12 × $25 = $300, so **$5,038** is at stake. Category "missing documentation" (high winnability) → worth appealing. Deadline **Apr 26, 2027** (163 days left).
- Sam (Wegovy pen, self-pay): last $199 intro fill, then $349 → **$4,038**/yr; alert "intro price ends after the next fill"; a $349 charge on intro fill 2 is flagged as **+$150** overpaid.
- Medicare user on Wegovy: GLP-1 Bridge 12 × $50 = **$600**; savings cards and TrumpRx are excluded for government beneficiaries.

## What works
- openFDA ingest → `data/drugs.json` (9 products, dose steps, NDCs, label metadata).
- 9 data files with zod schemas, a validating loader and cross-reference checks; every record carries `source_url` and `verified_at`.
- Pure engine (`lib/engine`): channels and eligibility, 12-month projection with dose steps, promo expiry and late refills, best and conditional paths, savings, coverage check, denial category, deadlines, checklist, worth-appealing score, overpayment check, renewal/promo/refill alerts.
- LLM extraction module (`lib/llm`, `claude-opus-5-5`, structured output + zod, server-side refusal fallback). Without `ANTHROPIC_API_KEY` it fails with a typed error. Includes a fictional DEMO denial letter PDF.
- Scaffold: Next.js 15, Tailwind v4, shadcn/ui themed to the design tokens, every library from the spec installed.

## Blocked
- No keys: real letter extraction needs `ANTHROPIC_API_KEY`; email needs `RESEND_*`; checkout needs `STRIPE_*`; persistence needs `DATABASE_URL`.
- Deployment needs a GitHub repo and a Vercel login (neither CLI is logged in).

## Facts not verified
See `data/SOURCES.md` → "Could NOT verify". In short: BGH "72% → 60%" (not found; 67%/72% used instead), Aetna BMI thresholds, UHC commercial criteria, Medicare Bridge clinical criteria, government eligibility for manufacturer self-pay, and the savings card after 2026-12-31 (flagged as an assumption).

## Env vars the owner must provide
`DATABASE_URL`, `RESEND_API_KEY`, `RESEND_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`.

## Next (Phase 2)
Build the screens 1:1 from the design; Stripe test checkout plus webhook; Resend reminders via Vercel Cron; Neon/Drizzle tables; analytics events; deploy.
