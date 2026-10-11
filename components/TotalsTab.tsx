import { fmtDate, fmtDateTime, fmtKwh, fmtPhp, joinNames, round2, summarize } from "@/lib/calc";
import type { Settings } from "@/lib/types";

type Summary = ReturnType<typeof summarize>;
type PersonRow = Summary["perPerson"][number];

const cols = "sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_5.5rem_minmax(0,1.1fr)_6rem]";

function detail(p: PersonRow) {
  if (p.kwh <= 0) return null;
  if (p.shared <= 0) return "No shared time";
  const sharedText = `${fmtKwh(p.shared)} kWh shared with ${joinNames(p.withPeople)}`;
  return p.alone > 0 ? `${fmtKwh(p.alone)} kWh alone, ${sharedText}` : sharedText;
}

export default function TotalsTab({ sum, settings }: { sum: Summary; settings: Settings }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Totals</h2>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
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
                <td className="px-4 py-3 align-top">
                  <span className="font-medium">{p.person}</span>
                  {detail(p) && <span className="mt-0.5 block text-sm text-mute">{detail(p)}</span>}
                </td>
                <td className="px-4 py-3 text-right align-top font-mono">{fmtKwh(p.kwh)} kWh</td>
                <td className="px-4 py-3 text-right align-top font-mono">{fmtPhp(p.bill)}</td>
              </tr>
            ))}
            {sum.unlogged > 0.005 && (
              <tr className="text-mute">
                <td className="px-4 py-3 align-top">
                  Not logged
                  <span className="mt-0.5 block text-sm">Used while nobody was timed in</span>
                </td>
                <td className="px-4 py-3 text-right align-top font-mono">{fmtKwh(sum.unlogged)} kWh</td>
                <td className="px-4 py-3 text-right align-top font-mono">{fmtPhp(sum.unloggedBill)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line font-semibold">
              <td className="px-4 py-3">Total on the meter</td>
              <td className="px-4 py-3 text-right font-mono">{fmtKwh(sum.total)} kWh</td>
              <td className="px-4 py-3 text-right font-mono">{fmtPhp(sum.totalBill)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {sum.timedIn.length > 0 && (
        <p className="mt-4 text-mute">
          Timed in now:{" "}
          {sum.timedIn.map((e, i) => (
            <span key={e.id}>
              {i > 0 && ", "}
              <span className="font-medium text-ink">{e.person}</span> since {fmtDateTime(e.start_at)}
            </span>
          ))}
        </p>
      )}

      {sum.inconsistent && (
        <p role="alert" className="mt-3 text-sm font-medium text-signal">
          Some readings don't line up with their times (a later time has a lower reading). Look for the red rows
          below, then fix the wrong reading in History.
        </p>
      )}

      <h3 className="mt-10 text-xl font-semibold">How it's split</h3>
      <p className="mt-1 text-mute">
        Each row is the time between two meter readings. The kWh used in that time is split equally between the people
        in the room.
      </p>

      {sum.segments.length === 0 ? (
        <p className="mt-4 text-mute">No readings yet.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
          <div className={`hidden gap-x-4 border-b border-line px-4 py-2 text-sm text-mute sm:grid ${cols}`}>
            <span>When</span>
            <span>Meter</span>
            <span className="text-right">kWh</span>
            <span>In the room</span>
            <span className="text-right">Each</span>
          </div>
          <ul className="divide-y divide-line">
            {sum.segments.map((g, i) => {
              const n = g.people.length;
              return (
                <li
                  key={i}
                  className={`grid gap-x-4 gap-y-1 px-4 py-3 sm:items-center ${cols} ${
                    g.problem ? "bg-signal/10" : n === 0 ? "text-mute" : ""
                  }`}
                >
                  <p className="text-sm">
                    {g.fromCycleStart ? `${fmtDate(settings.cycle_start)} (start)` : fmtDateTime(g.fromAt)} to{" "}
                    {fmtDateTime(g.toAt)}
                  </p>
                  <p className="font-mono text-sm text-mute">
                    {fmtKwh(g.fromReading)} to {fmtKwh(g.toReading)}
                  </p>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 sm:contents">
                    <span className="font-mono sm:text-right">{fmtKwh(g.kwh)} kWh</span>
                    <span className={g.problem ? "font-medium text-signal" : ""}>
                      {g.problem ? "Check readings" : n === 0 ? "Nobody logged" : joinNames(g.people)}
                    </span>
                    <span className="font-mono sm:text-right">
                      {n === 0 || g.problem ? "None" : `${fmtKwh(round2(g.kwh / n))} kWh`}
                      {n > 0 && !g.problem && <span className="font-sans sm:hidden"> each</span>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}