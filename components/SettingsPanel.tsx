"use client";

import { useState } from "react";
import { fmtDate, fmtKwh, fmtRate, isClosed, joinNames } from "@/lib/calc";
import type { Actions } from "@/lib/store";
import type { Entry, Settings } from "@/lib/types";
import { ErrorText, Field, Heading, Hint, outlineButton, primaryButton } from "./ui";

// Same day next month (for example Nov 4 becomes Dec 4).
function addMonth(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

function Locked({ actions }: { actions: Actions }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const err = await actions.unlockSettings(password);
    setPending(false);
    if (err) {
      setError(err);
      setPassword("");
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-4">
      <Hint>Enter the admin password to change the rate or the billing dates.</Hint>
      <Field label="Admin password" htmlFor="admin-password">
        <div className="relative">
          <input
            id="admin-password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            className="pr-20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-3 text-[15px] underline underline-offset-2"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Unlocking…" : "Unlock"}
      </button>
    </form>
  );
}

function BillingFields({
  start,
  setStart,
  end,
  setEnd,
  rate,
  setRate,
  reading,
  setReading,
  idPrefix,
  startLabel,
  readingHint,
}: {
  start: string;
  setStart: (v: string) => void;
  end: string;
  setEnd: (v: string) => void;
  rate: string;
  setRate: (v: string) => void;
  reading: string;
  setReading: (v: string) => void;
  idPrefix: string;
  startLabel: string;
  readingHint: string;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label={startLabel} htmlFor={`${idPrefix}-start`}>
          <input id={`${idPrefix}-start`} type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
        </Field>
        <Field label="Expected bill date" htmlFor={`${idPrefix}-end`}>
          <input id={`${idPrefix}-end`} type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </Field>
      </div>

      <Field label="Rate" htmlFor={`${idPrefix}-rate`}>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-mute">₱</span>
          <input
            id={`${idPrefix}-rate`}
            type="number"
            step="0.0001"
            min="0"
            inputMode="decimal"
            className="pl-8 pr-24 tabular-nums"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-mute">per kWh</span>
        </div>
      </Field>

      <div className="grid gap-1.5">
        <Field label="Meter reading at the start" htmlFor={`${idPrefix}-reading`}>
          <div className="relative">
            <input
              id={`${idPrefix}-reading`}
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              className="pr-14 tabular-nums"
              value={reading}
              onChange={(e) => setReading(e.target.value)}
              required
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-mute">kWh</span>
          </div>
        </Field>
        <Hint className="text-sm">{readingHint}</Hint>
      </div>
    </>
  );
}

function CurrentCycle({ settings, actions }: { settings: Settings; actions: Actions }) {
  const [start, setStart] = useState(settings.cycle_start);
  const [end, setEnd] = useState(settings.cycle_end);
  const [rate, setRate] = useState(String(settings.rate));
  const [reading, setReading] = useState(String(settings.previous_reading));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    setSaved(false);
    const err = await actions.saveBilling({
      cycleStart: start,
      cycleEnd: end,
      rate: rate === "" ? NaN : Number(rate),
      previousReading: reading === "" ? NaN : Number(reading),
    });
    setPending(false);
    if (err) setError(err);
    else setSaved(true);
  }

  return (
    <section>
      <Heading>Current billing cycle</Heading>
      <Hint className="mt-1">
        Use this to fix a date, or when the provider changes the rate. A new rate applies to the whole cycle, so every
        bill updates.
      </Hint>

      <form onSubmit={submit} className="mt-4 grid gap-4">
        <BillingFields
          idPrefix="cur"
          startLabel="Start date"
          start={start}
          setStart={setStart}
          end={end}
          setEnd={setEnd}
          rate={rate}
          setRate={setRate}
          reading={reading}
          setReading={setReading}
          readingHint="The meter reading when this cycle started."
        />
        {error && <ErrorText>{error}</ErrorText>}
        {saved && (
          <p role="status" className="text-[15px] font-semibold">
            Saved. The screens now use these numbers.
          </p>
        )}
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </section>
  );
}

function NewCycle({
  settings,
  entries,
  currentReading,
  actions,
}: {
  settings: Settings;
  entries: Entry[];
  currentReading: number;
  actions: Actions;
}) {
  const [start, setStart] = useState(settings.cycle_end);
  const [end, setEnd] = useState(addMonth(settings.cycle_end));
  const [rate, setRate] = useState(String(settings.rate));
  const [reading, setReading] = useState(String(currentReading));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const stillIn = entries.filter((e) => !isClosed(e)).map((e) => e.person);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !confirm(
        `Start a new billing cycle from ${fmtDate(start)}? The current cycle's entries stay saved but will leave the screens.`
      )
    ) {
      return;
    }
    setPending(true);
    setError("");
    const err = await actions.saveBilling({
      cycleStart: start,
      cycleEnd: end,
      rate: rate === "" ? NaN : Number(rate),
      previousReading: reading === "" ? NaN : Number(reading),
    });
    setPending(false);
    if (err) setError(err);
  }

  return (
    <section>
      <Heading>Start a new billing cycle</Heading>
      <Hint className="mt-1">
        Do this when a new bill period begins. Take a meter reading that day and enter it below. The old cycle's entries
        stay saved but leave the screens.
      </Hint>

      <form onSubmit={submit} className="mt-4 grid gap-4">
        <BillingFields
          idPrefix="new"
          startLabel="New start date"
          start={start}
          setStart={setStart}
          end={end}
          setEnd={setEnd}
          rate={rate}
          setRate={setRate}
          reading={reading}
          setReading={setReading}
          readingHint={`Filled in with the last reading logged (${fmtKwh(currentReading)} kWh). Change it if the meter shows something else.`}
        />

        {stillIn.length > 0 && (
          <ErrorText>
            {joinNames(stillIn)} {stillIn.length === 1 ? "is" : "are"} still timed in. Ask them to time out first, then start the
            new cycle.
          </ErrorText>
        )}
        {error && <ErrorText>{error}</ErrorText>}
        <button type="submit" disabled={pending || stillIn.length > 0} className={outlineButton + " disabled:opacity-40"}>
          {pending ? "Starting…" : "Start new cycle"}
        </button>
      </form>
    </section>
  );
}

export default function SettingsPanel({
  settings,
  entries,
  currentReading,
  admin,
  actions,
  onBack,
}: {
  settings: Settings;
  entries: Entry[];
  currentReading: number;
  admin: boolean;
  actions: Actions;
  onBack: () => void;
}) {
  // The key makes the forms start fresh with the new numbers after you save.
  const version = `${settings.cycle_start}|${settings.cycle_end}|${settings.rate}|${settings.previous_reading}`;

  return (
    <div className="grid gap-8">
      <div>
        <button type="button" onClick={onBack} className="py-2 text-[15px] underline underline-offset-2">
          Back
        </button>
        <div className="mt-2">
          <Heading>Billing settings</Heading>
          <Hint className="mt-1">
            Now: {fmtDate(settings.cycle_start)} to {fmtDate(settings.cycle_end)}, {fmtRate(settings.rate)} per kWh.
          </Hint>
        </div>

        {!admin && <Locked actions={actions} />}
      </div>

      {admin && (
        <>
          <CurrentCycle key={`cur-${version}`} settings={settings} actions={actions} />
          <NewCycle
            key={`new-${version}`}
            settings={settings}
            entries={entries}
            currentReading={currentReading}
            actions={actions}
          />
          <button
            type="button"
            onClick={() => actions.lockSettings()}
            className="mx-auto block px-3 py-2 text-base underline underline-offset-2"
          >
            Lock settings
          </button>
        </>
      )}
    </div>
  );
}
