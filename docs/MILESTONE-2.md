# DoseCost: Milestone 2 (Phase 2: product built from the approved design)

Design (approved): https://claude.ai/artifact/Q9wihheEeVvupUWoCNReE3 · source `design-canvas/project/*.dc.html` (git-ignored).

## Status at a glance

| Check | Result |
|---|---|
| `pnpm build` | ✅ green: 25 routes, ESLint and types checked |
| `pnpm typecheck` | ✅ |
| `pnpm test` (Vitest) | ✅ **70 passed / 6 files**: 6 SPEC §8 scenarios, deadlines, overpay, alerts, LLM boundary, data integrity, no-literals detector, seeded Guardian case, email template, landing numbers, appeal pack |
| `pnpm lint:data` | ✅ 41 files in `app/` and `components/`, no currency or percent literals |
| `pnpm data:validate` | ✅ |

## Live integration test (local production build, real keys from `.env.local`)

| Integration | What was exercised | Result |
|---|---|---|
| **Anthropic** (`claude-opus-5-5`, vision + structured output + zod) | `POST /api/decode?demo=1`: the fictional DEMO letter PDF through live extraction | ✅ Extracted plan, drug, reason (verbatim), notice date, reference, 180-day window. Code mapped it to "missing documentation" (high), deadline **Apr 26, 2027**, 6-item checklist |
| **Neon + Drizzle** | `drizzle-kit migrate` (4 tables); inserts from `/api/reminders` and `/api/events` | ✅ Tables created. Reminder, case snapshot and events rows written |
| **Resend** | `/api/reminders` (immediate send) and cron send | ✅ **Real emails delivered**: 2 DEMO promo-ending emails ("Your $199 intro price ends after your next fill") to the Resend account owner's address. Sending to any other address is rejected by Resend in testing mode |
| **Vercel Cron route** | `GET /api/cron/reminders` without / with `Bearer $CRON_SECRET` | ✅ 401 without; with it `{"due":1,"sent":1,"failed":0}`, row marked `sent` |
| **Stripe (test)** | `POST /api/checkout` → hosted Checkout URL; `GET /api/checkout/verify` on the unpaid session | ✅ Session created (`livemode:false`); verify correctly reports `active:false` until paid |
| **Stripe webhook** | forged signature | ✅ rejected (`bad_signature`); signature verification is active |
| **Analytics** | `quiz_start`, `result_view`, `paywall_view`, `checkout_start`, `reminder_set` | ✅ stored in `events`; invalid names rejected (400) |

Not exercised by me: completing a test payment (needs a browser: card 4242 4242 4242 4242), which would fire `checkout.session.completed` → `entitlements` row → `/guardian/welcome` unlock.

## What works (routes)

Screens (all with loading skeletons, empty and error states, visible focus, the "Prices verified on {date}" line from data, and the disclaimer in the footer):
`/` landing (leads with Upload / Try a sample letter, Guardian watch strip) · `/decode` (+`?demo=1`, manual entry fallback) · `/decoded` · `/quiz` (8 steps, react-hook-form + zod, framer-motion, localStorage) · `/result` (+`?demo=jessica|sam`; Recharts 12-month chart, every channel with reasons, worth-appealing score, live reminder-email preview + signup) · `/coverage` · `/guardian` (seeded DEMO case: **PA renewal in 23 days**, **$199 → $349 intro ends after the next fill**, timeline, reminder previews) · `/guardian/overpay` (+`?demo=1`: **+$150 overpaid**) · `/appeal` (+`?demo=jessica`, PDF export via pdf-lib) · `/paywall` · `/guardian/welcome` · `/sources`.

API: `/api/decode`, `/api/demo-letter`, `/api/checkout`, `/api/checkout/verify`, `/api/stripe/webhook`, `/api/reminders`, `/api/reminders/send-now`, `/api/cron/reminders` (daily via `vercel.json`), `/api/unsubscribe`, `/api/events`, `/api/status`.

The reminder preview on `/result` and `/guardian` uses the same `renderReminderEmail()` the cron sends (identical HTML apart from the per-recipient unsubscribe link).

## Blocked / needs the owner

- **Resend domain**: `RESEND_FROM=onboarding@resend.dev` only delivers to the Resend account owner. To email real users, verify a domain in Resend and update `RESEND_FROM`.
- **`NEXT_PUBLIC_APP_URL`**: set to the production URL after the first deploy (email links and Stripe redirects use it; the fallback is `VERCEL_URL`).
- **`STRIPE_WEBHOOK_SECRET`** for production: register `https://<prod>/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`.
- **Vercel env**: every variable in `.env.example` must also be set in the Vercel project. Run `pnpm db:migrate` once against the production `DATABASE_URL` (already done for the current Neon DB).
- Deploys and pushes are handled by the coordinator; nothing was pushed from here.

## Facts not verified (unchanged; see `data/SOURCES.md`)
BGH "72% → 60%" (not found; verified 67%/72% used), Aetna BMI thresholds and renewal %, UHC commercial criteria, Medicare Bridge clinical criteria, government eligibility for manufacturer self-pay (flagged in UI), savings card terms after 2026-12-31 (flagged as an assumption).

## Differences from the design boards (deliberate)
- Different-medicine alternatives (e.g. Wegovy pill for a Zepbound user) show a monthly price range under "Ask your doctor", not a 12-month total: a total would require assuming a dose, which is dosing guidance.
- Landing example card: dropped the "decoded in 14 seconds" claim (not measured).
- The Wegovy pen range includes the Wegovy HD 7.2 mg price ($399) from the live page.

## Notes
- The first Stripe price set I created (before seeing the owner's) was archived; the app uses the owner's `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY`. `pnpm stripe:setup` is idempotent and refuses non-test keys.
- No commit carries a Claude attribution trailer from 8ac4dab onward, per the owner's rule.

## Next steps
1. Deploy; set `NEXT_PUBLIC_APP_URL` and the production webhook secret; run one test payment end to end.
2. Verify a Resend domain so reminders reach any user.
3. Re-verify prices on 2026-12-01 (the Wegovy intro offer and the Zepbound card both end 2026-12-31), then run the January plan-change check against the 2027 terms.
4. Optional: rate limiting on `/api/decode`, and a Playwright smoke test of the jury flow.
