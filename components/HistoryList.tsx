"use client";

import { useState } from "react";
import { fmtDateTime, fmtKwh, fmtPhp, isClosed, joinNames, round2, toInputValue } from "@/lib/calc";
import type { Actions } from "@/lib/store";
import DateTimeFields from "./DateTimeFields";
import type { ClosedEntry, Entry, Person } from "@/lib/types";

const rowCols = "sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_5.5rem_5rem_6rem]";

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
    <form onSubmit={submit} className="grid gap-4 px-4 py-4">
      <div role="group" aria-label="Time in">
        <p className="mb-2 text-sm font-semibold">Time in</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <DateTimeFields idPrefix={`ti-${entry.id}`} value={timeIn} onChange={setTimeIn} />
          <div className="grid gap-1 text-sm font-medium">
            <label htmlFor={`ri-${entry.id}`}>Meter reading (kWh)</label>
            <input id={`ri-${entry.id}`} type="number" step="0.01" min="0" inputMode="decimal" value={readingIn} onChange={(e) => setReadingIn(e.target.value)} required />
          </div>
        </div>
      </div>
      <div role="group" aria-label="Time out">
        <p className="mb-2 text-sm font-semibold">Time out</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <DateTimeFields idPrefix={`to-${entry.id}`} value={timeOut} onChange={setTimeOut} />
          <div className="grid gap-1 text-sm font-medium">
            <label htmlFor={`ro-${entry.id}`}>Meter reading (kWh)</label>
            <input id={`ro-${entry.id}`} type="number" step="0.01" min="0" inputMode="decimal" value={readingOut} onChange={(e) => setReadingOut(e.target.value)} required />
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-signal">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-panel px-4 py-2 font-medium text-white transition-colors hover:bg-ink disabled:opacity-60">
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button type="button" onClick={onDone} className="rounded-md border border-line px-4 py-2 font-medium hover:bg-white">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Row({
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
      <li>
        <EditForm entry={entry} actions={actions} onDone={() => setEditing(false)} />
      </li>
    );
  }

  const kwh = isClosed(entry) ? share : null;

  return (
    <li className={`grid gap-x-4 gap-y-1 px-4 py-3 sm:items-center ${rowCols}`}>
      <div>
        <p className="font-medium">{entry.person}</p>
        <p className="text-sm text-mute">
          {fmtDateTime(entry.start_at)}
          {entry.end_at ? ` to ${fmtDateTime(entry.end_at)}` : " (still timed in)"}
        </p>
        {sharedWith.length > 0 && <p className="text-sm text-mute">Shared with {joinNames(sharedWith)}</p>}
      </div>
      <p className="font-mono text-sm text-mute">
        {fmtKwh(entry.start_reading)}
        {entry.end_reading !== null ? ` to ${fmtKwh(entry.end_reading)}` : ""}
      </p>
      <div className="flex items-baseline justify-between gap-4 sm:contents">
        <span className="font-mono sm:text-right">{kwh === null ? "In progress" : `${fmtKwh(kwh)} kWh`}</span>
        <span className="font-mono sm:text-right">{kwh === null ? "" : fmtPhp(round2(kwh * rate))}</span>
      </div>
      <div className="flex gap-4 pt-1 text-sm sm:justify-end sm:pt-0">
        {mine && isClosed(entry) && (
          <>
            <button type="button" onClick={() => setEditing(true)} className="font-medium underline underline-offset-4">
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete this entry?")) actions.deleteEntry(entry.id);
              }}
              className="font-medium text-signal underline underline-offset-4"
            >
              Delete
            </button>
          </>
        )}
      </div>
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
    <div>
      <h2 className="text-xl font-semibold">History</h2>
      <p className="mt-1 text-mute">Everyone's entries this cycle. Usage is each person's share. You can edit or delete your own.</p>
      {entries.length === 0 ? (
        <p className="mt-4 text-mute">No entries yet. Go to My session to log the first one.</p>
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
            {entries.map((e) => (
              <Row
                key={e.id}
                entry={e}
                mine={e.person === user}
                rate={rate}
                share={shares[e.id] ?? 0}
                sharedWith={sharedWith[e.id] ?? []}
                actions={actions}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}