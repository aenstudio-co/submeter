"use client";

import { useEffect, useState } from "react";
import { fmtDateTime, fmtKwh, fmtPhp, joinNames, previewShare, round2 } from "@/lib/calc";
import type { Actions } from "@/lib/store";
import { nowInput } from "@/lib/time";
import type { Entry, Settings } from "@/lib/types";

function TimeField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1 text-sm font-medium">
      <div className="flex items-center justify-between">
        <label htmlFor={id}>Time</label>
        <button type="button" onClick={() => onChange(nowInput())} className="font-normal underline underline-offset-4">
          Use current time
        </button>
      </div>
      <input id={id} type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}

function ReadingField({
  id,
  value,
  onChange,
  hint,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="grid gap-1 text-sm font-medium">
      <label htmlFor={id}>Meter reading (kWh)</label>
      <input
        id={id}
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      {hint && <span className="font-normal text-mute">{hint}</span>}
    </div>
  );
}

function NotTimedIn({ lastReading, actions }: { lastReading: number; actions: Actions }) {
  const [time, setTime] = useState("");
  const [reading, setReading] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setTime(nowInput());
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const err = await actions.timeIn(time, reading === "" ? NaN : Number(reading));
    setPending(false);
    if (err) setError(err);
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Time in</h2>
      <p className="mt-1 text-mute">You're not timed in. Enter the time you got in and the reading on the meter.</p>

      <form onSubmit={submit} className="mt-4 grid gap-5 rounded-lg border border-line bg-surface p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <TimeField id="time_in" value={time} onChange={setTime} />
          <ReadingField
            id="reading_in"
            value={reading}
            onChange={setReading}
            hint={`Last reading logged: ${fmtKwh(lastReading)}`}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-signal">
            {error}
          </p>
        )}
        <div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-panel px-5 py-2.5 font-medium text-white transition-colors hover:bg-ink disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save time in"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TimedIn({
  entry,
  entries,
  settings,
  actions,
}: {
  entry: Entry;
  entries: Entry[];
  settings: Settings;
  actions: Actions;
}) {
  const [time, setTime] = useState("");
  const [reading, setReading] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setTime(nowInput());
  }, []);

  // Your share, worked out the same way as the totals (time shared with others is split equally).
  const meterMoved = reading !== "" ? round2(Number(reading) - entry.start_reading) : null;
  const preview = reading !== "" ? previewShare(entries, settings, entry.id, time, Number(reading)) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const err = await actions.timeOut(entry.id, time, reading === "" ? NaN : Number(reading));
    setPending(false);
    if (err) setError(err);
  }

  return (
    <div>
      <div className="rounded-lg border border-line bg-surface p-5">
        <p className="text-sm text-mute">You're timed in</p>
        <p className="mt-1 text-lg font-semibold">{fmtDateTime(entry.start_at)}</p>
        <p className="font-mono text-mute">Meter reading {fmtKwh(entry.start_reading)}</p>
      </div>

      <h2 className="mt-8 text-xl font-semibold">Time out</h2>
      <p className="mt-1 text-mute">Enter the time you left and the reading on the meter.</p>

      <form onSubmit={submit} className="mt-4 grid gap-5 rounded-lg border border-line bg-surface p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <TimeField id="time_out" value={time} onChange={setTime} />
          <ReadingField id="reading_out" value={reading} onChange={setReading} />
        </div>

        <div className="rounded-md bg-paper p-4" aria-live="polite">
          {meterMoved === null ? (
            <p className="text-mute">Enter the reading to see your usage and bill.</p>
          ) : meterMoved < 0 ? (
            <p className="font-medium text-signal">That's lower than your reading when you came in.</p>
          ) : preview ? (
            <div>
              <div className="flex flex-wrap items-baseline gap-x-8 gap-y-1">
                <p>
                  <span className="text-sm text-mute">Your usage </span>
                  <span className="font-mono text-2xl font-medium">{fmtKwh(preview.share)} kWh</span>
                </p>
                <p>
                  <span className="text-sm text-mute">Your bill </span>
                  <span className="font-mono text-2xl font-medium">{fmtPhp(round2(preview.share * settings.rate))}</span>
                </p>
              </div>
              {preview.sharedWith.length > 0 && (
                <p className="mt-2 text-sm text-mute">
                  Shared with {joinNames(preview.sharedWith)} for the time you were in the room together.
                </p>
              )}
              {preview.inconsistent && (
                <p className="mt-2 text-sm font-medium text-signal">
                  This reading doesn't line up with another reading at that time. Double-check the numbers.
                </p>
              )}
            </div>
          ) : (
            <p className="text-mute">Enter the time and reading to see your usage and bill.</p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-signal">
            {error}
          </p>
        )}
        <div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-panel px-5 py-2.5 font-medium text-white transition-colors hover:bg-ink disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save time out"}
          </button>
        </div>
      </form>

      <button
        type="button"
        onClick={() => {
          if (confirm("Cancel this time in? It will be removed.")) actions.cancelTimeIn(entry.id);
        }}
        className="mt-4 text-sm font-medium text-signal underline underline-offset-4"
      >
        Cancel this time in
      </button>
    </div>
  );
}

export default function SessionTab({
  open,
  lastReading,
  entries,
  settings,
  actions,
}: {
  open: Entry | undefined;
  lastReading: number;
  entries: Entry[];
  settings: Settings;
  actions: Actions;
}) {
  // key makes the form start fresh whenever you switch between timed in and timed out
  return open ? (
    <TimedIn key={open.id} entry={open} entries={entries} settings={settings} actions={actions} />
  ) : (
    <NotTimedIn key="not-timed-in" lastReading={lastReading} actions={actions} />
  );
}
