import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Btn({
  tone = "quiet",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "solid" | "quiet" | "text" }) {
  const look =
    tone === "solid"
      ? "bg-bone text-bg hover:bg-bone/90"
      : tone === "text"
        ? "text-stone hover:text-bone"
        : "border border-line bg-ink text-bone hover:border-stone/50";
  return (
    <button
      type={type}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${look} ${className}`}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-stone">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const controlClass =
  "h-11 w-full rounded-md border border-line bg-ink px-3 text-sm text-bone outline-none";

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClass} ${className}`} {...props} />;
}
