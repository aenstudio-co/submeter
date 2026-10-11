import type { Person } from "./types";

// Every action returns an error message, or null when it worked.
export type Result = string | null;
export type EditValues = { timeIn: string; readingIn: number; timeOut: string; readingOut: number };

// What the screens can do. The real versions live in app/actions.ts and talk to Supabase.
export type Actions = {
  login: (name: Person | "") => Promise<Result>;
  logout: () => Promise<void>;
  timeIn: (time: string, reading: number) => Promise<Result>;
  timeOut: (id: string, time: string, reading: number) => Promise<Result>;
  cancelTimeIn: (id: string) => Promise<void>;
  updateEntry: (id: string, values: EditValues) => Promise<Result>;
  deleteEntry: (id: string) => Promise<void>;
};