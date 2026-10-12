"use server";

import { revalidatePath } from "next/cache";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/supabase";
import { createAdminSession, createSession, destroyAdminSession, destroySession, getSession, hasAdminSession } from "@/lib/session";
import type { BillingValues, EditValues, Result } from "@/lib/store";
import { PEOPLE, type Person } from "@/lib/types";

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const EXPIRED = "Your session expired. Sign in again.";

async function currentUser(): Promise<Person | null> {
  try {
    return await getSession();
  } catch {
    return null;
  }
}

function checkRange(timeIn: string, readingIn: number, timeOut: string, readingOut: number): Result {
  if (!DATETIME.test(timeIn) || !DATETIME.test(timeOut)) return "Enter both times.";
  if (timeOut < timeIn) return "Time out must be after time in.";
  if (![readingIn, readingOut].every((n) => Number.isFinite(n) && n >= 0)) return "Enter both meter readings.";
  if (readingOut < readingIn) return "The reading when you left can't be lower than when you came in.";
  return null;
}

// ---------- Sign in / out ----------

export async function login(name: Person | ""): Promise<Result> {
  if (!name || !(PEOPLE as readonly string[]).includes(name)) return "Choose your name.";

  try {
    await createSession(name);
  } catch (e) {
    return e instanceof Error ? e.message : "Couldn't sign in.";
  }
  return null;
}

export async function logout(): Promise<void> {
  await destroySession();
}

// ---------- Time in / time out ----------

export async function timeIn(time: string, reading: number): Promise<Result> {
  const user = await currentUser();
  if (!user) return EXPIRED;

  if (!DATETIME.test(String(time))) return "Enter the time you came in.";
  if (!Number.isFinite(reading) || reading < 0) return "Enter the meter reading.";

  const { error } = await db()
    .from("entries")
    .insert({ person: user, start_at: `${time}:00`, start_reading: reading });
  if (error) return error.code === "23505" ? "You're already timed in. Time out first." : error.message;

  revalidatePath("/");
  return null;
}

export async function timeOut(id: string, time: string, reading: number): Promise<Result> {
  const user = await currentUser();
  if (!user) return EXPIRED;

  const supabase = db();
  const { data: row } = await supabase
    .from("entries")
    .select("start_at, start_reading")
    .eq("id", String(id))
    .eq("person", user)
    .is("end_at", null)
    .maybeSingle();
  if (!row) return "Couldn't find your time in. Refresh the page and try again.";

  const problem = checkRange(String(row.start_at).slice(0, 16), Number(row.start_reading), String(time), reading);
  if (problem) return problem;

  const { error } = await supabase
    .from("entries")
    .update({ end_at: `${time}:00`, end_reading: reading })
    .eq("id", String(id))
    .eq("person", user);
  if (error) return error.message;

  revalidatePath("/");
  return null;
}

export async function cancelTimeIn(id: string): Promise<void> {
  const user = await currentUser();
  if (!user) return;

  await db().from("entries").delete().eq("id", String(id)).eq("person", user).is("end_at", null);
  revalidatePath("/");
}

// ---------- Edit / delete finished entries (your own only) ----------

export async function updateEntry(id: string, v: EditValues): Promise<Result> {
  const user = await currentUser();
  if (!user) return EXPIRED;

  const problem = checkRange(String(v.timeIn), v.readingIn, String(v.timeOut), v.readingOut);
  if (problem) return problem;

  const { error } = await db()
    .from("entries")
    .update({
      start_at: `${v.timeIn}:00`,
      start_reading: v.readingIn,
      end_at: `${v.timeOut}:00`,
      end_reading: v.readingOut,
    })
    .eq("id", String(id))
    .eq("person", user);
  if (error) return error.message;

  revalidatePath("/");
  return null;
}

export async function deleteEntry(id: string): Promise<void> {
  const user = await currentUser();
  if (!user) return;

  await db().from("entries").delete().eq("id", String(id)).eq("person", user);
  revalidatePath("/");
}

// ---------- Billing settings (rate, cycle dates), behind an admin password ----------

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function unlockSettings(password: string): Promise<Result> {
  if (!(await currentUser())) return EXPIRED;

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return "No admin password is set yet. Add ADMIN_PASSWORD to .env.local (and to Vercel), then restart.";

  if (!safeEqual(String(password), expected)) {
    await new Promise((r) => setTimeout(r, 600)); // slows down password guessing
    return "Wrong password.";
  }

  try {
    await createAdminSession();
  } catch (e) {
    return e instanceof Error ? e.message : "Couldn't unlock.";
  }
  revalidatePath("/");
  return null;
}

export async function lockSettings(): Promise<void> {
  await destroyAdminSession();
  revalidatePath("/");
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export async function saveBilling(v: BillingValues): Promise<Result> {
  if (!(await currentUser())) return EXPIRED;
  if (!(await hasAdminSession())) return "Settings are locked. Enter the admin password first.";

  const cycleStart = String(v.cycleStart);
  const cycleEnd = String(v.cycleEnd);
  if (!DATE_ONLY.test(cycleStart) || !DATE_ONLY.test(cycleEnd)) return "Enter both dates.";
  if (cycleEnd <= cycleStart) return "The expected bill date must be after the start date.";
  if (!Number.isFinite(v.rate) || v.rate <= 0 || v.rate > 1000) return "Enter the rate in pesos per kWh.";
  if (!Number.isFinite(v.previousReading) || v.previousReading < 0) {
    return "Enter the meter reading at the start of the cycle.";
  }

  const { error } = await db()
    .from("settings")
    .update({
      rate: v.rate,
      previous_reading: v.previousReading,
      cycle_start: cycleStart,
      cycle_end: cycleEnd,
    })
    .eq("id", 1);
  if (error) return error.message;

  revalidatePath("/");
  return null;
}
