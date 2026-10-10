import { PEOPLE, type Entry, type Settings } from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const entryKwh = (e: Pick<Entry, "start_reading" | "end_reading">) =>
  round2(e.end_reading - e.start_reading);

export function summarize(entries: Entry[], s: Settings) {
  const perPerson = PEOPLE.map((person) => {
    const kwh = round2(
      entries.filter((e) => e.person === person).reduce((sum, e) => sum + entryKwh(e), 0)
    );
    return { person, kwh, bill: round2(kwh * s.rate) };
  });

  // The meter's current reading is the end reading of the most recent entry.
  const latest = entries.reduce<Entry | null>(
    (a, e) => (!a || e.end_at > a.end_at ? e : a),
    null
  );
  const current = latest ? latest.end_reading : s.previous_reading;

  const total = round2(current - s.previous_reading);
  const logged = round2(perPerson.reduce((sum, p) => sum + p.kwh, 0));
  const unlogged = round2(total - logged);

  return {
    perPerson,
    current,
    total,
    totalBill: round2(total * s.rate),
    logged,
    unlogged,
    unloggedBill: round2(Math.max(unlogged, 0) * s.rate),
  };
}

const num = (n: number, digits = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtKwh = (n: number) => num(n);
export const fmtPhp = (n: number) => `₱${num(n)}`;
export const fmtRate = (n: number) => `₱${num(n, 4)}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// "2026-10-10T09:00:00" -> "Oct 10, 9:00 AM" (no timezone math; times are stored as typed)
export function fmtDateTime(s: string) {
  const [date, time] = s.split("T");
  const [, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const h12 = hh % 12 || 12;
  return `${MONTHS[m - 1]} ${d}, ${h12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
}

// For <input type="datetime-local">
export const toInputValue = (s: string) => s.slice(0, 16);