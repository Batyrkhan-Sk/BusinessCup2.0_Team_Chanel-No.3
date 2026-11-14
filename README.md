# DoseCost: GLP-1 Cost Guardian

> Your GLP-1 can cost $25 or $449 a month. DoseCost finds your cheapest **legal** path and makes sure you never overpay.

A B2C web app for US adults paying for Zepbound, Wegovy and other GLP-1 drugs. Free: decode a denial letter, check your cheapest path across every legal channel, check coverage. **Guardian** ($7.99/month or $59/year, Stripe test mode): appeal pack with PDF, case timeline, PA renewal reminders with stored baseline, promo and dose-price alerts, a monthly "did you overpay?" check, and a January plan-change check.

**Not medical, legal or financial advice.** DoseCost sells no medication and takes no money from drugmakers, pharmacies or telehealth companies.

- Data sources and what could not be verified: [`data/SOURCES.md`](data/SOURCES.md)

## Architecture

```
app/                 Next.js 15 App Router (screens, API routes)
components/          product components (components/ui = themed shadcn/ui primitives)
lib/data/            zod schemas + validating loader for /data
lib/engine/          PURE functions: channels, eligibility, 12-month projection, best path,
                     coverage check, denial category, deadlines, checklist, worth-appealing,
                     overpayment check, watch-list alerts
lib/llm/             server-only Claude vision extraction of denial letters (zod-validated)
lib/decoder/         pure "code half" of the decoder: extraction → category, deadlines, checklist
lib/lint/            detector behind `pnpm lint:data`
data/*.json          versioned facts; every record has source_url + verified_at
scripts/             ingest-openfda, validate-data, check-no-literals, make-demo-letter, extract-demo-letter
fixtures/            DEMO inputs only (personas, seeded Guardian case, fictional denial letter)
tests/               Vitest: SPEC §8 scenarios + deadlines, overpay, alerts, LLM boundary, data integrity
```

Stack: Next.js 15, TypeScript, Tailwind v4, shadcn/ui (custom token theme in `app/globals.css`), framer-motion, Recharts, lucide-react, react-hook-form + zod, Sonner, Drizzle + Neon, Stripe, Resend, `@anthropic-ai/sdk`, pdf-lib, Vitest.

## What code does vs what the LLM does

| Step | Who | Notes |
|---|---|---|
| Read a denial letter (photo/PDF) into facts: reason (verbatim), dates, plan type, reference, request type | **LLM** (`claude-opus-5-5`, structured output, zod-validated) | Fails with a typed error without `ANTHROPIC_API_KEY`; never fabricates. Server-side fallback on refusal is enabled (`fallbacks: "default"`). |
| Denial category, winnability tier, appeal deadline, decision windows, external review, checklist | **Code** | `lib/decoder`, `lib/engine/denial.ts`, rules in `appeal_rules.json` |
| Every price, channel, eligibility rule, promo window, dose-step projection, savings, worth-appealing score | **Code** | `lib/engine/path.ts`; numbers only from `/data` |
| Coverage status (likely covered with PA / excluded by plan / needs diagnosis code clarification) | **Code** | rules over coverage type, insurer, product, status and diagnosis yes/no |
| Overpayment check, renewal / promo / refill reminders | **Code** | `lib/engine/overpay.ts`, `lib/engine/alerts.ts` |

## Data sources and ingest

| File | How it is produced |
|---|---|
| `data/drugs.json` | `pnpm ingest:openfda` (openFDA NDC + label endpoints); re-runnable |
| `data/prices.json`, `savings_cards.json`, `medicare_bridge.json`, `insurer_rules.json`, `appeal_rules.json`, `stats.json` | compiled by hand from primary sources (no public API), each record cited |
| `data/pricing.json`, `reminder_rules.json` | our own product decisions (`internal:` source, `verification: editorial`) |

`pnpm data:validate` parses every file with its zod schema and cross-checks references (every offer, card and rule points at a real openFDA product and dose).

### How to refresh data

1. `pnpm ingest:openfda` and review the diff of `data/drugs.json`.
2. Re-check each source URL in `data/SOURCES.md`; update values, `verified_at`, and `verification`.
3. `pnpm data:validate && pnpm test` (the scenario tests pin worked numbers; update them, with provenance, if a price changed).
4. The UI's "Prices verified on {date}" line reads the dates from the data automatically.

## Safety boundaries

- **No medical advice.** No dosing guidance, no efficacy claims, no symptom or weight tracking. The projection only follows the dose the user says their doctor planned, one label step per fill; DoseCost never picks a dose or a medicine.
- **Different medicines are "ask your doctor" only.** A cheaper different drug is never chosen as the best path.
- **No compounded or "research peptide" referrals, no affiliate links** to pharmacies or telehealth.
- **We never assert clinical facts.** The letter of medical necessity is a structure with brackets for the doctor to complete and sign.
- **Minimal health data.** Diagnosis on file is yes/no only. Answers live in localStorage; email is stored only for reminders.
- **Honest uncertainty.** Secondary or unverified facts are flagged in data and in the UI; expired programs are flagged as assumptions, not hidden.
- **No fake outputs.** Missing keys produce a clear "not configured" state. DEMO data are labelled inputs that run through the same live pipeline.
- Disclaimer on every screen: "Not medical, legal or financial advice".

## Commands

```bash
pnpm dev               # local app
pnpm test              # Vitest
pnpm typecheck
pnpm lint:data         # fails on $ / % literals in app/ and components/
pnpm data:validate
pnpm ingest:openfda
pnpm fixtures:letter   # regenerate fixtures/demo-denial-letter.pdf
pnpm extract:demo      # run the DEMO letter through Claude (needs ANTHROPIC_API_KEY)
```

## Routes

| Route | What it is |
|---|---|
| `/` | Landing: leads with "Upload my denial letter" / "Try a sample letter", Guardian watch strip, stats, channel prices |
| `/decode` (`?demo=1`) | Upload a photo/PDF or run the fictional DEMO letter; manual entry fallback |
| `/decoded` | Decoded denial: category, deadline, decision window, external review, checklist, reminders |
| `/quiz` | 8-step quiz (react-hook-form + zod, framer-motion, localStorage, no login) |
| `/result` (`?demo=jessica\|sam`) | Cheapest legal path, 12-month Recharts chart, every channel, worth-appealing score, live reminder-email preview + signup |
| `/coverage` | Coverage status with the insurer's PA criteria (PDF link + page) |
| `/guardian` | Case timeline, seeded DEMO case (PA renewal in 23 days, intro price ends after the next fill), reminder previews |
| `/guardian/overpay` (`?demo=1`) | Monthly "did you overpay?" check |
| `/appeal` (`?demo=jessica`) | Appeal pack preview + PDF export (Guardian, or DEMO case) |
| `/paywall`, `/guardian/welcome` | Plans from `pricing.json`, Stripe test Checkout, server-side session verification |
| `/sources` | Every data record with its source and verification date |
| `POST /api/decode` | Claude vision extraction → code decode (503 `not_configured` without `ANTHROPIC_API_KEY`) |
| `POST /api/checkout`, `GET /api/checkout/verify`, `POST /api/stripe/webhook` | Stripe test mode; webhook writes `entitlements` |
| `POST /api/reminders`, `POST /api/reminders/send-now` | Schedule reminders (Neon) / send one now (Resend) |
| `GET /api/cron/reminders` | Vercel Cron (daily, `vercel.json`), `Authorization: Bearer $CRON_SECRET` |
| `POST /api/events` | quiz_start, result_view, paywall_view, checkout_start, reminder_set |
| `GET /api/status` | Which integrations are configured (missing variable names only) |

## Setting up the integrations

1. `cp .env.example .env.local` and fill in the values.
2. Neon: create a database, set `DATABASE_URL`, run `pnpm db:push` (schema in `lib/db/schema.ts`, SQL in `drizzle/`).
3. Stripe (test mode): create a "Guardian" product with a monthly and a yearly recurring price matching `data/pricing.json`; set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`; add a webhook to `/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`, and set `STRIPE_WEBHOOK_SECRET`.
4. Resend: verify a sending domain; set `RESEND_API_KEY` and `RESEND_FROM`.
5. Anthropic: set `ANTHROPIC_API_KEY` (used only server-side by `/api/decode`).
6. Vercel: set `CRON_SECRET` (Vercel sends it to the cron route automatically) and `NEXT_PUBLIC_APP_URL`.

## Environment

See `.env.example`: `DATABASE_URL`, `RESEND_API_KEY`, `RESEND_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`.
