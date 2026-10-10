export const PEOPLE = ["Shane", "Kris", "Hannah"] as const;
export type Person = (typeof PEOPLE)[number];

export type Entry = {
  id: string;
  person: Person;
  start_at: string; // "YYYY-MM-DDTHH:mm:ss", local time
  end_at: string;
  start_reading: number;
  end_reading: number;
  note: string | null;
};

export type Settings = {
  rate: number; // PHP per kWh
  previous_reading: number;
  cycle_start: string; // "YYYY-MM-DD"
  cycle_end: string;
};