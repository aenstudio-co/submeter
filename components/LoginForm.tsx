"use client";

import { useEffect, useState } from "react";
import type { Result } from "@/lib/store";
import { PEOPLE, type Person } from "@/lib/types";

const LAST_NAME_KEY = "submeter-last-name";

export default function LoginForm({ onLogin }: { onLogin: (name: Person | "") => Promise<Result> }) {
  const [name, setName] = useState<Person | "">("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // Remember who last signed in on this device, so you only tap Continue.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_NAME_KEY);
      if (saved && (PEOPLE as readonly string[]).includes(saved)) setName(saved as Person);
    } catch {}
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setPending(true);
    setError("");
    const err = await onLogin(name);
    setPending(false);
    if (err) return setError(err);
    try {
      localStorage.setItem(LAST_NAME_KEY, name);
    } catch {}
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Room sub meter</h1>
      <p className="mt-1 text-mute">Choose your name to continue.</p>

      <form onSubmit={submit} className="mt-8 grid gap-5">
        <fieldset>
          <legend className="sr-only">Who are you?</legend>
          <div className="grid grid-cols-3 gap-2">
            {PEOPLE.map((p) => (
              <label key={p} className="cursor-pointer">
                <input
                  type="radio"
                  name="name"
                  value={p}
                  checked={name === p}
                  onChange={() => {
                    setName(p);
                    setError("");
                  }}
                  className="peer sr-only"
                />
                <span
                  className={`block rounded-lg border px-3 py-3 text-center font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-panel peer-focus-visible:ring-offset-2 ${
                    name === p ? "border-panel bg-panel text-white" : "border-line bg-white hover:border-mute"
                  }`}
                >
                  {p}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm font-medium text-signal">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!name || pending}
          className="rounded-lg bg-panel px-5 py-3 font-medium text-white transition-colors hover:bg-ink disabled:opacity-40"
        >
          {pending ? "Continuing…" : "Continue"}
        </button>
      </form>
    </main>
  );
}