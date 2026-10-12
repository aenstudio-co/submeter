import { PEOPLE, type ClosedEntry, type Entry, type Person, type Settings } from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const isClosed = (e: Entry): e is ClosedEntry => e.end_at !== null && e.end_reading !== null;

// How far the meter moved during this entry (not split with anyone).
export const entryKwh = (e: ClosedEntry) => round2(e.end_reading - e.start_reading);

// One stretch of time between two meter readings, and who was in the room.
export type Segment = {
  fromCycleStart: boolean;
  fromAt: string;
  toAt: string;
  fromReading: number;
  toReading: number;
  kwh: number;
  people: Person[];
  problem: boolean; // the reading went down
};

export function summarize(entries: Entry[], s: Settings) {
  const timedIn = entries.filter((e) => !isClosed(e));
  const byId = new Map(entries.map((e) => [e.id, e]));

  // Every time in and time out is a point on the timeline with a meter reading.
  type Ev = { at: string; reading: number; entryId: string; kind: "start" | "end" };
  const events: Ev[] = [];
  for (const e of entries) {
    events.push({ at: e.start_at, reading: e.start_reading, entryId: e.id, kind: "start" });
    if (isClosed(e)) events.push({ at: e.end_at, reading: e.end_reading, entryId: e.id, kind: "end" });
  }
  events.sort((a, b) => {
    if (a.at !== b.at) return a.at < b.at ? -1 : 1;
    if (a.kind !== b.kind) return a.kind === "end" ? -1 : 1; // someone leaving counts before someone arriving
    return a.reading - b.reading;
  });

  const raw = new Map<string, number>();
  const together = new Map<string, Set<Person>>();
  const alone = new Map<Person, number>();
  const shared = new Map<Person, number>();
  const withPeople = new Map<Person, Set<Person>>();
  const segments: Segment[] = [];
  const active = new Set<string>();
  let inconsistent = false;

  // From the previous bill's reading to the first logged reading, nobody was timed in.
  if (events.length) {
    const first = events[0].reading - s.previous_reading;
    if (Math.abs(first) >= 0.005) {
      segments.push({
        fromCycleStart: true,
        fromAt: `${s.cycle_start}T00:00:00`,
        toAt: events[0].at,
        fromReading: s.previous_reading,
        toReading: events[0].reading,
        kwh: round2(first),
        people: [],
        problem: first < -0.005,
      });
      if (first < -0.005) inconsistent = true;
    }
  }

  // Walk the timeline. The kWh the meter used between two points is split equally
  // between everyone who was in the room during that time.
  events.forEach((ev, i) => {
    if (ev.kind === "start") active.add(ev.entryId);
    else active.delete(ev.entryId);

    const next = events[i + 1];
    if (!next) return;

    const delta = next.reading - ev.reading;
    if (Math.abs(delta) >= 0.005) {
      segments.push({
        fromCycleStart: false,
        fromAt: ev.at,
        toAt: next.at,
        fromReading: ev.reading,
        toReading: next.reading,
        kwh: round2(delta),
        people: [...new Set([...active].map((id) => byId.get(id)!.person))],
        problem: delta < -0.005,
      });
    }
    if (delta < -0.005) {
      inconsistent = true; // a later time has a lower reading
      return;
    }
    if (delta <= 0 || active.size === 0) return;

    const part = delta / active.size;
    for (const id of active) {
      const me = byId.get(id)!.person;
      raw.set(id, (raw.get(id) ?? 0) + part);

      const others = new Set<Person>();
      for (const other of active) {
        const them = byId.get(other)!.person;
        if (them !== me) others.add(them);
      }
      if (others.size === 0) {
        alone.set(me, (alone.get(me) ?? 0) + part);
      } else {
        shared.set(me, (shared.get(me) ?? 0) + part);
        if (!together.has(id)) together.set(id, new Set());
        if (!withPeople.has(me)) withPeople.set(me, new Set());
        others.forEach((o) => {
          together.get(id)!.add(o);
          withPeople.get(me)!.add(o);
        });
      }
    }
  });

  const shareByEntry: Record<string, number> = {};
  const sharedWith: Record<string, Person[]> = {};
  for (const e of entries) {
    shareByEntry[e.id] = round2(raw.get(e.id) ?? 0);
    sharedWith[e.id] = [...(together.get(e.id) ?? [])];
  }

  const perPerson = PEOPLE.map((person) => {
    const kwh = round2(
      entries.filter((e) => e.person === person).reduce((sum, e) => sum + (raw.get(e.id) ?? 0), 0)
    );
    return {
      person,
      kwh,
      bill: round2(kwh * s.rate),
      alone: round2(alone.get(person) ?? 0),
      shared: round2(shared.get(person) ?? 0),
      withPeople: [...(withPeople.get(person) ?? [])],
    };
  });

  // The meter's current reading is the most recent reading anyone logged.
  const current = events.length ? events[events.length - 1].reading : s.previous_reading;

  const total = round2(current - s.previous_reading);
  const assigned = [...raw.values()].reduce((sum, n) => sum + n, 0);
  const unlogged = round2(total - assigned);

  return {
    perPerson,
    timedIn,
    shareByEntry,
    sharedWith,
    segments,
    inconsistent,
    current,
    total,
    totalBill: round2(total * s.rate),
    logged: round2(assigned),
    unlogged,
    unloggedBill: round2(Math.max(unlogged, 0) * s.rate),
  };
}

// What your share would be if you timed out at this time and reading (used for the live preview).
export function previewShare(entries: Entry[], s: Settings, entryId: string, timeOut: string, readingOut: number) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(timeOut) || !Number.isFinite(readingOut)) return null;
  const hypothetical = entries.map((e) =>
    e.id === entryId ? { ...e, end_at: `${timeOut}:00`, end_reading: readingOut } : e
  );
  const r = summarize(hypothetical, s);
  return {
    share: r.shareByEntry[entryId] ?? 0,
    sharedWith: r.sharedWith[entryId] ?? [],
    inconsistent: r.inconsistent,
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

// "Hannah", "Hannah and Shane", "Hannah, Shane and Kris"
export const joinNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
