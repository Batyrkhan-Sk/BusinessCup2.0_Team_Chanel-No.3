# Agent prompt: GLP-1 Cost Guardian (DoseCost)

You are a senior full-stack engineer and product designer. Build, end to end, a working B2C web product for a 24-hour hackathon. Ship a deployed, working product with real data, not a prototype with mocks. Report to the product owner.

## 1. Hackathon constraints (pass/fail)
- Event and deadline: Zimran Business Cup Hackathon 2.0. Track: Money.
- Audience and payer: US adults aged 25-45. B2C only: the individual pays. If an employer, insurer, pharmacy or drugmaker pays, it is B2B and an automatic fail.
- Platform: web only. A mobile-responsive site or PWA is fine; native apps fail.
- Submission: a public deployed link and a public GitHub repo.
- Jury access: the jury must complete the core flow without signup or payment. Use a guest session or localStorage plus a demo mode.
- Real core flow: it must work end to end on real user input. Sample data is allowed only if clearly labeled DEMO and run through the same live pipeline.
- Paywall: a clear price is the minimum; a Stripe test-mode checkout is a plus.
- Return mechanic: at least one must actually work, for example a real reminder email.
- Sensitive topic: no medical advice, no treatment promises, no unnecessary health data (explicit organizer rule).
- Uptime: the link must stay live until the end of the final on Nov 15.
- Judging weights: Product & Engineering 40%, Value & Retention 20%, Problem & User 15%, Business Potential 15%, Originality 10%.
- What organizers value: paying users who renew for months over DAU; "what ChatGPT alone cannot give"; "code computes, LLM explains".

## 2. Problem and market context
- Usage: about 1 in 5 US adults have ever taken a GLP-1, and about 12% take one now. 56% of users find them hard to afford, including 55% of insured users (KFF).
- Shrinking coverage: employer coverage for obesity fell from 72% in 2025 to 60% in 2026 (Business Group on Health). More plans are dropping it for 2027 during the current open enrollment.
- Many prices for one drug. Each path below must be verified:
  - Commercial coverage plus savings card: as low as about $25/month.
  - Medicare GLP-1 Bridge: $50 copay from July 1, 2026.
  - TrumpRx and manufacturer cash: Wegovy pill $149; pens $199 for the first two fills, then $349; Zepbound vial $299 at the starting dose, up to about $449 at higher doses.
  - List price: over $1,000.
  Prices change with dose escalation and promo expiry. Cash coupons cannot be combined with insurance or government plans.
- Appeals: fewer than 1% of denied claims are appealed. A missing or incomplete PA is very winnable; a plan exclusion is hard.
- PA renewals fail when baseline data is missing, as in a real Michigan Zepbound renewal denial in Dec 2025.

Competitors:

| Competitor | What it does | Gap we fill |
|---|---|---|
| Ro | Free coverage checker (2M+ users); insurance concierge in its $149/month membership | Concierge only after a Ro provider prescribes; no Medicare, Medicaid or TRICARE |
| Counterforce Health, Claimable, Fight Health Insurance | Free or partner-funded AI appeal letters | One-off letters; no cost path, no tracking |
| TrumpRx, LillyDirect, NovoCare | Cash prices | Each shows only its own channel or drugs |
| The RX Index, GoodRx | Content and calculators | Not personal, no insurance logic, no tracking |

Our angle:
- Neutral: we sell no drugs and take no pharma or telehealth money.
- Built for own-doctor patients: about 80% of users get prescriptions from their own doctor.
- Whole-picture math: a 12-month total-cost path across ALL legal channels.
- Ongoing tracking over time.

## 3. Product spec
One-liner: "Your GLP-1 can cost $25 or $449 a month. We find your cheapest legal path and make sure you never overpay."

Demo personas:
- Jessica, 34, Texas: employer plan, Zepbound prescribed by her own doctor. Her PA was required and then denied.
- Self-pay user: their intro price ends next month.

Core flow:
1. Quiz, 8-10 screens, no login. Collect: coverage type; insurer; drug, chosen from a catalog built on openFDA data (section 5); current dose step; diagnosis on file, yes/no only; status; current monthly cost.
2. Cheapest-legal-path engine. Pure code, unit-tested. Enumerate the eligible channels: insurance plus savings card, Medicare Bridge, TrumpRx, LillyDirect, NovoCare, and pill or pen alternatives to ask the doctor about. Apply eligibility rules. Project the 12-month total with dose escalation and promo expiry. Output the best path, the savings and a "worth appealing?" score (savings x winnability by denial type).
3. Coverage check, rules not LLM. PA criteria for 3 major insurers plus a generic template. Status is one of: likely covered with PA; excluded by plan; needs diagnosis code clarification.
4. Denial letter decoder. The user uploads a photo or PDF. The LLM extracts reason, dates, plan type and reference into zod-validated JSON. Code maps the denial category, computes the appeal deadline and picks the checklist. A "Try DEMO letter" fixture goes through the same pipeline.
5. Appeal pack (paid): a patient appeal letter; a letter-of-medical-necessity draft for the doctor to review and sign (we never assert clinical facts); a document checklist; PDF export.
6. Paywall. Free: path check, coverage check, denial decode. Guardian, $7.99/month or $59/year (Stripe test mode): appeal pack, case timeline, monthly overpayment check, promo and dose-price alerts, PA renewal reminders with baseline storage, January plan-change check.
7. Return mechanics, live. All of these must work: real reminder emails via Resend, scheduled with Vercel Cron; a monthly "did you overpay?" check: the user enters the pharmacy amount, code compares it with the expected cost; a seeded demo case: "PA renewal in 23 days" and "Your $199 intro price ends after the next fill".

Never: dosing advice, symptom or weight tracking, or efficacy claims; compounded or "research peptide" referrals (the FDA is shutting both down); affiliate links to pharmacies or telehealth.

Copy and privacy: show a disclaimer "Not medical, legal or financial advice". Collect minimal health data (diagnosis yes/no only). Data lives in localStorage by default; email is stored only for reminders. The UI is in English.

## 4. Design first: mandatory gate before building
Do not write product UI code until a design exists in an artifact and the product owner has approved it.
1. Artifact type. Create the design as an artifact: a Design artifact if available, otherwise a self-contained HTML mockup published as an artifact. A text description is not enough.
2. Screens. Cover mobile and desktop for each: landing; quiz (2-3 steps); cheapest-path result with the 12-month cost and savings (the main "aha" screen); coverage status; denial upload with DEMO; decoded denial with deadline and checklist; appeal pack preview; paywall; case timeline; monthly overpayment check; reminder email.
3. Design tokens first. Color palette with one accent, type scale, spacing on an 8pt grid, radii, shadows. Reuse them 1:1 in code via CSS variables.
4. Real copy. Use realistic numbers from the personas, no lorem ipsum. No drug imagery and no before/after bodies.
5. Approval and timing. Budget 60-90 minutes, then share the link and wait for approval. If there is no answer in 20 minutes, continue with UI-independent work (data ingestion, engine) but build no screens before approval.

Stylish, considered design. Build on proven libraries rather than hand-rolled styles:
- Components: shadcn/ui on Radix primitives with a custom theme, not the default look.
- Styling: Tailwind CSS driven by the design tokens.
- Motion: framer-motion for meaningful transitions such as quiz steps and result reveal.
- Charts: Recharts or Tremor for the 12-month cost path and the channel comparison.
- Icons and type: Lucide icons; fonts via next/font, a clean sans plus one display face for big numbers.
- Forms and feedback: react-hook-form + zod for forms, Sonner for toasts.

Quality bar: calm, trustworthy, clean but warm, never a pharmacy ad; big dollar numerals; clear hierarchy and generous whitespace; empty, loading (skeleton) and error states for every screen; mobile-first layout; WCAG AA contrast, keyboard navigation and visible focus states. If a frontend-design skill or guide is available, use it.

## 5. Data: what to pull and from where

| Dataset | Source | How to get it | Used for |
|---|---|---|---|
| Drug catalog: approved GLP-1 products, forms, strengths, NDCs | openFDA API (drug label and NDC endpoints); Drugs@FDA | `scripts/ingest-openfda.ts` pulls and normalizes into `data/drugs.json` | Quiz options, dose steps |
| Cash prices by drug, form and dose, promo windows and expiry, eligibility exclusions | TrumpRx.gov; LillyDirect; NovoCare; wegovy.com and zepbound.lilly.com savings pages | No public API. Compile into `data/prices.json`; each value has `source_url` and `verified_at`. Optional change-check script where the site's terms allow | Path engine |
| Savings card terms (commercial only, "as low as" conditions) | Manufacturer savings pages and terms | Compile | Path engine |
| Medicare GLP-1 Bridge: eligibility, copay, start date | cms.gov | Compile | Eligibility rules |
| Insurer PA criteria and renewal criteria for 3 insurers (BMI thresholds, comorbidities, lifestyle documentation, renewal weight-loss %) | Aetna Clinical Policy Bulletins and pharmacy policies; Cigna drug coverage policies; UnitedHealthcare / Optum Rx PA criteria PDFs; PBM documents (CVS Caremark, Express Scripts) | Compile into `data/insurer_rules.json` with PDF link and page | Coverage check |
| Appeal deadlines and external review rights | DOL ERISA claims procedure (29 CFR 2560.503-1); HealthCare.gov appeals page; state Departments of Insurance | Compile | Deadline engine |
| Medicaid GLP-1 coverage by state (optional) | KFF state tracker | Compile with citation | Eligibility |
| Context stats for landing copy | KFF polls; Business Group on Health survey | Compile with citation | Landing |
| Denial letters | User upload | LLM vision extraction to a zod schema, then code | Decoder |

## 6. No hardcoding (hard rule)
- Data files only. Every price, dose, threshold, date, promo window, eligibility rule and deadline lives in versioned data files (`data/*.json`, validated with zod schemas) or in database tables loaded by ingest scripts. Every record carries `source_url` and `verified_at`.
- Pure engine. The engine is a pure function of (user input, data): no magic numbers in components or engine branches.
- Factual copy reads from data. A sentence like "$149/month" renders from `prices.json`, not a string literal.
- Demo inputs, not demo outputs. DEMO inputs are input fixtures in `/fixtures`. They go through the full pipeline, and outputs are never precomputed.
- Machine-readable sources get scripts. Use ingest scripts in `/scripts` wherever a machine-readable source exists (openFDA). Manual compilation is allowed only where none exists, and always with a citation.
- Automated guards: a CI or lint check that fails on currency or percent literals in `/app` and `/components`; engine tests against independent worked examples.
- Visible verification date. The UI shows "Prices verified on {date}", read from data.

## 7. Tech stack
- App: Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Radix, framer-motion, Recharts or Tremor, Lucide; deployed on Vercel.
- Engine: pure TypeScript in `lib/engine/`, with Vitest tests.
- Database: Postgres (Neon) + Drizzle for reminders and case snapshots.
- Services: Resend, Vercel Cron, Stripe Checkout in test mode.
- LLM: an LLM API with vision and structured JSON output validated by zod.
- Analytics events: quiz_start, result_view, paywall_view, checkout_start, reminder_set.

## 8. Definition of done
- Design: the design artifact was approved and the shipped UI matches it.
- Jury flow: the production URL works in incognito with no login. Real input and DEMO fixtures go through the same pipeline.
- No hardcoding: the CI check passes and every displayed price or rule traces to data with a source and date.
- Engine tests: at least 6 scenarios pass: covered with PA; excluded by plan; Medicare; self-pay intro price ending; dose escalation; denial worth appealing versus not.
- Payments and reminders: a real reminder email arrives, and the Stripe test checkout unlocks Guardian.
- README: covers architecture, what code does versus what the LLM does, data sources and ingest scripts, safety boundaries, and how to refresh data.

## 9. How to work and report
- Verify facts from primary sources before coding, and flag anything you could not verify.
- Never invent statistics.
- When unsure whether something is medical advice, leave it out.
- Report to the product owner at each milestone (design link ready, data and engine done, core flow live, final walkthrough) with: what works; what is blocked; the production URL; next steps.
