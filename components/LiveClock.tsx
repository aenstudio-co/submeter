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
  if (!now) return <p className="h-[1.375rem]" aria-hidden="true" />;

  const date = now.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <p className="mt-1 text-[15px] tabular-nums text-mute">
      {date}, <span className="font-semibold text-ink">{time}</span>
    </p>
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
  return <span>({text})</span>;
}
