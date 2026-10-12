"use client";

import { useEffect, useState } from "react";
import type { Result } from "@/lib/store";
import { PEOPLE, type Person } from "@/lib/types";
import { CheckIcon } from "./icons";
import { ErrorText, primaryButton } from "./ui";

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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 pb-14 text-center">
      <h1 className="text-[32px] font-bold leading-tight">Room sub meter</h1>
      <p className="mt-2.5 text-lg text-mute">Who's logging today?</p>

      <form onSubmit={submit} className="mt-9">
        <fieldset>
          <legend className="sr-only">Choose your name</legend>
          <div className="grid gap-3">
            {PEOPLE.map((p) => {
              const selected = name === p;
              return (
                <label
                  key={p}
                  className={`relative flex min-h-[60px] cursor-pointer items-center justify-center gap-2.5 rounded-lg border-2 text-[19px] font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink ${
                    selected ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="name"
                    value={p}
                    checked={selected}
                    onChange={() => {
                      setName(p);
                      setError("");
                    }}
                    className="sr-only"
                  />
                  {selected && <CheckIcon />}
                  {p}
                </label>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <div className="mt-4">
            <ErrorText>{error}</ErrorText>
          </div>
        )}

        <button type="submit" disabled={!name || pending} className={`mt-6 py-4 text-lg ${primaryButton}`}>
          {pending ? "Continuing…" : "Continue"}
        </button>
      </form>

      <p className="mt-5 text-[15px] text-mute">Your phone remembers your name, so next time you only tap Continue.</p>
    </main>
  );
}
