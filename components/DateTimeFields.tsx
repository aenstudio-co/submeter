"use client";

import { nowInput } from "@/lib/time";
import { Field } from "./ui";

// A Date field and a Time field, side by side, that together make "YYYY-MM-DDTHH:mm".
// Put it inside a two-column grid: it renders two cells.
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
      <Field label="Date" htmlFor={`${idPrefix}-date`}>
        <input
          id={`${idPrefix}-date`}
          type="date"
          value={date}
          onChange={(e) => onChange(`${e.target.value}T${time}`)}
          required
        />
      </Field>
      <Field
        label="Time"
        htmlFor={`${idPrefix}-time`}
        action={
          <button type="button" onClick={() => onChange(nowInput())} className="text-[15px] underline underline-offset-2">
            Set to now
          </button>
        }
      >
        <input
          id={`${idPrefix}-time`}
          type="time"
          value={time}
          onChange={(e) => onChange(`${date}T${e.target.value}`)}
          required
        />
      </Field>
    </>
  );
}
