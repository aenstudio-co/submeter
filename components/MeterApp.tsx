"use client";

import { useMemo, useState } from "react";
import { fmtDate, fmtKwh, fmtPhp, fmtRate, isClosed, summarize } from "@/lib/calc";
import type { Actions } from "@/lib/store";
import type { Entry, Person, Settings } from "@/lib/types";
import Calendar from "./Calendar";
import HistoryList from "./HistoryList";
import LiveClock, { DaysLeft } from "./LiveClock";
import SessionTab from "./SessionTab";
import SettingsPanel from "./SettingsPanel";
import TotalsTab from "./TotalsTab";

type Tab = "session" | "calendar" | "totals" | "history";
const TABS: { id: Tab; label: string }[] = [
  { id: "session", label: "My Session" },
  { id: "calendar", label: "Calendar" },
  { id: "totals", label: "Total" },
  { id: "history", label: "History" },
];

export default function MeterApp({
  user,
  settings,
  entries,
  admin,
  actions,
}: {
  user: Person;
  settings: Settings;
  entries: Entry[];
  admin: boolean;
  actions: Actions;
}) {
  const [tab, setTab] = useState<Tab>("session");
  const [signingOut, setSigningOut] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const sum = useMemo(() => summarize(entries, settings), [entries, settings]);
  const sorted = useMemo(() => [...entries].sort((a, b) => b.start_at.localeCompare(a.start_at)), [entries]);
  const open = entries.find((e) => e.person === user && !isClosed(e));

  async function signOut() {
    setSigningOut(true);
    try {
      await actions.logout();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-dvh bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md">
        <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight">Submeter Reading</h1>
            <LiveClock />
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[15px] font-semibold">{user}</p>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="text-[15px] underline underline-offset-2 disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </header>

        {/* Navigation: always at the top while you scroll */}
        <nav aria-label="Sections" className="sticky top-0 z-20 border-b border-line bg-surface">
          <div role="tablist" className="grid grid-cols-4">
            {TABS.map(({ id, label }) => {
              const active = !showSettings && tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={active}
                  aria-controls={`panel-${id}`}
                  onClick={() => {
                    setTab(id);
                    setShowSettings(false);
                    window.scrollTo({ top: 0 });
                  }}
                  className={`-mb-px border-b-[3px] px-0.5 py-3.5 text-[15px] ${
                    active ? "border-ink font-bold text-ink" : "border-transparent font-medium text-mute"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </nav>

        <main className="px-5 pb-16 pt-5">
          {showSettings ? (
            <SettingsPanel
              settings={settings}
              entries={entries}
              currentReading={sum.current}
              admin={admin}
              actions={actions}
              onBack={() => setShowSettings(false)}
            />
          ) : (
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "session" && (
              <div className="grid gap-7">
                <section aria-label="Current bill" className="rounded-lg border border-line p-5">
                  <p className="text-[15px] text-mute">Current bill</p>
                  <p className="mt-1 text-[40px] font-bold leading-none tabular-nums">{fmtPhp(sum.totalBill)}</p>
                  <p className="mt-3 text-[15px] text-mute">
                    Expected payment <strong className="text-ink">{fmtDate(settings.cycle_end)}</strong>{" "}
                    <DaysLeft dueDate={settings.cycle_end} />
                  </p>

                  <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
                    <div>
                      <dt className="text-sm text-mute">Previous reading</dt>
                      <dd className="mt-1 font-bold tabular-nums">{fmtKwh(settings.previous_reading)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-mute">Current reading</dt>
                      <dd className="mt-1 font-bold tabular-nums">{fmtKwh(sum.current)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-mute">Meter used</dt>
                      <dd className="mt-1 font-bold tabular-nums">{fmtKwh(sum.total)} kWh</dd>
                    </div>
                  </dl>

                  <p className="mt-4 border-t border-line pt-4 text-sm text-mute">
                    Billing cycle {fmtDate(settings.cycle_start)} to {fmtDate(settings.cycle_end)}. Rate{" "}
                    {fmtRate(settings.rate)} per kWh.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettings(true);
                      window.scrollTo({ top: 0 });
                    }}
                    className="mt-2 py-2 text-[15px] underline underline-offset-2"
                  >
                    Billing settings
                  </button>
                </section>

                <SessionTab
                  open={open}
                  lastReading={sum.current}
                  entries={entries}
                  settings={settings}
                  actions={actions}
                />
              </div>
            )}

            {tab === "calendar" && (
              <Calendar entries={entries} settings={settings} shares={sum.shareByEntry} sharedWith={sum.sharedWith} />
            )}

            {tab === "totals" && <TotalsTab sum={sum} settings={settings} />}

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
          )}
        </main>
      </div>
    </div>
  );
}
