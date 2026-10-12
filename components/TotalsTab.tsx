import { fmtDate, fmtDateTime, fmtKwh, fmtPhp, joinNames, round2, summarize } from "@/lib/calc";
import type { Settings } from "@/lib/types";
import { Heading, Hint } from "./ui";

type Summary = ReturnType<typeof summarize>;
type PersonRow = Summary["perPerson"][number];

function detail(p: PersonRow) {
  if (p.kwh <= 0) return null;
  if (p.shared <= 0) return "No shared time";
  const sharedText = `${fmtKwh(p.shared)} kWh shared with ${joinNames(p.withPeople)}`;
  return p.alone > 0 ? `${fmtKwh(p.alone)} kWh alone, ${sharedText}` : sharedText;
}

const th = "px-3 py-2.5 text-sm font-semibold text-mute border-b border-line";
const num = "px-3 py-3 text-right align-top whitespace-nowrap tabular-nums";

export default function TotalsTab({ sum, settings }: { sum: Summary; settings: Settings }) {
  return (
    <div className="grid gap-9">
      <section>
        <Heading>Who used what</Heading>

        <div className="mt-4 overflow-hidden rounded-lg border border-line">
          <table className="w-full border-collapse text-[17px]">
            <thead>
              <tr>
                <th scope="col" className={`${th} text-left`}>
                  Person
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Usage
                </th>
                <th scope="col" className={`${th} text-right`}>
                  Bill
                </th>
              </tr>
            </thead>
            <tbody className="[&>tr+tr>td]:border-t [&>tr+tr>td]:border-line">
              {sum.perPerson.map((p) => (
                <tr key={p.person}>
                  <td className="px-3 py-3 align-top">
                    <span className="font-bold">{p.person}</span>
                    {detail(p) && <span className="block text-[15px] text-mute">{detail(p)}</span>}
                  </td>
                  <td className={`${num} font-bold`}>{fmtKwh(p.kwh)} kWh</td>
                  <td className={num}>{fmtPhp(p.bill)}</td>
                </tr>
              ))}
              {sum.unlogged > 0.005 && (
                <tr className="text-mute">
                  <td className="px-3 py-3 align-top">
                    <span>Not logged</span>
                    <span className="block text-[15px]">Used while nobody was timed in</span>
                  </td>
                  <td className={num}>{fmtKwh(sum.unlogged)} kWh</td>
                  <td className={num}>{fmtPhp(sum.unloggedBill)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-soft font-bold">
                <td className="border-t-2 border-ink px-3 py-3 align-top">Total on the meter</td>
                <td className={`${num} border-t-2 border-ink`}>{fmtKwh(sum.total)} kWh</td>
                <td className={`${num} border-t-2 border-ink`}>{fmtPhp(sum.totalBill)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {sum.timedIn.length > 0 && (
          <Hint className="mt-3">
            Timed in now:{" "}
            {sum.timedIn.map((e, i) => (
              <span key={e.id}>
                {i > 0 && ", "}
                <strong className="text-ink">{e.person}</strong> since {fmtDateTime(e.start_at)}
              </span>
            ))}
          </Hint>
        )}

        {sum.inconsistent && (
          <p role="alert" className="mt-3 text-[15px] font-medium text-danger">
            Some readings don't line up with their times (a later time has a lower reading). Look for the red rows
            below, then fix the wrong reading in History.
          </p>
        )}
      </section>

      <details className="group rounded-lg border border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
          <span className="text-[17px] font-bold">How it's split</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0 transition-transform group-open:rotate-180"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>

        <div className="border-t border-line">
          <p className="px-4 pb-1 pt-3 text-[15px] text-mute">
            The kWh used between two meter readings is split equally between the people in the room.
          </p>

          {sum.segments.length === 0 ? (
            <p className="px-4 pb-4 pt-2 text-mute">No readings yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line border-t border-line">
              {sum.segments.map((g, i) => {
                const n = g.people.length;
                return (
                  <li key={i} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className={g.problem ? "font-bold text-danger" : n === 0 ? "text-mute" : "font-bold"}>
                        {g.problem ? "Check readings" : n === 0 ? "Nobody logged" : joinNames(g.people)}
                      </p>
                      <p className="text-[15px] text-mute">
                        {g.fromCycleStart ? `${fmtDate(settings.cycle_start)} (start)` : fmtDateTime(g.fromAt)} to{" "}
                        {fmtDateTime(g.toAt)}
                      </p>
                    </div>
                    <div className="shrink-0 whitespace-nowrap text-right">
                      <p className={`tabular-nums ${n === 0 ? "text-mute" : "font-bold"}`}>{fmtKwh(g.kwh)} kWh</p>
                      {n > 1 && !g.problem && (
                        <p className="text-[15px] tabular-nums text-mute">{fmtKwh(round2(g.kwh / n))} each</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}