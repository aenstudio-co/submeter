"use client";

import { useState } from "react";
import { entryKwh, fmtDateTime, fmtKwh, fmtPhp, isClosed, joinNames, round2, toInputValue } from "@/lib/calc";
import type { Actions } from "@/lib/store";
import type { ClosedEntry, Entry, Person } from "@/lib/types";
import DateTimeFields from "./DateTimeFields";
import { ErrorText, Field, Heading, Hint, outlineButton, primaryButton } from "./ui";

function ReadingInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Meter reading" htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
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

function EditForm({ entry, actions, onDone }: { entry: ClosedEntry; actions: Actions; onDone: () => void }) {
  const [timeIn, setTimeIn] = useState(toInputValue(entry.start_at));
  const [readingIn, setReadingIn] = useState(String(entry.start_reading));
  const [timeOut, setTimeOut] = useState(toInputValue(entry.end_at));
  const [readingOut, setReadingOut] = useState(String(entry.end_reading));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const err = await actions.updateEntry(entry.id, {
      timeIn,
      readingIn: readingIn === "" ? NaN : Number(readingIn),
      timeOut,
      readingOut: readingOut === "" ? NaN : Number(readingOut),
    });
    setPending(false);
    if (err) setError(err);
    else onDone();
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-3">
        <p className="text-lg font-bold">Time in</p>
        <div className="grid grid-cols-2 gap-3">
          <DateTimeFields idPrefix={`ti-${entry.id}`} value={timeIn} onChange={setTimeIn} />
        </div>
        <ReadingInput id={`ri-${entry.id}`} value={readingIn} onChange={setReadingIn} />
      </div>
      <div className="grid gap-3">
        <p className="text-lg font-bold">Time out</p>
        <div className="grid grid-cols-2 gap-3">
          <DateTimeFields idPrefix={`to-${entry.id}`} value={timeOut} onChange={setTimeOut} />
        </div>
        <ReadingInput id={`ro-${entry.id}`} value={readingOut} onChange={setReadingOut} />
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onDone} className={outlineButton}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function Item({
  entry,
  mine,
  rate,
  share,
  sharedWith,
  actions,
}: {
  entry: Entry;
  mine: boolean;
  rate: number;
  share: number;
  sharedWith: Person[];
  actions: Actions;
}) {
  const [editing, setEditing] = useState(false);

  if (isClosed(entry) && editing) {
    return (
      <li className="rounded-lg border border-line p-4">
        <EditForm entry={entry} actions={actions} onDone={() => setEditing(false)} />
      </li>
    );
  }

  const done = isClosed(entry);
  const kwh = done ? share : null;

  return (
    <li className="rounded-lg border border-line p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{entry.person}</p>
          <p className="mt-0.5 text-[15px] text-mute">
            {fmtDateTime(entry.start_at)}
            {entry.end_at ? ` to ${fmtDateTime(entry.end_at)}` : " (still timed in)"}
          </p>
          <p className="text-[15px] tabular-nums text-mute">
            Meter {fmtKwh(entry.start_reading)}
            {entry.end_reading !== null ? ` to ${fmtKwh(entry.end_reading)}` : ""}
          </p>
          {sharedWith.length > 0 && <p className="text-[15px] text-mute">Shared with {joinNames(sharedWith)}</p>}
        </div>
        <div className="shrink-0 whitespace-nowrap text-right">
          <p className="font-bold tabular-nums">{kwh === null ? "In progress" : `${fmtKwh(kwh)} kWh`}</p>
          {kwh !== null && <p className="mt-0.5 text-[15px] tabular-nums text-mute">{fmtPhp(round2(kwh * rate))}</p>}
        </div>
      </div>

      {mine && done && (
        <div className="mt-1.5 flex gap-5">
          <button type="button" onClick={() => setEditing(true)} className="px-1 py-3 text-base font-semibold underline underline-offset-2">
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this entry?")) actions.deleteEntry(entry.id);
            }}
            className="px-1 py-3 text-base font-semibold text-danger underline underline-offset-2"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

export default function HistoryList({
  entries,
  user,
  rate,
  shares,
  sharedWith,
  actions,
}: {
  entries: Entry[];
  user: Person;
  rate: number;
  shares: Record<string, number>;
  sharedWith: Record<string, Person[]>;
  actions: Actions;
}) {
  return (
    <section>
      <Heading>History</Heading>
      <Hint className="mt-1">
        Everyone's entries this billing cycle. Usage is each person's share. You can edit or delete your own.
      </Hint>

      {entries.length === 0 ? (
        <p className="mt-4 rounded-lg border border-line p-4 text-mute">No entries yet. Go to My session to log the first one.</p>
      ) : (
        <ul className="mt-4 grid gap-2.5">
          {entries.map((e) => (
            <Item
              key={e.id}
              entry={e}
              mine={e.person === user}
              rate={rate}
              share={shares[e.id] ?? entryKwh(e as ClosedEntry)}
              sharedWith={sharedWith[e.id] ?? []}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
