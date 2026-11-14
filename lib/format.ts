/** Display formatting. Values always come from data or the engine; these only format them. */

const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatUsd(n: number | null | undefined, opts: { signed?: boolean } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const s = Number.isInteger(Math.round(abs * 100) / 100) && Math.round(abs * 100) % 100 === 0 ? usd0.format(abs) : usd2.format(abs);
  if (n < 0) return `−${s}`;
  return opts.signed && n > 0 ? `+${s}` : s;
}

export function formatUsdRange(r: [number, number] | null): string {
  if (!r) return "—";
  return r[0] === r[1] ? formatUsd(r[0]) : `${formatUsd(r[0])}–${formatUsd(r[1])}`;
}

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const dateLong = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const monthYearFmt = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

const toDate = (iso: string) => new Date(`${iso.length === 7 ? `${iso}-01` : iso}T00:00:00Z`);

export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(toDate(iso)) : "—");
export const formatDateLong = (iso: string | null | undefined) => (iso ? dateLong.format(toDate(iso)) : "—");
export const formatMonth = (ym: string) => monthFmt.format(toDate(ym));
export const formatMonthYear = (ym: string) => monthYearFmt.format(toDate(ym));

export function formatPercent(value: number, opts: { upperBound?: boolean } = {}): string {
  return `${opts.upperBound ? "<" : ""}${value}%`;
}

export function formatDose(mg: number): string {
  return `${mg} mg`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
