# DoseCost data sources

All facts below were checked on **2026-11-14**. "Primary" means read on the owner's own page or document; "secondary" means taken from reporting or search excerpts because the primary page blocked automated access; "editorial" means our own product decision (labelled as such in the data). Where the product spec and a live source disagreed, **the live source wins** and the discrepancy is listed at the end.

## Cash prices and promos (`prices.json`)

| Fact | Value | Source | Status |
|---|---|---|---|
| LillyDirect Zepbound single-dose vial, 2.5 mg | $299/mo | https://www.lilly.com/lillydirect/zepbound | primary |
| LillyDirect Zepbound vial, 5 mg | $399/mo | same | primary |
| LillyDirect Zepbound vial, 7.5 / 10 / 12.5 / 15 mg | $449/mo when refilled within 45 days | same | primary |
| Late-refill (after 45 days) prices | $499 (7.5 mg), $699 (10, 12.5, 15 mg) | same | primary |
| LillyDirect Zepbound KwikPen ladder | same $299 / $399 / $449; pen needles extra | same | primary |
| Wegovy pen self-pay intro | $199/mo for first 2 fills at 0.25 or 0.5 mg, through 2026-12-31 | https://www.wegovy.com/coverage-and-savings/save-on-wegovy.html | primary |
| Wegovy pen self-pay regular | $349/mo (0.25–2.4 mg); Wegovy HD 7.2 mg $399/mo; 1 month = 4 pens | same | primary |
| Wegovy pill self-pay | $149 (1.5 mg), $199 (4 mg), $299 (9 and 25 mg); 1 month = 30 tablets | same | primary |
| TrumpRx listed prices | Wegovy pill $149, Wegovy pen $199, Ozempic $199, Zepbound $299 ("Lowest Presidential Deal") | https://trumprx.gov | primary |
| List ("original") prices | Wegovy $1,349, Ozempic $1,028, Zepbound $1,087 | https://trumprx.gov | primary |
| TrumpRx is cash-only; Zepbound purchases redirect to LillyDirect | — | ABC News / KFF Health News reporting on the Feb 2026 launch; FAQ answers not readable on trumprx.gov | secondary |
| LillyDirect Foundayo tablets | | TrumpRx is cash-only; Zepbound purchases redirect to LillyDirect | — | ABC News / KFF Health News reporting on the Feb 2026 launch; FAQ answers not readable on trumprx.gov | secondary |
49 (0.8 mg), | TrumpRx is cash-only; Zepbound purchases redirect to LillyDirect | — | ABC News / KFF Health News reporting on the Feb 2026 launch; FAQ answers not readable on trumprx.gov | secondary |
49 (2.5 mg), | TrumpRx is cash-only; Zepbound purchases redirect to LillyDirect | — | ABC News / KFF Health News reporting on the Feb 2026 launch; FAQ answers not readable on trumprx.gov | secondary |
99 (5.5 mg), $299 (9 mg), $299 (14.5 and 17.2 mg when refilled within 45 days); 2.5 and 5.5 mg prices temporarily reduced through 2026-12-31; 1 month = 30 days | https://lilly.com/lillydirect/medicines/foundayo (read 2026-11-15) | primary |

## Savings cards (`savings_cards.json`)

| Fact | Value | Source | Status |
|---|---|---|---|
| Zepbound Savings Card, commercial with coverage | as low as $25 for a 1-, 2- or 3-month fill of the single-dose pen; max $100/month; $1,300/year; ends 2026-12-31 | https://zepbound.lilly.com/coverage-savings | primary |
| Zepbound card, commercial without coverage | as low as $499/mo (single-dose pen); KwikPen 2.5 mg $299 with dose-specific caps | same | primary (KwikPen tiers not modelled) |
| Zepbound card exclusions | Medicaid, Medicare incl. Part D/Advantage, Medigap, DoD, VA, TRICARE/CHAMPUS, state drug programs | same | primary |
| Wegovy Savings Offer | as little as $25, max savings $100/month; government beneficiaries excluded; duration not stated | wegovy.com savings page | primary |
| Foundayo Savings Card, commercial with coverage | as low as $25/month; government beneficiaries excluded; max benefit and expiry not stated | https://lilly.com/lillydirect/medicines/foundayo (read 2026-11-15) | primary |

## Medicare GLP-1 Bridge (`medicare_bridge.json`)

| Fact | Value | Source | Status |
|---|---|---|---|
| Start / end | July 1, 2026 → December 31, 2027 | https://www.cms.gov/priorities/innovation/innovation-models/medicare-glp-1-bridge | primary |
| Copay | $50 per month | same | primary |
| Outside Part D: no deductible, not counted toward TrOOP, no LIS | — | same | primary |
| Requires PDP or MA-PD + prescriber PA; Wegovy pen and pill, all doses | — | wegovy.com | primary |
| Zepbound (KwikPen) and Foundayo covered | — | obesityaction.org, phlp.org | secondary |
| Clinical criteria (BMI thresholds) | **not verified** on cms.gov; secondary sources mention BMI ≥ 27 + condition | — | unverified, not used |

## Insurer PA criteria (`insurer_rules.json`)

| Insurer | Document | What was verified | Status |
|---|---|---|---|
| Cigna | IP0816 "Weight Loss – GLP-1 Agonists – Zepbound", effective 2026-09-01, [PDF](https://static.cigna.com/assets/chcp/pdf/coveragePolicies/pharmacy/ip_0816_coveragepositioncriteria_weight_loss_zepbound.pdf) | Initial (p. 4–5): age ≥ 18; ≥ 3 months behavioral modification + diet; baseline BMI ≥ 30, or ≥ 27 + listed comorbidity; approve 8 months. Renewal (p. 5): ≥ 5% loss from baseline; approve 1 year | primary (full PDF read) |
| Aetna | 6450-C "Weight Loss (BMI 35) GIP/GLP-1, GLP-1 Agonists PA with Limit" | Weight-management program with follow-up ≥ 6 months before drug therapy; comorbidity language | **secondary** (aetna.com returned 403; search excerpts). BMI thresholds and renewal % NOT verified |
| UnitedHealthcare / Optum Rx | UHC provider notice (2025) | BMI ≥ 30 or ≥ 27 + comorbidity, baseline weight required, diet/activity counseling, phentermine step therapy | primary **but only for UHC Community Plan of MA SCO/One Care**; UHC commercial criteria not verified. Renewal "up to 1 year" from Optum Rx Indiana Medicaid criteria (07.01.2026, p. 1) |
| Generic template | built from Cigna + UHC | BMI 30 / 27 + comorbidity, lifestyle program, 5% renewal | editorial |

## Appeals (`appeal_rules.json`)

| Fact | Value | Source | Status |
|---|---|---|---|
| Internal appeal filing window | at least 180 days | 29 CFR 2560.503-1(h)(3)(i) (https://www.law.cornell.edu/cfr/text/29/2560.503-1); HealthCare.gov internal appeals | primary |
| Pre-service decision | 30 days (15 per level if two levels) | 29 CFR 2560.503-1(i)(2)(ii) | primary |
| Post-service decision | 60 days (30 per level if two levels) | 29 CFR 2560.503-1(i)(2)(iii)(A) | primary |
| Urgent | 72 hours | 29 CFR 2560.503-1(i)(2)(i) | primary |
| External review | file within 4 months; standard 45 days; expedited 72 hours | https://www.healthcare.gov/appeal-insurance-company-decision/external-review/ | primary |
| Winnability tiers and weights, worth-appealing threshold | high/medium/low, 1.0/0.5/0.1, $1,000 | — | **editorial** (not probabilities) |
| Renewal denials citing missing baseline (Michigan, Dec 2025) | — | Michigan MOAHR decisions 26-003915, 26-002851 | primary documents found via search |

## Landing stats (`stats.json`)

| Fact | Source | Status |
|---|---|---|
| 18% ever taken, 12% currently taking a GLP-1; 56% of users (55% of insured) say hard to afford — poll Oct 27–Nov 2, 2025, published Nov 14, 2025 | https://www.kff.org/public-opinion/kff-health-tracking-poll-prescription-drug-costs-views-on-trump-administration-actions-and-glp-1-use/ | primary |
| < 1% of denied claims appealed; 66% of appeals upheld; 19% of in-network claims denied (HealthCare.gov, 2024; published Mar 24, 2026) | https://www.kff.org/private-insurance/claims-denials-and-appeals-in-aca-marketplace-plans-in-2024/ | primary |
| 67% of large employers cover GLP-1s for weight in 2026; 72% of those likely to continue in 2027; 10% likely not (105 employers, Feb–Mar 2026) | Business Group on Health release (site 403) via SHRM / Benefit News / Insurance Business | secondary |
| 14% of employers dropped or will drop coverage for 2027 (Aug 2026 survey) | EMARKETER citing BGH | secondary |
| 79% got their prescription from a primary care or other physician | KFF via AAFP | secondary |

## Drug catalog (`drugs.json`, machine-ingested)

`pnpm ingest:openfda` queries `api.fda.gov/drug/ndc.json` and `api.fda.gov/drug/label.json` for Zepbound (vial, pen, KwikPen), Wegovy (pen, pill), Foundayo, Mounjaro, Ozempic and Saxenda. Dose steps come from the NDC strength field (single-dose units) or the label's "Dosage forms and strengths" text (multi-dose devices). Each record stores its exact query URL and the run date.

## Could NOT verify (and how the product handles it)

- **Foundayo regular prices.** Lilly does not publish the 2.5/5.5 mg price after the temporary reduction ends on 2026-12-31, or the late-refill price for 14.5/17.2 mg. Projections use the listed prices and may understate cost after those points.
- **Spec: "employer coverage for obesity fell from 72% in 2025 to 60% in 2026" (Business Group on Health).** Not found. BGH data says 67% of large employers cover in 2026 and 72% *of those* expect to continue in 2027. The landing uses the verified figures; the 72%→60% claim is not used.
- **Spec: "about 80% of users get prescriptions from their own doctor".** Closest verified figure is 79% (KFF via AAFP, secondary). Used as 79%.
- **Spec: Wegovy pens "$199 for the first two fills, then $349".** Verified, with two conditions the spec omits: only at 0.25 or 0.5 mg, and only through 2026-12-31.
- **Spec: Zepbound vial "$299 at the starting dose, up to about $449".** Verified, with an added 5 mg step at $399 and late-refill prices of $499–$699.
- **Aetna BMI thresholds and renewal percentage**: not readable; the policy title references BMI 35. The coverage check shows Aetna's criteria as documentation to gather, never as a pass/fail on BMI (we do not collect BMI).
- **UHC commercial PA criteria**: only a Medicare/Medicaid-plan notice and an Indiana Medicaid Optum document were readable.
- **Government-beneficiary eligibility for LillyDirect and NovoCare self-pay**: the pages are silent; the engine flags these channels with a caveat instead of excluding or promising them.
- **Medicare Bridge clinical criteria** and the complete covered-drug list on cms.gov.
- **Zepbound Savings Card after 2026-12-31**: the card expires; projections past that date are flagged "assumes the card is renewed on the same terms", and the January plan-change check re-runs them.
- **Michigan Zepbound renewal denial (Dec 2025)**: found as Michigan administrative hearing decisions, not as news coverage.
- **Cigna CNF 684** (National Formulary policy, reportedly a 4% threshold): PDF returned 404; not modelled.
