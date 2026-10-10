import { fmtKwh } from "@/lib/calc";

// Meter drums: black for whole kWh, red for the decimals.
export default function Odometer({ value }: { value: number }) {
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
