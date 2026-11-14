/**
 * Pulls GLP-1 product data from openFDA (NDC + drug label endpoints) and
 * normalizes it to data/drugs.json.
 *
 *   pnpm ingest:openfda
 *
 * What comes from openFDA (machine-readable, re-runnable):
 *   - NDCs per product and form, labeler, marketing category
 *   - dose strengths (per single-dose unit from the NDC strength field,
 *     or from the label's "Dosage forms and strengths" section for multi-dose devices)
 *   - label set_id / effective date / whether the indication covers weight management
 *
 * What comes from this file's CATALOG config (human-curated, cited):
 *   - which brand+form combinations we expose in the quiz
 *   - the dose-escalation interval stated in each label's dosing section
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DrugsFileSchema, type Drug } from "../lib/data/schemas";

const API = "https://api.fda.gov/drug";
const TODAY = new Date().toISOString().slice(0, 10);

type DoseStrategy =
  | { kind: "ndc-unit" } // strength like "5 mg/.5mL" or "4 mg/1" (one unit = one dose)
  | { kind: "label-regex"; pattern: string }; // capture group 1 holds "x mg, y mg" text or a single number

interface CatalogEntry {
  product_id: string;
  medicine_id: string; // same medicine, any device (e.g. zepbound vial and pen)
  brand: string;
  generic: string;
  form: "pen" | "vial" | "pill";
  device: string;
  ndc_search: string; // openFDA ndc.json search expression
  package_filter: RegExp; // which packages belong to this device
  dose: DoseStrategy;
  label_search: string; // openFDA label.json search expression
  escalation_interval_weeks: number | null;
  escalation_note: string;
}

const LILLY = 'labeler_name:"lilly"';
const NOVO = 'labeler_name:"novo"';

export const CATALOG: CatalogEntry[] = [
  {
    product_id: "zepbound-vial",
    medicine_id: "zepbound",
    brand: "Zepbound",
    generic: "tirzepatide",
    form: "vial",
    device: "single-dose vial",
    ndc_search: `brand_name:"zepbound"+AND+${LILLY}`,
    package_filter: /VIAL, SINGLE-DOSE/i,
    dose: { kind: "ndc-unit" },
    label_search: 'openfda.brand_name:"zepbound"+AND+openfda.manufacturer_name:"lilly"',
    escalation_interval_weeks: 4,
    escalation_note: "Label section 2: start 2.5 mg weekly; increase in 2.5 mg steps after at least 4 weeks on the current dose.",
  },
  {
    product_id: "zepbound-pen",
    medicine_id: "zepbound",
    brand: "Zepbound",
    generic: "tirzepatide",
    form: "pen",
    device: "single-dose pen",
    ndc_search: `brand_name:"zepbound"+AND+${LILLY}`,
    package_filter: /4 SYRINGE in 1 CARTON/i,
    dose: { kind: "ndc-unit" },
    label_search: 'openfda.brand_name:"zepbound"+AND+openfda.manufacturer_name:"lilly"',
    escalation_interval_weeks: 4,
    escalation_note: "Label section 2: start 2.5 mg weekly; increase in 2.5 mg steps after at least 4 weeks on the current dose.",
  },
  {
    product_id: "zepbound-kwikpen",
    medicine_id: "zepbound",
    brand: "Zepbound KwikPen",
    generic: "tirzepatide",
    form: "pen",
    device: "KwikPen (4 doses per pen)",
    ndc_search: `brand_name:"zepbound+kwikpen"+AND+${LILLY}`,
    package_filter: /1 SYRINGE in 1 CARTON/i,
    dose: { kind: "label-regex", pattern: "(\\d+(?:\\.\\d+)?) mg/0\\.6 mL" },
    label_search: 'openfda.brand_name:"zepbound"+AND+openfda.manufacturer_name:"lilly"',
    escalation_interval_weeks: 4,
    escalation_note: "Label section 2: start 2.5 mg weekly; increase in 2.5 mg steps after at least 4 weeks on the current dose.",
  },
  {
    product_id: "wegovy-pen",
    medicine_id: "wegovy-injection",
    brand: "Wegovy",
    generic: "semaglutide",
    form: "pen",
    device: "single-dose pen",
    ndc_search: `brand_name:"wegovy"+AND+${NOVO}+AND+dosage_form:"injection"`,
    package_filter: /SYRINGE/i,
    dose: { kind: "ndc-unit" },
    label_search: 'openfda.brand_name:"wegovy"',
    escalation_interval_weeks: 4,
    escalation_note: "Label section 2: dose escalation every 4 weeks (0.25, 0.5, 1, 1.7, 2.4 mg).",
  },
  {
    product_id: "wegovy-pill",
    medicine_id: "wegovy-oral",
    brand: "Wegovy",
    generic: "semaglutide",
    form: "pill",
    device: "tablet (30 per bottle)",
    ndc_search: `brand_name:"wegovy"+AND+${NOVO}+AND+dosage_form:"tablet"`,
    package_filter: /TABLET/i,
    dose: { kind: "ndc-unit" },
    label_search: 'openfda.brand_name:"wegovy"+AND+openfda.route:"oral"',
    escalation_interval_weeks: null,
    escalation_note: "Oral Wegovy label was not available on the openFDA label endpoint at ingest; escalation interval not asserted.",
  },
  {
    product_id: "foundayo-pill",
    medicine_id: "foundayo",
    brand: "Foundayo",
    generic: "orforglipron",
    form: "pill",
    device: "tablet",
    ndc_search: `brand_name:"foundayo"+AND+${LILLY}`,
    package_filter: /TABLET|BOTTLE/i,
    dose: { kind: "ndc-unit" },
    label_search: 'openfda.brand_name:"foundayo"',
    escalation_interval_weeks: null,
    escalation_note: "Escalation interval not asserted; see label section 2.",
  },
  {
    product_id: "mounjaro-pen",
    medicine_id: "mounjaro",
    brand: "Mounjaro",
    generic: "tirzepatide",
    form: "pen",
    device: "single-dose pen",
    ndc_search: `brand_name:"mounjaro"+AND+${LILLY}`,
    package_filter: /4 SYRINGE in 1 CARTON/i,
    dose: { kind: "ndc-unit" },
    label_search: 'openfda.brand_name:"mounjaro"+AND+openfda.manufacturer_name:"lilly"',
    escalation_interval_weeks: 4,
    escalation_note: "Label section 2: start 2.5 mg weekly; increase in 2.5 mg steps after at least 4 weeks on the current dose.",
  },
  {
    product_id: "ozempic-pen",
    medicine_id: "ozempic",
    brand: "Ozempic",
    generic: "semaglutide",
    form: "pen",
    device: "multi-dose pen",
    ndc_search: `brand_name:"ozempic"+AND+${NOVO}+AND+dosage_form:"injection"`,
    package_filter: /PEN|SYRINGE|INJECTOR/i,
    dose: { kind: "label-regex", pattern: String.raw`doses of (\d*\.?\d+) mg` },
    label_search: 'openfda.brand_name:"ozempic"+AND+openfda.route:"subcutaneous"',
    escalation_interval_weeks: 4,
    escalation_note: "Label section 2: increase dose after at least 4 weeks on the current dose.",
  },
  {
    product_id: "saxenda-pen",
    medicine_id: "saxenda",
    brand: "Saxenda",
    generic: "liraglutide",
    form: "pen",
    device: "multi-dose pen",
    ndc_search: `brand_name:"saxenda"+AND+${NOVO}`,
    package_filter: /PEN|SYRINGE|INJECTOR/i,
    dose: { kind: "label-regex", pattern: String.raw`delivers doses of ((?:\d*\.?\d+ mg(?:,| or|, or)? ?)+)` },
    label_search: 'openfda.brand_name:"saxenda"',
    escalation_interval_weeks: 1,
    escalation_note: "Label section 2: weekly escalation by 0.6 mg to 3 mg.",
  },
];

interface NdcRecord {
  brand_name?: string;
  generic_name?: string;
  labeler_name?: string;
  dosage_form?: string;
  product_ndc: string;
  marketing_category?: string;
  active_ingredients?: { name: string; strength: string }[];
  packaging?: { package_ndc: string; description: string }[];
}
interface LabelRecord {
  set_id?: string;
  effective_time?: string;
  openfda?: { brand_name?: string[]; product_ndc?: string[]; route?: string[] };
  dosage_forms_and_strengths?: string[];
  indications_and_usage?: string[];
}

async function getJson<T>(url: string): Promise<{ results: T[] }> {
  const res = await fetch(url, { headers: { "User-Agent": "DoseCost ingest (hackathon)" } });
  if (res.status === 404) return { results: [] }; // openFDA returns 404 for "no matches"
  if (!res.ok) throw new Error(`openFDA ${res.status} for ${url}`);
  return (await res.json()) as { results: T[] };
}

const num = (s: string) => Number.parseFloat(s.startsWith(".") ? `0${s}` : s);

function unitDose(strength: string): number | null {
  // "5 mg/.5mL", ".25 mg/.5mL", "4 mg/1"  -> per-unit dose; "16.7 mg/mL" (concentration) -> null
  const m = strength.match(/^\s*(\d*\.?\d+)\s*mg\/(\.\d+|0\.\d+|1)\s*(mL)?\s*$/i);
  if (!m) return null;
  if (m[2] === "1" && m[3]) return null; // "x mg/1 mL" would be a concentration
  return num(m[1]);
}

function labelDoses(text: string, pattern: string): number[] {
  const out: number[] = [];
  const re = new RegExp(pattern, "gi");
  for (const m of text.matchAll(re)) {
    for (const d of m[1].matchAll(/(\d*\.?\d+)\s*mg/gi)) out.push(num(d[1]));
    if (!/mg/i.test(m[1])) out.push(num(m[1]));
  }
  return out;
}

const uniqSorted = (xs: number[]) => [...new Set(xs.filter((x) => Number.isFinite(x) && x > 0))].sort((a, b) => a - b);

async function buildDrug(entry: CatalogEntry): Promise<Drug | null> {
  const ndcUrl = `${API}/ndc.json?search=${entry.ndc_search}&limit=100`;
  const labelUrl = `${API}/label.json?search=${entry.label_search}&limit=5`;
  const [ndc, label] = await Promise.all([getJson<NdcRecord>(ndcUrl), getJson<LabelRecord>(labelUrl)]);

  const records = ndc.results.filter((r) => (r.packaging ?? []).some((p) => entry.package_filter.test(p.description)));
  if (records.length === 0) {
    console.warn(`! ${entry.product_id}: no NDC records matched`);
    return null;
  }
  // Prefer the manufacturer's own label (most product NDCs, newest effective date).
  const lbl = [...label.results].sort(
    (a, b) =>
      (b.openfda?.product_ndc?.length ?? 0) - (a.openfda?.product_ndc?.length ?? 0) ||
      (b.effective_time ?? "").localeCompare(a.effective_time ?? ""),
  )[0];
  const dfs = (lbl?.dosage_forms_and_strengths ?? []).join(" ").replace(/\s+/g, " ");
  const indications = (lbl?.indications_and_usage ?? []).join(" ").toLowerCase();

  let doses: number[];
  if (entry.dose.kind === "ndc-unit") {
    doses = uniqSorted(records.flatMap((r) => (r.active_ingredients ?? []).map((a) => unitDose(a.strength) ?? NaN)));
  } else {
    doses = uniqSorted(labelDoses(dfs, entry.dose.pattern));
  }
  if (doses.length === 0) {
    console.warn(`! ${entry.product_id}: could not parse dose steps`);
    return null;
  }

  const ndcs = [...new Set(records.map((r) => r.product_ndc))].sort();
  const packageNdcs = [...new Set(records.flatMap((r) => (r.packaging ?? []).map((p) => p.package_ndc)))].sort();

  return {
    product_id: entry.product_id,
    medicine_id: entry.medicine_id,
    brand: entry.brand,
    generic: entry.generic,
    form: entry.form,
    device: entry.device,
    labeler: records[0].labeler_name ?? "",
    dose_unit: "mg",
    dose_steps_mg: doses,
    escalation_interval_weeks: entry.escalation_interval_weeks,
    escalation_note: entry.escalation_note,
    weight_management_indication: lbl ? /weight/.test(indications) : null,
    product_ndcs: ndcs,
    package_ndcs: packageNdcs,
    label_set_id: lbl?.set_id ?? null,
    label_effective_date: lbl?.effective_time
      ? `${lbl.effective_time.slice(0, 4)}-${lbl.effective_time.slice(4, 6)}-${lbl.effective_time.slice(6, 8)}`
      : null,
    source_url: ndcUrl,
    label_source_url: lbl ? labelUrl : null,
    verified_at: TODAY,
  };
}

async function main() {
  const drugs: Drug[] = [];
  for (const entry of CATALOG) {
    const d = await buildDrug(entry);
    if (d) {
      drugs.push(d);
      console.log(`✓ ${d.product_id}: ${d.dose_steps_mg.join(", ")} mg · ${d.product_ndcs.length} NDCs`);
    }
  }
  const file = DrugsFileSchema.parse({
    generated_at: new Date().toISOString(),
    source: "openFDA drug NDC and label endpoints (api.fda.gov)",
    source_url: "https://open.fda.gov/apis/drug/",
    verified_at: TODAY,
    drugs,
  });
  const out = resolve(process.cwd(), "data/drugs.json");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(file, null, 2) + "\n");
  console.log(`wrote ${drugs.length} products to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
