/**
 * Appeal pack content. Pure. The patient letter uses only facts from the decoded letter,
 * the insurer policy data and the deadline rules. The letter of medical necessity is a
 * STRUCTURE: every clinical statement is a [bracket] for the doctor to write and sign.
 * DoseCost never asserts clinical facts.
 */
import type { DataBundle, InsurerRule } from "@/lib/data/schemas";
import type { DecodedDenial } from "@/lib/decoder/decode";
import type { PathResult } from "@/lib/engine/types";
import { formatDate, formatDateLong, formatUsd } from "@/lib/format";

export interface AppealPack {
  title: string;
  demo: boolean;
  letter: { header: string[]; to: string[]; re: string; paragraphs: string[]; enclosures: string[]; signoff: string[] };
  lmn: { title: string; note: string; sections: Array<{ heading: string; body: string }> };
  checklist: Array<{ label: string; detail: string; who: string }>;
  summary: Array<[string, string]>;
}

export function buildAppealPack(args: {
  decoded: DecodedDenial;
  rule: InsurerRule | null;
  path: PathResult | null;
  memberName?: string | null;
  today: string;
  demo: boolean;
}, data: DataBundle): AppealPack {
  const { decoded: d, rule } = args;
  const f = d.facts;
  const name = args.memberName?.trim() || "[Your full name]";
  const drug = f.drug_name ?? "[medication and strength]";
  const dl = d.deadlines;
  const decision = dl ? `${dl.decision_window.value} ${dl.decision_window.unit}` : null;
  const criteria = rule?.initial_criteria ?? [];
  const policyRef = rule ? `${rule.insurer_label} policy ${rule.policy_id}${rule.effective_date ? ` (effective ${formatDate(rule.effective_date)})` : ""}` : "[your plan's coverage policy]";
  const ercat = data.appealRules.categories.find((c) => c.id === d.category);

  const paragraphs = [
    `I am writing to appeal the denial of coverage for ${drug}, prescribed by my physician, [Dr. Name], on [date]. Your notice${f.notice_date ? ` dated ${formatDateLong(f.notice_date)}` : ""} gives this reason: "${f.reason_text || "[reason as stated in the letter]"}"`,
    criteria.length
      ? `Under ${policyRef}, coverage requires: ${criteria.map((c) => c.label.toLowerCase()).join("; ")}. The enclosed records address each of these: ${criteria.map((c) => c.evidence.toLowerCase()).join("; ")}.`
      : `The enclosed records address the reason stated in your notice.`,
    d.category === "plan_exclusion"
      ? "I ask that you confirm in writing the specific plan provision that excludes this medication, and whether any medical exception process applies."
      : `Because the denial rests on ${ercat?.label.toLowerCase() ?? "the stated reason"} rather than a plan exclusion, I ask that you review the enclosed records and approve the request.`,
    `${f.claim_timing === "post_service" ? "This is a post-service appeal" : f.claim_timing === "urgent" ? "I request an expedited review because my situation is urgent" : "This is a pre-service appeal"}${decision ? `; under 29 CFR 2560.503-1 I understand a decision is due within ${decision} of your receipt` : ""}. If the denial is upheld, please identify the specific criteria not met and explain how to request an independent external review.`,
  ];

  const enclosures = ["Copy of the denial notice", ...d.checklist.filter((c) => c.id !== "denial_copy").map((c) => c.label)];

  return {
    title: `Appeal pack · ${f.reference_number ?? "your case"}`,
    demo: args.demo,
    letter: {
      header: [name, "[Street address]", "[City, State ZIP]", `Member ID: [from your card]`, formatDateLong(args.today)],
      to: [`${f.plan_name ?? "[Plan name]"} · Appeals Department`, f.appeal_contact ?? "[Address or fax from the denial letter]"],
      re: `Re: Internal appeal of coverage denial${f.reference_number ? ` · Reference ${f.reference_number}` : ""} · ${drug}${f.notice_date ? ` · Notice dated ${formatDateLong(f.notice_date)}` : ""}`,
      paragraphs,
      enclosures,
      signoff: ["Sincerely,", name],
    },
    lmn: {
      title: "Letter of medical necessity: draft for your doctor",
      note: "A structure, not a claim. Your doctor writes every clinical statement, edits freely, and signs. DoseCost does not provide medical opinions.",
      sections: [
        { heading: "Patient and request", body: `Patient: ${name}. Date of birth: [DOB]. Medication requested: ${drug}. Plan reference: ${f.reference_number ?? "[reference]"}.` },
        ...criteria.map((c) => ({ heading: c.label, body: `[Doctor: document ${c.detail.charAt(0).toLowerCase()}${c.detail.slice(1)}] (Policy ${rule?.policy_id ?? ""}${c.source_page ? `, ${c.source_page}` : ""})` })),
        { heading: "Clinical rationale", body: "[Doctor: in your own words, why this medication is appropriate for this patient.]" },
        { heading: "Prescriber", body: "[Name, credentials, NPI, practice address, phone], [Signature], [Date]" },
      ],
    },
    checklist: d.checklist.map((c) => ({ label: c.label, detail: c.detail, who: c.who })),
    summary: [
      ["Denial category", d.category_label],
      ["Chance of winning (our estimate)", d.winnability],
      ["File the appeal by", dl ? formatDate(dl.file_by) : "—"],
      ["Plan decision window", decision ?? "—"],
      ["Policy cited", rule ? `${rule.insurer_label} ${rule.policy_id}` : "—"],
      ["At stake over 12 months", args.path?.at_stake_usd != null ? formatUsd(args.path.at_stake_usd) : "—"],
    ],
  };
}
