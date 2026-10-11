"use client";

import { nowInput } from "@/lib/time";

// Two separate fields, a date and a time, that together make "YYYY-MM-DDTHH:mm".
// Put it inside a grid: it renders two cells.
export default function DateTimeFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [date = "", time = ""] = value.split("T");

  return (
    <>
      <div className="grid gap-1 text-sm font-medium">
        <label htmlFor={`${idPrefix}-date`}>Date</label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          value={date}
          onChange={(e) => onChange(`${e.target.value}T${time}`)}
          required
        />
      </div>
      <div className="grid gap-1 text-sm font-medium">
        <div className="flex items-center justify-between">
          <label htmlFor={`${idPrefix}-time`}>Time</label>
          <button type="button" onClick={() => onChange(nowInput())} className="font-normal underline underline-offset-4">
            Set to now
          </button>
        </div>
        <input
          id={`${idPrefix}-time`}
          type="time"
          value={time}
          onChange={(e) => onChange(`${date}T${e.target.value}`)}
          required
        />
      </div>
    </>
  );
}