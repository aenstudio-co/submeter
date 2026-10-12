"use client";

import { useMemo, useState } from "react";
import { fmtDate, fmtDateTime, fmtKwh, fmtPhp, isClosed, joinNames, round2 } from "@/lib/calc";
import { nowInput } from "@/lib/time";
import type { Entry, Person, Settings } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "./icons";
import { Heading, Hint } from "./ui";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");
const toDate = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let t = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let i = 0; t <= end && i < 62; i++, t += DAY_MS) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

// "2026-10-10T09:00:00" -> "9:00 AM"
function clock(s: string) {
  const [hh, mm] = s.slice(11, 16).split(":").map(Number);
  return `${hh % 12 || 12}:${pad(mm)} ${hh < 12 ? "AM" : "PM"}`;
}

function longDay(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return `${weekday}, ${MONTHS[m - 1]} ${d}`;
}

function describe(e: Entry, day: string) {
  const startDay = e.start_at.slice(0, 10);
  if (!e.end_at) {
    return startDay === day ? `Since ${clock(e.start_at)}` : `Timed in since ${fmtDateTime(e.start_at)}`;
  }
  const endDay = e.end_at.slice(0, 10);
  const from = startDay === day ? clock(e.start_at) : fmtDateTime(e.start_at);
  const to = endDay === day ? clock(e.end_at) : fmtDateTime(e.end_at);
  return `${from} to ${to}`;
}

export default function Calendar({
  entries,
  settings,
  shares,
  sharedWith,
}: {
  entries: Entry[];
  settings: Settings;
  shares: Record<string, number>;
  sharedWith: Record<string, Person[]>;
}) {
  // This only renders after the page has loaded in the browser, so reading the clock here is safe.
  const today = useMemo(() => nowInput().slice(0, 10), []);
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)) - 1);
  const [selected, setSelected] = useState(today);

  // Which entries touch which day (an entry that runs past midnight shows on both days).
  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const first = e.start_at.slice(0, 10);
      const last = e.end_at ? e.end_at.slice(0, 10) : today > first ? today : first;
      for (const d of daysBetween(first, last)) {
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(e);
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.start_at.localeCompare(b.start_at));
    return map;
  }, [entries, today]);

  function move(delta: number) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
  }

  function goToday() {
    setYear(Number(today.slice(0, 4)));
    setMonth(Number(today.slice(5, 7)) - 1);
    setSelected(today);
  }

  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDate(year, month, i + 1)),
  ];

  const dayEntries = byDay.get(selected) ?? [];
  const navButton = "grid size-11 place-items-center rounded-lg border border-line bg-surface active:bg-soft";

  return (
    <div className="grid gap-8">
      <section aria-label="Calendar">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => move(-1)} aria-label="Previous month" className={navButton}>
            <ChevronLeft />
          </button>
          <h2 className="text-[22px] font-bold leading-tight">
            {MONTHS[month]} {year}
          </h2>
          <button type="button" onClick={() => move(1)} aria-label="Next month" className={navButton}>
            <ChevronRight />
          </button>
        </div>

        <div aria-hidden="true" className="mt-4 grid grid-cols-7 text-center text-sm font-semibold text-mute">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="mt-1.5 grid grid-cols-7 gap-y-0.5">
          {cells.map((date, i) => {
            if (!date) return <div key={`blank-${i}`} />;

            const list = byDay.get(date) ?? [];
            const hasEntries = list.length > 0;
            const isSelected = date === selected;
            const isToday = date === today;
            const isDue = date === settings.cycle_end;
            const inCycle = date >= settings.cycle_start && date < settings.cycle_end;

            let style = "text-edge";
            if (isSelected) style = "bg-ink font-bold text-surface";
            else if (isDue) style = "font-bold text-danger ring-2 ring-danger";
            else if (isToday) style = "font-bold ring-2 ring-ink";
            else if (inCycle) style = "font-medium text-ink";

            return (
              <div key={date} className="flex h-[54px] flex-col items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setSelected(date)}
                  aria-pressed={isSelected}
                  aria-label={`${longDay(date)}${hasEntries ? ", has entries" : ""}${isDue ? ", expected bill payment" : ""}`}
                  className={`size-11 rounded-full text-[17px] tabular-nums ${style}`}
                >
                  {Number(date.slice(8))}
                </button>
                {hasEntries && <span aria-hidden="true" className="size-1.5 rounded-full bg-ink" />}
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex justify-start">
          <button type="button" onClick={goToday} className="py-2 text-[15px] underline underline-offset-2">
            Go to Today
          </button>
        </div>

        <Hint className="mt-2 text-sm">
          A dot means someone logged time that day. Days outside the billing cycle are dimmed. The outlined circle is
          today, and the red ring is the expected bill payment day.
        </Hint>
        <Hint className="mt-2 text-sm">
          Expected bill payment: <strong className="text-ink">{fmtDate(settings.cycle_end)}</strong>
        </Hint>
      </section>

      <section>
        <Heading>{longDay(selected)}</Heading>

        {selected === settings.cycle_end && (
          <p className="mt-3 rounded-lg border border-danger px-4 py-3 text-[15px] font-semibold text-danger">
            Expected bill payment day.
          </p>
        )}

        {dayEntries.length === 0 ? (
          <p className="mt-4 rounded-lg border border-line p-4 text-mute">No entries on this day.</p>
        ) : (
          <ul className="mt-4 grid gap-2.5">
            {dayEntries.map((e) => {
              const share = shares[e.id] ?? 0;
              const others = sharedWith[e.id] ?? [];
              return (
                <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg border border-line p-3.5">
                  <div className="min-w-0">
                    <p className="font-bold">{e.person}</p>
                    <p className="mt-0.5 text-[15px] text-mute">{describe(e, selected)}</p>
                    {others.length > 0 && <p className="text-[15px] text-mute">Shared with {joinNames(others)}</p>}
                  </div>
                  <div className="shrink-0 whitespace-nowrap text-right">
                    {isClosed(e) ? (
                      <>
                        <p className="font-bold tabular-nums">{fmtKwh(share)} kWh</p>
                        <p className="mt-0.5 text-[15px] tabular-nums text-mute">{fmtPhp(round2(share * settings.rate))}</p>
                      </>
                    ) : (
                      <p className="font-bold">In progress</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
