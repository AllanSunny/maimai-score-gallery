import type { ReactNode } from "react";
import { classNames } from "../../utils/class-names";

export const navigationCardClassName = [
  "group rounded-lg border-l-4 bg-darker no-underline ring-1 ring-inset ring-primary/50",
  "transition duration-150",
  "hover:-translate-y-0.5 hover:bg-dark/90 hover:ring-primary/70 hover:shadow-[0_2px_6px_var(--color-darkest)]",
  "focus-visible:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
].join(" ");

interface NavigationCardProps {
  href: string;
  accentClassName: string;
  children: ReactNode;
  className?: string;
}

export function NavigationCard({ href, accentClassName, children, className }: NavigationCardProps) {
  return (
    <a
      href={href}
      className={classNames(navigationCardClassName, accentClassName, className)}
    >
      {children}
    </a>
  );
}
