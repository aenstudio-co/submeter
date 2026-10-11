"use client";

import { useMemo, useState } from "react";
import { fmtDate, fmtKwh, fmtPhp, fmtRate, isClosed, summarize } from "@/lib/calc";
import type { Actions } from "@/lib/store";
import type { Entry, Person, Settings } from "@/lib/types";
import HistoryList from "./HistoryList";
import LiveClock, { DaysLeft } from "./LiveClock";
import SessionTab from "./SessionTab";
import TotalsTab from "./TotalsTab";
import UserMenu from "./UserMenu";

type Tab = "session" | "split" | "history";
const TABS: { id: Tab; label: string }[] = [
  { id: "session", label: "My session" },
  { id: "split", label: "Totals" },
  { id: "history", label: "History" },
];

export default function MeterApp({
  user,
  settings,
  entries,
  actions,
}: {
  user: Person;
  settings: Settings;
  entries: Entry[];
  actions: Actions;
}) {
  const [tab, setTab] = useState<Tab>("session");

  const sum = useMemo(() => summarize(entries, settings), [entries, settings]);
  const sorted = useMemo(() => [...entries].sort((a, b) => b.start_at.localeCompare(a.start_at)), [entries]);
  const open = entries.find((e) => e.person === user && !isClosed(e));

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
      <header>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Room sub meter</h1>
          <UserMenu user={user} onSignOut={actions.logout} />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-mute">
            Billing cycle {fmtDate(settings.cycle_start)} to {fmtDate(settings.cycle_end)}. Rate{" "}
            {fmtRate(settings.rate)} per kWh.
          </p>
          <LiveClock />
        </div>
      </header>

      {/* Summary */}
      <section aria-labelledby="bill" className="mt-6 rounded-xl border border-line bg-surface p-5 sm:p-6">
        <h2 id="bill" className="text-sm text-mute">
          Current bill
        </h2>
        <p className="mt-1 font-mono text-4xl font-medium tracking-tight sm:text-5xl">{fmtPhp(sum.totalBill)}</p>
        <p className="mt-2 text-mute">
          Payment due <span className="font-medium text-ink">{fmtDate(settings.cycle_end)}</span>{" "}
          <DaysLeft dueDate={settings.cycle_end} />
        </p>
        <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4">
          <div>
            <dt className="text-sm text-mute">Previous reading</dt>
            <dd className="mt-0.5 font-mono">{fmtKwh(settings.previous_reading)}</dd>
          </div>
          <div>
            <dt className="text-sm text-mute">Current reading</dt>
            <dd className="mt-0.5 font-mono">{fmtKwh(sum.current)}</dd>
          </div>
          <div>
            <dt className="text-sm text-mute">Meter used</dt>
            <dd className="mt-0.5 font-mono">{fmtKwh(sum.total)} kWh</dd>
          </div>
        </dl>
      </section>

      {/* Tabs */}
      <div role="tablist" aria-label="Sections" className="mt-6 grid grid-cols-3 gap-1 rounded-xl bg-line/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-2.5 font-medium transition-colors ${
              tab === t.id ? "bg-surface text-ink shadow-sm" : "text-mute hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6">
        {tab === "session" && (
          <SessionTab
            open={open}
            lastReading={sum.current}
            entries={entries}
            settings={settings}
            actions={actions}
          />
        )}

        {tab === "split" && <TotalsTab sum={sum} settings={settings} />}

        {tab === "history" && (
          <HistoryList
            entries={sorted}
            user={user}
            rate={settings.rate}
            shares={sum.shareByEntry}
            sharedWith={sum.sharedWith}
            actions={actions}
          />
        )}
      </div>
    </main>
  );
}