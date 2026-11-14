/** Which reminders a case can turn on, with their engine-computed payloads. Pure. */
import type { DataBundle } from "@/lib/data/schemas";
import type { PathResult, QuizInput } from "@/lib/engine/types";
import type { DecodedDenial } from "@/lib/decoder/decode";
import { monthStart } from "@/lib/engine/dates";
import { appealWatch, demoWatchList, monthlyCheckPayload, promoWatch, type DemoCaseFile, type WatchItem } from "@/lib/guardian/watch";
import type { ReminderOption } from "@/components/email/reminder-signup";

const LABEL: Record<WatchItem["kind"], string> = {
  promo_ending: "Promo ending, before the price changes",
  pa_renewal: "Insurance approval renewal, before it ends",
  refill_window: "Refill window, before it closes",
  appeal_deadline: "Appeal deadline, ahead of the last day",
  monthly_check: "Monthly \"did you overpay?\" check",
};

const toOption = (w: WatchItem): ReminderOption => ({ id: w.id, label: LABEL[w.kind], payload: w.payload, remind_on: w.remind_on });

export function reminderOptions(
  data: DataBundle,
  args: {
    input: QuizInput;
    path: PathResult;
    decoded: DecodedDenial | null;
    demo: "jessica" | "sam" | null;
    demoCase: DemoCaseFile;
    personas: { jessica: QuizInput; sam: QuizInput };
    today: string;
  },
): ReminderOption[] {
  if (args.demo) {
    const w = demoWatchList(data, args.demoCase, args.personas.sam, args.personas.jessica);
    const kinds = args.demo === "jessica" ? ["refill_window", "appeal_deadline"] : ["promo_ending"];
    const out = w.items.filter((i) => kinds.includes(i.kind)).map(toOption);
    const promo = args.demoCase.cases.find((c) => c.id === "demo-promo") as unknown as { offer_id: string; dose_mg: number; intro_fills_used: number; next_fill_date: string };
    if (args.demo === "sam")
      out.push({
        id: "monthly",
        label: LABEL.monthly_check,
        payload: monthlyCheckPayload(data, { offer_id: promo.offer_id, dose_mg: promo.dose_mg, fill_date: promo.next_fill_date, fill_number: promo.intro_fills_used + 1, demo: true }),
        remind_on: [],
      });
    return out;
  }

  const out: ReminderOption[] = [];
  const { input, path } = args;
  const firstFill = monthStart(input.start_month);
  const own = data.prices.offers.find((o) => o.product_id === input.product_id && (o.channel === "lillydirect" || o.channel === "novocare"));
  if (input.status === "self_pay" && own?.promo && input.current_dose_mg !== null) {
    const p = promoWatch(data, { offer_id: own.id, dose_mg: input.current_dose_mg, intro_fills_used: input.intro_fills_used ?? 0, next_fill_date: firstFill, quiz: input, today: args.today });
    if (p) out.push(toOption(p));
  }
  const d = args.decoded;
  if (d?.facts.notice_date) {
    const a = appealWatch(data, {
      notice_date: d.facts.notice_date,
      product_id: input.product_id,
      reference_number: d.facts.reference_number,
      at_stake_12mo_usd: path.at_stake_usd,
      stated_appeal_window_days: d.facts.stated_appeal_window_days,
      today: args.today,
    });
    if (a) out.push(toOption(a));
  }
  const best = path.best;
  if (best && data.prices.offers.some((o) => o.id === best.id) && best.months[0]) {
    out.push({
      id: "monthly",
      label: LABEL.monthly_check,
      payload: monthlyCheckPayload(data, { offer_id: best.id, dose_mg: best.months[0].dose_mg, fill_date: firstFill, fill_number: (input.intro_fills_used ?? 0) + 1 }),
      // one check on each projected fill date
      remind_on: best.months.map((m) => m.fill_date).filter((dt) => dt >= args.today),
    });
  }
  return out;
}
