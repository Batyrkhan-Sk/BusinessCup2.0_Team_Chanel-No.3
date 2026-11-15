/** Which reminders a case can turn on, with their engine-computed payloads. Pure. */
import type { DataBundle } from "@/lib/data/schemas";
import type { PathResult, QuizInput } from "@/lib/engine/types";
import type { DecodedDenial } from "@/lib/decoder/decode";
import { addDays, monthStart } from "@/lib/engine/dates";
import { refillWindowAlert } from "@/lib/engine/alerts";
import { pricesVerifiedOn } from "@/lib/data/load";
import {
  appealWatch,
  demoWatchList,
  monthlyCheckPayload,
  productLabel,
  promoWatch,
  refillWatch,
  renewalWatch,
  sourceLabel,
  type DemoCaseFile,
  type WatchItem,
} from "@/lib/guardian/watch";
import type { ReminderOption } from "@/components/email/reminder-signup";

const LABEL: Record<WatchItem["kind"], string> = {
  promo_ending: "Promo ending, before the price changes",
  pa_renewal: "Insurance approval renewal, before it ends",
  refill_window: "Refill window, before it closes",
  appeal_deadline: "Appeal deadline, ahead of the last day",
  monthly_check: "Monthly \"did you overpay?\" check",
  discount_ending: "Discount ending, before your price changes",
  plan_year: "New plan year check in January",
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

  // Approval renewal: 6-12 months out, from the end date on the approval letter.
  if (input.status === "pa_approved" && input.approval_ends_on && input.approval_ends_on >= args.today) {
    const card = data.savingsCards.cards.find((c) => c.applies_when === "with_coverage" && c.product_ids.includes(input.product_id));
    const doseMg = input.current_dose_mg ?? data.drugs.drugs.find((x) => x.product_id === input.product_id)?.dose_steps_mg[0];
    if (doseMg !== undefined) {
      const w = renewalWatch(data, {
        product_id: input.product_id,
        dose_mg: doseMg,
        approval_ends_on: input.approval_ends_on,
        self_pay_offer_id: own?.id ?? null,
        covered_card_id: card?.id ?? null,
        baseline_label: null,
        today: args.today,
      });
      const dates = w.remind_on.filter((dt) => dt >= args.today);
      if (dates.length) out.push(toOption({ ...w, remind_on: dates }));
    }
  }

  // Refill window: only where a late refill costs more at the projected dose.
  const bestOffer = best ? data.prices.offers.find((o) => o.id === best.id) : undefined;
  if (best && bestOffer) {
    const windowed = best.months.filter((m) => refillWindowAlert(bestOffer.id, m.dose_mg, m.fill_date, data));
    // One scheduled item per dose, so each email quotes the prices for that month's dose.
    const schedule: NonNullable<ReminderOption["schedule"]> = [];
    for (const dose of [...new Set(windowed.map((m) => m.dose_mg))]) {
      const months = windowed.filter((m) => m.dose_mg === dose);
      const w = refillWatch(data, { offer_id: bestOffer.id, dose_mg: dose, last_delivery_date: months[0].fill_date, appeal_file_by: null, today: args.today });
      const dates = months.map((m) => refillWindowAlert(bestOffer.id, m.dose_mg, m.fill_date, data)!.remind_on).filter((dt) => dt >= args.today);
      if (w && dates.length) schedule.push({ payload: w.payload, remind_on: dates });
    }
    if (schedule.length)
      out.push({ id: `refill:${bestOffer.id}`, label: LABEL.refill_window, payload: schedule[0].payload, remind_on: schedule.flatMap((s) => s.remind_on), schedule });
  }

  // Discounts the chosen or conditional path relies on that expire (savings cards, intro offers).
  const rules = data.reminderRules;
  const endings = new Map<string, { label: string; ends_on: string; current: number | null; source: string }>();
  for (const opt of [best, path.best_conditional]) {
    if (!opt) continue;
    for (const card of data.savingsCards.cards) {
      if (card.expires_on && opt.id.includes(card.id)) endings.set(card.id, { label: card.label.split(" (")[0], ends_on: card.expires_on, current: opt.months[0]?.price_usd ?? null, source: card.source_url });
    }
    const offer = data.prices.offers.find((o) => o.id === opt.id);
    if (offer?.promo && opt.months.some((m) => m.note === "intro"))
      endings.set(offer.id, { label: `${productLabel(data, offer.product_id)} intro price`, ends_on: offer.promo.valid_through, current: offer.promo.intro_monthly_usd, source: offer.source_url });
  }
  for (const [id, e] of endings) {
    if (e.ends_on < args.today) continue;
    const remindOn = [addDays(e.ends_on, -rules.discount_ending_lead_days), args.today].sort().reverse()[0];
    out.push({
      id: `discount:${id}`,
      label: LABEL.discount_ending,
      remind_on: [remindOn],
      payload: {
        kind: "discount_ending",
        prices_verified_on: pricesVerifiedOn(data),
        source_label: sourceLabel(e.source),
        product_label: productLabel(data, input.product_id),
        discount_label: e.label,
        ends_on: e.ends_on,
        days_left: Math.max(0, Math.round((Date.parse(e.ends_on) - Date.parse(remindOn)) / 86400000)),
        current_usd: e.current,
      },
    });
  }

  // New plan year: once a year, when coverage and copays reset.
  const month = String(rules.january_plan_check_month).padStart(2, "0");
  const year = Number(args.today.slice(0, 4));
  const thisYear = `${year}-${month}-01`;
  const planCheck = thisYear > args.today ? thisYear : `${year + 1}-${month}-01`;
  out.push({
    id: "plan-year",
    label: LABEL.plan_year,
    remind_on: [planCheck],
    payload: {
      kind: "plan_year",
      prices_verified_on: pricesVerifiedOn(data),
      source_label: "our data files",
      product_label: productLabel(data, input.product_id),
      plan_year: planCheck.slice(0, 4),
      best_label: best?.label.split(" (")[0] ?? null,
      best_monthly_usd: best?.months[0]?.price_usd ?? null,
    },
  });
  return out;
}
