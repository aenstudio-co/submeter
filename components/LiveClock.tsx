"use client";

import { useEffect, useState } from "react";
import { nowInput } from "@/lib/time";

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

// Ticking date and time in Philippine time.
export default function LiveClock() {
  const now = useNow();
  if (!now) return <div className="h-[4.25rem]" aria-hidden="true" />;

  const time = now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  const date = now.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="sm:text-right">
      <p className="font-mono text-2xl font-medium tabular-nums">{time}</p>
      <p className="text-sm text-mute">{date}</p>
    </div>
  );
}

// "(24 days left)" counting down to the bill date.
export function DaysLeft({ dueDate }: { dueDate: string }) {
  const now = useNow();
  if (!now) return null;

  const today = nowInput().slice(0, 10);
  const left = Math.round(
    (Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
  );

  const text =
    left > 1 ? `${left} days left` : left === 1 ? "tomorrow" : left === 0 ? "today" : `${-left} days ago`;
  return <span className="text-white/70">({text})</span>;
}