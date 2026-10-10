"use client";

import { useEffect, useMemo, useState } from "react";
import {
  entryKwh,
  fmtDate,
  fmtDateTime,
  fmtKwh,
  fmtPhp,
  fmtRate,
  round2,
  summarize,
  toInputValue,
} from "@/lib/calc";
import { nowInput } from "@/lib/time";
import { PEOPLE, type Entry, type Person, type Settings } from "@/lib/types";
import LiveClock, { DaysLeft } from "./LiveClock";

const STORAGE_KEY = "submeter-person";
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const rowCols = "sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_5.5rem_5rem_6rem]";

// Meter drums: black for whole kWh, red for the decimals.
function Odometer({ value }: { value: number }) {
  const [whole, decimals] = value.toFixed(2).split(".");
  const cell =
    "grid h-14 w-9 place-items-center rounded-sm font-mono text-3xl font-medium text-white sm:h-[4.5rem] sm:w-12 sm:text-5xl";
  return (
    <div role="img" aria-label={`Meter reading ${fmtKwh(value)} kilowatt-hours`} className="flex items-center gap-1">
      {whole
        .padStart(5, "0")
        .split("")
        .map((d, i) => (
          <span key={`w${i}`} aria-hidden="true" className={`${cell} bg-drum`}>
            {d}
          </span>
        ))}
      <span aria-hidden="true" className="px-0.5 font-mono text-3xl text-white/60 sm:text-5xl">
        .
      </span>
      {decimals.split("").map((d, i) => (
        <span key={`d${i}`} aria-hidden="true" className={`${cell} bg-signal`}>
          {d}
        </span>
      ))}
    </div>
  );
}

export default function MeterApp({
  settings,
  initialEntries,
}: {
  settings: Settings;
  initialEntries: Entry[];
}) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const sum = useMemo(() => summarize(entries, settings), [entries, settings]);
  const sorted = useMemo(() => [...entries].sort((a, b) => b.start_at.localeCompare(a.start_at)), [entries]);

  const [person, setPerson] = useState<Person | "">("");
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [readingIn, setReadingIn] = useState("");
  const [readingOut, setReadingOut] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Once the page loads in the browser: fill in the current time, the last reading, and your saved name.
  useEffect(() => {
    const now = nowInput();
    setTimeIn(now);
    setTimeOut(now);
    setReadingIn(String(sum.current));
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (PEOPLE as readonly string[]).includes(saved)) setPerson(saved as Person);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choosePerson(p: Person | "") {
    setPerson(p);
    try {
      if (p) localStorage.setItem(STORAGE_KEY, p);
    } catch {}
  }

  function resetForm(current: number) {
    const now = nowInput();
    setTimeIn(now);
    setTimeOut(now);
    setReadingIn(String(current));
    setReadingOut("");
    setNote("");
    setEditingId(null);
    setError("");
  }

  // Live preview while typing
  const used = readingIn !== "" && readingOut !== "" ? round2(Number(readingOut) - Number(readingIn)) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const rIn = Number(readingIn);
    const rOut = Number(readingOut);

    if (!person) return setError("Choose your name.");
    if (!timeIn || !timeOut) return setError("Enter both times.");
    if (timeOut < timeIn) return setError("Time out must be after time in.");
    if (readingIn === "" || readingOut === "" || !Number.isFinite(rIn) || !Number.isFinite(rOut))
      return setError("Enter both meter readings.");
    if (rOut < rIn) return setError("The reading when you left can't be lower than when you came in.");

    const next: Entry = {
      id: editingId ?? makeId(),
      person,
      start_at: `${timeIn}:00`,
      end_at: `${timeOut}:00`,
      start_reading: rIn,
      end_reading: rOut,
      note: note.trim() || null,
    };
    const nextEntries = editingId ? entries.map((x) => (x.id === editingId ? next : x)) : [...entries, next];
    setEntries(nextEntries);
    resetForm(summarize(nextEntries, settings).current);
  }

  function startEdit(entry: Entry) {
    setPerson(entry.person);
    setTimeIn(toInputValue(entry.start_at));
    setTimeOut(toInputValue(entry.end_at));
    setReadingIn(String(entry.start_reading));
    setReadingOut(String(entry.end_reading));
    setNote(entry.note ?? "");
    setEditingId(entry.id);
    setError("");
    document.getElementById("log-form")?.scrollIntoView({ behavior: "smooth" });
  }

  function remove(entry: Entry) {
    if (!confirm(`Delete ${entry.person}'s entry?`)) return;
    const nextEntries = entries.filter((x) => x.id !== entry.id);
    setEntries(nextEntries);
    if (editingId === entry.id) resetForm(summarize(nextEntries, settings).current);
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Room sub meter</h1>
          <p className="mt-1 text-mute">
            Billing cycle {fmtDate(settings.cycle_start)} to {fmtDate(settings.cycle_end)}. Rate{" "}
            {fmtRate(settings.rate)} per kWh.
          </p>
        </div>
        <LiveClock />
      </header>

      {/* Meter */}
      <section aria-labelledby="meter" className="mt-8 rounded-lg bg-panel p-5 text-white sm:p-7">
        <h2 id="meter" className="text-sm text-white/70">
          Current meter reading
        </h2>
        <div className="mt-3">
          <Odometer value={sum.current} />
        </div>
        <dl className="mt-7 grid gap-5 border-t border-white/15 pt-5 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-white/70">Previous reading</dt>
            <dd className="mt-1 font-mono text-lg">{fmtKwh(settings.previous_reading)}</dd>
          </div>
          <div>
            <dt className="text-sm text-white/70">Used this cycle</dt>
            <dd className="mt-1 font-mono text-lg">{fmtKwh(sum.total)} kWh</dd>
          </div>
          <div>
            <dt className="text-sm text-white/70">Current bill</dt>
            <dd className="mt-1 font-mono text-3xl font-medium leading-none">{fmtPhp(sum.totalBill)}</dd>
          </div>
        </dl>
        <p className="mt-5 border-t border-white/15 pt-4">
          Expected bill payment: <span className="font-semibold">{fmtDate(settings.cycle_end)}</span>{" "}
          <DaysLeft dueDate={settings.cycle_end} />
        </p>
      </section>

      {/* Who used what */}
      <section aria-labelledby="split" className="mt-12">
        <h2 id="split" className="text-xl font-semibold">
          Who used what
        </h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line text-sm text-mute">
                <th className="px-4 py-2 text-left font-medium">Person</th>
                <th className="px-4 py-2 text-right font-medium">Usage</th>
                <th className="px-4 py-2 text-right font-medium">Bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sum.perPerson.map((p) => (
                <tr key={p.person}>
                  <td className="px-4 py-3 font-medium">{p.person}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtKwh(p.kwh)} kWh</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtPhp(p.bill)}</td>
                </tr>
              ))}
              {sum.unlogged > 0.005 && (
                <tr className="text-mute">
                  <td className="px-4 py-3">Not logged</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtKwh(sum.unlogged)} kWh</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtPhp(sum.unloggedBill)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right font-mono">{fmtKwh(sum.total)} kWh</td>
                <td className="px-4 py-3 text-right font-mono">{fmtPhp(sum.totalBill)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {sum.unlogged < -0.005 && (
          <p role="alert" className="mt-3 text-sm font-medium text-signal">
            Logged entries add up to {fmtKwh(Math.abs(sum.unlogged))} kWh more than the meter moved. Check for
            overlapping entries or a wrong reading.
          </p>
        )}
      </section>

      {/* Form */}
      <section aria-labelledby="add" id="log-form" className="mt-12 scroll-mt-6">
        <h2 id="add" className="text-xl font-semibold">
          {editingId ? "Edit entry" : "Log your stay"}
        </h2>
        <p className="mt-1 text-mute">Enter the time and the meter reading. The usage and bill are worked out for you.</p>

        <form onSubmit={submit} className="mt-4 grid gap-5 rounded-lg border border-line bg-surface p-5 sm:p-6">
          <div className="grid gap-1 text-sm font-medium sm:max-w-xs">
            <label htmlFor="person">Who are you?</label>
            <select id="person" value={person} onChange={(e) => choosePerson(e.target.value as Person | "")}>
              <option value="" disabled>
                Choose your name
              </option>
              {PEOPLE.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <fieldset className="grid gap-4 rounded-md border border-line p-4">
              <legend className="px-1 text-sm font-semibold">When you came in</legend>
              <div className="grid gap-1 text-sm font-medium">
                <div className="flex items-center justify-between">
                  <label htmlFor="timeIn">Time in</label>
                  <button type="button" onClick={() => setTimeIn(nowInput())} className="font-normal underline underline-offset-4">
                    Use current time
                  </button>
                </div>
                <input id="timeIn" type="datetime-local" value={timeIn} onChange={(e) => setTimeIn(e.target.value)} required />
              </div>
              <div className="grid gap-1 text-sm font-medium">
                <label htmlFor="readingIn">Meter reading (kWh)</label>
                <input
                  id="readingIn"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={readingIn}
                  onChange={(e) => setReadingIn(e.target.value)}
                  required
                />
              </div>
            </fieldset>

            <fieldset className="grid gap-4 rounded-md border border-line p-4">
              <legend className="px-1 text-sm font-semibold">When you left</legend>
              <div className="grid gap-1 text-sm font-medium">
                <div className="flex items-center justify-between">
                  <label htmlFor="timeOut">Time out</label>
                  <button type="button" onClick={() => setTimeOut(nowInput())} className="font-normal underline underline-offset-4">
                    Use current time
                  </button>
                </div>
                <input id="timeOut" type="datetime-local" value={timeOut} onChange={(e) => setTimeOut(e.target.value)} required />
              </div>
              <div className="grid gap-1 text-sm font-medium">
                <label htmlFor="readingOut">Meter reading (kWh)</label>
                <input
                  id="readingOut"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={readingOut}
                  onChange={(e) => setReadingOut(e.target.value)}
                  required
                />
              </div>
            </fieldset>
          </div>

          <div className="grid gap-1 text-sm font-medium">
            <label htmlFor="note">Note (optional)</label>
            <input id="note" type="text" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {/* Live result */}
          <div className="rounded-md bg-paper p-4" aria-live="polite">
            {used === null ? (
              <p className="text-mute">Enter both readings to see your usage and bill.</p>
            ) : used < 0 ? (
              <p className="font-medium text-signal">The reading when you left is lower than when you came in.</p>
            ) : (
              <div className="flex flex-wrap items-baseline gap-x-8 gap-y-1">
                <p>
                  <span className="text-sm text-mute">Your usage </span>
                  <span className="font-mono text-2xl font-medium">{fmtKwh(used)} kWh</span>
                </p>
                <p>
                  <span className="text-sm text-mute">Your bill </span>
                  <span className="font-mono text-2xl font-medium">{fmtPhp(round2(used * settings.rate))}</span>
                </p>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-signal">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button type="submit" className="rounded-md bg-panel px-5 py-2.5 font-medium text-white transition-colors hover:bg-ink">
              {editingId ? "Save changes" : "Save entry"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => resetForm(sum.current)}
                className="rounded-md border border-line px-5 py-2.5 font-medium hover:bg-white"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Entries */}
      <section aria-labelledby="log" className="mt-12">
        <h2 id="log" className="text-xl font-semibold">
          Entries this cycle
        </h2>
        {sorted.length === 0 ? (
          <p className="mt-3 text-mute">No entries yet. Add the first one above.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-line bg-surface">
            <div className={`hidden gap-x-4 border-b border-line px-4 py-2 text-sm text-mute sm:grid ${rowCols}`}>
              <span>Person</span>
              <span>Readings</span>
              <span className="text-right">Usage</span>
              <span className="text-right">Bill</span>
              <span />
            </div>
            <ul className="divide-y divide-line">
              {sorted.map((e) => {
                const kwh = entryKwh(e);
                return (
                  <li key={e.id} className={`grid gap-x-4 gap-y-1 px-4 py-3 sm:items-center ${rowCols}`}>
                    <div>
                      <p className="font-medium">{e.person}</p>
                      <p className="text-sm text-mute">
                        {fmtDateTime(e.start_at)} to {fmtDateTime(e.end_at)}
                      </p>
                      {e.note && <p className="text-sm text-mute">{e.note}</p>}
                    </div>
                    <p className="font-mono text-sm text-mute">
                      {fmtKwh(e.start_reading)} to {fmtKwh(e.end_reading)}
                    </p>
                    <div className="flex items-baseline justify-between gap-4 sm:contents">
                      <span className="font-mono sm:text-right">{fmtKwh(kwh)} kWh</span>
                      <span className="font-mono sm:text-right">{fmtPhp(round2(kwh * settings.rate))}</span>
                    </div>
                    <div className="flex gap-4 pt-1 text-sm sm:justify-end sm:pt-0">
                      <button type="button" onClick={() => startEdit(e)} className="font-medium underline underline-offset-4">
                        Edit
                      </button>
                      <button type="button" onClick={() => remove(e)} className="font-medium text-signal underline underline-offset-4">
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}