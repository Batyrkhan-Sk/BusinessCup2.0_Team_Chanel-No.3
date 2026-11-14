/** Pure UTC date helpers. All dates are ISO "YYYY-MM-DD"; months are "YYYY-MM". */

const DAY_MS = 86_400_000;

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return formatDate(new Date(parseDate(iso).getTime() + days * DAY_MS));
}

/** Calendar-month addition; clamps to the last day of the target month. */
export function addMonths(iso: string, months: number): string {
  const d = parseDate(iso);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return formatDate(target);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseDate(toIso).getTime() - parseDate(fromIso).getTime()) / DAY_MS);
}

export function monthStart(month: string): string {
  return `${month}-01`;
}

export function nextMonth(month: string, n = 1): string {
  return addMonths(monthStart(month), n).slice(0, 7);
}

export function isOnOrBefore(aIso: string, bIso: string): boolean {
  return aIso <= bIso;
}

export function isWithin(iso: string, startIso: string, endIso: string): boolean {
  return iso >= startIso && iso <= endIso;
}

/** Round to cents to keep sums exact. */
export function cents(n: number): number {
  return Math.round(n * 100) / 100;
}
