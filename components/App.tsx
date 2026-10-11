"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cancelTimeIn, deleteEntry, login, logout, timeIn, timeOut, updateEntry } from "@/app/actions";
import type { Actions } from "@/lib/store";
import type { Entry, Person, Settings } from "@/lib/types";
import LoginForm from "./LoginForm";
import MeterApp from "./MeterApp";

type Session = { user: Person; settings: Settings; entries: Entry[] };

export default function App({ session }: { session: Session | null }) {
  const router = useRouter();
  const signedIn = session !== null;

  // Keep everyone's screen up to date: refresh from the database every 10 seconds
  // and whenever you come back to this tab.
  useEffect(() => {
    if (!signedIn) return;
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, 10_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, signedIn]);

  const actions: Actions = {
    async login(name) {
      const err = await login(name);
      if (!err) router.refresh();
      return err;
    },
    async logout() {
      await logout();
      router.refresh();
    },
    timeIn,
    timeOut,
    cancelTimeIn,
    updateEntry,
    deleteEntry,
  };

  if (!session) return <LoginForm onLogin={actions.login} />;
  return <MeterApp user={session.user} settings={session.settings} entries={session.entries} actions={actions} />;
}