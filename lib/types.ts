export const PEOPLE = ["Shane", "Kris", "Hannah"] as const;
export type Person = (typeof PEOPLE)[number];

// An entry is "timed in" until end_at and end_reading are filled in.
export type Entry = {
  id: string;
  person: Person;
  start_at: string; // "YYYY-MM-DDTHH:mm:ss", local time
  start_reading: number;
  end_at: string | null;
  end_reading: number | null;
};

export type ClosedEntry = Entry & { end_at: string; end_reading: number };

export type Settings = {
  rate: number; // PHP per kWh
  previous_reading: number;
  cycle_start: string; // "YYYY-MM-DD"
  cycle_end: string;
};
