"use client";

import { useEffect, useRef, useState } from "react";
import type { Person } from "@/lib/types";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`text-mute transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export default function UserMenu({ user, onSignOut }: { user: Person; onSignOut: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);

  // Close when you click elsewhere or press Escape.
  useEffect(() => {
    if (!open) return;
    itemRef.current?.focus();

    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setPending(true);
    try {
      await onSignOut();
    } finally {
      setPending(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm font-medium transition-colors hover:border-mute"
      >
        <span className="grid size-8 place-items-center rounded-full bg-panel text-sm font-semibold text-white">
          {user[0]}
        </span>
        {user}
        <Chevron open={open} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          <div className="px-3 py-2">
            <p className="text-xs text-mute">Signed in as</p>
            <p className="font-medium">{user}</p>
          </div>
          <div className="my-1 border-t border-line" />
          <button
            ref={itemRef}
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={pending}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-signal transition-colors hover:bg-paper disabled:opacity-60"
          >
            <LogoutIcon />
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}