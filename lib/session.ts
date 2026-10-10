import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PEOPLE, type Person } from "./types";

const COOKIE = "submeter_session";
const MAX_AGE = 60 * 60 * 24 * 30; // stay signed in for 30 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short. Add a long random text (16+ characters) to .env.local.");
  }
  return s;
}

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

export async function createSession(name: Person) {
  const payload = Buffer.from(JSON.stringify({ name, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

// Returns the signed-in person, or null.
export async function getSession(): Promise<Person | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;

  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { name, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof exp !== "number" || exp < Date.now()) return null;
    return (PEOPLE as readonly string[]).includes(name) ? (name as Person) : null;
  } catch {
    return null;
  }
}
