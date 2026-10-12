"use client";

import { useEffect, useState } from "react";
import { fmtDateTime, fmtKwh, fmtPhp, joinNames, previewShare, round2 } from "@/lib/calc";
import type { Actions } from "@/lib/store";
import { nowInput } from "@/lib/time";
import type { Entry, Settings } from "@/lib/types";
import DateTimeFields from "./DateTimeFields";
import { ErrorText, Field, Heading, Hint, primaryButton } from "./ui";

function ReadingField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Meter reading" htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="0.00"
          className="pr-14 tabular-nums"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-mute">kWh</span>
      </div>
    </Field>
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
    <section>
      <Heading>Time in</Heading>
      <Hint className="mt-1">You're not timed in. Enter when you got in and the reading on the meter.</Hint>

      <form onSubmit={submit} className="mt-4 grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <DateTimeFields idPrefix="time_in" value={time} onChange={setTime} />
        </div>
        <div className="grid gap-1.5">
          <ReadingField id="reading_in" value={reading} onChange={setReading} />
          <Hint className="text-sm">Last reading logged: {fmtKwh(lastReading)} kWh</Hint>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Saving…" : "Save time in"}
        </button>
      </form>
    </section>
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
    <div className="grid gap-7">
      <section className="rounded-lg bg-soft px-5 py-4">
        <p className="text-[15px] text-mute">You're timed in</p>
        <p className="mt-0.5 text-xl font-bold">Since {fmtDateTime(entry.start_at)}</p>
        <p className="mt-0.5 text-[15px] tabular-nums text-mute">Meter reading {fmtKwh(entry.start_reading)} kWh</p>
      </section>

      <section>
        <Heading>Time out</Heading>
        <Hint className="mt-1">Enter when you left and the reading on the meter.</Hint>

        <form onSubmit={submit} className="mt-4 grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <DateTimeFields idPrefix="time_out" value={time} onChange={setTime} />
          </div>
          <ReadingField id="reading_out" value={reading} onChange={setReading} />

          <div aria-live="polite">
            {meterMoved === null ? (
              <Hint>Enter the reading to see your usage and bill.</Hint>
            ) : meterMoved < 0 ? (
              <ErrorText>That's lower than your reading when you came in.</ErrorText>
            ) : preview ? (
              <div className="rounded-lg bg-soft p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[15px] text-mute">Your usage</p>
                    <p className="text-[22px] font-bold tabular-nums">{fmtKwh(preview.share)} kWh</p>
                  </div>
                  <div>
                    <p className="text-[15px] text-mute">Your bill</p>
                    <p className="text-[22px] font-bold tabular-nums">{fmtPhp(round2(preview.share * settings.rate))}</p>
                  </div>
                </div>
                {preview.sharedWith.length > 0 && (
                  <Hint className="mt-3">
                    Shared with {joinNames(preview.sharedWith)} for the time you were in the room together.
                  </Hint>
                )}
                {preview.inconsistent && (
                  <p className="mt-3 text-[15px] font-medium text-danger">
                    This reading doesn't line up with another reading at that time. Double-check the numbers.
                  </p>
                )}
              </div>
            ) : (
              <Hint>Enter the time and reading to see your usage and bill.</Hint>
            )}
          </div>

          {error && <ErrorText>{error}</ErrorText>}
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending ? "Saving…" : "Save time out"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            if (confirm("Cancel this time in? It will be removed.")) actions.cancelTimeIn(entry.id);
          }}
          className="mx-auto mt-4 block px-3 py-2 text-base text-danger underline underline-offset-2"
        >
          Cancel this time in
        </button>
      </section>
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
