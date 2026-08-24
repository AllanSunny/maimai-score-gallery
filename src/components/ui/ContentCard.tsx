import type { CSSProperties, ReactNode } from "react";

type ContentCardVariant = "primary" | "secondary";

interface ContentCardProps {
  children: ReactNode;
  accentColor: string;
  variant?: ContentCardVariant;
  className?: string;
}

const variantClasses: Record<ContentCardVariant, string> = {
  primary: "rounded-3xl border-2 p-6 sm:p-8 shadow-[0_0px_10px_var(--color-darkest)]",
  secondary: "overflow-hidden rounded-2xl border shadow-[0_0px_5px_var(--color-primary)]",
};

const variantBackgrounds: Record<ContentCardVariant, string> = {
  primary: "color-mix(in srgb, color-mix(in srgb, var(--card-accent) 40%, var(--color-light)) 70%, transparent)",
  secondary: "color-mix(in srgb, color-mix(in srgb, var(--card-accent) 30%, var(--color-darkest)) 40%, transparent)",
};

export function ContentCard({ children, accentColor, variant = "primary", className = "" }: ContentCardProps) {
  return (
    <div
      className={`min-w-0 ${variantClasses[variant]} ${className}`}
      style={{
        "--card-accent": `var(--color-${accentColor})`,
        borderColor: "var(--card-accent)",
        backgroundColor: variantBackgrounds[variant],
      } as CSSProperties}
    >
      {children}
    </div>
  );
}
