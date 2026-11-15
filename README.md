# DoseCost: GLP-1 Cost Guardian

**Team: Chanel No.3** · Zimran Business Cup Hackathon 2.0 · Money track

**Live site: [dosecost.vercel.app](https://dosecost.vercel.app/)** · no login, no install

> Your GLP-1 can cost $25 or $449 a month. DoseCost finds your cheapest legal price and warns you before it jumps.

## What it is

### The problem, in numbers

- **4 in 10 US adults have obesity** (40.3%, CDC, 2021–2023). [Source](https://www.cdc.gov/nchs/products/databriefs/db508.htm)
- **About 1 in 8 US adults is taking a GLP-1 medicine right now** (12%), and 18% have tried one. [Source](https://www.kff.org/public-opinion/kff-health-tracking-poll-prescription-drug-costs-views-on-trump-administration-actions-and-glp-1-use/)
- **More than half of them (56%) say it is hard to afford**, and that includes people with insurance (55%). [Same source](https://www.kff.org/public-opinion/kff-health-tracking-poll-prescription-drug-costs-views-on-trump-administration-actions-and-glp-1-use/)
- **Coverage is shrinking:** 14% of employers have dropped or will drop GLP-1 obesity coverage for 2027. [Source](https://www.emarketer.com/content/us-employers-face-another-steep-healthcare-cost-hike-glp-1-spending-strains-budgets)
- **When insurance says no, people give up:** fewer than 1% of denied claims are appealed (ACA Marketplace plans, 2024). [Source](https://www.kff.org/private-insurance/claims-denials-and-appeals-in-aca-marketplace-plans-in-2024/)

So millions of people need these medicines, many cannot afford them, and when the insurance says no, almost nobody fights back. Often they don't know why they were denied, what the deadline is, or that a cheaper legal option exists.

### Why the price jumps

The price of Zepbound or Wegovy can change overnight: the insurance says no, an approval expires, a refill is one day late, or an intro offer ends. The same medicine can cost as little as $25 a month with a savings card when insurance covers it, or $449 a month paying cash at the drugmaker's own pharmacy.

### What DoseCost does

DoseCost helps in three ways:

1. **Reads the insurance denial letter.** Upload a photo or PDF. AI reads it, and our code tells you why you were denied, the last day to appeal, and which documents to collect.
2. **Finds the cheapest legal way to pay.** It compares every official option (insurance, savings cards, the drugmakers' own pharmacies, Medicare rules) and shows your cost for the next 12 months.
3. **Watches your dates.** It emails you before the price goes up or a deadline passes.

The first two are free. **Guardian** is the paid plan: $7.99 a month or $59 a year, with a 7-day free trial.

DoseCost does not sell medicine and takes no money from drugmakers, pharmacies or telehealth companies. **It is not medical, legal or financial advice.**

## For the jury: try it in 5 minutes

Everything works without an account. The examples use made-up people and a made-up letter, but they go through the same real code as a real user.

| # | What to do | What you will see |
|---|---|---|
| 1 | Open the [home page](https://dosecost.vercel.app/) and click **"No letter? Try a sample one"** | The sample denial letter is read by AI, then explained: why it was denied, the appeal deadline and a checklist |
| 2 | Open [the sample price result](https://dosecost.vercel.app/result?demo=jessica) | The cheapest path, a 12-month cost chart, every option with its price, and a preview of the reminder email |
| 3 | Or click **"Check my lowest price"** and answer a few short questions (up to 8) | Your own result, built from your answers |
| 4 | Open [Guardian](https://dosecost.vercel.app/guardian) | An example case: what needs attention soon, the case timeline, and every reminder email |
| 5 | Open the [appeal pack](https://dosecost.vercel.app/appeal?demo=jessica) | The appeal letter, the doctor's letter template and the checklist, with a PDF download |
| 6 | Open the [plans page](https://dosecost.vercel.app/paywall) and start the free trial | Stripe's payment page (test mode). Use the test card below |

### Test payment (no real money)

- Card number: **4242 4242 4242 4242**
- Any future date (for example 12/30), any 3-digit CVC, any name.
- You get a **7-day free trial**. Stripe shows "7 days free, then $7.99 per month" (or $59 per year).
- After paying you land on a welcome page, and all Guardian features open right away.
- To cancel, click **"Manage or cancel plan"** on the Guardian pages. It opens Stripe's own billing page.

The trial is the full Guardian plan. Nothing is held back during the trial. The only difference is that you pay $0 for the first 7 days.

## Emails and reminders

### What emails exist

| Email | When it is sent |
|---|---|
| Approval renewal | Before your insurance approval expires |
| Promo ending | Before an intro price ends |
| Refill window | Before your low price is lost because a refill is late |
| Appeal deadline | Before the last day to appeal |
| Monthly check | After each fill: "did the pharmacy charge you the right price?" |
| Discount ending | Before a savings card or offer ends |
| New plan year | In January, when insurance plans change |

### How sending works

- You enter your email and click **"Set reminders"**. We save the dates in our database.
- A scheduled job runs **every day at 14:00 UTC**, finds the reminders due that day and sends them with [Resend](https://resend.com).
- **"Send me this email now"** sends one email immediately, so you can see it without waiting.
- The numbers in each email (days left, prices, dates) are worked out again on the day it is sent, so they are never out of date.
- Every email has a one-click **Unsubscribe** link.
- The **email preview on the site uses the same template as the real email**, so what you see there is exactly what arrives.

### Email delivery during the hackathon: please read

For this demo we send emails from Resend's free test address (`onboarding@resend.dev`). Resend only delivers emails from that address to the **team's own inbox**. We chose not to buy a domain for the hackathon.

What this means for you:

- **You can still try everything.** Type any email and click **"Set reminders"**. Your reminders are saved in our database, and the daily job tries to send them.
- **The email will not reach your inbox.** The site tells you this right away, in plain words. It never pretends an email was sent.
- **You can see the exact email.** The previews on the [result](https://dosecost.vercel.app/result?demo=jessica) and [Guardian](https://dosecost.vercel.app/guardian) pages use the same template as the real email, filled with the same numbers.
- **The sending itself is real.** The daily job has already delivered reminders to the team inbox. We can show a delivered email live during the pitch.

To send to anyone, the team only needs to verify a domain in Resend and change one setting (`RESEND_FROM`). No code changes.

## Free vs Guardian

| Free | Guardian ($7.99/month or $59/year, 7 days free) |
|---|---|
| Read a denial letter: reason, deadline, checklist | Full appeal pack: patient letter, doctor's letter template, checklist, PDF |
| Cheapest legal path with a 12-month cost | Case timeline with every deadline |
| Coverage check against your insurer's rules | Reminders before **every** date |
| **One** email reminder | Monthly "did you overpay?" check |
| | January plan-change check |

## Where the numbers come from

- **No price is typed into the app's code.** Every price, rule and date lives in data files in [`data/`](data/). Each record has a source link and the date we checked it.
- An automatic check (`pnpm lint:data`) fails the build if someone types a dollar amount or a percentage into the screens.
- The [Sources page](https://dosecost.vercel.app/sources) lists every source. [`data/SOURCES.md`](data/SOURCES.md) also lists what we **could not** verify, instead of guessing.
- Prices were last checked on **Nov 14, 2026**. The site shows this date in the footer.

## What the AI does and what the code does

| Job | Who does it |
|---|---|
| Read the letter photo or PDF and pull out the facts (reason, dates, plan, reference number) | **AI** (Claude, server only). If it is unsure, it says which fields to double-check. |
| Decide why you were denied, how fixable it is, the deadlines and the checklist | **Code**, using written rules |
| Every price, saving, 12-month projection and "worth appealing?" answer | **Code**, using only the data files |
| Reminder dates, the overpayment check, alerts | **Code** |

The AI explains. The code calculates.

## Safety and privacy

- **No medical advice.** We never suggest a dose or a medicine. We only follow the dose the user says their doctor planned. Switching medicine is always "ask your doctor".
- **No compounded or "research" drugs, no affiliate links.**
- **Minimal data.** Quiz answers stay in your browser. We store only your email (for reminders) and your case dates. We never ask for weight, symptoms or a diagnosis, beyond a yes/no on whether one is on file.
- The doctor's letter is a template with blanks for the doctor to fill in and sign. We never make medical claims.
- Every page says "Not medical, legal or financial advice".

## Known limits

- US only, and covers the main GLP-1 medicines (Zepbound, Wegovy, Foundayo and others in the data files).
- A Guardian membership is remembered **in the browser where you paid**. It does not carry over to another device.
- Payments are in Stripe **test mode**, so no real money moves.
- Emails only reach the team inbox during the hackathon, because we use Resend's free test sender (see "Email delivery during the hackathon" above).

## Tests

**90 automated tests** (`pnpm test`), including:

- The worked examples from our spec, checked to the cent.
- A sweep of **5,184** combinations of medicine, insurance, dose and situation, checking that every result is legal, consistent and uses only real data.
- Reminder dates, appeal deadlines, the overpayment check and the AI boundary (the AI output is validated and never trusted blindly).

---

## For developers

### Run it locally

```bash
pnpm install
cp .env.example .env.local   # fill in the keys (see below)
pnpm db:push                  # create the database tables
pnpm dev                      # open http://localhost:3000
```

Every integration works on its own. If a key is missing, that feature shows a clear "not configured" message instead of fake results.

### Commands

```bash
pnpm dev               # run the app locally
pnpm test              # run all tests
pnpm typecheck         # check TypeScript
pnpm lint:data         # fail if a $ or % amount is typed into the screens
pnpm data:validate     # check every data file and the links between them
pnpm ingest:openfda    # refresh the medicine list from the FDA's open data
pnpm fixtures:letter   # rebuild the sample denial letter PDF
pnpm extract:demo      # run the sample letter through Claude
pnpm stripe:setup      # create the Guardian product and prices in Stripe test mode
```

### Keys (`.env.local`)

| Key | What it is for |
|---|---|
| `DATABASE_URL` | Neon Postgres: reminders, case dates, memberships |
| `RESEND_API_KEY`, `RESEND_FROM` | Sending emails. `RESEND_FROM` must use a domain verified in Resend to reach any inbox |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_WEBHOOK_SECRET` | Payments (test mode) |
| `ANTHROPIC_API_KEY` | Reading denial letters (server only) |
| `CRON_SECRET` | Protects the daily email job |
| `NEXT_PUBLIC_APP_URL` | The site address used in emails and payment redirects |

### Setting up the services

1. **Neon:** create a database, put its address in `DATABASE_URL`, run `pnpm db:push`.
2. **Stripe (test mode):** run `pnpm stripe:setup`, or create a "Guardian" product with a monthly and a yearly price that match `data/pricing.json`. Add a webhook to `/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`. The trial length comes from `trial_days` in `data/pricing.json`.
3. **Resend:** add and verify your domain (Resend shows the DNS records to add), then set `RESEND_FROM`, for example `DoseCost <reminders@yourdomain.com>`.
4. **Anthropic:** set `ANTHROPIC_API_KEY`.
5. **Vercel:** set all keys above. The daily job is defined in `vercel.json` and runs at 14:00 UTC.

### How the code is organised

```
app/            pages and API routes (Next.js 15)
components/     screens and UI pieces (shadcn/ui)
lib/engine/     the calculations: prices, 12-month path, deadlines, alerts (pure functions)
lib/decoder/    turns the AI's letter facts into a category, deadlines and a checklist
lib/llm/        the Claude call that reads letters (server only)
lib/email/      email templates
data/           all prices and rules, each with a source and check date
fixtures/       the made-up demo people and the made-up denial letter
scripts/        data refresh, data checks, demo letter, Stripe setup
tests/          automated tests
```

Stack: Next.js 15, TypeScript, Tailwind v4, shadcn/ui, Recharts, Drizzle + Neon Postgres, Stripe, Resend, Claude (Anthropic SDK), pdf-lib, Vitest. Hosted on Vercel.

### Pages and API routes

| Route | What it does |
|---|---|
| `/` | Home page |
| `/decode`, `/decoded` | Upload or try the sample letter, then see it explained |
| `/quiz`, `/result` | The questions, then the cheapest path (`?demo=jessica` or `?demo=sam` for examples) |
| `/coverage` | Does your insurance cover it, and what it needs |
| `/guardian`, `/guardian/overpay`, `/appeal` | Guardian: timeline, overpayment check, appeal pack |
| `/paywall`, `/guardian/welcome` | Plans, then the welcome page after payment |
| `/sources` | Every data source |
| `POST /api/decode` | Reads a letter with AI, then decodes it with code |
| `POST /api/checkout`, `GET /api/checkout/verify`, `POST /api/stripe/webhook`, `POST /api/billing/portal` | Payment, checking a payment, Stripe events, manage or cancel |
| `POST /api/reminders`, `POST /api/reminders/send-now`, `GET /api/unsubscribe` | Save reminders, send one now, unsubscribe |
| `GET /api/cron/reminders` | The daily email job (needs `CRON_SECRET`) |
| `GET /api/status` | Which services are set up (names only, never values) |
