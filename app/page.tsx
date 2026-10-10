import MeterApp from "@/components/MeterApp";
import type { Entry, Settings } from "@/lib/types";

// Temporary sample data. This gets replaced by the database later.
const settings: Settings = {
  rate: 11.73,
  previous_reading: 3772.7,
  cycle_start: "2026-10-03",
  cycle_end: "2026-11-03",
};

const entries: Entry[] = [
  {
    id: "1",
    person: "Kris",
    start_at: "2026-10-10T09:00:00",
    end_at: "2026-10-10T17:00:00",
    start_reading: 3775.65,
    end_reading: 3776.2,
    note: null,
  },
  {
    id: "2",
    person: "Shane",
    start_at: "2026-10-10T18:00:00",
    end_at: "2026-10-10T22:00:00",
    start_reading: 3776.2,
    end_reading: 3777.0,
    note: null,
  },
  {
    id: "3",
    person: "Hannah",
    start_at: "2026-10-10T19:00:00",
    end_at: "2026-10-10T23:00:00",
    start_reading: 3777.5,
    end_reading: 3778.4,
    note: "Studying",
  },
];

export default function Home() {
  return <MeterApp settings={settings} initialEntries={entries} />;
}