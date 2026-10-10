"use client";

import { useEffect, useRef, useState } from "react";
import type { Result } from "@/lib/store";
import { PEOPLE, type Person } from "@/lib/types";

const LAST_NAME_KEY = "submeter-last-name";

export default function LoginForm({ onLogin }: { onLogin: (name: Person | "", password: string) => Promise<Result> }) {
  const [name, setName] = useState<Person | "">("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Remember who last signed in on this device, so you only type your password.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_NAME_KEY);
      if (saved && (PEOPLE as readonly string[]).includes(saved)) {
        setName(saved as Person);
        passwordRef.current?.focus();
      }
    } catch {}
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return setError("Choose your name first.");
    setPending(true);
    setError("");
    const err = await onLogin(name, password);
    setPending(false);
    if (err) {
      setError(err);
      setPassword("");
      passwordRef.current?.focus();
      return;
    }
    try {
      localStorage.setItem(LAST_NAME_KEY, name);
    } catch {}
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Room sub meter</h1>
      <p className="mt-1 text-mute">Sign in to log your time and readings.</p>

      <form onSubmit={submit} className="mt-8 grid gap-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Who are you?</legend>
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
                    passwordRef.current?.focus();
                  }}
                  className="peer sr-only"
                />
                <span
                  className={`block rounded-lg border px-3 py-2.5 text-center font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-panel peer-focus-visible:ring-offset-2 ${
                    name === p ? "border-panel bg-panel text-white" : "border-line bg-white hover:border-mute"
                  }`}
                >
                  {p}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <input
              ref={passwordRef}
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-16"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-pressed={show}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-3 text-sm font-medium text-mute transition-colors hover:text-ink"
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-signal">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-panel px-5 py-3 font-medium text-white transition-colors hover:bg-ink disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}