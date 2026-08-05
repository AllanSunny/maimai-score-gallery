import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/** A reusable Tailwind component and pattern for future UI primitives. */
export function StatCard({ label, children, className = "" }: StatCardProps) {
  return (
    <article
      className={`flex flex-col border-r border-line px-8 py-7 last:border-0 max-[760px]:border-r-0 max-[760px]:border-b ${className}`}
    >
      <span>{label}</span>
      <strong>{children}</strong>
    </article>
  );
}
