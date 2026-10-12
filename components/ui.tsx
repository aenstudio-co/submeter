import type { ReactNode } from "react";
import type { Person } from "@/lib/types";

// Plain building blocks: black, white and grey, with big readable text.

export const primaryButton =
  "w-full rounded-lg bg-ink px-5 py-3.5 text-[17px] font-semibold text-surface transition-opacity active:opacity-80 disabled:opacity-40";

export const outlineButton =
  "w-full rounded-lg border border-edge bg-surface px-5 py-3.5 text-[17px] font-semibold text-ink transition-colors active:bg-soft";

export function Heading({ children }: { children: ReactNode }) {
  return <h2 className="text-[22px] font-bold leading-tight">{children}</h2>;
}

export function Hint({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[15px] leading-snug text-mute ${className}`}>{children}</p>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-[15px] font-medium text-danger">
      {children}
    </p>
  );
}

// A label above a field. `action` is a small link on the right of the label.
export function Field({
  label,
  htmlFor,
  action,
  children,
}: {
  label: string;
  htmlFor: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[15px] font-semibold">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Avatar({ person, className = "size-10 text-base" }: { person: Person; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-ink font-semibold text-surface ${className}`}
    >
      {person[0]}
    </span>
  );
}
